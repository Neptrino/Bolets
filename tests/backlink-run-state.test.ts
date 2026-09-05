import { describe, expect, it } from "vitest";

import {
  BACKLINK_DISCOVERY_BUDGET_MS,
  BACKLINK_RUN_STALE_AFTER_MS,
  displayBacklinkRun,
  isBacklinkRunStale,
} from "@/src/lib/backlinks/run-state";

describe("backlink run state", () => {
  const now = new Date("2026-09-05T12:00:00.000Z");

  it("keeps discovery inside the external worker timeout", () => {
    expect(BACKLINK_DISCOVERY_BUDGET_MS).toBe(12 * 60_000);
    expect(BACKLINK_DISCOVERY_BUDGET_MS).toBeLessThan(BACKLINK_RUN_STALE_AFTER_MS);
  });

  it("recognizes only expired running cycles as stale", () => {
    expect(isBacklinkRunStale({ status: "running", started_at: "2026-09-05T11:29:59.000Z" }, now)).toBe(true);
    expect(isBacklinkRunStale({ status: "running", started_at: "2026-09-05T11:30:01.000Z" }, now)).toBe(false);
    expect(isBacklinkRunStale({ status: "succeeded", started_at: "2026-09-05T10:00:00.000Z" }, now)).toBe(false);
  });

  it("shows stale cycles as interrupted without hiding saved counters", () => {
    expect(displayBacklinkRun({
      status: "running",
      started_at: "2026-09-05T10:00:00.000Z",
      inspected_count: 12,
      detail: null,
      completed_at: null,
    }, now)).toMatchObject({
      status: "failed",
      inspected_count: 12,
      completed_at: "2026-09-05T10:30:00.000Z",
    });
  });
});
