"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Sparkles, X } from "lucide-react";
import { IntentLink } from "@/components/intent-link";
import { useMapPriceSurveyVisibility } from "@/components/use-map-price-survey-visibility";
import {
  clickMapPriceSurveyBanner, dismissMapPriceSurveyBanner, isMapPriceSurveyBannerHidden,
  MAP_PRICE_SURVEY_PATH, showMapPriceSurvey, subscribeMapPriceSurvey,
} from "@/src/lib/map-price-survey";
import { isUmamiBlockedPath } from "@/src/lib/umami-privacy";
import styles from "./map-price-survey-banner.module.css";

const serverHidden = () => false;

function VisibleBanner() {
  const banner = useRef<HTMLElement>(null);
  useMapPriceSurveyVisibility(banner, showMapPriceSurvey);

  useEffect(() => {
    const element = banner.current;
    if (!element) return;
    const updateHeight = () => document.documentElement.style.setProperty(
      "--map-price-banner-height", `${element.getBoundingClientRect().height}px`,
    );
    updateHeight();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateHeight) : null;
    observer?.observe(element);
    return () => {
      observer?.disconnect();
      document.documentElement.style.removeProperty("--map-price-banner-height");
    };
  }, []);

  return <aside ref={banner} className={styles.banner} aria-label="Enquesta sobre el mapa detallat">
    <div className={styles.inner}>
      <div className={styles.message}>
        <span className={styles.label}><Sparkles size={14} aria-hidden="true" /> Enquesta · Ajuda’ns</span>
        <strong>Mapa a 250 m i previsió a 14 dies. T’interessaria?</strong>
      </div>
      <IntentLink href={MAP_PRICE_SURVEY_PATH} className={styles.link} onClick={clickMapPriceSurveyBanner}>
        Dona la teva opinió <ArrowUpRight size={16} aria-hidden="true" />
      </IntentLink>
      <button type="button" className={styles.close} onClick={dismissMapPriceSurveyBanner} aria-label="Tanca el bàner de l’enquesta">
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  </aside>;
}

export function MapPriceSurveyBanner() {
  const pathname = usePathname();
  const hidden = useSyncExternalStore(subscribeMapPriceSurvey, isMapPriceSurveyBannerHidden, serverHidden);
  if (hidden || pathname === MAP_PRICE_SURVEY_PATH || isUmamiBlockedPath(pathname) ||
    pathname.startsWith("/auth/") || pathname.startsWith("/api/")) return null;
  return <VisibleBanner />;
}
