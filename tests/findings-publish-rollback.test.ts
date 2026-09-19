import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createSupabaseAdminClient: vi.fn() }));
vi.mock("@/src/lib/supabase/admin", () => ({ createSupabaseAdminClient: mocks.createSupabaseAdminClient }));

import { publishFinding } from "@/src/lib/findings/mutations.server";

const photo = {
  id: "11111111-1111-4111-8111-111111111111",
  stagingPath: "owner/finding/photo.webp",
  position: 0,
  path: "finding/photo.webp",
  width: 1600,
  height: 1200,
  byteSize: 90_000,
  contentSha256: "sha",
  perceptualHash: "phash",
  duplicateReviewState: "clear" as const,
};

const photoDeletes: Array<{ findingId: unknown; ids: unknown }> = [];
const photoInserts: unknown[] = [];

function adminClient(states: Array<string | null>, publishError: { message: string } | null) {
  const owners = [...states];
  return {
    from(table: string) {
      if (table === "user_findings") {
        return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => {
          const state = owners.shift() ?? null;
          return { data: state ? { id: "finding", revision: 1, visibility: "public", publication_state: state } : null, error: null };
        } }) }) }) };
      }
      if (table === "user_finding_photos") {
        return {
          delete: () => ({ eq: (_column: string, findingId: unknown) => ({ in: async (_key: string, ids: unknown) => {
            photoDeletes.push({ findingId, ids });
            return { error: null };
          } }) }),
          insert: async (rows: unknown) => { photoInserts.push(rows); return { error: null }; },
        };
      }
      return { insert: async () => ({ error: null }) };
    },
    async rpc(name: string) {
      if (name === "publish_user_finding") return { data: publishError ? null : "2026-09-26", error: publishError };
      return { data: "2026-09-26", error: null };
    },
  };
}

beforeEach(() => {
  photoDeletes.length = 0;
  photoInserts.length = 0;
});

describe("publishing a finding whose photos are already attached", () => {
  it("keeps the photos when the publish call commits but loses its response", async () => {
    mocks.createSupabaseAdminClient.mockReturnValue(adminClient(["draft", "published"], { message: "fetch failed" }));
    await expect(publishFinding("finding", "owner", [photo])).resolves.toBe("2026-09-26");
    expect(photoInserts).toHaveLength(1);
    expect(photoDeletes).toHaveLength(1);
  });

  it("rolls the photo rows back only once the finding is confirmed to be an unpublished draft", async () => {
    mocks.createSupabaseAdminClient.mockReturnValue(adminClient(["draft", "draft"], { message: "Daily public finding limit reached" }));
    await expect(publishFinding("finding", "owner", [photo])).rejects.toThrow("límit de publicacions públiques");
    expect(photoDeletes).toHaveLength(2);
    expect(photoDeletes.at(-1)).toEqual({ findingId: "finding", ids: [photo.id] });
  });

  it("leaves the rows in place when the publication state cannot be read back", async () => {
    mocks.createSupabaseAdminClient.mockReturnValue(adminClient(["draft", null], { message: "fetch failed" }));
    await expect(publishFinding("finding", "owner", [photo])).rejects.toThrow("No s’ha pogut publicar la troballa.");
    expect(photoDeletes).toHaveLength(1);
  });

  it("clears a lost attempt's rows within this finding instead of upserting over another one's", async () => {
    mocks.createSupabaseAdminClient.mockReturnValue(adminClient(["draft"], null));
    await expect(publishFinding("finding", "owner", [photo])).resolves.toBe("2026-09-26");
    expect(photoDeletes).toEqual([{ findingId: "finding", ids: [photo.id] }]);
  });
});
