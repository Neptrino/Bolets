import { describe, expect, it } from "vitest";
import { mapStatusCopy } from "@/components/region-map/status";

describe("region map status", () => {
  it("does not present a partially loaded viewport as complete", () => {
    expect(mapStatusCopy({
      cellState: {
        status: "ready",
        published: 20,
        excluded: 10,
        withheld: 0,
        truncated: false,
        incomplete: true,
        gridSizeM: 5000,
      },
      globalPrediction: true,
      showCompatibility: false,
    })).toMatchObject({
      title: "Mapa incomplet",
    });
  });
});
