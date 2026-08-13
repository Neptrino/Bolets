"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useId, useState } from "react";
import type { PredictionCell, PredictionHistoryPoint } from "@/src/lib/types";

type State =
  | { kind: "loading" }
  | { kind: "ready"; points: PredictionHistoryPoint[] }
  | { kind: "unavailable" };

function dayLabel(value: string) {
  return new Intl.DateTimeFormat("ca-ES", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Madrid",
  }).format(new Date(value));
}

function scoreLine(points: PredictionHistoryPoint[]) {
  const available = points
    .map((point, index) => ({ ...point, index }))
    .filter((point): point is PredictionHistoryPoint & { index: number; score: number } => point.score !== null);
  if (!available.length) return { path: "", dots: [] as Array<{ x: number; y: number; score: number }> };
  const width = 320;
  const height = 112;
  const x = (index: number) => points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
  const y = (score: number) => height - (score / 100) * height;
  const dots = available.map((point) => ({ x: x(point.index), y: y(point.score), score: point.score }));
  return { path: dots.map((dot, index) => `${index ? "L" : "M"}${dot.x} ${dot.y}`).join(" "), dots };
}

export function CellScoreHistory({ speciesId, cell }: { speciesId: string; cell: PredictionCell }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const titleId = useId();
  const requestBody = JSON.stringify({
    speciesId,
    cellId: cell.cellId,
    regionId: cell.regionId,
    values: cell.values,
  });

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/predictions/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Prediction history unavailable");
        return response.json() as Promise<{ points: PredictionHistoryPoint[] }>;
      })
      .then(({ points }) => {
        if (!controller.signal.aborted) setState({ kind: "ready", points });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ kind: "unavailable" });
      });
    return () => controller.abort();
  }, [requestBody]);

  if (state.kind === "loading") {
    return <section className="cell-score-history" aria-busy="true"><p>Carregant l’evolució de la puntuació…</p></section>;
  }
  if (state.kind === "unavailable") {
    return <section className="cell-score-history"><p>No hi ha prou historial verificat per mostrar l’evolució d’aquesta cel·la.</p></section>;
  }

  const available = state.points.filter((point): point is PredictionHistoryPoint & { score: number } => point.score !== null);
  if (!available.length) {
    return <section className="cell-score-history"><p>No hi ha puntuacions publicables en l’historial recent d’aquesta cel·la.</p></section>;
  }
  const { path, dots } = scoreLine(state.points);
  const first = available[0];
  const last = available.at(-1)!;
  const change = last.score - first.score;
  const TrendIcon = change >= 0 ? TrendingUp : TrendingDown;
  const changeLabel = change === 0
    ? "Sense canvis des de la primera lectura disponible"
    : `${change > 0 ? "+" : ""}${change} punts des de ${dayLabel(first.observedAt)}`;

  return (
    <section className="cell-score-history" aria-labelledby={titleId}>
      <div className="cell-score-history-heading">
        <div>
          <p className="eyebrow">Evolució local</p>
          <h4 id={titleId}>Puntuació dels últims 7 dies</h4>
        </div>
        <span className={change > 0 ? "improving" : change < 0 ? "worsening" : "steady"}>
          <TrendIcon size={16} aria-hidden="true" /> {changeLabel}
        </span>
      </div>
      <svg className="cell-score-history-chart" viewBox="0 0 320 140" role="img" aria-label={`Evolució de ${available.length} puntuacions: ${changeLabel}`}>
        <line x1="0" x2="320" y1="0" y2="0" />
        <line x1="0" x2="320" y1="56" y2="56" />
        <line x1="0" x2="320" y1="112" y2="112" />
        <path d={path} />
        {dots.map((dot, index) => <circle key={index} cx={dot.x} cy={dot.y} r="3.5"><title>{dot.score}/100</title></circle>)}
        <text x="0" y="132">{dayLabel(state.points[0]?.observedAt ?? first.observedAt)}</text>
        <text x="320" y="132" textAnchor="end">{dayLabel(state.points.at(-1)?.observedAt ?? last.observedAt)}</text>
      </svg>
      <p className="cell-score-history-note">Cada punt recalcula el model actual amb les dades ambientals verificades d’aquell dia.</p>
    </section>
  );
}
