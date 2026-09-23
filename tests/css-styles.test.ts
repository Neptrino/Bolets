import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BASELINE_PATH, countHardcodedColours } from "@/scripts/hardcoded-colours.mjs";

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

  it("never adds hardcoded colours outside the design tokens", () => {
    const baseline: Record<string, number> = JSON.parse(
      readFileSync(join(process.cwd(), BASELINE_PATH), "utf8"),
    );
    const current: Record<string, number> = countHardcodedColours();
    const files = new Set([...Object.keys(baseline), ...Object.keys(current)]);
    const added: string[] = [];
    const removed: string[] = [];
    for (const file of files) {
      const allowed = baseline[file] ?? 0;
      const found = current[file] ?? 0;
      if (found > allowed) added.push(`${file}: ${found} colours, baseline ${allowed}`);
      if (found < allowed) removed.push(`${file}: ${found} colours, baseline ${allowed}`);
    }

    // Use app/styles/tokens.css variables instead of hex, rgb() or hsl().
    expect(added).toEqual([]);
    // Colours were removed: lock the gain in with
    // `node scripts/hardcoded-colours.mjs --write`.
    expect(removed).toEqual([]);
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
