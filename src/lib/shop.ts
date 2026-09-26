import { queueUmamiEvent, UMAMI_EVENTS } from "@/src/lib/umami-goals";
import { isUmamiBlockedPath } from "@/src/lib/umami-privacy";

export const SHOP_URL = "https://botiga.bolets.app";
export const SHOP_BANNER_KEY = "bolets:shop-banner:v1:snoozed-until";
export const SHOP_BANNER_SNOOZE_MS = 7 * 24 * 60 * 60 * 1_000;
const changeEvent = "bolets:shop-banner";

export type ShopPlacement = "banner" | "nav" | "footer" | "map-card" | "map-info" | "home";

const clickEvents = {
  banner: UMAMI_EVENTS.shopBannerClick,
  nav: UMAMI_EVENTS.shopNavClick,
  footer: UMAMI_EVENTS.shopFooterClick,
  "map-card": UMAMI_EVENTS.shopMapCardClick,
  "map-info": UMAMI_EVENTS.shopMapInfoClick,
  home: UMAMI_EVENTS.shopHomeClick,
} as const satisfies Record<ShopPlacement, string>;

/** Shopify reads the UTM tags, so each placement stays attributable in its own reports too. */
export function shopHref(placement: ShopPlacement, path = "/") {
  const url = new URL(path, SHOP_URL);
  url.searchParams.set("utm_source", "bolets.app");
  url.searchParams.set("utm_medium", placement);
  return url.toString();
}

export function trackShopClick(placement: ShopPlacement) {
  queueUmamiEvent(clickEvents[placement]);
}

/** Keep merch away from the full-screen map, species profiles and every private or technical route. */
export function isShopBannerPath(pathname: string) {
  if (pathname === "/map" || pathname.startsWith("/map/")) return false;
  if (pathname.startsWith("/bolets/") && pathname !== "/bolets/infografia") return false;
  if (pathname.startsWith("/auth/") || pathname.startsWith("/api/")) return false;
  return !isUmamiBlockedPath(pathname);
}

export function isShopBannerSnoozed(now = Date.now()) {
  try {
    return Number(window.localStorage.getItem(SHOP_BANNER_KEY)) > now;
  } catch {
    return false;
  }
}

export function dismissShopBanner() {
  try {
    window.localStorage.setItem(SHOP_BANNER_KEY, String(Date.now() + SHOP_BANNER_SNOOZE_MS));
  } catch {
    // The strip still closes for this page view through the change event.
  }
  queueUmamiEvent(UMAMI_EVENTS.shopBannerDismissed);
  window.dispatchEvent(new Event(changeEvent));
}

export function subscribeShopBanner(listener: () => void) {
  window.addEventListener(changeEvent, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(changeEvent, listener);
    window.removeEventListener("storage", listener);
  };
}

/** Runs while the strip is parsed so a snoozed strip never paints and then collapses. */
export const shopBannerPrePaintScript = `(function(){try{if(Number(localStorage.getItem(${JSON.stringify(SHOP_BANNER_KEY)}))>Date.now())document.currentScript.parentElement.hidden=true}catch(e){}})()`;
