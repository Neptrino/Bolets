"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useId, useRef } from "react";

import styles from "./backlinks.module.css";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "details > summary",
  "input:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function BacklinkSidePanel({
  children,
  closeHref,
  subtitle,
  title,
}: {
  children: ReactNode;
  closeHref: string;
  subtitle: string;
  title: string;
}) {
  const router = useRouter();
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closePanel = useCallback(() => {
    router.replace(closeHref, { scroll: false });
  }, [closeHref, router]);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closePanel();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true");
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [closePanel]);

  return (
    <div className={styles.panelBackdrop} onMouseDown={(event) => {
      if (event.target === event.currentTarget) closePanel();
    }}>
      <aside
        aria-labelledby={titleId}
        aria-modal="true"
        className={styles.sidePanel}
        ref={panelRef}
        role="dialog"
      >
        <header className={styles.panelHeader}>
          <div>
            <span>Detall de l’oportunitat</span>
            <h2 id={titleId}>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button aria-label="Tanca el detall" onClick={closePanel} ref={closeRef} type="button">
            <X aria-hidden="true" />
          </button>
        </header>
        <div className={styles.panelBody}>{children}</div>
      </aside>
    </div>
  );
}
