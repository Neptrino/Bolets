import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { INSTAGRAM_FONT_NAME } from "@/src/lib/instagram-design";

// Satori (next/og) only uses fonts handed to ImageResponse; without them every
// weight collapses into its single bundled fallback face. The static Nunito
// Sans instances live in public/fonts so the standalone server ships them.
export const INSTAGRAM_CARD_FONT_FAMILY = INSTAGRAM_FONT_NAME;

const FONT_DIRECTORY = join("public", "fonts", "nunito-sans");
const FONT_FILES = [
  { file: "NunitoSans-Regular.ttf", weight: 400, style: "normal" },
  { file: "NunitoSans-Italic.ttf", weight: 400, style: "italic" },
  { file: "NunitoSans-Bold.ttf", weight: 700, style: "normal" },
  { file: "NunitoSans-ExtraBold.ttf", weight: 800, style: "normal" },
  { file: "NunitoSans-Black.ttf", weight: 900, style: "normal" },
] as const;

export interface InstagramCardFont {
  name: string;
  data: Buffer;
  weight: 400 | 700 | 800 | 900;
  style: "normal" | "italic";
}

let cache: Promise<InstagramCardFont[]> | null = null;

export function instagramCardFonts(rootDirectory = process.cwd()) {
  cache ??= Promise.all(FONT_FILES.map(async (font) => ({
    name: INSTAGRAM_CARD_FONT_FAMILY,
    data: await readFile(join(rootDirectory, FONT_DIRECTORY, font.file)),
    weight: font.weight,
    style: font.style,
  }))).catch((error) => {
    cache = null;
    throw error;
  });
  return cache;
}

export const INSTAGRAM_CARD_FONT_PATHS = FONT_FILES.map((font) => join(FONT_DIRECTORY, font.file));
