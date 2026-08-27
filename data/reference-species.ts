import type { ReferenceSpeciesProfile } from "@/src/lib/types";
import { falseChanterelleSources } from "@/data/field-guide-sources";
import { officialSafetySource } from "@/data/editorial";
import { speciesMedia } from "@/data/species-media";

// Describe only what the cited sources establish. These records never enter the
// weather model, habitat cache, map selector or quantified monthly calendar.
export const referenceSpeciesProfiles: ReferenceSpeciesProfile[] = [{
  speciesId: "hygrophoropsis-aurantiaca",
  scope: "reference-only",
  identity: {
    commonName: "Fals rossinyol",
    alternateNames: ["pixacà taronja"],
    scientificName: "Hygrophoropsis aurantiaca",
    family: "Hygrophoropsidaceae",
    genus: "Hygrophoropsis",
    edibility: "not_recommended",
    identificationDifficulty: "Cal contrastar diversos trets",
    typicalSize: "Barret de 4–8 cm",
    shortDescription: "Bolet taronja de làmines fines i bifurcades, habitual a la tardor. No es recomana consumir-lo; es pot confondre amb el rossinyol i el bolet d’olivera.",
  },
  morphology: {
    cap: "De 4–8 cm, inicialment convex i després enfonsat al centre, fins a prendre forma d’embut. El marge és cargolat cap endins i la superfície té un tacte finament vellutat.",
    hymenium: "Làmines taronja, primes i molt juntes, amb bifurcacions. Baixen pel peu: aquesta disposició s’anomena decurrent.",
    stem: "Prim, cilíndric o una mica més estret a baix, de color taronja; la base pot enfosquir-se. Aranzadi en descriu una llargada de 2–8 cm.",
    flesh: "Groga ataronjada i poc consistent.",
    colour: "Del groc ataronjat al taronja rogenc.",
    smell: "No es fa servir l’olor com a tret de confirmació en aquesta fitxa.",
    texture: "La carn és prima; el barret pot tenir una superfície finament vellutada.",
    typicalAppearance: "Petit bolet ataronjat amb el centre del barret deprimit, peu prim i làmines que baixen pel peu.",
    keyFeatures: ["Làmines fines i bifurcades", "Làmines decurrents", "Tons taronja", "Peu prim"],
    variation: "El barret es va obrint i enfonsant amb la maduració. El color o la forma, per si sols, no confirmen l’espècie.",
  },
  similarSpecies: [
    {
      scientificName: "Cantharellus cibarius", commonName: "Rossinyol",
      mainDifferences: "Té plecs a la cara inferior, no les làmines fines i atapeïdes del fals rossinyol. Cal observar el conjunt de l’exemplar, no només el color.",
      edibility: "excellent_edible", toxicity: "La comestibilitat del rossinyol no es pot atribuir a un exemplar que només s’hi assembli.", warning: true,
    },
    {
      scientificName: "Omphalotus olearius", commonName: "Bolet d’olivera",
      mainDifferences: "També és taronja i té làmines; la ICHN en destaca el peu excèntric i el creixement sobre fusta. És una espècie diferent i tòxica.",
      edibility: "toxic", toxicity: "No consumir: és tòxic.", warning: true,
    },
  ],
  ecology: {
    habitats: ["Pinedes i rouredes", "Boscos de coníferes"],
    season: "Tardor",
    description: "La ICHN el documenta a la tardor en pinedes i rouredes. Aranzadi també en situa l’aparició tardorenca en boscos de coníferes.",
    limitations: "El bosc i l’època ajuden a descriure la troballa, però no confirmen l’espècie. No disposem de dades suficients per oferir-ne un mapa d’hàbitat o unes condicions actuals fiables.",
  },
  safetyNotice: "No consumiu cap exemplar dubtós. Aquesta fitxa és educativa i les fotografies no substitueixen la identificació per una persona experta.",
  culinaryProfile: {
    kind: "safety", rating: 0, ratingLabel: "No recomanat",
    ratingRationale: "La ICHN el considera no comestible; Aranzadi el classifica com a sospitós i sense valor culinari.",
    summary: "No el considereu un bolet per al consum. La diferència entre les etiquetes de les fonts no significa que sigui segur menjar-ne.",
    cautions: ["No el tasteu per intentar identificar-lo.", "Una semblança amb un rossinyol no és una garantia de comestibilitat."],
    sources: [...falseChanterelleSources, officialSafetySource],
  },
  references: [...falseChanterelleSources, officialSafetySource],
  media: speciesMedia["hygrophoropsis-aurantiaca"] ?? [],
  confidence: "limited",
}];

export function getReferenceSpecies(id: string) {
  return referenceSpeciesProfiles.find(species => species.speciesId === id);
}

export function getReferenceSpeciesByScientificName(name: string) {
  const normalized = name.trim().toLocaleLowerCase("la");
  return referenceSpeciesProfiles.find(species => species.identity.scientificName.toLocaleLowerCase("la") === normalized);
}
