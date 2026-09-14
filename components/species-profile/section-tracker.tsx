"use client";

import { useEffect } from "react";
import { queueUmamiEvent, UMAMI_EVENTS, type UmamiEventName } from "@/src/lib/umami-goals";

export type TrackedSection = { id: string; event: UmamiEventName };

// Records, once per page view, which profile sections a reader actually
// reaches and whether the in-page "Contingut" navigation is used. Events carry
// no payload: the privacy guard already strips the URL, so each section needs
// its own event name.
export function SpeciesSectionTracker({ sections, navSelector }: {
  sections: TrackedSection[];
  navSelector?: string;
}) {
  const sectionKey = sections.map((section) => `${section.id}:${section.event}`).join(",");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const pending = new Map<Element, UmamiEventName>();
    for (const entry of sectionKey.split(",")) {
      const [id, event] = entry.split(":");
      const element = id ? document.getElementById(id) : null;
      if (element && event) pending.set(element, event as UmamiEventName);
    }
    if (!pending.size) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const event = pending.get(entry.target);
        if (!event) continue;
        pending.delete(entry.target);
        observer.unobserve(entry.target);
        queueUmamiEvent(event);
      }
    }, { rootMargin: "0px 0px -40% 0px", threshold: 0 });
    pending.forEach((_, element) => observer.observe(element));
    return () => observer.disconnect();
  }, [sectionKey]);

  useEffect(() => {
    if (!navSelector) return;
    const nav = document.querySelector(navSelector);
    if (!nav) return;
    const onClick = (event: Event) => {
      const link = (event.target as Element | null)?.closest?.("a[href^='#']");
      if (link) queueUmamiEvent(UMAMI_EVENTS.speciesNavClick);
    };
    nav.addEventListener("click", onClick);
    return () => nav.removeEventListener("click", onClick);
  }, [navSelector]);

  return null;
}
