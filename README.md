# QuireLab

**Computational analysis of historical manuscripts, in the browser.**

A *quire* is the bundle of folded parchment leaves from which every medieval codex
was physically built — the unit manuscripts are made of.

QuireLab pairs a viewer for the [IIIF](https://iiif.io) image APIs that hundreds of
libraries publish with a statistical laboratory for the texts themselves. The flagship
dataset is the Voynich Manuscript (Beinecke MS 408, Yale): QuireLab reproduces its
well-established statistical fingerprints — conditional character entropy, Zipf
compliance, word-length structure, per-section vocabulary — against known-language
baselines, entirely client-side. No server, no accounts, nothing uploaded.

It makes **no decipherment claims**. It makes the numbers behind the debate
reproducible and explorable.

## Features

- **Text Lab** — H1/H2 conditional entropy (Bennett-style, space-joined stream),
  Zipf rank–frequency with fitted α, word-length distributions, top words, character
  frequencies, per-section Voynich statistics, and paste-your-own-text comparison.
- **Manuscript Viewer** — load any IIIF Presentation v2/v3 manifest (Yale, Gallica,
  British Library, …), browse thumbnails, lightbox with keyboard navigation and
  full-resolution links.
- **About & Methods** — tokenization and cleaning rules, entropy definitions, credits.

## Run locally

```bash
npm install
npm run dev
```

## Data & credits

- Voynich transliteration: **ZL 3b** (Zandbergen & Landini, May 2025) from
  [voynich.nu](http://www.voynich.nu), building on the EVMT project.
- Images: Beinecke Rare Book & Manuscript Library, Yale University, via public IIIF.
- Baselines: *Alice's Adventures in Wonderland* and *De Bello Gallico I–IV*
  (public domain, Project Gutenberg).
- Key literature: Montemurro & Zanette, PLoS ONE 2013; Bennett 1976.
