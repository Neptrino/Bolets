import { describe, expect, it } from "vitest";

import { backlinkRescanMode, manualApprovalBlocker } from "@/src/lib/backlinks/manual-policy";

describe("manual backlink decisions", () => {
  it("allows an uncontacted low-score prospect because score is intentionally not a hard gate", () => {
    expect(manualApprovalBlocker({
      contactEmail: "editorial@example.cat",
      existingLink: false,
      sendCount: 0,
      status: "discovered",
    })).toBeNull();
  });

  it("keeps mailbox and existing-link safeguards mandatory", () => {
    expect(manualApprovalBlocker({
      contactEmail: "persona@example.cat",
      existingLink: false,
      sendCount: 0,
      status: "discovered",
    })).toBe("invalid-contact");
    expect(manualApprovalBlocker({
      contactEmail: "premsa@example.cat",
      existingLink: true,
      sendCount: 0,
      status: "discovered",
    })).toBe("existing-link");
  });

  it("locks a prospect after any recorded send", () => {
    expect(manualApprovalBlocker({
      contactEmail: "info@example.cat",
      existingLink: false,
      sendCount: 1,
      status: "sent",
    })).toBe("already-contacted");
  });

  it("preserves manual exclusions while giving a newly verified link priority", () => {
    expect(backlinkRescanMode({
      existingLink: false,
      manualDecision: "excluded",
      sendCount: 0,
      status: "suppressed",
    })).toBe("manual-excluded");
    expect(backlinkRescanMode({
      existingLink: true,
      manualDecision: "excluded",
      sendCount: 0,
      status: "suppressed",
    })).toBe("verified-link");
    expect(backlinkRescanMode({
      existingLink: false,
      manualDecision: "excluded",
      sendCount: 0,
      status: "linked",
    })).toBe("manual-excluded");
  });

  it("does not reopen a contacted prospect when its score changes", () => {
    expect(backlinkRescanMode({
      existingLink: false,
      manualDecision: null,
      sendCount: 1,
      status: "sent",
    })).toBe("contacted");
  });
});
