import { describe, expect, it } from "vitest";

import { pageHref, positivePage } from "@/app/admin/status/detail-utils";
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
    expect(pageHref("/admin/status/findings", 3, {
      state: "published",
      visibility: "public",
    })).toBe("/admin/status/findings?state=published&visibility=public&page=3");
  });
});
