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

const madridDayFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Europe/Madrid",
});

/**
 * Whole-day offset of a unix timestamp from a reference day, counted on the
 * Europe/Madrid calendar so DST changes and provider publishing hours do not
 * shift a value onto the wrong day.
 */
function madridDayOffset(timestamp: number, reference: number) {
  const toUtcDay = (value: number) => {
    const [year, month, day] = madridDayFormatter.format(new Date(value * 1000)).split("-").map(Number);
    return Date.UTC(year!, month! - 1, day!) / 86_400_000;
  };
  return toUtcDay(timestamp) - toUtcDay(reference);
}

/**
 * Picks which daily slots receive an axis label. Slots are calendar-day
 * offsets, so gaps between points (the sparse 14-day outlook) stay visible;
 * labels only land on days that actually hold a point.
 */
function chartDaySplits(chartWidth: number, slots: number[], boundarySlot?: number) {
  if (!slots.length) return [];
  const span = Math.max(slots[slots.length - 1]! - slots[0]!, 1);
  if (chartWidth >= 520 && slots.length <= 16) return [...slots];

  const estimatedPlotWidth = Math.max(chartWidth - 56, 1);
  const dayWidth = estimatedPlotWidth / span;
  const minimumDayGap = Math.max(1, Math.ceil(64 / dayWidth));
  const selected = new Set([slots[0]!, slots[slots.length - 1]!]);
  const hasRoom = (candidate: number) => Array.from(selected).every(
    (existing) => Math.abs(existing - candidate) >= minimumDayGap,
  );

  if (boundarySlot !== undefined && hasRoom(boundarySlot)) selected.add(boundarySlot);
  for (const slot of slots) {
    if (hasRoom(slot)) selected.add(slot);
  }
  return Array.from(selected).sort((first, second) => first - second);
}

function scoreChartPlugin(boundaryIndex?: number, boundarySlot?: number): uPlot.Plugin {
  return {
    hooks: {
      draw: (chart) => {
        const ratio = uPlot.pxRatio;
        const context = chart.ctx;
        context.save();
        context.font = `${12 * ratio}px ui-sans-serif, system-ui, sans-serif`;
        context.textAlign = "center";
        context.textBaseline = "middle";

        if (boundarySlot !== undefined) {
          const boundaryX = chart.valToPos(boundarySlot, "x", true);
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
  // A coarse cell's reading is its best 2.5 km sector, so its history is
  // that sector's history too.
  const historyCell = cell.summarisedFrom ?? cell;
  const requestBody = JSON.stringify({
    speciesId,
    cellId: historyCell.cellId,
    gridSizeM: historyCell.gridSizeM,
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
    // their daily values at different hours, so place each point on its
    // calendar-day offset rather than its raw hour. Unlike a plain ordinal
    // index, day offsets keep the sparse outlook horizons (+7, +10, +12,
    // +14 days) at their true spacing instead of one slot apart.
    const dailySlots = timestamps.map((timestamp) => madridDayOffset(timestamp, timestamps[0]!));
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
    const boundarySlot = boundaryIndex === undefined ? undefined : dailySlots[boundaryIndex];
    // The final day label is centred on the last point; on narrow charts the
    // sparse outlook pushes that point close to the edge, so leave room for it.
    const narrowChart = host.clientWidth < 520;
    const chart = new uPlot({
      width: Math.max(host.clientWidth, 1),
      height: 260,
      padding: [18, narrowChart ? 30 : 14, 0, 4],
      plugins: [scoreChartPlugin(boundaryIndex, boundarySlot)],
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
          splits: (currentChart) => chartDaySplits(currentChart.width, dailySlots, boundarySlot),
          values: (_chart, values) => values.map((slot) => {
            const index = dailySlots.indexOf(Math.round(slot));
            return index >= 0 ? chartDayLabel(timestamps[index]!) : "";
          }),
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
  const simulatedForecast = state.timeline.simulated === true || forecast?.simulated === true;
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
    ? simulatedForecast
      ? "Evolució recent i simulació a 5 dies"
      : "Evolució recent i projecció a 5 dies"
    : forecast
      ? simulatedForecast
        ? "Simulació ambiental a 5 dies"
        : "Projecció ambiental a 5 dies"
      : "Evolució recent";
  const information = simulatedForecast
    ? "Simulació local amb dades fictícies per comprovar la interfície. No és una previsió meteorològica ni s’utilitza en producció."
    : forecast
    ? `La projecció combina el temps recent amb la previsió dels pròxims dies. No prediu quan apareixeran bolets i és menys segura com més s’allunya d’avui. Generada el ${dayLabel(forecast.generatedAt)}.`
    : "Cada punt compara les condicions ambientals disponibles d’aquell dia.";

  return (
    <section className="cell-score-history" aria-labelledby={titleId}>
      <div className="cell-score-history-heading">
        <div>
          <p className="eyebrow">Evolució de les condicions</p>
          <div className="cell-score-history-title-row">
            <h4 id={titleId}>{title}</h4>
            {simulatedForecast ? (
              <span className="cell-score-history-simulation">Simulació local</span>
            ) : null}
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
          <span><i className="projected" />{simulatedForecast ? "Simulat des d’ara" : "Projectat des d’ara"}</span>
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
                <td>{dayLabel(point.validAt)}</td><td>{simulatedForecast ? "Simulada" : "Projectada"}</td><td>{scoreLabel(point.opportunityIndex)}</td><td>{scoreLabel(point.fruitingConditionsScore)}</td><td>{confidenceLabel(point.horizonConfidence)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
