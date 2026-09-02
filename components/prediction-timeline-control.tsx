"use client";

import { LoaderCircle, Pause, Play } from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { queueUmamiEvent, UMAMI_EVENTS } from "@/src/lib/umami-goals";
import type { PredictionTimelineOffset } from "@/src/lib/types";

const FIRST_OFFSET: PredictionTimelineOffset = -3;
const LAST_OFFSET: PredictionTimelineOffset = 5;

export function predictionTimelinePosition(offset: PredictionTimelineOffset) {
  return ((offset - FIRST_OFFSET) / (LAST_OFFSET - FIRST_OFFSET)) * 100;
}

export function predictionTimelineLabel(offset: PredictionTimelineOffset) {
  if (offset === 0) return { phase: "Avui", detail: "Condicions observades" };
  if (offset < 0) {
    const days = Math.abs(offset);
    return {
      phase: "Evolució",
      detail: `Fa ${days} ${days === 1 ? "dia" : "dies"}`,
    };
  }
  return {
    phase: "Previsió",
    detail: offset === 1 ? "Demà" : `D'aquí ${offset} dies`,
  };
}

export function PredictionTimelineControl({
  incomplete,
  loading,
  unavailable,
  offset,
  onChange,
}: {
  incomplete: boolean;
  loading: boolean;
  unavailable: boolean;
  offset: PredictionTimelineOffset;
  onChange: (offset: PredictionTimelineOffset) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const usageTracked = useRef(false);
  const activePlaying = playing && !unavailable && !incomplete;
  const label = predictionTimelineLabel(offset);
  const timelineStyle = {
    "--prediction-timeline-today-position": `${predictionTimelinePosition(0)}%`,
  } as CSSProperties;

  function trackTimelineUsage() {
    if (usageTracked.current) return;
    usageTracked.current = true;
    queueUmamiEvent(UMAMI_EVENTS.mapTimelineUsed);
  }

  useEffect(() => {
    if (!activePlaying || loading) return;
    const timer = window.setTimeout(() => {
      onChange((offset === LAST_OFFSET ? FIRST_OFFSET : offset + 1) as PredictionTimelineOffset);
    }, 1_150);
    return () => window.clearTimeout(timer);
  }, [activePlaying, loading, offset, onChange]);

  return (
    <section
      className="prediction-timeline"
      style={timelineStyle}
      aria-label="Evolució i previsió del mapa"
    >
      <div className="prediction-timeline-heading" aria-live="polite">
        <span>{label.phase}</span>
        <strong>{unavailable
          ? "Fotograma no disponible"
          : incomplete ? "Fotograma incomplet" : label.detail}</strong>
        {loading ? <LoaderCircle className="prediction-timeline-loader" size={15} aria-label="Carregant el fotograma" /> : null}
      </div>
      <div className="prediction-timeline-controls">
        <button
          type="button"
          className="prediction-timeline-play"
          onClick={() => {
            trackTimelineUsage();
            setPlaying((current) => !current);
          }}
          aria-label={activePlaying ? "Pausa l’animació" : "Reprodueix l’animació"}
          aria-pressed={activePlaying}
          disabled={unavailable || incomplete}
        >
          {activePlaying ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
        </button>
        <div className="prediction-timeline-range">
          <input
            type="range"
            min={FIRST_OFFSET}
            max={LAST_OFFSET}
            step="1"
            value={offset}
            onChange={(event) => {
              trackTimelineUsage();
              setPlaying(false);
              onChange(Number(event.currentTarget.value) as PredictionTimelineOffset);
            }}
            aria-label="Dia mostrat al mapa"
            aria-valuetext={`${label.phase}: ${label.detail}`}
          />
          <div className="prediction-timeline-scale" aria-hidden="true">
            <span>Fa 3 dies</span>
            <b>Avui</b>
            <span>+5 dies</span>
          </div>
        </div>
      </div>
    </section>
  );
}
