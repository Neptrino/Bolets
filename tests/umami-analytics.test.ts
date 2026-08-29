import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isUmamiBlockedPath,
  umamiPrivacyGuard,
} from "@/src/lib/umami-privacy";
import {
  flushUmamiEvents,
  isNewAuthUser,
  queueUmamiEvent,
  UMAMI_EVENTS,
} from "@/src/lib/umami-goals";

afterEach(() => {
  vi.unstubAllGlobals();
});

function installPrivacyGuard(pageUrl: string) {
  const sent = vi.fn<typeof fetch>();
  sent.mockResolvedValue(new Response(null, { status: 202 }));
  const window = {
    fetch: sent,
    location: new URL(pageUrl),
  };

  runInNewContext(umamiPrivacyGuard, {
    Promise,
    Response,
    URL,
    window,
  });

  return { sent, window };
}

describe("Umami analytics", () => {
  it("excludes private route families from page-view analytics", () => {
    expect(isUmamiBlockedPath("/compte")).toBe(true);
    expect(isUmamiBlockedPath("/les-meves-troballes/123")).toBe(true);
    expect(isUmamiBlockedPath("/bolets/rovello")).toBe(false);
  });

  it("sanitizes heatmap URLs and removes private-route events", async () => {
    const { sent, window } = installPrivacyGuard(
      "https://bolets.app/mapa?species=rovello#7/42/2",
    );
    const body = {
      type: "heatmap",
      payload: {
        website: "website-id",
        events: [
          { type: "click", url: "https://bolets.app/mapa?species=cep#position", x: 12 },
          { type: "scroll", url: "https://bolets.app/compte?tab=private", scrollPct: 80 },
        ],
      },
    };

    await window.fetch("https://analytics.bolets.app/api/record", {
      method: "POST",
      body: JSON.stringify(body),
    });

    expect(sent).toHaveBeenCalledOnce();
    const forwarded = JSON.parse(sent.mock.calls[0]?.[1]?.body as string);
    expect(forwarded.payload.events).toEqual([
      { type: "click", url: "https://bolets.app/mapa", x: 12 },
    ]);
  });

  it("fails closed for session replay and private-page recorder traffic", async () => {
    const publicPage = installPrivacyGuard("https://bolets.app/bolets");
    await publicPage.window.fetch("https://analytics.bolets.app/api/record", {
      method: "POST",
      body: JSON.stringify({ type: "record", payload: { events: [{ secret: "text" }] } }),
    });
    expect(publicPage.sent).not.toHaveBeenCalled();

    const privatePage = installPrivacyGuard("https://bolets.app/troballes/nova?draft=1");
    await privatePage.window.fetch("https://analytics.bolets.app/api/record", {
      method: "POST",
      body: JSON.stringify({
        type: "heatmap",
        payload: { events: [{ type: "click", url: "https://bolets.app/troballes/nova" }] },
      }),
    });
    expect(privatePage.sent).not.toHaveBeenCalled();
  });

  it("allows only named conversion events from private pages and removes page context", () => {
    const { window } = installPrivacyGuard("https://bolets.app/compte?tab=private");
    const guard = (window as typeof window & {
      boletsUmamiBeforeSend: (type: string, payload: Record<string, string>) => unknown;
    }).boletsUmamiBeforeSend;

    expect(guard("event", {
      website: "website-id",
      hostname: "bolets.app",
      name: "user-signup",
      url: "https://bolets.app/compte?tab=private",
      referrer: "https://bolets.app/acces?email=private",
      title: "Compte",
    })).toEqual({
      website: "website-id",
      hostname: "bolets.app",
      language: undefined,
      screen: undefined,
      name: "user-signup",
      url: "https://bolets.app/analytics-event",
      title: "Analytics event",
    });
    expect(guard("event", {
      website: "website-id",
      name: "ordinary-event",
      url: "https://bolets.app/compte",
    })).toBe(false);
  });

  it("distinguishes a new account from a returning sign-in", () => {
    expect(isNewAuthUser({
      created_at: "2026-08-29T18:00:00.000Z",
      last_sign_in_at: "2026-08-29T18:00:04.000Z",
    })).toBe(true);
    expect(isNewAuthUser({
      created_at: "2026-08-01T18:00:00.000Z",
      last_sign_in_at: "2026-08-29T18:00:04.000Z",
    })).toBe(false);
  });

  it("keeps conversions queued while an earlier event is still sending", async () => {
    const values = new Map<string, string>();
    let releaseFirst: (() => void) | undefined;
    const track = vi.fn((name: string) => name === UMAMI_EVENTS.userSignup
      ? new Promise<void>((resolve) => { releaseFirst = resolve; })
      : Promise.resolve());
    vi.stubGlobal("window", {
      dispatchEvent: vi.fn(),
      navigator: { onLine: true },
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => values.set(key, value),
      },
      umami: { track },
    });

    queueUmamiEvent(UMAMI_EVENTS.userSignup);
    queueUmamiEvent(UMAMI_EVENTS.findingAdded);
    releaseFirst?.();
    await flushUmamiEvents();

    expect(track.mock.calls.map(([name]) => name)).toEqual([
      UMAMI_EVENTS.userSignup,
      UMAMI_EVENTS.findingAdded,
    ]);
    expect(values.size).toBe(0);
  });

  it("retains offline events until connectivity returns", async () => {
    const values = new Map<string, string>();
    const navigator = { onLine: false };
    const track = vi.fn(async () => undefined);
    vi.stubGlobal("window", {
      dispatchEvent: vi.fn(),
      navigator,
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => values.set(key, value),
      },
      umami: { track },
    });

    queueUmamiEvent(UMAMI_EVENTS.findingDraftSaved);
    await flushUmamiEvents();
    expect(track).not.toHaveBeenCalled();
    expect(values.size).toBe(1);

    navigator.onLine = true;
    await flushUmamiEvents();
    expect(track).toHaveBeenCalledWith(UMAMI_EVENTS.findingDraftSaved);
    expect(values.size).toBe(0);
  });

  it("loads the heatmap recorder and bootstraps heatmaps without replay", () => {
    const layout = readFileSync("app/layout.tsx", "utf8");
    const bootstrap = readFileSync("deploy/vps/bootstrap-umami.sh", "utf8");
    const findingSync = readFileSync("src/lib/findings/sync-client.ts", "utf8");
    const findingForm = readFileSync("components/findings/finding-report-form.tsx", "utf8");
    const accessForm = readFileSync("components/findings/access-form.tsx", "utf8");

    expect(layout).toContain('src="https://analytics.bolets.app/recorder.js"');
    expect(layout).toContain('data-performance="true"');
    expect(bootstrap).toContain("heatmapEnabled: true");
    expect(bootstrap).toContain("replayEnabled: false");
    expect(bootstrap).toContain("UMAMI_HEATMAP_SAMPLE_RATE");
    expect(bootstrap).toContain('"user-signup"');
    expect(bootstrap).toContain('"finding-added"');
    expect(bootstrap).toContain('"signup-started"');
    expect(bootstrap).toContain('"finding-draft-saved"');
    expect(bootstrap).toContain('"infographic-downloaded"');
    expect(bootstrap).toContain('"infographic-shared"');
    expect(bootstrap).toContain('"Signup completion"');
    expect(bootstrap).toContain('"Finding sync completion"');
    expect(bootstrap).toContain('"Infographic downloaded"');
    expect(bootstrap).toContain('"Infographic shared"');
    expect(findingSync.indexOf("queueUmamiEvent(UMAMI_EVENTS.findingAdded)")).toBeGreaterThan(
      findingSync.indexOf("if (!finalize.ok)"),
    );
    expect(findingForm.indexOf("queueUmamiEvent(UMAMI_EVENTS.findingDraftSaved)")).toBeGreaterThan(
      findingForm.indexOf("await saveOutboxFinding"),
    );
    expect(accessForm).toContain("queueUmamiEvent(UMAMI_EVENTS.signupStarted)");
  });

});
