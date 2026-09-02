import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  readContributorAccess: vi.fn(),
  clearCapability: vi.fn(),
  setAdministratorCapability: vi.fn(),
  setContributorCapability: vi.fn(),
}));

vi.mock("@/src/lib/supabase/server", () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}));

vi.mock("@/src/lib/contributions/server", () => ({
  readContributorAccess: mocks.readContributorAccess,
}));

vi.mock("@/src/lib/contributions/capability.server", () => ({
  clearContributorDetailCapability: mocks.clearCapability,
  setAdministratorDetailCapability: mocks.setAdministratorCapability,
  setContributorDetailCapability: mocks.setContributorCapability,
}));

import { GET } from "@/app/api/me/contributor-access/route";

describe("contributor access route", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
  });

  it("mints full-detail capability for an authenticated administrator", async () => {
    const user = { id: "admin-id", app_metadata: { app_role: "admin" } };
    const access = {
      authenticated: true,
      administrator: true,
      active: true,
      level: "contributor",
      minimumResolutionM: 250,
      activeUntil: null,
      oneKmActiveUntil: null,
      fineActiveUntil: null,
      revokedAt: null,
    };
    mocks.getAuthenticatedUser.mockResolvedValue(user);
    mocks.readContributorAccess.mockResolvedValue(access);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(access);
    expect(mocks.readContributorAccess).toHaveBeenCalledWith(user);
    expect(mocks.setAdministratorCapability).toHaveBeenCalledOnce();
    expect(mocks.setContributorCapability).not.toHaveBeenCalled();
    expect(mocks.clearCapability).not.toHaveBeenCalled();
  });
});
