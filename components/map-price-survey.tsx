"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CalendarDays, Map } from "lucide-react";
import { SectionHeader } from "@/components/page-layout";
import { useMapPriceSurveyVisibility } from "@/components/use-map-price-survey-visibility";
import {
  answerMapPriceSurvey, getMapPriceSurveyState, MAP_PRICE_SURVEY_ANSWERS,
  loadMapPriceSurvey, openMapPriceSurvey, subscribeMapPriceSurvey,
} from "@/src/lib/map-price-survey";
import styles from "./map-price-survey.module.css";

const serverState = () => "" as const;

export function MapPriceSurvey() {
  const question = useRef<HTMLDivElement>(null);
  const state = useSyncExternalStore(subscribeMapPriceSurvey, getMapPriceSurveyState, serverState);
  const answer = MAP_PRICE_SURVEY_ANSWERS.find(({ value }) => value === state);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useMapPriceSurveyVisibility(question, openMapPriceSurvey);

  async function load() {
    setError("");
    try { await loadMapPriceSurvey(); setReady(true); }
    catch { setError("No podem carregar l’enquesta ara. Torna-ho a provar."); }
  }

  useEffect(() => {
    let active = true;
    function refresh() {
      loadMapPriceSurvey().then(() => { if (active) { setReady(true); setError(""); } })
        .catch(() => { if (active) setError("No podem carregar l’enquesta ara. Torna-ho a provar."); });
    }
    function changed(event: StorageEvent) { if (event.key?.endsWith(":receipt")) refresh(); }
    refresh();
    window.addEventListener("storage", changed);
    return () => { active = false; window.removeEventListener("storage", changed); };
  }, []);

  async function submit(value: (typeof MAP_PRICE_SURVEY_ANSWERS)[number]["value"]) {
    setSaving(true);
    setError("");
    try { await answerMapPriceSurvey(value); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No s’ha pogut desar. Torna-ho a provar."); }
    finally { setSaving(false); }
  }

  return <section className={styles.survey} aria-labelledby="map-price-question">
    <div className={`panel-dark ${styles.offer}`}>
      <ul>
        <li><Map size={20} aria-hidden="true" /> Sectors de 250 m</li>
        <li><CalendarDays size={20} aria-hidden="true" /> Previsió a 14 dies</li>
      </ul>
    </div>
    <div ref={question}>
      <SectionHeader meta="Una pregunta · sense compromís" title="Quant pagaries l’any?" titleId="map-price-question" size="compact"
        description="Tria el preu més alt d’aquests tres que estaries disposat a pagar per aquesta proposta." />
    </div>
    <div className={styles.answers} role="group" aria-labelledby="map-price-question">
      {MAP_PRICE_SURVEY_ANSWERS.map((option) => <button
        key={option.value}
        type="button"
        disabled={!ready || saving || Boolean(answer)}
        aria-pressed={ready && state === option.value}
        onClick={() => submit(option.value)}
      >{option.label}</button>)}
    </div>
    <p className={styles.status} role="status">{saving ? "Desant la teva resposta…" : ready && answer
      ? `Resposta desada. Gràcies per donar-nos la teva opinió. Has triat: ${answer.label}.`
      : ready ? "Només és una enquesta. Sense compte ni cobrament." : "Carregant l’enquesta…"}</p>
    {error && <div role="alert"><p>{error}</p>{!ready && <button type="button" className="button" onClick={load}>Torna-ho a provar</button>}</div>}
    <p className={styles.status}>Desem la resposta i fem servir una galeta per evitar duplicats. <a href="/avis-legal#enquesta">Privadesa de l’enquesta</a></p>
  </section>;
}
