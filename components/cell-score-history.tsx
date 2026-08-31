"use client";

import { CircleHelp, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { PREDICTION_CACHE_VERSION } from "@/src/lib/model-versions";
import type {
  ForecastHorizonConfidence,
  PredictionCell,
  PredictionCellTimeline,
  PredictionForecastPoint,
  PredictionHistoryPoint,
} from "@/src/lib/types";

type State =
  | { kind: "loading" }
  | { kind: "ready"; timeline: PredictionCellTimeline }
  | { kind: "unavailable"; reason?: string };

function dayLabel(value: string) {
  return new Intl.DateTimeFormat("ca-ES", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Madrid",
  }).format(new Date(value));
}

const chartDayFormatter = new Intl.DateTimeFormat("ca-ES", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Madrid",
});

function chartDayLabel(timestamp: number) {
  return chartDayFormatter.format(new Date(timestamp * 1000));
}

function scoreChartPlugin(boundaryIndex?: number): uPlot.Plugin {
  return {
    hooks: {
      draw: (chart) => {
        const ratio = uPlot.pxRatio;
        const context = chart.ctx;
        context.save();
        context.font = `${12 * ratio}px ui-sans-serif, system-ui, sans-serif`;
        context.textAlign = "center";
        context.textBaseline = "middle";

        if (boundaryIndex !== undefined) {
          const boundaryX = chart.valToPos(boundaryIndex, "x", true);
          context.strokeStyle = "rgba(117, 91, 67, 0.42)";
          context.lineWidth = ratio;
          context.setLineDash([4 * ratio, 5 * ratio]);
          context.beginPath();
          context.moveTo(boundaryX, chart.bbox.top);
          context.lineTo(boundaryX, chart.bbox.top + chart.bbox.height);
          context.stroke();
          context.setLineDash([]);
        }

        const narrow = chart.width < 520;
        [1, 2].forEach((seriesIndex) => {
          const seriesValues = Array.from(chart.data[seriesIndex] as ArrayLike<number | null | undefined>);
          const availableIndices = seriesValues
            .flatMap((score, index) => score === null || score === undefined ? [] : [index]);
          seriesValues.forEach((score, index) => {
            if (score === null || score === undefined) return;
            if (seriesIndex === 2 && boundaryIndex === index) return;
            if (narrow && index !== availableIndices.at(-1)) return;
            const x = chart.valToPos(chart.data[0][index], "x", true);
            const pointY = chart.valToPos(score, "y", true);
            const label = `${score}`;
            const width = context.measureText(label).width + 14 * ratio;
            const height = 20 * ratio;
            const y = pointY - 18 * ratio < chart.bbox.top
              ? pointY + 18 * ratio
              : pointY - 18 * ratio;

            context.fillStyle = "rgba(255, 250, 240, 0.96)";
            context.strokeStyle = seriesIndex === 1
              ? "rgba(40, 115, 78, 0.24)"
              : "rgba(154, 85, 40, 0.30)";
            context.lineWidth = ratio;
            context.beginPath();
            context.roundRect(x - width / 2, y - height / 2, width, height, 6 * ratio);
            context.fill();
            context.stroke();
            context.fillStyle = seriesIndex === 1 ? "#245f43" : "#8a4a26";
            context.fillText(label, x, y + 0.5 * ratio);
          });
        });
        context.restore();
      },
    },
  };
}

function confidenceLabel(confidence: ForecastHorizonConfidence) {
  return { high: "alta", moderate: "moderada", limited: "limitada" }[confidence];
}

function scoreLabel(score: number | null) {
  return score === null ? "Sense dades" : `${score}/100`;
}

export function CellScoreHistory({ speciesId, cell }: { speciesId: string; cell: PredictionCell }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const chartRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const informationId = useId();
  const requestBody = JSON.stringify({
    speciesId,
    cellId: cell.cellId,
    gridSizeM: cell.gridSizeM,
    regionId: cell.regionId,
    values: cell.values,
  });

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/predictions/history?v=${encodeURIComponent(PREDICTION_CACHE_VERSION)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Prediction history unavailable (${response.status})`);
        return response.json() as Promise<PredictionCellTimeline>;
      })
      .then((timeline) => {
        if (!controller.signal.aborted) setState({ kind: "ready", timeline });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({
          kind: "unavailable",
          reason: error instanceof Error ? error.message : undefined,
        });
      });
    return () => controller.abort();
  }, [cell.gridSizeM, requestBody]);

  useEffect(() => {
    if (state.kind !== "ready" || !chartRef.current) return;
    const host = chartRef.current;
    const { observed, forecast } = state.timeline;
    const timestamps = [
      ...observed.map((point) => new Date(point.observedAt).getTime() / 1000),
      ...(forecast?.points.map((point) => new Date(point.validAt).getTime() / 1000) ?? []),
    ];
    if (!timestamps.length) return;
    // This is a daily summary. Historical and forecast providers can publish
    // their daily values at different hours, so use ordinal daily slots rather
    // than those raw hours to avoid visually compressing adjacent dates.
    const dailySlots = timestamps.map((_timestamp, index) => index);
    const observedScores = [
      ...observed.map((point) => point.score),
      ...Array(forecast?.points.length ?? 0).fill(null),
    ];
    const projectedScores: Array<number | null> = Array(timestamps.length).fill(null);
    const anchorObservedIndex = forecast
      ? observed.findIndex((point) => Date.parse(point.observedAt) === Date.parse(forecast.anchor.observedAt))
      : -1;
    if (forecast && anchorObservedIndex >= 0) {
      projectedScores[anchorObservedIndex] = forecast.anchor.score;
    }
    forecast?.points.forEach((point, index) => {
      projectedScores[observed.length + index] = point.score;
    });
    const boundaryIndex = forecast && anchorObservedIndex >= 0
      ? anchorObservedIndex
      : undefined;
    const chart = new uPlot({
      width: Math.max(host.clientWidth, 1),
      height: 260,
      padding: [18, 14, 0, 4],
      plugins: [scoreChartPlugin(boundaryIndex)],
      series: [
        {},
        {
          label: "Calculat",
          stroke: "#28734e",
          width: 3,
          points: {
            show: true,
            size: 10,
            fill: "#fffaf0",
            stroke: "#28734e",
            width: 3,
          },
        },
        {
          label: "Projectat",
          stroke: "#a85e31",
          width: 3,
          dash: [8, 6],
          points: {
            show: true,
            size: 10,
            fill: "#fffaf0",
            stroke: "#a85e31",
            width: 3,
          },
        },
      ],
      scales: {
        x: {
          time: false,
          range: (_chart, minimum, maximum) => minimum === maximum
            ? [minimum - 0.5, maximum + 0.5]
            : [minimum - 0.35, maximum + 0.35],
        },
        y: { range: [0, 100] },
      },
      axes: [
        {
          stroke: "#7b8179",
          font: "600 12px ui-sans-serif, system-ui, sans-serif",
          size: 34,
          gap: 9,
          splits: (currentChart) => currentChart.width < 520
            ? dailySlots.filter((_slot, index) =>
              index === anchorObservedIndex || index === timestamps.length - 1 || index % 2 === 0)
            : dailySlots,
          values: (_chart, values) => values.map((slot) =>
            chartDayLabel(timestamps[Math.round(slot)] ?? timestamps[0]!)),
          grid: { stroke: "rgba(105, 112, 99, 0.10)", width: 1 },
          ticks: { show: false },
          border: { show: false },
        },
        {
          stroke: "#7b8179",
          font: "600 12px ui-sans-serif, system-ui, sans-serif",
          size: 40,
          gap: 8,
          splits: [0, 25, 50, 75, 100],
          values: (_chart, values) => values.map(String),
          grid: { stroke: "rgba(105, 112, 99, 0.12)", width: 1 },
          ticks: { show: false },
          border: { show: false },
        },
      ],
      legend: { show: false },
      cursor: { show: false },
    }, [dailySlots, observedScores, projectedScores], host);
    const observer = new ResizeObserver(() => chart.setSize({ width: Math.max(host.clientWidth, 1), height: 260 }));
    observer.observe(host);
    return () => { observer.disconnect(); chart.destroy(); };
  }, [state]);

  if (state.kind === "loading") {
    return <section className="cell-score-history" aria-busy="true"><p>Carregant l’evolució i la projecció…</p></section>;
  }
  if (state.kind === "unavailable") {
    return <section className="cell-score-history"><p>No s’ha pogut carregar l’evolució d’aquest sector.</p></section>;
  }

  const { observed, forecast } = state.timeline;
  const observedAvailable = observed.filter((point): point is PredictionHistoryPoint & { score: number } => point.score !== null);
  const projectedAvailable = forecast?.points.filter(
    (point): point is PredictionForecastPoint & { score: number } => point.score !== null,
  ) ?? [];
  if (!observedAvailable.length && !projectedAvailable.length) {
    return <section className="cell-score-history"><p>No hi ha prou dades per mostrar l’evolució recent d’aquest sector.</p></section>;
  }
  const latestObserved = observedAvailable.at(-1);
  const latestProjected = projectedAvailable.at(-1);
  const firstObserved = observedAvailable[0];
  const projectionChange = forecast && latestProjected
    ? latestProjected.score - forecast.anchor.score
    : undefined;
  const observedChange = firstObserved && latestObserved
    ? latestObserved.score - firstObserved.score
    : undefined;
  const change = projectionChange ?? observedChange ?? 0;
  const TrendIcon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
  const changeLabel = forecast && latestProjected
    ? projectionChange === 0
      ? `D’ara a +${latestProjected.horizonDays} dies: sense canvis`
      : `D’ara a +${latestProjected.horizonDays} dies: ${projectionChange! > 0 ? "+" : ""}${projectionChange} punts`
    : observedChange === 0
      ? "Sense canvis en l’historial disponible"
      : `${observedChange! > 0 ? "+" : ""}${observedChange} punts des de ${dayLabel(firstObserved!.observedAt)}`;
  const title = observed.length && forecast
    ? "Evolució recent i projecció a 5 dies"
    : forecast
      ? "Projecció ambiental a 5 dies"
      : "Evolució recent";
  const information = forecast
    ? `La projecció combina el temps recent amb la previsió dels pròxims dies. No prediu quan apareixeran bolets i és menys segura com més s’allunya d’avui. Generada el ${dayLabel(forecast.generatedAt)}.`
    : "Cada punt compara les condicions ambientals disponibles d’aquell dia.";

  return (
    <section className="cell-score-history" aria-labelledby={titleId}>
      <div className="cell-score-history-heading">
        <div>
          <p className="eyebrow">Evolució de les condicions</p>
          <div className="cell-score-history-title-row">
            <h4 id={titleId}>{title}</h4>
            <button
              type="button"
              className="cell-score-history-help"
              aria-label="Com es calcula aquesta projecció"
              aria-describedby={informationId}
            >
              <CircleHelp aria-hidden="true" size={16} />
            </button>
            <span
              className="cell-score-history-tooltip"
              id={informationId}
              role="tooltip"
            >
              {information}
            </span>
          </div>
        </div>
        <span className={change > 0 ? "improving" : change < 0 ? "worsening" : "steady"}>
          <TrendIcon size={16} aria-hidden="true" /> {changeLabel}
        </span>
      </div>
      <div className="cell-score-history-legend" aria-hidden="true">
        {observed.length ? <span><i className="observed" />Calculat</span> : null}
        {forecast ? <>
          <span><i className="projected" />Projectat des d’ara</span>
          {observed.length ? <span><i className="boundary" />Inici de la projecció</span> : null}
        </> : null}
      </div>
      <div ref={chartRef} className="cell-score-history-chart" aria-hidden="true" />
      {!forecast ? (
        <p className="cell-score-forecast-unavailable">La projecció meteorològica encara no està disponible; es manté l’historial observat.</p>
      ) : null}
      <div className="visually-hidden">
        <table>
          <caption>Evolució recent i previsió de les condicions</caption>
          <thead><tr><th scope="col">Data</th><th scope="col">Tipus</th><th scope="col">Valoració del sector</th><th scope="col">Condicions del moment</th><th scope="col">Fiabilitat de la previsió</th></tr></thead>
          <tbody>
            {observed.map((point) => (
              <tr key={`observed:${point.observedAt}`}>
                <td>{dayLabel(point.observedAt)}</td><td>Calculada</td><td>{scoreLabel(point.opportunityIndex)}</td><td>{scoreLabel(point.fruitingConditionsScore)}</td><td>No aplicable</td>
              </tr>
            ))}
            {forecast?.points.map((point) => (
              <tr key={`projected:${point.validAt}`}>
                <td>{dayLabel(point.validAt)}</td><td>Projectada</td><td>{scoreLabel(point.opportunityIndex)}</td><td>{scoreLabel(point.fruitingConditionsScore)}</td><td>{confidenceLabel(point.horizonConfidence)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
