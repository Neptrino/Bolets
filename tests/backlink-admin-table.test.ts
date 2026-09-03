import { describe, expect, it } from "vitest";

import {
  backlinkDetailId,
  backlinkDetailHref,
  backlinkTableHref,
  nextBacklinkSortDirection,
  parseBacklinkTableQuery,
  safeBacklinkReturnPath,
} from "@/src/lib/backlinks/admin-table";

describe("backlink admin table state", () => {
  it("normalizes invalid query parameters", () => {
    expect(parseBacklinkTableQuery({ page: "-4", status: "unknown", sort: "recipient", dir: "sideways" }))
      .toEqual({ page: 1, search: "", status: null, sort: "updated", direction: "desc" });
  });

  it("parses supported filters and bounds the search", () => {
    const parsed = parseBacklinkTableQuery({
      page: "3",
      q: `  ${"a".repeat(140)}  `,
      status: "ready",
      sort: "score",
      dir: "asc",
    });
    expect(parsed).toMatchObject({ page: 3, status: "ready", sort: "score", direction: "asc" });
    expect(parsed.search).toHaveLength(120);
  });

  it("preserves active collection state in links and omits defaults", () => {
    const current = parseBacklinkTableQuery({ q: "parc", status: "ready", sort: "score", page: "2" });
    expect(backlinkTableHref(current, { page: 3 }))
      .toBe("/admin/enllacos?q=parc&status=ready&sort=score&page=3");
    expect(backlinkTableHref(parseBacklinkTableQuery({}))).toBe("/admin/enllacos");
  });

  it("toggles an active sort and selects sensible defaults for a new one", () => {
    const scoreDescending = parseBacklinkTableQuery({ sort: "score" });
    expect(nextBacklinkSortDirection(scoreDescending, "score")).toBe("asc");
    expect(nextBacklinkSortDirection(scoreDescending, "title")).toBe("asc");
    expect(nextBacklinkSortDirection(scoreDescending, "checked")).toBe("desc");
  });

  it("preserves safe collection state across the details view", () => {
    const current = parseBacklinkTableQuery({ q: "parc", status: "ready", page: "2" });
    const prospectId = "43dfe92b-f101-4517-80d5-1c73dd625fd9";
    expect(backlinkDetailHref(prospectId, current))
      .toBe(`/admin/enllacos?q=parc&status=ready&page=2&detail=${prospectId}`);
    expect(backlinkDetailId({ detail: prospectId })).toBe(prospectId);
    expect(backlinkDetailId({ detail: "not-an-id" })).toBeNull();
    expect(safeBacklinkReturnPath("/admin/enllacos?q=parc&page=2")).toBe("/admin/enllacos?q=parc&page=2");
    expect(safeBacklinkReturnPath("https://evil.example/admin/enllacos")).toBe("/admin/enllacos");
  });
});
