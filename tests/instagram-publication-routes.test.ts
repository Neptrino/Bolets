import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as dailyPost } from "@/app/api/internal/instagram/daily/route";
import { POST as weekendPost } from "@/app/api/internal/instagram/growth/route";
import { createFavourableDailySharePreviewCards, loadDailySharePublicationCard } from "@/src/lib/daily-share-cards";

vi.mock("@/src/lib/daily-share-cards", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/src/lib/daily-share-cards")>(),
  loadDailySharePublicationCard: vi.fn(),
}));

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-11T16:00:00Z"));
  vi.stubEnv("INSTAGRAM_PUBLISH_SECRET", "test-publish-secret");
  vi.stubEnv("BUFFER_API_KEY", "test-buffer-key");
  vi.stubEnv("BUFFER_INSTAGRAM_CHANNEL", "bolets.app");
  vi.stubEnv("DAILY_SHARE_CARD_SIGNING_SECRET", "test-signing-secret");
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(loadDailySharePublicationCard).mockResolvedValue({
    ...createFavourableDailySharePreviewCards()[0]!,
    isPreview: false,
    observedAt: "2026-09-11T00:22:00Z",
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

describe.each([
  { name: "daily Story", post: dailyPost },
  { name: "weekend Reel", post: weekendPost },
])("$name publication route", ({ post }) => {
  const request = () => new Request("https://bolets.app/api/internal/instagram/test", {
    method: "POST",
    headers: { Authorization: "Bearer test-publish-secret", "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "weekend" }),
  });

  it("never contacts Buffer when data preparation exhausts its retry", async () => {
    vi.mocked(loadDailySharePublicationCard).mockResolvedValue(null);
    const response = await post(request());
    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not retry an ambiguous Buffer create-post failure", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ data: { account: { organizations: [{ id: "org" }] } } }))
      .mockResolvedValueOnce(Response.json({ data: { channels: [{
        id: "channel", organizationId: "org", name: "bolets.app", service: "instagram",
      }] } }))
      .mockResolvedValueOnce(Response.json({ data: { posts: { edges: [] } } }))
      .mockRejectedValueOnce(new Error("Connection lost after submitting the post"));
    const response = await post(request());
    expect(response.status).toBe(500);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(loadDailySharePublicationCard).toHaveBeenCalledTimes(1);
    const mutation = JSON.parse(String(fetchMock.mock.calls[3]?.[1]?.body));
    expect(mutation.query).toContain("createPost");
    await vi.advanceTimersByTimeAsync(300_000);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
