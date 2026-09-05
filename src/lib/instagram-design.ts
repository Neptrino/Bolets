// Shared by server-rendered share images and Remotion. These are image pixels,
// not website type sizes. Keep the palette and font family in one place.
export const instagramPalette = {
  cream: "#f4ecd7", creamSoft: "#fff9ec", forest: "#14271c",
  forestDeep: "#09170f", moss: "#3d513f", orange: "#f28a32",
  orangeLight: "#ffb16d", clay: "#7a452f", ink: "#343431",
  muted: "#63645d", red: "#8b2f26", rose: "#ffb4a6",
} as const;

// Preserve the typography of the existing ad and cinematic Reels. Satori uses
// the bundled Nunito instances; Remotion retains its existing Avenir-first stack.
export const INSTAGRAM_MOTION_FONT_FAMILY = '"Avenir Next", "Nunito Sans", ui-sans-serif, system-ui, sans-serif';
export const INSTAGRAM_FONT_NAME = "Nunito Sans";
export const INSTAGRAM_FONT_FAMILY = '"Nunito Sans", "Avenir Next", sans-serif';
export const instagramFormats = {
  feed: { width: 1080, height: 1350, left: 58, right: 58, top: 58, bottom: 58 },
  story: { width: 1080, height: 1920, left: 72, right: 110, top: 250, bottom: 350 },
} as const;
export type InstagramFormat = keyof typeof instagramFormats;

export const instagramType = {
  cover: 116, coverLong: 92, heading: 76, body: 34,
  label: 26, small: 23, credit: 18,
} as const;

export function instagramTitleSize(title: string) {
  return title.length > 34 ? instagramType.coverLong : instagramType.cover;
}
