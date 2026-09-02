import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("administrator entry route", () => {
  it("forwards the short admin URL through the protected status dashboard", () => {
    const source = readFileSync("app/admin/page.tsx", "utf8");
    expect(source).toContain('redirect("/admin/status")');
  });
});
