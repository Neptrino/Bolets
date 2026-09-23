import type { CatalogueSpecies } from "@/src/lib/types";

/* Catalan definite articles for species common names, so section headings can
   carry the species ("Com reconèixer el cep", "Es pot menjar l’apagallums?").
   The rule works on the first word: vowel-initial names elide, names ending in
   -a are feminine, everything else is masculine. Exceptions are listed. */
const MASCULINE_ENDING_IN_A = new Set(["tricoloma"]);
const VOWEL_START = /^(?:h?[aeiouàáèéíïòóúü])/;

export function speciesArticle(name: string) {
  const lower = `${name.charAt(0).toLocaleLowerCase("ca-ES")}${name.slice(1)}`;
  const first = lower.split(/[\s-]/)[0] ?? lower;
  const elided = VOWEL_START.test(first);
  const feminine = !elided && first.endsWith("a") && !MASCULINE_ENDING_IN_A.has(first);
  return {
    withArticle: elided ? `l’${lower}` : `${feminine ? "la" : "el"} ${lower}`,
    ofSpecies: elided ? `de l’${lower}` : feminine ? `de la ${lower}` : `del ${lower}`,
  };
}

function sentenceCase(value: string) {
  return `${value.charAt(0).toLocaleUpperCase("ca-ES")}${value.slice(1)}`;
}

export function speciesHeadings(name: string) {
  const { withArticle, ofSpecies } = speciesArticle(name);
  return {
    identify: `Com reconèixer ${withArticle}`,
    lookalikes: `Amb què es pot confondre ${withArticle}`,
    faq: `Preguntes sobre ${withArticle}`,
    names: `Noms ${ofSpecies} en català i castellà`,
    cuisine: sentenceCase(`${withArticle} a la cuina`),
    edible: `Es pot menjar ${withArticle}?`,
    ecology: `On i quan creix ${withArticle}`,
    map: `On podria créixer ${withArticle} a Catalunya`,
    fieldCard: `Targeta de camp ${ofSpecies}`,
  };
}


/** One ordered list owns both the contents menu and visible section numbers. */
export function speciesProfileSections(species: CatalogueSpecies) {
  return [
    { id: "identificació", label: "Com reconèixer-lo" },
    { id: "confusions", label: "Possibles confusions" },
    { id: "noms", label: "Noms" },
    { id: "cuina", label: species.culinaryProfile.kind === "culinary" ? "A la cuina" : "Es pot menjar?" },
    { id: "ecologia", label: "On i quan creix" },
    ...("scope" in species ? [] : [{ id: "distribució", label: "On podria créixer" }]),
    { id: "preguntes", label: "Preguntes freqüents" },
    { id: "targeta-de-camp", label: "Targeta de camp" },
    { id: "fonts", label: "Fonts i autoria" },
  ].map((section, index) => ({ ...section, number: String(index + 1).padStart(2, "0") }));
}
