import type { MushroomGameEntry } from "@/src/lib/mushroom-game";
import { speciesDrawingAssets, speciesIllustrationPath, speciesStockIllustrationAssets, speciesStockIllustrationPath } from "@/data/species-illustrations";

export type SpeciesIllustration = MushroomGameEntry["specimen"];

/**
 * Which drawn specimen (components/mushroom-game-illustrations.tsx) stands for
 * a species outside the game. Close relatives share a drawing; species with no
 * suitable drawing fall back to their reference photograph.
 */
const SPECIES_ILLUSTRATIONS: Partial<Record<string, SpeciesIllustration>> = {
  "boletus-edulis": "cep",
  "boletus-aereus": "cep",
  "boletus-pinophilus": "cep",
  "lactarius-deliciosus": "milkcap",
  "lactarius-sanguifluus": "milkcap",
  "cantharellus-cibarius": "chanterelle",
  "craterellus-lutescens": "yellowfoot",
  "amanita-caesarea": "royal-amanita",
  "amanita-muscaria": "fly-agaric",
  "amanita-phalloides": "death-cap",
  "macrolepiota-procera": "parasol",
  "coprinus-comatus": "inkcap",
  "morchella-esculenta": "morel",
  "pleurotus-ostreatus": "oyster",
  "russula-virescens": "russula",
  "marasmius-oreades": "fairy-ring",
  "rubroboletus-satanas": "devil-bolete",
};

export function speciesIllustration(speciesId: string): SpeciesIllustration | undefined {
  return SPECIES_ILLUSTRATIONS[speciesId];
}

/**
 * The drawing shown for a species: our main drawing (public/media/illustrations)
 * or, for a species without one, its stock illustration. Comes with its credit
 * when one is due.
 */
export function speciesDrawing(speciesId: string) {
  const src = speciesIllustrationPath(speciesId);
  if (src) return { src, credit: speciesDrawingAssets[speciesId]?.credit };
  return speciesStockIllustration(speciesId);
}

/** The stock illustration for a species (public/media/illustrations/stock), for social and print reuse. */
export function speciesStockIllustration(speciesId: string) {
  const src = speciesStockIllustrationPath(speciesId);
  return src ? { src, credit: speciesStockIllustrationAssets[speciesId]?.credit } : undefined;
}
