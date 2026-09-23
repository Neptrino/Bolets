import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  findGradients,
  findHardcodedColours,
  findOffGridSpacing,
  findUntokenisedRadii,
  findUntokenisedShadows,
} from "@/scripts/css-design-rules.mjs";

const minimumFontSize = 12;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:css|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe("shared styles", () => {
  it("keeps every declared font size at 12px or larger", () => {
    const files = ["app", "components"].flatMap((directory) =>
      sourceFiles(join(process.cwd(), directory)),
    );
    const violations = files.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const cssSizes = [
        ...source.matchAll(/\bfont(?:-size)?\s*:\s*(\d+(?:\.\d+)?)px/g),
      ];
      const reactSizes = [
        ...source.matchAll(/\bfontSize\s*:\s*([^,}\n]+)/g),
      ].flatMap((match) =>
        [...match[1].matchAll(/\d+(?:\.\d+)?/g)].map((size) => ({
          declaration: match[0],
          value: size[0],
        })),
      );
      return [
        ...cssSizes.map((match) => ({
          declaration: match[0],
          value: match[1],
        })),
        ...reactSizes,
      ]
        .filter(({ value }) => Number(value) < minimumFontSize)
        .map(({ declaration }) => `${file}: ${declaration}`);
    });

    expect(violations).toEqual([]);
  });

  it("keeps every colour in the palette tokens", () => {
    // Reference app/styles/tokens.css instead of hex, rgb() or hsl(); use
    // color-mix(in srgb, var(--x) N%, transparent) for translucency.
    expect(findHardcodedColours()).toEqual([]);
  });

  it("uses solid backgrounds outside the map legend", () => {
    // Put text on a solid, possibly translucent, band instead of a scrim.
    expect(findGradients()).toEqual([]);
  });

  it("uses the radius and shadow tokens", () => {
    // Use --radius-* for corners and --shadow-* for elevation.
    expect(findUntokenisedRadii()).toEqual([]);
    expect(findUntokenisedShadows()).toEqual([]);
  });

  it("keeps spacing on the 4px grid", () => {
    // Use multiples of 4px (0.25rem) for gap, padding and margin.
    expect(findOffGridSpacing()).toEqual([]);
  });

  it("keeps the species profile on shared palette tokens", () => {
    const css = readFileSync(
      join(process.cwd(), "app", "styles", "species-profile.css"),
      "utf8",
    );
    const tokenBlockEnd = css.indexOf("}") + 1;
    const profileStyles = css.slice(tokenBlockEnd);

    expect(css.slice(0, tokenBlockEnd)).toContain("--profile-line:");
    expect(profileStyles.match(/#[0-9a-f]{3,8}\b/gi) ?? []).toEqual([]);
  });
});
