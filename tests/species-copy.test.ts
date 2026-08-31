import { describe, expect, it } from "vitest";
import { rainfallLimitationCopy } from "@/src/lib/species-copy";

describe("public species copy", () => {
  it.each([
    "cyclocybe-cylindracea",
    "coprinus-comatus",
    "pleurotus-eryngii",
    "morchella-esculenta",
    "ramaria-aurea",
    "pleurotus-ostreatus",
    "craterellus-tubaeformis",
    "tuber-melanosporum",
    "lepiota-brunneoincarnata",
  ])("keeps the public rainfall limitation plain for %s", (speciesId) => {
    const copy = rainfallLimitationCopy(
      speciesId,
      "El model territorial usa una predicció basada en la fenologia.",
    );

    expect(copy).not.toMatch(/model|predicció|fenologia/i);
  });
});
