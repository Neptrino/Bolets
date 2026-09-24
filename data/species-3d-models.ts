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

const models: Record<string, Species3dModel> = {
  "boletus-edulis": { src: "/models/species/boletus-edulis.glb", poster: "/models/species/boletus-edulis.webp", thumb: "/models/species/boletus-edulis-thumb.webp" },
  "lactarius-sanguifluus": { src: "/models/species/lactarius-sanguifluus.glb", poster: "/models/species/lactarius-sanguifluus.webp", thumb: "/models/species/lactarius-sanguifluus-thumb.webp" },
  "amanita-caesarea": { src: "/models/species/amanita-caesarea.glb", poster: "/models/species/amanita-caesarea.webp", thumb: "/models/species/amanita-caesarea-thumb.webp" },
};

export const species3dModelIds = Object.keys(models);

export function getSpecies3dModel(speciesId: string): Species3dModel | undefined {
  return models[speciesId];
}
