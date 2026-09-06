// Renders the five Instagram species slides for one or more catalogue species
// without the admin page or Buffer, exactly as the image route produces them:
//
//   npx tsx scripts/preview-instagram-species-card.tsx boletus-edulis amanita-phalloides
//
// Output: artifacts/instagram/species-cards/<speciesId>/slide-N.png plus a
// strip.jpg contact sheet of the five slides.
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

import { getCatalogueSpecies } from "@/data/catalogue";
import { renderInstagramSpeciesSlide } from "@/src/lib/instagram-species-card-render";
import { INSTAGRAM_SPECIES_SLIDE_COUNT } from "@/src/lib/instagram-species-series";
import { toSpeciesFieldCardProfile } from "@/src/lib/species-field-card";

async function main() {
  const speciesIds = process.argv.slice(2);
  if (speciesIds.length === 0) {
    console.error("Usage: npx tsx scripts/preview-instagram-species-card.tsx <speciesId> [speciesId…]");
    process.exit(1);
  }

  const outputRoot = resolve(process.cwd(), "artifacts", "instagram", "species-cards");
  const thumbnailWidth = 432;
  const thumbnailGap = 16;

  for (const speciesId of speciesIds) {
    const species = getCatalogueSpecies(speciesId);
    if (!species) {
      console.error(`Unknown catalogue species: ${speciesId}`);
      process.exitCode = 1;
      continue;
    }
    const profile = toSpeciesFieldCardProfile(species);
    const directory = resolve(outputRoot, speciesId);
    await mkdir(directory, { recursive: true });

    const slides: Buffer[] = [];
    for (let slide = 1; slide <= INSTAGRAM_SPECIES_SLIDE_COUNT; slide += 1) {
      const response = await renderInstagramSpeciesSlide({ profile, slide });
      const png = Buffer.from(await response.arrayBuffer());
      await writeFile(resolve(directory, `slide-${slide}.png`), png);
      slides.push(png);
    }

    const thumbnails = await Promise.all(slides.map((png) => sharp(png).resize({ width: thumbnailWidth }).toBuffer()));
    const thumbnailHeight = Math.round(thumbnailWidth * 1350 / 1080);
    await sharp({
      create: {
        width: thumbnailWidth * slides.length + thumbnailGap * (slides.length - 1),
        height: thumbnailHeight,
        channels: 3,
        background: "#ffffff",
      },
    })
      .composite(thumbnails.map((input, index) => ({ input, left: index * (thumbnailWidth + thumbnailGap), top: 0 })))
      .jpeg({ quality: 88 })
      .toFile(resolve(directory, "strip.jpg"));
    console.log(`${speciesId}: ${slides.length} slides → ${directory}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
