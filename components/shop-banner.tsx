"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { ArrowUpRight, ShoppingBag, X } from "lucide-react";
import {
  dismissShopBanner, isShopBannerPath, isShopBannerSnoozed,
  subscribeShopBanner,
} from "@/src/lib/shop";
import { ShopLink } from "@/components/shop-link";
import { ShopPrePaintScript } from "@/components/shop-pre-paint-script";
import styles from "./shop-banner.module.css";

const serverSnoozed = () => false;

export function ShopBanner() {
  const pathname = usePathname();
  const snoozed = useSyncExternalStore(subscribeShopBanner, () => isShopBannerSnoozed(), serverSnoozed);
  if (snoozed || !isShopBannerPath(pathname)) return null;

  return <aside className={`panel-dark ${styles.banner}`} aria-label="Botiga de Bolets" suppressHydrationWarning>
    <ShopPrePaintScript />
    <div className={styles.inner}>
      <div className={styles.message}>
        <span className={`label-caps ${styles.label}`}><ShoppingBag size={14} aria-hidden="true" /> <span className={styles.desktopMessage}>Botiga nova</span><span className={styles.mobileMessage}>Ajuda l’atles</span></span>
        <strong className={styles.desktopMessage}>Samarretes, dessuadores i làmines il·lustrades. Cada compra ajuda a mantenir l’atles obert.</strong>
        <strong className={styles.mobileMessage}>Samarretes i làmines de bolets</strong>
      </div>
      <ShopLink placement="banner" className={styles.link}>
        <span className={styles.desktopCta}>Visita la botiga</span>
        <span className={styles.mobileCta}>Botiga</span>
        <ArrowUpRight size={16} aria-hidden="true" />
      </ShopLink>
      <button type="button" className={`icon-tile ${styles.close}`} onClick={dismissShopBanner} aria-label="Amaga la botiga durant 7 dies">
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  </aside>;
}
