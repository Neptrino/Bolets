import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ownerReads = readFileSync("src/lib/findings/reads.server.ts", "utf8");
const deleteRoute = readFileSync("app/api/findings/[id]/route.ts", "utf8");
const personalFindings = readFileSync("components/findings/personal-findings.tsx", "utf8");
const accountSettings = readFileSync("components/findings/account-settings.tsx", "utf8");
const confirmDialog = readFileSync("components/ui/confirm-dialog.tsx", "utf8");

describe("owner finding deletion", () => {
  it("does not return withdrawn findings to the private list", () => {
    expect(ownerReads).toContain('.neq("publication_state", "hidden")');
  });

  it("uses one atomic database operation and checks its result", () => {
    expect(deleteRoute).toContain('admin.rpc("remove_owner_finding"');
    expect(deleteRoute).toContain("if (error || !removal)");
    expect(deleteRoute).toContain("storageRemoval.error");
  });

  it("uses the app confirmation dialog instead of the browser prompt", () => {
    expect(personalFindings).toContain("<FindingDeleteDialog");
    expect(accountSettings).toContain("<FindingDeleteDialog");
    expect(confirmDialog).toContain("<dialog");
    expect(personalFindings).not.toContain("window.confirm");
    expect(accountSettings).not.toContain("window.confirm");
  });
});
