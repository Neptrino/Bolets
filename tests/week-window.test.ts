import { describe, expect, it } from "vitest";
import { civilDate, isoDate, monthPhrase, shiftCivilDate, weekWindow, weekendWindow } from "@/src/lib/week-window";

const at = (iso: string) => new Date(iso);

describe("week window", () => {
  it("frames the civil week from Monday to Sunday in Catalonia time", () => {
    const week = weekWindow(at("2026-09-17T10:00:00+02:00"));
    expect(isoDate(week.start)).toBe("2026-09-14");
    expect(isoDate(week.end)).toBe("2026-09-20");
    expect(week.label).toBe("del 14 al 20 de setembre");
  });

  it("names both months when the week crosses one and elides the article", () => {
    expect(weekWindow(at("2026-10-01T10:00:00+02:00")).label).toBe("del 28 de setembre al 4 d’octubre");
    expect(monthPhrase(4)).toBe("d’abril");
    expect(monthPhrase(8)).toBe("d’agost");
  });

  it("reads the local date on the far side of midnight", () => {
    const late = civilDate(at("2026-09-17T23:30:00Z"));
    expect(isoDate(late)).toBe("2026-09-18");
    expect(late.weekday).toBe(4);
    expect(shiftCivilDate(late, 3).weekday).toBe(0);
  });
});

describe("weekend window", () => {
  it("points at the coming weekend during the week", () => {
    const weekend = weekendWindow(at("2026-09-17T10:00:00+02:00"));
    expect(isoDate(weekend.saturday)).toBe("2026-09-19");
    expect(isoDate(weekend.sunday)).toBe("2026-09-20");
    expect(weekend.label).toBe("19 i 20 de setembre");
    expect(weekend.current).toBe(false);
  });

  it("keeps the current weekend on Saturday and Sunday", () => {
    expect(isoDate(weekendWindow(at("2026-09-19T10:00:00+02:00")).saturday)).toBe("2026-09-19");
    const sunday = weekendWindow(at("2026-09-20T10:00:00+02:00"));
    expect(isoDate(sunday.saturday)).toBe("2026-09-19");
    expect(sunday.current).toBe(true);
  });

  it("names both months when the weekend straddles one", () => {
    expect(weekendWindow(at("2026-10-29T10:00:00+01:00")).label).toBe("31 d’octubre i 1 de novembre");
  });
});
