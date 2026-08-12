import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

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

  it("keeps the culinary dossier on shared palette tokens", () => {
    const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
    const marker = "/* Culinary dossier:";
    const culinaryStyles = css.slice(css.indexOf(marker));

    expect(culinaryStyles).toContain(marker);
    expect(culinaryStyles.match(/#[0-9a-f]{3,8}\b/gi) ?? []).toEqual([]);
  });
});
