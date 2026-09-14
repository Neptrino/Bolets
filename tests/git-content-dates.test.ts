import { describe, expect, it } from "vitest";
import { locateBlock } from "./helpers/git-content-dates";

const catalogue = `import type { Thing } from "./types";

export const things: Thing[] = [
  {
    id: "alpha",
    note: "braces { inside } strings and \\"quotes\\" are ignored",
    tags: ["a", "b"],
  },
  // a comment with { an unmatched brace
  {
    id: "beta",
    label: \`template \${count > 1 ? "{many}" : "one"} done\`,
  },
];

export const media: Record<string, string[]> = {
  "alpha": [
    "one.webp",
  ],
  "beta": ["two.webp"],
};
`;

describe("locateBlock", () => {
  const at = (marker: string | string[], extra: Record<string, unknown> = {}) =>
    locateBlock(catalogue, { kind: "block", file: "catalogue.ts", marker, ...extra });

  it("returns the object enclosing a marker line", () => {
    expect(at('id: "alpha"')).toEqual([4, 8]);
    expect(at('id: "beta"')).toEqual([10, 13]);
  });

  it("returns the literal a marker line opens, skipping same-line type annotations", () => {
    expect(at("export const things")).toEqual([3, 14]);
    expect(at('"alpha": [')).toEqual([17, 19]);
  });

  it("falls back to the anchor line for single-line entries", () => {
    expect(at('"beta": [', { unit: "line" })).toEqual([20, 20]);
  });

  it("limits the search to a scope block", () => {
    expect(at('"alpha"', { scope: "export const media" })).toEqual([17, 19]);
    expect(at(['id: "', 'beta'], { scope: "export const things" })).toEqual([10, 13]);
  });

  it("reports absent markers as null only when optional", () => {
    expect(at('id: "gamma"', { optional: true })).toBeNull();
    expect(() => at('id: "gamma"')).toThrow(/not found/);
  });
});
