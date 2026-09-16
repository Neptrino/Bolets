"use client";

import { useEffect, type RefObject } from "react";

/** Count a survey surface only when it is actually visible in a foreground tab. */
export function useMapPriceSurveyVisibility(ref: RefObject<HTMLElement | null>, record: () => void) {
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    let visible = false;
    const recordVisible = () => {
      if (visible && document.visibilityState === "visible") record();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
      recordVisible();
    }, { threshold: 0.5 });
    observer.observe(element);
    document.addEventListener("visibilitychange", recordVisible);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", recordVisible);
    };
  }, [ref, record]);
}
