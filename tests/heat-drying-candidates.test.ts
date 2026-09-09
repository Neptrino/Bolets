import { expect, it } from "vitest";
import { heatDryingSnapshot, heatEquivalentHours } from "@/scripts/lib/heat-drying-candidates";
import type { ConditionSnapshot } from "@/src/lib/types";

it("distinguishes heat intensity continuously without changing frost or recency", () => {
  expect(heatEquivalentHours([33], 3)).toBe(6 * heatEquivalentHours([28], 3));
  expect(heatEquivalentHours([26, 27], 3)).toBe(0);
  expect(heatEquivalentHours([27.001], 3)).toBeCloseTo(0.001 / 3);
  expect(() => heatEquivalentHours([NaN], 3)).toThrow();
  expect(() => heatEquivalentHours([28], 0)).toThrow();
});

it("isolates ET and heat candidates and preserves legacy inputs on missing evidence", () => {
  const snapshot = { values: { evapotranspiration7dMm: 20, rainfall7dMm: 40,
    frostHours14d: 5, heatHours14d: 10, heatHours20d: 15 } } as ConditionSnapshot;
  const et = heatDryingSnapshot(snapshot, { name: "et", etCoefficient: 0.75 });
  expect(et.values.evapotranspiration7dMm).toBe(30);
  expect(et.values.rainfall7dMm).toBe(40);
  expect(snapshot.values.evapotranspiration7dMm).toBe(20);
  const heat = { name: "heat", etCoefficient: 0.5, heatWidthC: 3 };
  expect(heatDryingSnapshot(snapshot, heat)).toEqual(snapshot);
  const series = [...Array<number>(144).fill(33), ...Array<number>(336).fill(28)];
  const scored = heatDryingSnapshot(snapshot, heat, series);
  expect(scored.values.heatHours14d).toBeCloseTo(112);
  expect(scored.values.heatHours20d).toBeCloseTo(400);
  expect(scored.values.frostHours14d).toBe(5);
  expect(scored.values.evapotranspiration7dMm).toBe(20);
  expect(() => heatDryingSnapshot(snapshot, heat, [28])).toThrow();
});
