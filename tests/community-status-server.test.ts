import { beforeEach, describe, expect, it, vi } from "vitest";

const { createSupabaseAdminClient } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/src/lib/supabase/admin", () => ({ createSupabaseAdminClient }));

import { readCommunityStatus } from "@/src/lib/community-status-server";

type CountResponse = {
  count: number | null;
  error: { message: string } | null;
};

function countQuery(response: CountResponse) {
  const result = Promise.resolve(response);
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    then: result.then.bind(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.gte.mockReturnValue(query);
  return query;
}

function adminClient(
  findingCounts: CountResponse[],
  flagCount: CountResponse,
  userTotal = 9,
) {
  const remainingFindingCounts = [...findingCounts];
  return {
    auth: {
      admin: {
        listUsers: vi.fn().mockResolvedValue({
          data: { users: [], total: userTotal },
          error: null,
        }),
      },
    },
    from: vi.fn((table: string) => countQuery(
      table === "user_finding_flags"
        ? flagCount
        : remainingFindingCounts.shift() ?? { count: null, error: { message: "Missing fixture" } },
    )),
  };
}

describe("community status reader", () => {
  beforeEach(() => {
    createSupabaseAdminClient.mockReset();
  });

  it("returns aggregate account, finding, verification, and moderation counts", async () => {
    createSupabaseAdminClient.mockReturnValue(adminClient([
      { count: 12, error: null },
      { count: 3, error: null },
      { count: 7, error: null },
      { count: 5, error: null },
      { count: 2, error: null },
      { count: 4, error: null },
    ], { count: 1, error: null }));

    await expect(readCommunityStatus(new Date("2026-08-29T12:00:00.000Z"))).resolves.toEqual({
      registeredUsers: 9,
      submittedFindings: 12,
      submittedFindingsLast7Days: 3,
      publicFindings: 7,
      privateFindings: 5,
      draftFindings: 2,
      pendingVerificationFindings: 4,
      openModerationFlags: 1,
    });
  });

  it("fails the community panel when a count cannot be read", async () => {
    createSupabaseAdminClient.mockReturnValue(adminClient([
      { count: 12, error: null },
      { count: null, error: { message: "database unavailable" } },
      { count: 7, error: null },
      { count: 5, error: null },
      { count: 2, error: null },
      { count: 4, error: null },
    ], { count: 0, error: null }));

    await expect(readCommunityStatus()).rejects.toThrow("Recent finding count failed");
  });
});
