import { describe, expect, it } from "vitest";

import {
  adminDomainSuppressionReason,
  backlinkDomainKey,
  backlinkDomainMatchFilter,
  backlinkSuppressionDomainValues,
  isAdminDomainSuppression,
} from "@/src/lib/backlinks/domain-control";

describe("backlink domain controls", () => {
  it("blocks a registered domain across www and subdomains", () => {
    expect(backlinkDomainKey("www.elnacional.cat")).toBe("elnacional.cat");
    expect(backlinkDomainKey("media.elnacional.cat")).toBe("elnacional.cat");
    expect(backlinkSuppressionDomainValues("www.elnacional.cat")).toEqual([
      "elnacional.cat",
      "www.elnacional.cat",
    ]);
    expect(backlinkDomainMatchFilter("www.elnacional.cat")).toBe(
      "domain.eq.elnacional.cat,domain.like.%.elnacional.cat",
    );
  });

  it("distinguishes reversible admin blocks from protected opt-outs", () => {
    const reason = adminDomainSuppressionReason("No aporta valor editorial");
    expect(reason).toBe("admin:No aporta valor editorial");
    expect(isAdminDomainSuppression(reason)).toBe(true);
    expect(isAdminDomainSuppression("opt_out")).toBe(false);
  });
});
