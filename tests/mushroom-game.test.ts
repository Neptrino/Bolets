import { describe, expect, it } from "vitest";

import {
  rankForScore,
  scoreForAttempt,
  selectMushroomRound,
  type MushroomGameEntry,
} from "@/src/lib/mushroom-game";

const pool = Array.from({ length: 15 }, (_, index) => ({
  id: `species-${index}`,
  choices: [
    { id: `species-${index}`, label: `Species ${index}` },
    { id: "decoy-a", label: "Decoy A" },
    { id: "decoy-b", label: "Decoy B" },
  ],
})) as MushroomGameEntry[];

describe("mushroom game scoring", () => {
  it("rewards an identification made with fewer attempts", () => {
    expect(scoreForAttempt(1)).toBe(100);
    expect(scoreForAttempt(2)).toBe(70);
    expect(scoreForAttempt(3)).toBe(40);
    expect(scoreForAttempt(8)).toBe(40);
  });

  it("assigns a rank relative to the available score", () => {
    expect(rankForScore(560, 6)).toBe("Ull de linx");
    expect(rankForScore(450, 6)).toBe("Naturalista atent");
    expect(rankForScore(300, 6)).toBe("Aprenent del sotabosc");
  });

  it("selects six unique species and six unique forest positions", () => {
    const round = selectMushroomRound(pool, [], () => 0.42);

    expect(round).toHaveLength(6);
    expect(new Set(round.map((entry) => entry.id)).size).toBe(6);
    expect(new Set(round.map((entry) => `${entry.position.x}:${entry.position.y}`)).size).toBe(6);
  });

  it("changes at least one species when starting a new round", () => {
    const previousIds = pool.slice(0, 6).map((entry) => entry.id);
    const round = selectMushroomRound(pool, previousIds, () => 0.999999);

    expect(round.some((entry) => !previousIds.includes(entry.id))).toBe(true);
  });
});
