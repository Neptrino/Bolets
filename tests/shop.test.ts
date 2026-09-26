/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";

const analytics = vi.hoisted(() => ({ queueUmamiEvent: vi.fn() }));

vi.mock("@/src/lib/umami-goals", () => ({
  queueUmamiEvent: analytics.queueUmamiEvent,
  UMAMI_EVENTS: {
    shopBannerClick: "shop-banner-click",
    shopBannerDismissed: "shop-banner-dismissed",
    shopNavClick: "shop-nav-click",
    shopFooterClick: "shop-footer-click",
    shopMapCardClick: "shop-map-card-click",
    shopMapInfoClick: "shop-map-info-click",
    shopHomeClick: "shop-home-click",
  },
  UMAMI_EVENT_NAMES: [],
}));

import {
  dismissShopBanner, isShopBannerPath, isShopBannerSnoozed, SHOP_BANNER_KEY, SHOP_BANNER_SNOOZE_MS,
  shopBannerPrePaintScript, shopHref, subscribeShopBanner, trackShopClick,
} from "@/src/lib/shop";

afterEach(() => {
  window.localStorage.clear();
  analytics.queueUmamiEvent.mockReset();
  vi.useRealTimers();
});

describe("shop links", () => {
  it("tags every placement for Shopify attribution", () => {
    expect(shopHref("banner")).toBe("https://botiga.bolets.app/?utm_source=bolets.app&utm_medium=banner");
    expect(new URL(shopHref("footer")).searchParams.get("utm_medium")).toBe("footer");
  });

  it("links straight to a product while keeping the placement tag", () => {
    expect(shopHref("home", "/products/dessuadora-cep"))
      .toBe("https://botiga.bolets.app/products/dessuadora-cep?utm_source=bolets.app&utm_medium=home");
  });

  it.each([
    ["banner", "shop-banner-click"], ["nav", "shop-nav-click"], ["footer", "shop-footer-click"],
    ["map-card", "shop-map-card-click"], ["map-info", "shop-map-info-click"], ["home", "shop-home-click"],
  ] as const)("records the %s click as %s", (placement, event) => {
    trackShopClick(placement);
    expect(analytics.queueUmamiEvent).toHaveBeenCalledWith(event);
  });
});

describe("shop banner visibility", () => {
  it.each(["/", "/temporada", "/bolets", "/bolets/infografia", "/bolets-avui", "/zones/pirineu", "/guies"])(
    "shows on public reference page %s",
    (pathname) => expect(isShopBannerPath(pathname)).toBe(true),
  );

  it.each([
    "/map", "/map/boletus-edulis", "/bolets/cep", "/bolets/cep/3d", "/bolets/cep/targeta",
    "/admin", "/compte/bosc", "/acces", "/moderacio", "/troballes/nova", "/auth/callback",
  ])("stays off %s", (pathname) => expect(isShopBannerPath(pathname)).toBe(false));

  it("snoozes for seven days and notifies subscribers", () => {
    vi.useFakeTimers({ now: new Date("2026-09-26T10:00:00Z") });
    const listener = vi.fn();
    const unsubscribe = subscribeShopBanner(listener);

    expect(isShopBannerSnoozed()).toBe(false);
    dismissShopBanner();

    expect(Number(window.localStorage.getItem(SHOP_BANNER_KEY))).toBe(Date.now() + SHOP_BANNER_SNOOZE_MS);
    expect(isShopBannerSnoozed()).toBe(true);
    expect(isShopBannerSnoozed(Date.now() + SHOP_BANNER_SNOOZE_MS + 1)).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(analytics.queueUmamiEvent).toHaveBeenCalledWith("shop-banner-dismissed");
    unsubscribe();
  });

  it("hides a snoozed strip before it paints", () => {
    window.localStorage.setItem(SHOP_BANNER_KEY, String(Date.now() + 60_000));
    const aside = document.createElement("aside");
    const script = document.createElement("script");
    aside.append(script);
    Object.defineProperty(document, "currentScript", { configurable: true, get: () => script });

    new Function(shopBannerPrePaintScript)();
    expect(aside.hidden).toBe(true);

    window.localStorage.setItem(SHOP_BANNER_KEY, String(Date.now() - 1));
    aside.hidden = false;
    new Function(shopBannerPrePaintScript)();
    expect(aside.hidden).toBe(false);
  });
});
