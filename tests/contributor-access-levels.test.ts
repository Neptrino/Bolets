import { describe, expect, it } from "vitest";
import { resolveContributorAccess } from "@/src/lib/contributions";

const now = Date.parse("2026-09-02T08:00:00.000Z");

describe("contributor map access levels", () => {
  it("defaults to the public 2.5 km floor", () => {
    expect(resolveContributorAccess(null, now)).toMatchObject({
      level: "public",
      minimumResolutionM: 2500,
      active: false,
    });
  });

  it("opens 1 km for an active finding grant", () => {
    expect(resolveContributorAccess({
      active_until: null,
      one_km_active_until: "2026-09-09T08:00:00.000Z",
      revoked_at: null,
    }, now)).toMatchObject({
      level: "finding",
      minimumResolutionM: 1000,
      activeUntil: "2026-09-09T08:00:00.000Z",
    });
  });

  it("prefers active 250 m access and downgrades to a later 1 km grant", () => {
    const row = {
      active_until: "2026-09-03T08:00:00.000Z",
      one_km_active_until: "2026-09-10T08:00:00.000Z",
      revoked_at: null,
    };
    expect(resolveContributorAccess(row, now).minimumResolutionM).toBe(250);
    expect(resolveContributorAccess(row, Date.parse("2026-09-04T08:00:00.000Z"))).toMatchObject({
      level: "finding",
      minimumResolutionM: 1000,
      activeUntil: "2026-09-10T08:00:00.000Z",
    });
  });

  it("fails closed after an administrative revocation", () => {
    expect(resolveContributorAccess({
      active_until: "2026-10-02T08:00:00.000Z",
      one_km_active_until: "2026-09-09T08:00:00.000Z",
      revoked_at: "2026-09-02T08:01:00.000Z",
    }, now)).toMatchObject({ level: "public", minimumResolutionM: 2500, active: false });
  });
});
