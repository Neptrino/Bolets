import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import sharp from "sharp";
import { getCatalogueSpecies } from "@/data/catalogue";
import { toSpeciesFieldCardProfile } from "@/src/lib/species-field-card";

export interface InstagramReferencePhoto {
  dataUrl: string;
  credit: string;
}

export async function instagramPublicImage(imagePath: string, rootDirectory = process.cwd()) {
  const publicDirectory = resolve(rootDirectory, "public");
  const path = resolve(publicDirectory, imagePath.replace(/^\/+/, ""));
  if (!path.startsWith(`${publicDirectory}${sep}`)) throw new Error("Instagram images must be local public assets");
  const image = await sharp(await readFile(path))
    .resize({ width: 1400, withoutEnlargement: true })
    .jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  return `data:image/jpeg;base64,${image.toString("base64")}`;
}

export async function instagramReferencePhoto(speciesId: string, rootDirectory = process.cwd()): Promise<InstagramReferencePhoto> {
  const species = getCatalogueSpecies(speciesId);
  if (!species) throw new Error(`Unknown catalogue species: ${speciesId}`);
  const profile = toSpeciesFieldCardProfile(species);
  return {
    dataUrl: await instagramPublicImage(profile.imagePath, rootDirectory),
    credit: [profile.imageAttribution, profile.imageLicense].filter(Boolean).join(" · "),
  };
}
