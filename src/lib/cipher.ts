// Classical-cipher analysis toolkit: index of coincidence, Caesar solving via
// chi-squared, and monoalphabetic substitution cracking via quadgram-scored
// hill climbing. All models are built in-browser from the bundled corpora.

const A = "abcdefghijklmnopqrstuvwxyz";

export function lettersOnly(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // fold accents so ä/é/ò count as a/e/o
    .replace(/[^a-z]/g, "");
}

/** Index of coincidence: probability two random letters match.
 *  ~0.065–0.075 for European languages, ~0.0385 for uniform-random text. */
export function indexOfCoincidence(letters: string): number {
  const counts = new Array<number>(26).fill(0);
  for (const c of letters) counts[c.charCodeAt(0) - 97]++;
  const n = letters.length;
  if (n < 2) return 0;
  let sum = 0;
  for (const c of counts) sum += c * (c - 1);
  return sum / (n * (n - 1));
}

export function letterFrequencies(letters: string): number[] {
  const counts = new Array<number>(26).fill(0);
  for (const c of letters) counts[c.charCodeAt(0) - 97]++;
  return counts.map((c) => c / (letters.length || 1));
}

/* ---------------- Reference language model -------------------------------- */

export interface LanguageModel {
  name: string;
  freqs: number[]; // a-z relative frequencies
  quadgrams: Map<string, number>; // log10 probabilities
  floor: number;
  ic: number;
  source: string; // letters-only corpus, for practice-cipher generation
  rawText: string; // original text with punctuation, for readable excerpts
}

export function buildLanguageModel(name: string, rawText: string): LanguageModel {
  const letters = lettersOnly(rawText);
  const counts = new Map<string, number>();
  for (let i = 0; i + 4 <= letters.length; i++) {
    const q = letters.slice(i, i + 4);
    counts.set(q, (counts.get(q) ?? 0) + 1);
  }
  const total = Math.max(1, letters.length - 3);
  const quadgrams = new Map<string, number>();
  for (const [q, c] of counts) quadgrams.set(q, Math.log10(c / total));
  return {
    name,
    freqs: letterFrequencies(letters),
    quadgrams,
    floor: Math.log10(0.01 / total),
    ic: indexOfCoincidence(letters),
    source: letters,
    rawText,
  };
}

export function quadgramScore(letters: string, model: LanguageModel): number {
  let score = 0;
  for (let i = 0; i + 4 <= letters.length; i++) {
    score += model.quadgrams.get(letters.slice(i, i + 4)) ?? model.floor;
  }
  return score;
}

/** Cosine similarity between two letter-frequency vectors. */
export function profileSimilarity(a: number[], b: number[]): number {
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < 26; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

/* ---------------- Caesar ---------------------------------------------------- */

export function bestCaesarShift(letters: string, model: LanguageModel) {
  const obs = letterFrequencies(letters);
  let best = { shift: 0, chi2: Infinity };
  for (let shift = 0; shift < 26; shift++) {
    let chi2 = 0;
    for (let i = 0; i < 26; i++) {
      chi2 += (obs[(i + shift) % 26] - model.freqs[i]) ** 2 / (model.freqs[i] || 1e-6);
    }
    if (chi2 < best.chi2) best = { shift, chi2 };
  }
  return best;
}

export function caesarDecrypt(text: string, shift: number): string {
  return text.replace(/[a-z]/gi, (ch) => {
    const lower = ch.toLowerCase();
    const idx = (lower.charCodeAt(0) - 97 - shift + 26) % 26;
    return A[idx];
  });
}

/* ---------------- Monoalphabetic substitution ------------------------------ */

/** key[i] = plaintext letter that ciphertext letter A[i] maps to. */
export type SubKey = string[];

export function applyKey(text: string, key: SubKey): string {
  return text.replace(/[a-z]/gi, (ch) => key[ch.toLowerCase().charCodeAt(0) - 97]);
}

export function randomKey(): SubKey {
  const arr = A.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Initial guess: map cipher letters to model letters by frequency rank. */
function frequencyKey(cipherLetters: string, model: LanguageModel): SubKey {
  const obs = letterFrequencies(cipherLetters);
  const cipherOrder = A.split("").sort((x, y) => obs[y.charCodeAt(0) - 97] - obs[x.charCodeAt(0) - 97]);
  const langOrder = A.split("").sort(
    (x, y) => model.freqs[y.charCodeAt(0) - 97] - model.freqs[x.charCodeAt(0) - 97],
  );
  const key = new Array<string>(26);
  cipherOrder.forEach((c, i) => {
    key[c.charCodeAt(0) - 97] = langOrder[i];
  });
  return key;
}

export interface CrackProgress {
  restart: number;
  totalRestarts: number;
  bestScore: number;
  bestKey: SubKey;
  bestPlain: string;
  done: boolean;
}

/**
 * Hill-climbing substitution crack with random restarts. Runs in cooperative
 * chunks (via setTimeout) so the UI stays responsive; onProgress fires after
 * each restart with the best solution so far.
 */
export function crackSubstitution(
  ciphertext: string,
  model: LanguageModel,
  onProgress: (p: CrackProgress) => void,
  totalRestarts = 12,
): () => void {
  const cipherLetters = lettersOnly(ciphertext);
  let globalBest = { score: -Infinity, key: randomKey() };
  let restart = 0;
  let cancelled = false;

  function runRestart() {
    if (cancelled) return;
    let key = restart === 0 ? frequencyKey(cipherLetters, model) : randomKey();
    let score = quadgramScore(applyKeyToLetters(cipherLetters, key), model);
    let sinceImprove = 0;
    while (sinceImprove < 1500) {
      const i = Math.floor(Math.random() * 26);
      let j = Math.floor(Math.random() * 26);
      if (i === j) j = (j + 1) % 26;
      [key[i], key[j]] = [key[j], key[i]];
      const s = quadgramScore(applyKeyToLetters(cipherLetters, key), model);
      if (s > score) {
        score = s;
        sinceImprove = 0;
      } else {
        [key[i], key[j]] = [key[j], key[i]];
        sinceImprove++;
      }
    }
    if (score > globalBest.score) globalBest = { score, key: [...key] };
    restart++;
    onProgress({
      restart,
      totalRestarts,
      bestScore: globalBest.score,
      bestKey: globalBest.key,
      bestPlain: applyKey(ciphertext.toLowerCase(), globalBest.key),
      done: restart >= totalRestarts,
    });
    if (restart < totalRestarts) setTimeout(runRestart, 0);
  }

  setTimeout(runRestart, 0);
  return () => {
    cancelled = true;
  };
}

function applyKeyToLetters(letters: string, key: SubKey): string {
  let out = "";
  for (let i = 0; i < letters.length; i++) out += key[letters.charCodeAt(i) - 97];
  return out;
}

/* ---------------- Practice cipher generation ------------------------------- */

export function makePracticeCipher(model: LanguageModel, length = 400) {
  const text = model.rawText.replace(/\s+/g, " ");
  const start = Math.floor(Math.random() * Math.max(1, text.length - length - 1));
  // snap to a word boundary for a readable excerpt
  const from = text.indexOf(" ", start) + 1;
  const excerpt = text.slice(from, from + length).toLowerCase();
  const key = randomKey();
  return { plaintext: excerpt, ciphertext: applyKey(excerpt, key), key };
}
