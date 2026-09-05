import { describe, expect, it } from "vitest";
// The pure module runs unchanged in the browser and Node.
// @ts-expect-error Standalone browser module has no TypeScript declaration.
import { photoCrop, wrapText } from "../tools/instagram-photo-studio/geometry.mjs";
// @ts-expect-error Standalone browser module has no TypeScript declaration.
import { defaults, restoreSettings, hasOverlay } from "../tools/instagram-photo-studio/settings.mjs";

describe("photo-first composition settings", () => {
  it("migrates text without restoring the old mandatory panel", () => {
    const migrated = restoreSettings({}, { showFooter: true, title: "Al bosc", caption: "Una observació", credit: "Foto: Anna" });
    expect(migrated).toMatchObject({ preset: "photo", branding: "wordmark", title: "Al bosc", caption: "Una observació", credit: "Foto: Anna" });
    expect(restoreSettings({ preset: "bad", branding: "bad", zoom: 3 })).toEqual(defaults);
  });
  it("does not export invisible text as an empty watermark but always retains attribution", () => {
    const clean = { ...defaults, branding: "none", title: "Hidden title" };
    expect(hasOverlay(clean)).toBe(false);
    expect(hasOverlay({ ...clean, credit: "Foto: Anna" })).toBe(true);
    expect(hasOverlay({ ...clean, preset: "headline" })).toBe(true);
    expect(hasOverlay({ ...clean, preset: "headline", title: "", caption: "Hidden caption" })).toBe(false);
  });
});

describe("local photo editor geometry", () => {
  it("fills a portrait frame from a landscape photo without stretching or exposing blank edges", () => {
    expect(photoCrop(4000, 3000, 1080, 1350)).toEqual({ x: 800, y: 0, width: 2400, height: 3000 });
    expect(photoCrop(4000, 3000, 1080, 1350, 1, -1).x).toBe(0);
    const right = photoCrop(4000, 3000, 1080, 1350, 2, 1, 1);
    expect(right.x + right.width).toBeCloseTo(4000);
    expect(right.y + right.height).toBeCloseTo(3000);
  });
  it("bounds zoom and panning and rejects invalid image dimensions", () => {
    expect(photoCrop(1080, 1350, 1080, 1350, 0.5, 40, -40)).toEqual({ x: 0, y: 0, width: 1080, height: 1350 });
    expect(() => photoCrop(0, 3000, 1080, 1350)).toThrow("Invalid photo dimensions");
  });
  it("wraps Catalan text and unbroken words without silently accepting overflow", () => {
    const measure = (value: string) => Array.from(value).length;
    expect(wrapText("Trompeta de la mort", 10, measure, 3)).toEqual({ lines: ["Trompeta", "de la mort"], overflow: false });
    expect(wrapText("abcdefghijkl", 4, measure, 2)).toEqual({ lines: ["abcd", "efgh"], overflow: true });
    expect(wrapText("  ", 10, measure)).toEqual({ lines: [], overflow: false });
  });
});
