import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { INSTAGRAM_FONT_NAME, instagramFormats, instagramPalette, instagramType } from "./instagram-design";

// Statically scoped loaders let standalone builds trace only the required assets.
// No client-supplied path is ever passed to the filesystem.
const assets = new Map<string, readonly [string, () => Promise<Buffer>]>([
  ["index.html", ["text/html; charset=utf-8", () => readFile(join(process.cwd(), "tools/instagram-photo-studio/index.html"))]],
  ["studio.css", ["text/css; charset=utf-8", () => readFile(join(process.cwd(), "tools/instagram-photo-studio/studio.css"))]],
  ...["studio.mjs", "drawing.mjs", "geometry.mjs", "settings.mjs"].map((name) =>
    [name, ["text/javascript; charset=utf-8", () => readFile(join(process.cwd(), "tools/instagram-photo-studio", name))]] as const),
  ["tokens.css", ["text/css; charset=utf-8", () => readFile(join(process.cwd(), "app/styles/tokens.css"))]],
  ["brand.svg", ["image/svg+xml", () => readFile(join(process.cwd(), "app/icon.svg"))]],
  ...["Regular", "Bold", "ExtraBold", "Black"].map((weight) =>
    [`fonts/${weight}.ttf`, ["font/ttf", () => readFile(join(process.cwd(), "public/fonts/nunito-sans", `NunitoSans-${weight}.ttf`))]] as const),
]);

export const photoStudioHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "SAMEORIGIN",
  "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' blob: data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'",
};

export async function readPhotoStudioAsset(name: string): Promise<Response> {
  if (name === "design.json") {
    return Response.json({
      palette: instagramPalette, formats: instagramFormats, type: instagramType, font: INSTAGRAM_FONT_NAME,
    }, { headers: photoStudioHeaders });
  }
  const asset = assets.get(name);
  if (!asset) return new Response("Not found", { status: 404, headers: photoStudioHeaders });
  const bytes = await asset[1]();
  const body = name === "index.html"
    ? bytes.toString("utf8").replace("<body>", '<body data-embedded="true">')
    : new Uint8Array(bytes);
  return new Response(body, { headers: { ...photoStudioHeaders, "Content-Type": asset[0] } });
}
