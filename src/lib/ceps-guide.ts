import type { RegionId } from "@/src/lib/types";

export const cepSpeciesIds = [
  "boletus-edulis",
  "boletus-pinophilus",
  "boletus-aereus",
  "boletus-reticulatus",
] as const;

export type CepSpeciesId = (typeof cepSpeciesIds)[number];

type PredictionRegionId = Exclude<RegionId, "altres">;

export interface CepTerritoryReading {
  region: PredictionRegionId;
  speciesId: CepSpeciesId;
  description: string;
}

// Each broad prediction region is paired with one canonical cep profile that
// explicitly includes it. The copy describes that profile, not abundance or a
// confirmed local occurrence.
export const cepTerritoryReadings = [
  {
    region: "pirineus",
    speciesId: "boletus-pinophilus",
    description:
      "El cep rogenc aporta la lectura de muntanya: pinedes de pi roig, pi negre o pinassa, sòl fresc i orientacions protegides del vent.",
  },
  {
    region: "prepirineus",
    speciesId: "boletus-edulis",
    description:
      "El cep comú és compatible amb fagedes, rouredes i pinedes de muntanya quan el sòl es manté humit però ben drenat.",
  },
  {
    region: "emporda",
    speciesId: "boletus-aereus",
    description:
      "El cep negre representa els boscos mediterranis de Quercus: alzinars, suredes i rouredes càlides després de pluja efectiva.",
  },
  {
    region: "catalunya-central",
    speciesId: "boletus-reticulatus",
    description:
      "El cep d’estiu aporta una finestra primerenca en rouredes, fagedes, castanyedes i altres boscos de planifolis.",
  },
  {
    region: "muntanyes-interiors",
    speciesId: "boletus-pinophilus",
    description:
      "El cep rogenc hi aporta un perfil de pineda montana, sòl àcid o descarbonatat i humitat alta sense entollament.",
  },
  {
    region: "montseny",
    speciesId: "boletus-edulis",
    description:
      "El cep comú encaixa amb boscos frescos de planifolis o coníferes, sobretot en marges protegits i vessants humits.",
  },
  {
    region: "serralades-costeres",
    speciesId: "boletus-aereus",
    description:
      "El cep negre aporta un perfil termòfil d’alzinar, sureda o roureda mediterrània amb sòl profund i drenat.",
  },
  {
    region: "serralades-prelitorals",
    speciesId: "boletus-reticulatus",
    description:
      "El cep d’estiu és compatible amb boscos temperats de planifolis i respon a la pluja quan el sòl conserva escalfor i humitat.",
  },
  {
    region: "ports",
    speciesId: "boletus-aereus",
    description:
      "El cep negre aporta la lectura càlida: Quercus, sòl ben drenat i pluja efectiva sense un retorn immediat de la sequera.",
  },
] as const satisfies readonly CepTerritoryReading[];
