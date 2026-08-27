import { describe, expect, it } from "vitest";
import { identificationDifficultyLabel } from "@/src/lib/identification-difficulty";

describe("identification difficulty labels", () => {
  it.each([
    ["Baixa", "Senzilla"],
    ["Baixa a mitjana", "Senzilla"],
    ["Mitjana", "Moderada"],
    ["Mitjana a alta", "Difícil"],
    ["Alta", "Difícil"],
    ["Molt alta", "Molt difícil"],
    ["Cal contrastar diversos trets", "Difícil"],
  ])("presents %s on the four-rank scale", (source, expected) => {
    expect(identificationDifficultyLabel(source)).toBe(expected);
  });

  it("preserves an unrecognized editorial value", () => {
    expect(identificationDifficultyLabel("Requereix microscòpia")).toBe("Requereix microscòpia");
  });
});
