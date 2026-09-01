import { describe, expect, it } from "vitest";
import { resolveAccessDestination } from "@/src/lib/findings/access-destination";

describe("finding access destination", () => {
  it.each([
    "/el-meu-bosc",
    "/les-meves-troballes",
    "/compte",
    "/moderacio",
    "/admin/status",
    "/admin/status/users",
    "/admin/status/findings",
    "/admin/status/reports",
    "/admin/status/instagram",
  ])("accepts %s", (destination) => {
    expect(resolveAccessDestination(destination)).toBe(destination);
  });

  it("returns to a specific public finding after sign-in", () => {
    const destination = "/troballes/3c6e0a7c-7a51-4b89-8c8f-46e1cccf1511";
    expect(resolveAccessDestination(destination)).toBe(destination);
  });

  it.each([
    undefined,
    null,
    ["/compte", "/moderacio"],
    "/acces",
    "//example.com",
    "https://example.com",
    "/una-ruta-desconeguda",
    "/troballes/no-es-un-uuid",
    "/troballes/3c6e0a7c-7a51-4b89-8c8f-46e1cccf1511?següent=https://example.com",
  ])("falls back safely for %j", (destination) => {
    expect(resolveAccessDestination(destination)).toBe("/el-meu-bosc");
  });
});
