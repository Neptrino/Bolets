import { describe, expect, it } from "vitest";

import { nextBacklinkRunWindow } from "@/src/lib/backlinks/schedule";

describe("backlink schedule", () => {
  it("keeps the current Madrid date until the randomized window ends", () => {
    expect(nextBacklinkRunWindow(new Date("2026-09-03T08:25:00Z")))
      .toBe("3 de set. 2026, 10:20–10:30");
  });

  it("moves to the next Madrid date after the window", () => {
    expect(nextBacklinkRunWindow(new Date("2026-09-03T08:31:00Z")))
      .toBe("4 de set. 2026, 10:20–10:30");
  });

  it("uses Madrid local time across winter offset changes", () => {
    expect(nextBacklinkRunWindow(new Date("2027-01-10T09:15:00Z")))
      .toBe("10 de gen. 2027, 10:20–10:30");
  });
});
