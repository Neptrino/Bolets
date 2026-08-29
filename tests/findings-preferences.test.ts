import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const reportForm = readFileSync("components/findings/finding-report-form.tsx", "utf8");

describe("finding form preferences", () => {
  it("restores and remembers the public alias choice on the device", () => {
    expect(reportForm).toContain('SHOW_ALIAS_PREFERENCE_KEY = "bolets:findings:show-alias:v1"');
    expect(reportForm).toContain("window.localStorage.getItem(SHOW_ALIAS_PREFERENCE_KEY)");
    expect(reportForm).toContain("window.localStorage.setItem(SHOW_ALIAS_PREFERENCE_KEY, String(value))");
    expect(reportForm).toContain("useSyncExternalStore(");
    expect(reportForm).toContain("rememberShowAliasPreference(event.target.checked)");
  });

  it("keeps the anonymous first-use default and explains device-only memory", () => {
    expect(reportForm).toContain("const getServerShowAliasPreference = () => false");
    expect(reportForm).toContain("Recordarem aquesta elecció en aquest dispositiu.");
  });
});
