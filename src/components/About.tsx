export function About() {
  return (
    <>
      <div className="card">
        <h2>What is QuireLab?</h2>
        <p className="note">
          QuireLab is an open workbench for computational analysis of historical manuscripts. It
          combines a viewer for the IIIF image APIs that hundreds of libraries publish with a
          statistical laboratory for studying the texts themselves — entropy, Zipf compliance,
          vocabulary structure — entirely in your browser. No account, no server, no data leaves
          your machine.
        </p>
        <p className="note">
          The flagship dataset is the <strong>Voynich Manuscript</strong> (Beinecke MS 408, Yale
          University), a ~15th-century codex written in an undeciphered script. QuireLab makes no
          claim to decipher it. What it does is make the manuscript&apos;s well-established
          statistical fingerprints — the ones that rule out both random gibberish and simple
          substitution ciphers — reproducible and explorable by anyone.
        </p>
      </div>

      <div className="card">
        <h2>Methods</h2>
        <h3>Tokenization</h3>
        <p className="note">
          Voynich text uses the Zandbergen–Landini (ZL) transliteration in basic EVA (European
          Voynich Alphabet). Inline editorial markup is stripped, alternate readings resolve to the
          first alternative, and only unambiguous lowercase-EVA words enter the statistics. Natural
          language baselines are lowercased and split on non-letter characters.
        </p>
        <h3>Entropy</h3>
        <p className="note">
          Character entropies are computed over the space-joined word stream (the word separator
          participates as a symbol, following Bennett 1976). H1 is first-order Shannon entropy; the
          conditional (block) entropies are H2 = H(Xₙ | Xₙ₋₁) = H(bigrams) − H(unigrams) and H3 =
          H(Xₙ | Xₙ₋₂Xₙ₋₁) = H(trigrams) − H(bigrams), all in bits per character. Note that entropy
          values depend on the transcription alphabet — EVA itself is one hypothesis about what the
          &quot;characters&quot; are.
        </p>
        <h3>Zipf fit</h3>
        <p className="note">
          α is the negative least-squares slope of log₁₀(frequency) against log₁₀(rank), fitted
          over words occurring at least 3 times.
        </p>
        <h3>Cipher Lab</h3>
        <p className="note">
          Language models (letter frequencies and quadgram log-likelihoods) are built in the
          browser from the bundled corpora, with accents folded to base letters. The index of
          coincidence is Friedman&apos;s unnormalized IC. Caesar shifts are ranked by χ² against
          reference frequencies; substitution keys are recovered by hill climbing with random
          restarts, scored by quadgram log-likelihood. These are the standard classical attacks —
          they demonstrably crack monoalphabetic ciphers, and demonstrably do not apply to
          Voynichese, which violates their statistical premises.
        </p>
      </div>

      <div className="card">
        <h2>Data &amp; credits</h2>
        <p className="note">
          <strong>Voynich transliteration:</strong> ZL 3b (May 2025) by René Zandbergen and Gabriel
          Landini, from{" "}
          <a href="http://www.voynich.nu" target="_blank" rel="noreferrer">
            voynich.nu
          </a>
          , building on the EVMT project. <br />
          <strong>Manuscript images:</strong> Beinecke Rare Book &amp; Manuscript Library, Yale
          University, via their public{" "}
          <a href="https://collections.library.yale.edu" target="_blank" rel="noreferrer">
            IIIF digital collections
          </a>
          . <br />
          <strong>Baseline texts:</strong> <em>Alice&apos;s Adventures in Wonderland</em>{" "}
          (Carroll), <em>De Bello Gallico I–IV</em> (Caesar), <em>Faust I</em> (Goethe), and{" "}
          <em>La Divina Commedia</em> (Dante), all public domain via{" "}
          <a href="https://www.gutenberg.org" target="_blank" rel="noreferrer">
            Project Gutenberg
          </a>
          . <br />
          <strong>Viewer presets</strong> stream from the public IIIF services of Yale (Beinecke),
          Heidelberg University Library (Codex Manesse), the Abbey Library of St. Gall via
          e-codices (Abrogans), and Cambridge University Library (Book of Deer). <br />
          <strong>Key literature:</strong> Montemurro &amp; Zanette,{" "}
          <a
            href="https://doi.org/10.1371/journal.pone.0066344"
            target="_blank"
            rel="noreferrer"
          >
            <em>Keywords and Co-Occurrence Patterns in the Voynich Manuscript</em>
          </a>
          , PLoS ONE 2013; Bennett,{" "}
          <em>Scientific and Engineering Problem-Solving with the Computer</em>, 1976.
        </p>
        <p className="note">
          <strong>Going deeper:</strong> René Zandbergen&apos;s{" "}
          <a href="http://www.voynich.nu" target="_blank" rel="noreferrer">
            voynich.nu
          </a>{" "}
          is the definitive reference site (transliterations, analysis, bibliography); the{" "}
          <a href="https://collections.library.yale.edu/catalog/2002046" target="_blank" rel="noreferrer">
            Beinecke catalog record
          </a>{" "}
          hosts the full manuscript;{" "}
          <a href="https://www.jasondavies.com/voynich/" target="_blank" rel="noreferrer">
            Jason Davies&apos; Voynich Voyager
          </a>{" "}
          pairs the transliteration with page images. QuireLab is open source —{" "}
          <a href="https://github.com/derekwden-droid/quirelab" target="_blank" rel="noreferrer">
            github.com/derekwden-droid/quirelab
          </a>
          .
        </p>
      </div>
    </>
  );
}
