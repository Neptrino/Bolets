import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  INSTAGRAM_CARD_FONT_FAMILY,
  INSTAGRAM_CARD_FONT_PATHS,
  instagramCardFonts,
} from "@/src/lib/instagram-card-fonts";

describe("Instagram card fonts", () => {
  it("ships TrueType instances of Nunito Sans for the server-rendered cards", async () => {
    expect(INSTAGRAM_CARD_FONT_PATHS).toHaveLength(5);
    for (const path of INSTAGRAM_CARD_FONT_PATHS) {
      // TrueType outlines start with the 0x00010000 sfnt version.
      expect(readFileSync(path).readUInt32BE(0)).toBe(0x00010000);
    }
    const fonts = await instagramCardFonts();
    expect(fonts.map((font) => `${font.weight}-${font.style}`)).toEqual([
      "400-normal", "400-italic", "700-normal", "800-normal", "900-normal",
    ]);
    expect(fonts.every((font) => font.name === INSTAGRAM_CARD_FONT_FAMILY && font.data.length > 50_000)).toBe(true);
    expect(readFileSync("src/lib/instagram-design.ts", "utf8")).toContain(`"${INSTAGRAM_CARD_FONT_FAMILY}"`);
  });
});
