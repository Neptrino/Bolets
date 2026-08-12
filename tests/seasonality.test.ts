import { describe, expect, it } from "vitest";
import { monthInTimeZone, monthWithPreposition, SEASON_MONTHS } from "@/src/lib/seasonality";

describe("seasonality calendar", () => {
  it("keeps the twelve months in calendar order", () => {
    expect(SEASON_MONTHS.map(({ key }) => key)).toEqual([
      "gen",
      "feb",
      "mar",
      "abr",
      "mai",
      "jun",
      "jul",
      "ago",
      "set",
      "oct",
      "nov",
      "des",
    ]);
  });

  it("uses Catalonia local time at a month boundary", () => {
    expect(monthInTimeZone(new Date("2026-08-31T21:59:59Z"))).toBe("ago");
    expect(monthInTimeZone(new Date("2026-08-31T22:00:00Z"))).toBe("set");
  });

  it("uses the correct Catalan article before month names", () => {
    expect(monthWithPreposition("ago")).toBe("a l’agost");
    expect(monthWithPreposition("abr")).toBe("a l’abril");
    expect(monthWithPreposition("oct")).toBe("a l’octubre");
    expect(monthWithPreposition("set")).toBe("al setembre");
  });
});
