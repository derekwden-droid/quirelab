import { useEffect, useMemo, useState } from "react";
import { computeStats, tokenizeNatural } from "../lib/stats";
import type { CorpusStats } from "../lib/stats";
import { parseIvtff } from "../lib/ivtff";
import type { VoynichCorpus } from "../lib/ivtff";
import { BarChart, HBarChart, LineChart, StatTile } from "./charts";
import type { Series } from "./charts";

interface Corpus {
  id: string;
  name: string;
  colorVar: string;
  stats: CorpusStats;
}

const COLOR_VARS: Record<string, string> = {
  voynich: "var(--series-1)",
  english: "var(--series-2)",
  latin: "var(--series-3)",
  custom: "var(--series-4)",
};

const base = import.meta.env.BASE_URL;

export function TextLab() {
  const [corpora, setCorpora] = useState<Corpus[]>([]);
  const [voynich, setVoynich] = useState<VoynichCorpus | null>(null);
  const [active, setActive] = useState("voynich");
  const [error, setError] = useState("");
  const [customText, setCustomText] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [zl, en, la] = await Promise.all([
          fetch(`${base}data/voynich_zl.txt`).then((r) => r.text()),
          fetch(`${base}data/english_alice.txt`).then((r) => r.text()),
          fetch(`${base}data/latin_caesar.txt`).then((r) => r.text()),
        ]);
        if (cancelled) return;
        const vc = parseIvtff(zl);
        setVoynich(vc);
        setCorpora([
          { id: "voynich", name: "Voynich (EVA)", colorVar: COLOR_VARS.voynich, stats: computeStats(vc.words) },
          { id: "english", name: "English (Alice)", colorVar: COLOR_VARS.english, stats: computeStats(tokenizeNatural(en)) },
          { id: "latin", name: "Latin (Caesar)", colorVar: COLOR_VARS.latin, stats: computeStats(tokenizeNatural(la)) },
        ]);
      } catch (e) {
        if (!cancelled) setError(`Failed to load bundled corpora: ${String(e)}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function analyzeCustom() {
    const words = tokenizeNatural(customText);
    if (words.length < 50) {
      setError("Paste at least 50 words to get meaningful statistics.");
      return;
    }
    setError("");
    const corpus: Corpus = {
      id: "custom",
      name: "Your text",
      colorVar: COLOR_VARS.custom,
      stats: computeStats(words),
    };
    setCorpora((prev) => [...prev.filter((c) => c.id !== "custom"), corpus]);
    setActive("custom");
  }

  const current = corpora.find((c) => c.id === active) ?? corpora[0];

  const zipfSeries: Series[] = useMemo(
    () =>
      corpora.map((c) => ({
        name: c.name,
        color: c.colorVar,
        points: c.stats.zipf
          .filter((z) => z.freq >= 2)
          .map((z) => ({ x: z.rank, y: z.freq, meta: `"${z.word}"` })),
      })),
    [corpora],
  );

  const wordLenSeries: Series[] = useMemo(
    () =>
      corpora.map((c) => ({
        name: c.name,
        color: c.colorVar,
        points: c.stats.wordLenDist.map((d) => ({ x: d.len, y: d.p })),
      })),
    [corpora],
  );

  const sectionRows = useMemo(() => {
    if (!voynich) return [];
    return [...voynich.sections.entries()]
      .filter(([, words]) => words.length > 300)
      .map(([name, words]) => {
        const s = computeStats(words);
        return { name, tokens: s.tokens, types: s.types, ttr: s.ttr, h1: s.h1, h2: s.h2cond };
      })
      .sort((a, b) => b.tokens - a.tokens);
  }, [voynich]);

  if (corpora.length === 0) {
    return (
      <div className="card">
        <h2>Text Lab</h2>
        {error ? <p className="error">{error}</p> : <p className="sub">Loading corpora…</p>}
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <h2>Corpora</h2>
        <p className="sub">
          The Voynich Manuscript (Zandbergen–Landini transliteration, basic EVA) against two
          known-language baselines. Select a corpus to inspect it, or paste your own text below.
        </p>
        <div className="chips">
          {corpora.map((c) => (
            <button
              key={c.id}
              className={`chip ${c.id === active ? "active" : ""}`}
              onClick={() => setActive(c.id)}
            >
              <span className="dot" style={{ background: c.colorVar }} />
              {c.name}
            </button>
          ))}
        </div>
        {current && (
          <div className="tiles">
            <StatTile label="Word tokens" value={current.stats.tokens.toLocaleString()} />
            <StatTile
              label="Distinct words"
              value={current.stats.types.toLocaleString()}
              detail={`TTR ${current.stats.ttr.toFixed(3)}`}
            />
            <StatTile
              label="Avg word length"
              value={current.stats.avgWordLen.toFixed(2)}
              detail={`alphabet: ${current.stats.alphabetSize} symbols`}
            />
            <StatTile
              label="H1 entropy"
              value={current.stats.h1.toFixed(2)}
              detail="bits / character"
            />
            <StatTile
              label="H2 conditional"
              value={current.stats.h2cond.toFixed(2)}
              detail="bits / character"
            />
            <StatTile
              label="Zipf α"
              value={Number.isNaN(current.stats.zipfAlpha) ? "—" : current.stats.zipfAlpha.toFixed(2)}
              detail="rank-frequency slope"
            />
          </div>
        )}
        <p className="note">
          The famously low <strong>H2 conditional entropy</strong> of Voynichese (~2 bits/char vs
          ~3–3.5 for European languages) means each character is unusually predictable from the one
          before it — one of the strongest quantitative arguments that the text is neither a simple
          substitution cipher of Latin nor random scribbling.
        </p>
      </div>

      <div className="card">
        <h2>Zipf rank–frequency</h2>
        <p className="sub">
          Log–log plot of word frequency against frequency rank. Natural languages fall on a straight
          line with slope ≈ −1. Voynichese complies — strong evidence against random gibberish.
        </p>
        <LineChart
          series={zipfSeries}
          logLog
          xLabel="rank"
          yLabel="frequency"
          xFmt={(v) => v.toLocaleString()}
          yFmt={(v) => (v >= 1 ? Math.round(v).toLocaleString() : v.toPrecision(2))}
        />
      </div>

      <div className="card">
        <h2>Word-length distribution</h2>
        <p className="sub">
          Share of tokens at each word length. Voynichese has an unusually narrow, symmetric
          distribution (almost no 1–2 letter words, almost nothing beyond 9) — very unlike European
          languages, and one reason some researchers suspect a syllabic or engineered encoding.
        </p>
        <LineChart
          series={wordLenSeries}
          xLabel="word length (characters)"
          yLabel="share of tokens"
          xFmt={(v) => String(Math.round(v))}
          yFmt={(v) => `${(v * 100).toFixed(1)}%`}
        />
      </div>

      <div className="row" style={{ alignItems: "stretch" }}>
        <div className="card" style={{ flex: "1 1 340px" }}>
          <h2>Top 20 words — {current?.name}</h2>
          <p className="sub">Most frequent word tokens in the selected corpus.</p>
          {current && (
            <HBarChart
              data={current.stats.topWords.map((w) => ({ label: w.word, value: w.count }))}
              color={current.colorVar}
              valueLabel="count"
              vFmt={(v) => v.toLocaleString()}
            />
          )}
        </div>
        <div className="card" style={{ flex: "1 1 340px" }}>
          <h2>Character frequency — {current?.name}</h2>
          <p className="sub">Relative frequency of each symbol (word spaces excluded).</p>
          {current && (
            <BarChart
              data={current.stats.charFreq.slice(0, 26).map((c) => ({ label: c.ch, value: c.p }))}
              color={current.colorVar}
              yLabel="share"
              yFmt={(v) => `${(v * 100).toFixed(1)}%`}
            />
          )}
        </div>
      </div>

      {sectionRows.length > 0 && (
        <div className="card">
          <h2>Voynich sections compared</h2>
          <p className="sub">
            Statistics per manuscript section (grouped by the illustration type on each page).
            Montemurro &amp; Zanette (2013) showed vocabulary clusters by section the way keywords
            cluster in topical technical manuals.
          </p>
          <table className="data">
            <thead>
              <tr>
                <th>Section</th>
                <th>Tokens</th>
                <th>Distinct</th>
                <th>TTR</th>
                <th>H1 (bits)</th>
                <th>H2 cond. (bits)</th>
              </tr>
            </thead>
            <tbody>
              {sectionRows.map((r) => (
                <tr key={r.name}>
                  <td>{r.name}</td>
                  <td>{r.tokens.toLocaleString()}</td>
                  <td>{r.types.toLocaleString()}</td>
                  <td>{r.ttr.toFixed(3)}</td>
                  <td>{r.h1.toFixed(2)}</td>
                  <td>{r.h2.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card">
        <h2>Analyze your own text</h2>
        <p className="sub">
          Paste any text (any language) and it joins the comparison charts as a fourth series.
          Everything runs in your browser — nothing is uploaded.
        </p>
        <textarea
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="Paste at least ~50 words of any text…"
        />
        <div className="row" style={{ marginTop: 10 }}>
          <button className="primary" onClick={analyzeCustom} disabled={customText.trim().length === 0}>
            Analyze
          </button>
          {error && <span className="error">{error}</span>}
        </div>
      </div>
    </>
  );
}
