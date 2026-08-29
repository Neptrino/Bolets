import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

function collectTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTsxFiles(path);
    return entry.isFile() && entry.name.endsWith(".tsx") ? [path] : [];
  });
}

const productSources = ["app", "components"]
  .flatMap(collectTsxFiles)
  .map((path) => ({
    path: relative(process.cwd(), path),
    source: readFileSync(path, "utf8"),
  }));

describe("custom browser controls", () => {
  it("uses the shared selector instead of native browser select popups", () => {
    const offenders = productSources
      .filter(({ source }) => /<select\b/.test(source))
      .map(({ path }) => path);

    expect(offenders).toEqual([]);
  });

  it("does not invoke browser-native alert, confirm, or prompt dialogs", () => {
    const offenders = productSources
      .filter(({ source }) => /window\.(?:alert|confirm|prompt)\s*\(/.test(source))
      .map(({ path }) => path);

    expect(offenders).toEqual([]);
  });

  it("builds the shared selector on the accessible Base UI primitive", () => {
    const select = readFileSync("components/ui/form-select.tsx", "utf8");

    expect(select).toContain('from "@base-ui/react/select"');
    expect(select).toContain("<Select.Trigger");
    expect(select).toContain("<Select.Portal>");
  });
});
