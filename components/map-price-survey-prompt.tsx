"use client";

import { ArrowUpRight, CalendarDays, Grid2X2, Sparkles, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { IntentLink } from "@/components/intent-link";
import {
  clickMapPriceSurveyPrompt,
  dismissMapPriceSurveyPrompt,
  hasMapPriceSurveyPromptBeenShown,
  MAP_PRICE_SURVEY_PATH,
  showMapPriceSurveyPrompt,
} from "@/src/lib/map-price-survey";
import styles from "./map-price-survey-prompt.module.css";

export const MAP_PRICE_SURVEY_PROMPT_DELAY_MS = 30_000;

export function MapPriceSurveyPrompt() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  useEffect(() => {
    if (hasMapPriceSurveyPromptBeenShown()) return;

    let remaining = MAP_PRICE_SURVEY_PROMPT_DELAY_MS;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timerStartedAt = 0;
    let interactionStarted = false;

    const stopTimer = () => {
      if (!timer) return;
      clearTimeout(timer);
      timer = undefined;
      remaining = Math.max(0, remaining - (performance.now() - timerStartedAt));
    };
    const finish = () => {
      timer = undefined;
      if (document.visibilityState !== "visible" || hasMapPriceSurveyPromptBeenShown()) return;
      showMapPriceSurveyPrompt();
      setOpen(true);
    };
    const startTimer = () => {
      if (timer || !interactionStarted || document.visibilityState !== "visible") return;
      timerStartedAt = performance.now();
      timer = setTimeout(finish, remaining);
    };
    const onInteraction = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element) || target.closest("dialog")) return;
      interactionStarted = true;
      document.removeEventListener("pointerdown", onInteraction, true);
      document.removeEventListener("wheel", onInteraction, true);
      document.removeEventListener("keydown", onInteraction, true);
      startTimer();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") startTimer();
      else stopTimer();
    };

    document.addEventListener("pointerdown", onInteraction, true);
    document.addEventListener("wheel", onInteraction, true);
    document.addEventListener("keydown", onInteraction, true);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stopTimer();
      document.removeEventListener("pointerdown", onInteraction, true);
      document.removeEventListener("wheel", onInteraction, true);
      document.removeEventListener("keydown", onInteraction, true);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const dismiss = () => {
    dismissMapPriceSurveyPrompt();
    setOpen(false);
  };

  return <dialog
    ref={dialog}
    className={styles.dialog}
    aria-labelledby={titleId}
    aria-describedby={descriptionId}
    onCancel={(event) => {
      event.preventDefault();
      dismiss();
    }}
    onClick={(event) => {
      if (event.target === event.currentTarget) dismiss();
    }}
  >
    <div className={styles.card}>
      <button type="button" className={styles.close} onClick={dismiss} aria-label="Ara no; tanca l’enquesta">
        <X size={20} aria-hidden="true" />
      </button>
      <div className={styles.heading}>
        <span className={styles.icon} aria-hidden="true"><Sparkles size={22} /></span>
        <div>
          <p className={styles.eyebrow}>Una pregunta ràpida</p>
          <h2 id={titleId}>T’ajudaria veure més detall?</h2>
        </div>
      </div>
      <p id={descriptionId} className={styles.description}>
        Estem valorant dues millores per preparar millor les sortides. Digues-nos si t’interessarien.
      </p>
      <div className={styles.benefits} aria-label="Millores proposades">
        <span><Grid2X2 size={18} aria-hidden="true" /><strong>Mapa a 250 m</strong></span>
        <span><CalendarDays size={18} aria-hidden="true" /><strong>Previsió a 14 dies</strong></span>
      </div>
      <p className={styles.note}>És una enquesta d’1 pregunta. Sense compte ni cobrament.</p>
      <div className={styles.actions}>
        <button type="button" className={styles.later} onClick={dismiss}>Ara no</button>
        <IntentLink href={MAP_PRICE_SURVEY_PATH} className={styles.cta} onClick={clickMapPriceSurveyPrompt}>
          Dona la teva opinió <ArrowUpRight size={17} aria-hidden="true" />
        </IntentLink>
      </div>
    </div>
  </dialog>;
}
