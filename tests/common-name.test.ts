import { describe, expect, it } from "vitest";
import { commonNameDisplayLabel } from "@/src/lib/common-name";

describe("common-name display labels", () => {
  it("capitalizes only the initial letter", () => {
    expect(commonNameDisplayLabel("lengua de vaca", "es-ES")).toBe("Lengua de vaca");
    expect(commonNameDisplayLabel("seta de San Jorge", "es-ES")).toBe("Seta de San Jorge");
  });

  it("keeps empty labels empty", () => {
    expect(commonNameDisplayLabel("")).toBe("");
  });
});
