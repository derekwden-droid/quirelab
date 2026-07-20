// Parser for IVTFF (Intermediate Voynich Transliteration File Format) files,
// specifically the Zandbergen-Landini "ZL" transliteration in basic EVA.

export interface VoynichCorpus {
  words: string[];
  pages: number;
  /** Section name -> EVA word list, keyed by the $I illustration-type variable. */
  sections: Map<string, string[]>;
}

const SECTION_NAMES: Record<string, string> = {
  T: "Text-only",
  H: "Herbal",
  A: "Astronomical",
  Z: "Zodiac",
  B: "Biological",
  C: "Cosmological",
  P: "Pharmaceutical",
  S: "Recipes (Stars)",
};

/**
 * Clean one locus line of transliterated text down to plain EVA words.
 * - <!...> inline comments and all other <...> markers are removed
 * - [a:b] alternate readings resolve to the first alternative
 * - "@nnn;" extended-glyph codes make a word untrustworthy -> marked invalid
 * - "." and "," (certain and uncertain word spaces) both split words
 * - only pure lowercase-EVA words are kept; anything with ?, uppercase
 *   (extended EVA) or residual markup is dropped from statistics
 */
function cleanLocusText(raw: string): string[] {
  const cleaned = raw
    .replace(/<![^>]*>/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\[([^:\]]*):[^\]]*\]/g, "$1")
    .replace(/@\d+;/g, "")
    .replace(/[.,]/g, " ");
  return cleaned
    .split(/\s+/)
    .filter((w) => w.length > 0 && /^[a-z]+$/.test(w));
}

export function parseIvtff(text: string): VoynichCorpus {
  const words: string[] = [];
  const sections = new Map<string, string[]>();
  let pages = 0;
  let currentSection = "Unknown";

  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("#") || line.trim().length === 0) continue;

    // Page header: "<f1r>      <! $Q=A ... $I=T ...>"
    const pageHeader = line.match(/^<([^>.,]+)>\s*<!([^>]*)>/);
    if (pageHeader) {
      pages++;
      const iVar = pageHeader[2].match(/\$I=(\w)/);
      currentSection = iVar ? (SECTION_NAMES[iVar[1]] ?? "Unknown") : "Unknown";
      continue;
    }

    // Locus line: "<f1r.1,@P0>       text..."
    const locus = line.match(/^<[^>]+\.[^>]+>\s*(.*)$/);
    if (!locus) continue;
    const lineWords = cleanLocusText(locus[1]);
    words.push(...lineWords);
    if (!sections.has(currentSection)) sections.set(currentSection, []);
    sections.get(currentSection)!.push(...lineWords);
  }

  return { words, pages, sections };
}
