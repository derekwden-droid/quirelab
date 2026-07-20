import { useEffect, useState } from "react";
import { fetchManifest } from "../lib/iiif";
import type { IiifManifest } from "../lib/iiif";

const PRESETS = [
  {
    name: "Voynich Manuscript — Beinecke MS 408 (Yale)",
    url: "https://collections.library.yale.edu/manifests/2002046",
  },
  {
    name: "Codex Manesse — Cod. Pal. germ. 848 (Heidelberg)",
    url: "https://digi.ub.uni-heidelberg.de/diglit/iiif/cpg848/manifest.json",
  },
  {
    name: "Abrogans, oldest German book — Cod. Sang. 911 (St. Gallen)",
    url: "https://e-codices.unifr.ch/metadata/iiif/csg-0911/manifest.json",
  },
  {
    name: "Book of Deer, 10th-c. Gospel — MS Ii.6.32 (Cambridge)",
    url: "https://cudl.lib.cam.ac.uk/iiif/MS-II-00006-00032",
  },
];

export function Viewer() {
  const [url, setUrl] = useState(PRESETS[0].url);
  const [manifest, setManifest] = useState<IiifManifest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [shown, setShown] = useState(60);

  async function load(target: string) {
    setLoading(true);
    setError("");
    setManifest(null);
    setSelected(null);
    setShown(60);
    try {
      setManifest(await fetchManifest(target));
    } catch (e) {
      setError(
        `Could not load manifest: ${String(e)}. The server must allow cross-origin requests (most IIIF servers do).`,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(PRESETS[0].url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (selected === null || !manifest) return;
      if (e.key === "Escape") setSelected(null);
      if (e.key === "ArrowRight") setSelected((s) => Math.min((s ?? 0) + 1, manifest.pages.length - 1));
      if (e.key === "ArrowLeft") setSelected((s) => Math.max((s ?? 0) - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, manifest]);

  return (
    <>
      <div className="card">
        <h2>IIIF Manuscript Viewer</h2>
        <p className="sub">
          Paste any IIIF Presentation manifest URL (v2 or v3) — Yale, Gallica, the British Library,
          and hundreds of other institutions publish them for free.
        </p>
        <div className="row">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…/manifest.json"
            onKeyDown={(e) => e.key === "Enter" && load(url)}
          />
          <button className="primary" onClick={() => load(url)} disabled={loading}>
            {loading ? "Loading…" : "Load"}
          </button>
          <select
            value=""
            onChange={(e) => {
              if (!e.target.value) return;
              setUrl(e.target.value);
              load(e.target.value);
            }}
          >
            <option value="">Presets…</option>
            {PRESETS.map((p) => (
              <option key={p.url} value={p.url}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="error">{error}</p>}
        {manifest && (
          <p className="note">
            <strong>{manifest.label}</strong> — {manifest.pages.length} images
            {manifest.attribution ? ` · ${manifest.attribution}` : ""}
          </p>
        )}
      </div>

      {manifest && (
        <div className="card">
          <div className="thumb-grid">
            {manifest.pages.slice(0, shown).map((p, i) => (
              <button className="thumb" key={i} onClick={() => setSelected(i)} title={p.label}>
                <img src={p.thumbUrl} alt={p.label} loading={i < 12 ? "eager" : "lazy"} />
                <div className="cap">{p.label}</div>
              </button>
            ))}
          </div>
          {shown < manifest.pages.length && (
            <div className="row" style={{ marginTop: 14, justifyContent: "center" }}>
              <button className="primary" onClick={() => setShown((s) => s + 60)}>
                Show more ({manifest.pages.length - shown} remaining)
              </button>
            </div>
          )}
        </div>
      )}

      {manifest && selected !== null && (
        <div className="lightbox" onClick={() => setSelected(null)}>
          <img
            src={manifest.pages[selected].viewUrl}
            alt={manifest.pages[selected].label}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="bar" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelected(Math.max(selected - 1, 0))} disabled={selected === 0}>
              ← Prev
            </button>
            <span>
              {manifest.pages[selected].label} ({selected + 1}/{manifest.pages.length})
            </span>
            <button
              onClick={() => setSelected(Math.min(selected + 1, manifest.pages.length - 1))}
              disabled={selected === manifest.pages.length - 1}
            >
              Next →
            </button>
            <a href={manifest.pages[selected].fullUrl} target="_blank" rel="noreferrer">
              Full resolution ↗
            </a>
            <button onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}
