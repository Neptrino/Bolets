"use client";

import { useSyncExternalStore } from "react";
import { shopBannerPrePaintScript } from "@/src/lib/shop";

const subscribe = () => () => {};

/** Hides a snoozed shop element before first paint; client-side renders read the snooze directly instead. */
export function ShopPrePaintScript() {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  return hydrated ? null : <script dangerouslySetInnerHTML={{ __html: shopBannerPrePaintScript }} />;
}
