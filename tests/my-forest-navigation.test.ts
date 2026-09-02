import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveAccessDestination } from "@/src/lib/findings/access-destination";
import { isUmamiBlockedPath } from "@/src/lib/umami-privacy";

const header = readFileSync("components/site-header.tsx", "utf8");
const proxy = readFileSync("proxy.ts", "utf8");

describe("El meu bosc account navigation", () => {
  it("makes the dashboard the account destination on desktop and mobile", () => {
    expect(header.match(/href="\/compte\/bosc"/g)).toHaveLength(2);
    expect(header).toContain("El meu bosc");
    expect(resolveAccessDestination(undefined)).toBe("/compte/bosc");
    expect(resolveAccessDestination("/compte/bosc")).toBe("/compte/bosc");
    expect(resolveAccessDestination("/compte/troballes")).toBe("/compte/troballes");
  });

  it("protects and de-indexes the private destination", () => {
    expect(proxy).toContain('"/compte"');
    expect(proxy).toContain('"/compte/:path*"');
    expect(isUmamiBlockedPath("/compte/bosc")).toBe(true);
  });
});
