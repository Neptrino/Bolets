import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("administrator entry route", () => {
  it("provides a standalone protected admin dashboard", () => {
    const source = readFileSync("app/admin/(private)/page.tsx", "utf8");
    expect(source).toContain("AdminDashboardPage");
    expect(source).toContain("Què necessita atenció");
    expect(source).toContain('href="/admin/operacions"');
    expect(source).not.toContain("redirect(");
  });
});
