"use client";

import { useEffect } from "react";

// Native fragments reveal closed <details> on arrival. Reloads and history
// restoration are inconsistent, so enhance only the FAQ's answer targets.
export function FaqFragmentNavigation() {
  useEffect(() => {
    let frame: number | undefined;
    const revealAnswer = () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      let id: string;
      try {
        id = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return;
      }
      const answer = document.getElementById(id);
      const details = answer?.parentElement;
      if (!answer || !(details instanceof HTMLDetailsElement) || !details.hasAttribute("data-faq-question")) return;

      details.open = true;
      frame = requestAnimationFrame(() => {
        answer.scrollIntoView({ block: "start", behavior: "instant" });
      });
    };

    revealAnswer();
    window.addEventListener("hashchange", revealAnswer);
    window.addEventListener("pageshow", revealAnswer);
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", revealAnswer);
      window.removeEventListener("pageshow", revealAnswer);
    };
  }, []);

  return null;
}
