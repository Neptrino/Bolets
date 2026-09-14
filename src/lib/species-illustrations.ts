import type { MushroomGameEntry } from "@/src/lib/mushroom-game";
import { speciesIllustrationAssets, speciesIllustrationPath } from "@/data/species-illustrations";

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

/** The editorial drawing for a species (public/media/illustrations), with its credit when one is due. */
export function speciesDrawing(speciesId: string) {
  const src = speciesIllustrationPath(speciesId);
  return src ? { src, credit: speciesIllustrationAssets[speciesId]?.credit } : undefined;
}
