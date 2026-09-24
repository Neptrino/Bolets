/**
 * Illustrative 3D models of the most searched species, generated in Blender
 * from each species' versioned morphology and reference photographs (used as
 * visual reference only). They are drawings in three dimensions, not scans of
 * real specimens, and never identification evidence.
 */
export interface Species3dModel {
  /** GLB with Draco-compressed geometry and WebP textures. */
  src: string;
  /** Still render shown while the viewer loads. */
  poster: string;
  /** Tight square crop of the poster for the link from the species profile. */
  thumb: string;
}

function modelFiles(speciesId: string): Species3dModel {
  const base = `/models/species/${speciesId}`;
  return { src: `${base}.glb`, poster: `${base}.webp`, thumb: `${base}-thumb.webp` };
}

const models: Record<string, Species3dModel> = Object.fromEntries(
  [
    "boletus-edulis",
    "lactarius-sanguifluus",
    "amanita-caesarea",
    "lactarius-deliciosus",
    "cantharellus-cibarius",
    "macrolepiota-procera",
    "craterellus-lutescens",
    "craterellus-cornucopioides",
    "tricholoma-terreum",
    "marasmius-oreades",
    "calocybe-gambosa",
    "morchella-esculenta",
  ].map((speciesId) => [speciesId, modelFiles(speciesId)]),
);

export const species3dModelIds = Object.keys(models);

export function getSpecies3dModel(speciesId: string): Species3dModel | undefined {
  return models[speciesId];
}
