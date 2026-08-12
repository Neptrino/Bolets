import { describe, expect, it } from "vitest";
import { getEdibilityPresentation } from "@/src/lib/edibility-presentation";

describe("edibility presentation", () => {
  it("keeps consumption conditions in their own safety labels", () => {
    expect(getEdibilityPresentation("excellent_edible").label).toBe("Excel·lent comestible");
    expect(getEdibilityPresentation("edible").label).toBe("Comestible");
    expect(getEdibilityPresentation("edible_with_conditions").label).toBe("Comestible amb condicions");
  });

  it("does not soften a dangerous classification", () => {
    expect(getEdibilityPresentation("dangerously_toxic").label).toBe("Molt tòxic");
  });
});
