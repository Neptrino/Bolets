"use client";

import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { BACKLINK_SEARCHES_PER_RUN, BRAVE_RESULTS_PER_PAGE } from "@/src/lib/backlinks/search-pagination";

import {
  updateBacklinkSettingsAction,
  type BacklinkSettingsActionState,
} from "./actions";
import styles from "./backlinks.module.css";

const INITIAL_STATE: BacklinkSettingsActionState = {
  status: "idle",
  message: "Els canvis es desen automàticament.",
  savedAt: null,
};

type BacklinkSettingsFormProps = {
  settings: {
    enabled: boolean;
    autoSend: boolean;
    dailySendLimit: number;
    minimumScore: number;
  };
  configured: {
    search: boolean;
    delivery: boolean;
    unsubscribe: boolean;
  };
};

export function BacklinkSettingsForm({ settings, configured }: BacklinkSettingsFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scheduled, setScheduled] = useState(false);
  const [state, formAction, pending] = useActionState(updateBacklinkSettingsAction, INITIAL_STATE);

  const clearScheduledSave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setScheduled(false);
  };

  const submitValidForm = () => {
    clearScheduledSave();
    if (formRef.current?.checkValidity()) formRef.current.requestSubmit();
  };

  const scheduleSave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setScheduled(true);
    timerRef.current = setTimeout(submitValidForm, 650);
  };

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const feedbackState = pending ? "saving" : state.status;
  const feedbackMessage = pending
    ? "Desant els canvis…"
    : scheduled
      ? "Canvis pendents…"
      : state.message;
  const FeedbackIcon = feedbackState === "error"
    ? AlertCircle
    : feedbackState === "saving"
      ? LoaderCircle
      : CheckCircle2;

  return (
    <form
      action={formAction}
      className={styles.settingsForm}
      ref={formRef}
      onChange={(event) => {
        const control = event.target;
        if (!(control instanceof HTMLInputElement)) return;
        if (control.type === "checkbox") submitValidForm();
        else scheduleSave();
      }}
      onBlur={(event) => {
        const control = event.target;
        if (control instanceof HTMLInputElement && control.type === "number" && scheduled) submitValidForm();
      }}
      onSubmit={clearScheduledSave}
    >
      <fieldset className={styles.settingsGroup}>
        <legend>Execució</legend>
        <div className={styles.settingsGroupBody}>
          <label className={styles.checkControl}>
            <input type="checkbox" name="enabled" defaultChecked={settings.enabled} />
            <span><strong>Descobriment i verificació</strong><small>Executa {BACKLINK_SEARCHES_PER_RUN} consultes diferents i revisa fins a {BACKLINK_SEARCHES_PER_RUN * BRAVE_RESULTS_PER_PAGE} resultats nous de Brave per cicle; després els puntua i revalida les oportunitats contactades.</small></span>
          </label>
          <label className={styles.checkControl}>
            <input type="checkbox" name="autoSend" defaultChecked={settings.autoSend} />
            <span><strong>Enviament automàtic</strong><small>Envia les preparades sense revisió manual, sempre amb límits i exclusions.</small></span>
          </label>
        </div>
      </fieldset>
      <fieldset className={styles.settingsGroup}>
        <legend>Criteris d’enviament</legend>
        <div className={`${styles.settingsGroupBody} ${styles.limitControls}`}>
          <label className={styles.fieldControl}>
            <span>Màxim per 24 hores</span>
            <input type="number" name="dailySendLimit" min="1" max="25" defaultValue={settings.dailySendLimit} />
            <small>Compta tots els correus enviats durant les últimes 24 hores.</small>
          </label>
          <label className={styles.fieldControl}>
            <span>Puntuació mínima</span>
            <input type="number" name="minimumScore" min="60" max="100" defaultValue={settings.minimumScore} />
            <small>Per sota d’aquest valor, l’oportunitat no queda preparada.</small>
          </label>
        </div>
      </fieldset>
      <footer className={styles.settingsFooter}>
        <div>
          <strong>Serveis connectats</strong>
          <div className={styles.configuration}>
            <span data-ready={configured.search}>Cerca web</span>
            <span data-ready={configured.delivery}>Enviament</span>
            <span data-ready={configured.unsubscribe}>Baixa segura</span>
          </div>
        </div>
        <p className={styles.settingsSaveStatus} data-state={feedbackState} aria-live="polite">
          <span className={styles.settingsSaveIcon}><FeedbackIcon aria-hidden="true" /></span> {feedbackMessage}
        </p>
        <noscript><button type="submit" className={styles.saveButton}>Desa els canvis</button></noscript>
      </footer>
    </form>
  );
}
