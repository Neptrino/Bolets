import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  download: vi.fn(),
  contribution: { data: { user_id: "owner-id" }, error: null as Error | null },
  media: { data: { storage_path: "request-id/media-id.webp" }, error: null as Error | null },
}));

vi.mock("@/src/lib/supabase/server", () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}));

vi.mock("@/src/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      const result = table === "contribution_requests" ? mocks.contribution : mocks.media;
      const builder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => result,
      };
      return builder;
    },
    storage: { from: () => ({ download: mocks.download }) },
  }),
}));

import { GET } from "@/app/api/contributions/[requestId]/media/[mediaId]/route";

const context = {
  params: Promise.resolve({ requestId: "request-id", mediaId: "media-id" }),
};

describe("private contribution media route", () => {
  beforeEach(() => {
    mocks.getAuthenticatedUser.mockReset();
    mocks.download.mockReset();
    mocks.download.mockResolvedValue({ data: new Blob(["webp"]), error: null });
  });

  it("requires authentication", async () => {
    mocks.getAuthenticatedUser.mockResolvedValue(null);
    expect((await GET(new Request("http://localhost"), context)).status).toBe(401);
  });

  it("hides media from another account", async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({ id: "another-user", app_metadata: {} });
    expect((await GET(new Request("http://localhost"), context)).status).toBe(404);
    expect(mocks.download).not.toHaveBeenCalled();
  });

  it("serves the protected WebP to its owner without caching", async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({ id: "owner-id", app_metadata: {} });
    const response = await GET(new Request("http://localhost"), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("serves an explicit attachment when the admin requests a download", async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({ id: "admin-id", app_metadata: { app_role: "admin" } });
    const response = await GET(new Request("http://localhost?download=1"), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="bolets-aportacio-media-id.webp"',
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
