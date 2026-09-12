import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  list: vi.fn(), remove: vi.fn(), update: vi.fn(), client: vi.fn(), session: vi.fn(),
  previous: vi.fn(), resume: vi.fn(), upload: vi.fn(), event: vi.fn(),
}));
vi.mock("@/src/lib/findings/outbox", () => ({ listOutboxFindings: mocks.list, deleteOutboxFinding: mocks.remove, updateOutboxFinding: mocks.update }));
vi.mock("@/src/lib/supabase/client", () => ({ createSupabaseBrowserClient: mocks.client }));
vi.mock("@/src/lib/supabase/config", () => ({ publicSupabaseConfig: () => ({ url: "https://storage.example" }) }));
vi.mock("@/src/lib/umami-goals", () => ({ queueUmamiEvent: mocks.event, UMAMI_EVENTS: { findingAdded: "finding-added" } }));
vi.mock("tus-js-client", () => ({
  Upload: class {
    constructor(blob: Blob, options: { onSuccess: () => void }) {
      mocks.upload(blob, options);
      this.start = options.onSuccess;
    }
    start: () => void;
    findPreviousUploads = mocks.previous;
    resumeFromPreviousUpload = mocks.resume;
  },
}));
import { syncFindingOutbox } from "@/src/lib/findings/sync-client";

const record = { draft: { clientReportId: "draft-1" }, photos: [{ id: "photo-1", position: 0, blob: new Blob(["photo"]) }] };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("navigator", { onLine: true });
  mocks.client.mockReturnValue({ auth: { getSession: mocks.session } });
  mocks.session.mockResolvedValue({ data: { session: null } });
});
afterEach(() => vi.unstubAllGlobals());

describe("finding sync loads only the services it needs", () => {
  it("returns immediately for an empty outbox without initializing auth or uploads", async () => {
    mocks.list.mockResolvedValue([]);
    expect(await syncFindingOutbox()).toMatchObject({ synced: 0, pending: 0, needsLogin: false });
    expect(mocks.client).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("retains offline drafts and still requires login when connectivity returns", async () => {
    mocks.list.mockResolvedValue([record]);
    vi.stubGlobal("navigator", { onLine: false });
    expect(await syncFindingOutbox()).toMatchObject({ synced: 0, pending: 1, needsLogin: false });
    expect(mocks.client).not.toHaveBeenCalled();
    vi.stubGlobal("navigator", { onLine: true });
    expect(await syncFindingOutbox()).toMatchObject({ synced: 0, pending: 1, needsLogin: true });
    expect(mocks.session).toHaveBeenCalledOnce();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("lazily loads and resumes a pending photo upload before finalizing and removing the draft", async () => {
    mocks.list.mockResolvedValueOnce([record]).mockResolvedValueOnce([]);
    mocks.session.mockResolvedValue({ data: { session: { access_token: "test-token", user: { id: "test-owner" } } } });
    mocks.previous.mockResolvedValue([{ uploadUrl: "https://storage.example/resume" }]);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ id: "finding-1", state: "pending" }))
      .mockResolvedValueOnce(Response.json({ oneKmAccessUntil: "2026-09-20" }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await syncFindingOutbox()).toMatchObject({ synced: 1, pending: 0, oneKmAccessUntil: "2026-09-20" });
    expect(mocks.upload).toHaveBeenCalledOnce();
    expect(mocks.resume).toHaveBeenCalledWith({ uploadUrl: "https://storage.example/resume" });
    expect(fetchMock).toHaveBeenLastCalledWith("/api/findings/finding-1/finalize", expect.objectContaining({ method: "POST" }));
    expect(mocks.remove).toHaveBeenCalledWith("draft-1");
  });
});
