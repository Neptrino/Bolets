"use client";

import { useSyncExternalStore } from "react";
import { ArrowUpRight, Heart } from "lucide-react";
import { ShopLink } from "@/components/shop-link";
import { ShopPrePaintScript } from "@/components/shop-pre-paint-script";
import { useContributorMapAccess } from "@/components/use-contributor-map-access";
import { isShopBannerSnoozed, subscribeShopBanner } from "@/src/lib/shop";
import type { SpatialGridSizeM } from "@/src/lib/types";

const serverSnoozed = () => false;

/** Idle-state line in the map footer; it yields to the contribution notice and honours the strip's snooze. */
export function MapShopNote({ resolution }: { resolution: SpatialGridSizeM }) {
  const access = useContributorMapAccess();
  const snoozed = useSyncExternalStore(subscribeShopBanner, () => isShopBannerSnoozed(), serverSnoozed);
  if (snoozed || (access.checked && resolution < access.minimumResolutionM)) return null;

  return <p className="map-shop-note" suppressHydrationWarning>
    <ShopPrePaintScript />
    <Heart size={14} aria-hidden="true" />
    <span>Cada compra ajuda a mantenir el mapa ·{" "}
      <ShopLink placement="map-card">
        Botiga <ArrowUpRight size={13} aria-hidden="true" />
      </ShopLink>
    </span>
  </p>;
}

/** Card in the «Sobre aquest mapa» panel for people who opened it to understand the map. */
export function MapShopCard() {
  return <aside className="map-shop-card" aria-labelledby="map-shop-card-title">
    <Heart size={20} aria-hidden="true" />
    <div>
      <h2 id="map-shop-card-title">Un mapa que es calcula cada dia</h2>
      <p>Cada dia recalculem la pluja i la temperatura de tot Catalunya, i el mapa és gratuït i sense publicitat. Cada compra a la botiga ajuda a mantenir-lo així.</p>
      <ShopLink placement="map-info" className="text-link">
        Visita la botiga <ArrowUpRight size={17} aria-hidden="true" />
      </ShopLink>
    </div>
  </aside>;
}
