// Core statistical engine. All measures computed client-side on token arrays.

export interface ZipfPoint {
  rank: number;
  freq: number;
  word: string;
}

export interface CorpusStats {
  tokens: number;
  types: number;
  ttr: number;
  avgWordLen: number;
  alphabetSize: number;
  h0: number; // log2(alphabet)
  h1: number; // first-order Shannon entropy, bits/char
  h2cond: number; // second-order conditional entropy H(X_n | X_{n-1}), bits/char
  h3cond: number; // third-order conditional entropy H(X_n | X_{n-2} X_{n-1}), bits/char
  zipf: ZipfPoint[];
  zipfAlpha: number;
  wordLenDist: { len: number; p: number }[];
  topWords: { word: string; count: number }[];
  charFreq: { ch: string; p: number }[];
}

/** Tokenize natural-language text: lowercase, split on non-letters. */
export function tokenizeNatural(text: string): string[] {
  return (text.toLowerCase().match(/\p{L}+/gu) ?? []).filter((w) => w.length > 0);
}

function entropyFromCounts(counts: Map<string, number>, total: number): number {
  let h = 0;
  for (const c of counts.values()) {
    const p = c / total;
    h -= p * Math.log2(p);
  }
  return h;
}

/**
 * Character entropies are computed over the space-joined word stream so the
 * word-boundary symbol participates, matching the convention used by Bennett
 * (1976) and most Voynich literature. The conditional (block) entropies are:
 *   H2 = H(Xₙ | Xₙ₋₁)       = H(bigram)  − H(unigram)
 *   H3 = H(Xₙ | Xₙ₋₂ Xₙ₋₁)  = H(trigram) − H(bigram)
 */
function characterEntropies(words: string[]) {
  const stream = words.join(" ");
  const uni = new Map<string, number>();
  const bi = new Map<string, number>();
  const tri = new Map<string, number>();
  for (let i = 0; i < stream.length; i++) {
    uni.set(stream[i], (uni.get(stream[i]) ?? 0) + 1);
    if (i < stream.length - 1) {
      const b = stream.slice(i, i + 2);
      bi.set(b, (bi.get(b) ?? 0) + 1);
    }
    if (i < stream.length - 2) {
      const t = stream.slice(i, i + 3);
      tri.set(t, (tri.get(t) ?? 0) + 1);
    }
  }
  const h1 = entropyFromCounts(uni, stream.length);
  const hPair = entropyFromCounts(bi, stream.length - 1);
  const hTri = entropyFromCounts(tri, stream.length - 2);
  return {
    alphabetSize: uni.size,
    h0: Math.log2(uni.size),
    h1,
    h2cond: hPair - h1,
    h3cond: hTri - hPair,
    uni,
    streamLen: stream.length,
  };
}

/** Least-squares slope of log10(freq) on log10(rank). Returns alpha = -slope. */
function fitZipfAlpha(zipf: ZipfPoint[]): number {
  const pts = zipf.filter((z) => z.freq >= 3);
  if (pts.length < 10) return NaN;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const z of pts) {
    const x = Math.log10(z.rank);
    const y = Math.log10(z.freq);
    sx += x; sy += y; sxx += x * x; sxy += x * y;
  }
  const n = pts.length;
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  return -slope;
}

export function computeStats(words: string[]): CorpusStats {
  const wordCounts = new Map<string, number>();
  let lenSum = 0;
  for (const w of words) {
    wordCounts.set(w, (wordCounts.get(w) ?? 0) + 1);
    lenSum += w.length;
  }
  const sorted = [...wordCounts.entries()].sort((a, b) => b[1] - a[1]);
  const zipf: ZipfPoint[] = sorted
    .slice(0, 1000)
    .map(([word, freq], i) => ({ rank: i + 1, freq, word }));

  const lenCounts = new Map<number, number>();
  for (const w of words) {
    const len = Math.min(w.length, 15);
    lenCounts.set(len, (lenCounts.get(len) ?? 0) + 1);
  }
  const maxLen = Math.max(...lenCounts.keys());
  const wordLenDist: { len: number; p: number }[] = [];
  for (let len = 1; len <= maxLen; len++) {
    wordLenDist.push({ len, p: (lenCounts.get(len) ?? 0) / words.length });
  }

  const ent = characterEntropies(words);
  const charFreq = [...ent.uni.entries()]
    .filter(([ch]) => ch !== " ")
    .sort((a, b) => b[1] - a[1])
    .map(([ch, c]) => ({ ch, p: c / ent.streamLen }));

  return {
    tokens: words.length,
    types: wordCounts.size,
    ttr: wordCounts.size / words.length,
    avgWordLen: lenSum / words.length,
    alphabetSize: ent.alphabetSize,
    h0: ent.h0,
    h1: ent.h1,
    h2cond: ent.h2cond,
    h3cond: ent.h3cond,
    zipf,
    zipfAlpha: fitZipfAlpha(zipf),
    wordLenDist,
    topWords: sorted.slice(0, 20).map(([word, count]) => ({ word, count })),
    charFreq,
  };
}
