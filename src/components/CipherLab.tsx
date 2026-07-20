import { useEffect, useMemo, useRef, useState } from "react";
import {
  bestCaesarShift,
  buildLanguageModel,
  caesarDecrypt,
  crackSubstitution,
  indexOfCoincidence,
  letterFrequencies,
  lettersOnly,
  makePracticeCipher,
  profileSimilarity,
} from "../lib/cipher";
import type { CrackProgress, LanguageModel } from "../lib/cipher";
import { parseIvtff } from "../lib/ivtff";
import { BarChart, StatTile } from "./charts";

const base = import.meta.env.BASE_URL;

const LANG_FILES: { id: string; name: string; file: string }[] = [
  { id: "english", name: "English", file: "english_alice.txt" },
  { id: "latin", name: "Latin", file: "latin_caesar.txt" },
  { id: "german", name: "German", file: "german_faust.txt" },
  { id: "italian", name: "Italian", file: "italian_dante.txt" },
];

const ALPHA = "abcdefghijklmnopqrstuvwxyz".split("");

export function CipherLab() {
  const [models, setModels] = useState<LanguageModel[]>([]);
  const [langId, setLangId] = useState("english");
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState(""); // hidden plaintext of practice cipher
  const [progress, setProgress] = useState<CrackProgress | null>(null);
  const [voynichIc, setVoynichIc] = useState<number | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await Promise.all(
        LANG_FILES.map(async (l) => {
          const text = await fetch(`${base}data/${l.file}`).then((r) => r.text());
          return buildLanguageModel(l.name, text);
        }),
      );
      const zl = await fetch(`${base}data/voynich_zl.txt`).then((r) => r.text());
      if (cancelled) return;
      setModels(loaded);
      const evaLetters = parseIvtff(zl).words.join("");
      setVoynichIc(indexOfCoincidence(evaLetters));
    })();
    return () => {
      cancelled = true;
      cancelRef.current?.();
    };
  }, []);

  const model = models.find((m) => m.name === LANG_FILES.find((l) => l.id === langId)?.name);

  const analysis = useMemo(() => {
    const letters = lettersOnly(input);
    if (!model || letters.length < 40) return null;
    const ic = indexOfCoincidence(letters);
    const freqs = letterFrequencies(letters);
    const caesar = bestCaesarShift(letters, model);
    const similarities = models
      .map((m) => ({ name: m.name, sim: profileSimilarity(freqs, m.freqs) }))
      .sort((a, b) => b.sim - a.sim);
    return { letters, ic, freqs, caesar, similarities };
  }, [input, model, models]);

  function generatePractice() {
    if (!model) return;
    const { ciphertext, plaintext } = makePracticeCipher(model);
    cancelRef.current?.();
    setProgress(null);
    setAnswer(plaintext);
    setInput(ciphertext);
  }

  function crack() {
    if (!model || !analysis) return;
    cancelRef.current?.();
    setProgress(null);
    cancelRef.current = crackSubstitution(input, model, setProgress);
  }

  if (models.length === 0) {
    return (
      <div className="card">
        <h2>Cipher Lab</h2>
        <p className="sub">Building language models from the bundled corpora…</p>
      </div>
    );
  }

  const icHint =
    analysis === null
      ? ""
      : analysis.ic > 0.055
        ? "language-like — consistent with plaintext or a monoalphabetic (single-substitution) cipher"
        : analysis.ic > 0.045
          ? "intermediate — possibly a short text or a cipher with few alphabets"
          : "flat — consistent with a polyalphabetic cipher (e.g. Vigenère) or random text";

  return (
    <>
      <div className="card">
        <h2>Cipher Lab</h2>
        <p className="sub">
          The classical decipherment toolkit — the same statistical attacks that broke real
          historical ciphers, running live in your browser. Generate a practice cipher, then watch
          frequency analysis and hill climbing recover the plaintext.
        </p>
        <div className="row" style={{ marginBottom: 10 }}>
          <label className="muted" style={{ fontSize: 13 }}>
            Reference language:
          </label>
          <select value={langId} onChange={(e) => setLangId(e.target.value)}>
            {LANG_FILES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <button className="primary" onClick={generatePractice}>
            Generate practice cipher
          </button>
        </div>
        <textarea
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setAnswer("");
            cancelRef.current?.();
            setProgress(null);
          }}
          placeholder="Paste a ciphertext (≥ 40 letters), or generate a practice cipher above…"
        />
      </div>

      {analysis && model && (
        <>
          <div className="card">
            <h2>Statistical fingerprint</h2>
            <div className="tiles">
              <StatTile label="Letters" value={analysis.letters.length.toLocaleString()} />
              <StatTile
                label="Index of coincidence"
                value={analysis.ic.toFixed(4)}
                detail={`${model.name} ≈ ${model.ic.toFixed(4)} · random ≈ 0.0385`}
              />
              <StatTile
                label="Closest profile"
                value={analysis.similarities[0].name}
                detail={`cosine ${analysis.similarities[0].sim.toFixed(3)}`}
              />
              <StatTile
                label="Best Caesar shift"
                value={String(analysis.caesar.shift)}
                detail={`χ² ${analysis.caesar.chi2.toFixed(1)} (lower = better)`}
              />
            </div>
            <p className="note">
              Reading: the index of coincidence is <strong>{icHint}</strong>.
            </p>
            {analysis.caesar.chi2 < 0.6 && analysis.caesar.shift !== 0 && (
              <p className="note">
                The χ² fit is good enough that this may simply be a Caesar shift of{" "}
                {analysis.caesar.shift}: <em>“{caesarDecrypt(input, analysis.caesar.shift).slice(0, 120)}…”</em>
              </p>
            )}
            <h3>Letter frequencies — ciphertext vs {model.name}</h3>
            <p className="sub">
              A monoalphabetic cipher shuffles this histogram without changing its shape; that
              invariance is exactly what frequency analysis exploits.
            </p>
            <BarChart
              data={ALPHA.map((ch, i) => ({ label: ch, value: analysis.freqs[i] }))}
              color="var(--series-1)"
              yLabel="ciphertext"
              yFmt={(v) => `${(v * 100).toFixed(1)}%`}
              height={180}
            />
            <BarChart
              data={ALPHA.map((ch, i) => ({ label: ch, value: model.freqs[i] }))}
              color="var(--series-2)"
              yLabel={model.name}
              yFmt={(v) => `${(v * 100).toFixed(1)}%`}
              height={180}
            />
            <div className="legend">
              <span className="item">
                <span className="swatch" style={{ background: "var(--series-1)" }} /> ciphertext
              </span>
              <span className="item">
                <span className="swatch" style={{ background: "var(--series-2)" }} /> {model.name}{" "}
                reference
              </span>
            </div>
          </div>

          <div className="card">
            <h2>Substitution solver</h2>
            <p className="sub">
              Hill climbing over the 26! possible substitution keys, scored by quadgram
              log-likelihood against the {model.name} model ({model.quadgrams.size.toLocaleString()}{" "}
              distinct quadgrams). 12 random restarts.
            </p>
            <div className="row">
              <button className="primary" onClick={crack}>
                {progress && !progress.done ? "Cracking…" : "Crack it"}
              </button>
              {progress && (
                <span className="muted" style={{ fontSize: 13 }}>
                  restart {progress.restart}/{progress.totalRestarts} · best score{" "}
                  {progress.bestScore.toFixed(0)}
                </span>
              )}
            </div>
            {progress && (
              <>
                <h3>Best decryption so far</h3>
                <p className="note" style={{ fontFamily: "ui-monospace, Consolas, monospace" }}>
                  {progress.bestPlain.slice(0, 600)}
                  {progress.bestPlain.length > 600 ? "…" : ""}
                </p>
                {answer && progress.done && (
                  <p className="note">
                    {lettersOnly(progress.bestPlain) === lettersOnly(answer) ? (
                      <strong>✓ Exact match — the practice cipher is fully recovered.</strong>
                    ) : (
                      <>
                        Close but not exact — compare the hidden plaintext:{" "}
                        <em>“{answer.slice(0, 200)}…”</em>
                      </>
                    )}
                  </p>
                )}
              </>
            )}
          </div>
        </>
      )}

      <div className="card">
        <h2>Why this doesn&apos;t crack the Voynich</h2>
        <p className="note">
          Everything above works because substitution preserves a language&apos;s statistical
          skeleton. Voynichese fails that premise: its index of coincidence over EVA characters is{" "}
          <strong>{voynichIc === null ? "…" : voynichIc.toFixed(4)}</strong> — far <em>higher</em>{" "}
          than any European language (more repetitive), while its conditional entropy is far{" "}
          <em>lower</em>, and its rigid word grammar (prefixes like <em>qo-</em>, suffixes like{" "}
          <em>-aiin</em>) has no counterpart in Latin, German, Italian or English. A monoalphabetic
          decryption of the Voynich would inherit those anomalies, so whatever the manuscript is —
          an unknown language, an engineered system, an elaborate cipher, or something else — it is
          provably not a simple substitution of a known European language. That result, which you
          can reproduce on this page, is the honest state of the art; anyone claiming a
          &quot;translation&quot; without addressing it is selling something.
        </p>
      </div>
    </>
  );
}
