import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/src/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));

import { readContributorAccess } from "@/src/lib/contributions/server";

describe("server-side contributor access", () => {
  it("grants an administrator full detail without requiring a contribution row", async () => {
    const access = await readContributorAccess({
      id: "admin-id",
      app_metadata: { app_role: "admin" },
    });

    expect(access).toMatchObject({
      administrator: true,
      active: true,
      level: "contributor",
      minimumResolutionM: 250,
    });
    expect(mocks.createSupabaseAdminClient).not.toHaveBeenCalled();
  });
});
