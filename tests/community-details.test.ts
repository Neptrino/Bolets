import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { pageHref, positivePage } from "@/app/admin/(private)/detail-utils";
import { maskAdminEmail } from "@/src/lib/community-details-server";

describe("admin community details", () => {
  it("masks account emails without hiding the provider domain", () => {
    expect(maskAdminEmail("aleix@example.cat")).toBe("a…x@example.cat");
    expect(maskAdminEmail("ab@example.cat")).toBe("ab@example.cat");
    expect(maskAdminEmail(undefined)).toBe("Sense correu");
  });

  it("normalizes invalid pages and preserves detail filters in pagination links", () => {
    expect(positivePage("-3")).toBe(1);
    expect(positivePage("4")).toBe(4);
    expect(pageHref("/admin/troballes", 3, {
      state: "published",
      visibility: "public",
    })).toBe("/admin/troballes?state=published&visibility=public&page=3");
  });

  it("shows user roles and expiring map access in an admin table", () => {
    const page = readFileSync("app/admin/(private)/usuaris/page.tsx", "utf8");
    const server = readFileSync("src/lib/community-details-server.ts", "utf8");
    expect(page).toContain("<table");
    expect(page).toContain("Accés al mapa");
    expect(page).toContain("Caducitat");
    expect(page).toContain("Aportacions");
    expect(page).toContain("Sense caducitat");
    expect(server).toContain('.from("contributor_access")');
    expect(server).toContain('.from("contribution_requests")');
    expect(server).toContain("userHasAppRole(user, APP_ROLES.admin)");
  });
});
