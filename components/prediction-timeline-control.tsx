"use client";

import { LoaderCircle, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import type { PredictionTimelineOffset } from "@/src/lib/types";

const FIRST_OFFSET: PredictionTimelineOffset = -6;
const LAST_OFFSET: PredictionTimelineOffset = 5;

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
  loading,
  unavailable,
  offset,
  onChange,
}: {
  loading: boolean;
  unavailable: boolean;
  offset: PredictionTimelineOffset;
  onChange: (offset: PredictionTimelineOffset) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const activePlaying = playing && !unavailable;
  const label = predictionTimelineLabel(offset);

  useEffect(() => {
    if (!activePlaying || loading) return;
    const timer = window.setTimeout(() => {
      onChange((offset === LAST_OFFSET ? FIRST_OFFSET : offset + 1) as PredictionTimelineOffset);
    }, 1_150);
    return () => window.clearTimeout(timer);
  }, [activePlaying, loading, offset, onChange]);

  return (
    <section className="prediction-timeline" aria-label="Evolució i previsió del mapa">
      <div className="prediction-timeline-heading" aria-live="polite">
        <span>{label.phase}</span>
        <strong>{unavailable ? "Fotograma no disponible" : label.detail}</strong>
        {loading ? <LoaderCircle className="prediction-timeline-loader" size={15} aria-label="Carregant el fotograma" /> : null}
      </div>
      <div className="prediction-timeline-controls">
        <button
          type="button"
          className="prediction-timeline-play"
          onClick={() => setPlaying((current) => !current)}
          aria-label={activePlaying ? "Pausa l’animació" : "Reprodueix l’animació"}
          aria-pressed={activePlaying}
          disabled={unavailable}
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
              setPlaying(false);
              onChange(Number(event.currentTarget.value) as PredictionTimelineOffset);
            }}
            aria-label="Dia mostrat al mapa"
            aria-valuetext={`${label.phase}: ${label.detail}`}
          />
          <div className="prediction-timeline-scale" aria-hidden="true">
            <span>Fa 6 dies</span>
            <b>Avui</b>
            <span>+5 dies</span>
          </div>
        </div>
      </div>
    </section>
  );
}
