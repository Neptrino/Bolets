"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import {
  Clock3,
  Cloud,
  CloudRain,
  Database,
  Droplets,
  Snowflake,
  ThermometerSun,
  Wind,
} from "lucide-react";
import type {
  ConditionSnapshot,
  HistoricalOccurrenceEvidence,
  OccurrenceEvidenceStatus,
  SpatialGridSizeM,
  SpeciesProfile,
  SuitabilityResult,
} from "@/src/lib/types";
import { formatGridDimensions } from "@/src/lib/map-grid";
import { getConditionPredictionStatus } from "@/src/lib/condition-presentation";
import {
  getSuitabilityBand,
  suitabilityScale,
} from "@/src/lib/suitability-scale";
import { regionLabels } from "@/data/regions";

type FactorChartItem = { name: string; score: number };
type ConditionStat = { label: string; value: string };

const temperature = (value: number | undefined) =>
  value === undefined ? "—" : `${value.toFixed(1)} °C`;
const percentage = (value: number | undefined, ratio = false) =>
  value === undefined ? "—" : `${Math.round(value * (ratio ? 100 : 1))}%`;
const speed = (value: number | undefined) =>
  value === undefined ? "—" : `${Math.round(value)} km/h`;
const lowercaseInitial = (value: string) =>
  value
    ? `${value.charAt(0).toLocaleLowerCase("ca-ES")}${value.slice(1)}`
    : value;

function readingTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "hora desconeguda";
  return new Intl.DateTimeFormat("ca-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(date);
}

function FactorTooltip({ active, payload }: TooltipContentProps) {
  const item = payload?.[0]?.payload as FactorChartItem | undefined;
  if (!active || !item) return null;
  const band = getSuitabilityBand(item.score);

  return (
    <div className="factor-tooltip" style={{ borderColor: band.color }}>
      <span>{item.name}</span>
      <strong>{band.label}</strong>
      <p>{band.description}</p>
    </div>
  );
}

export function ConditionComparison({
  species,
  snapshot,
  result,
  cellId,
  cellGridSizeM,
  occurrenceEvidence,
  occurrenceEvidenceStatus,
  onReset,
  expanded = false,
}: {
  species: SpeciesProfile;
  snapshot: ConditionSnapshot;
  result: SuitabilityResult;
  cellId?: string;
  cellGridSizeM?: SpatialGridSizeM;
  occurrenceEvidence?: HistoricalOccurrenceEvidence | null;
  occurrenceEvidenceStatus?: OccurrenceEvidenceStatus;
  onReset?: () => void;
  expanded?: boolean;
}) {
  const v = snapshot.values;
  const predictionStatus = getConditionPredictionStatus(snapshot.stale, result);
  const atmosphericResolution = v.atmosphericResolutionM
    ? `${(v.atmosphericResolutionM / 1000).toLocaleString("ca-ES")} km`
    : undefined;
  const soilResolution = v.soilMoistureResolutionM
    ? `${(v.soilMoistureResolutionM / 1000).toLocaleString("ca-ES")} km`
    : undefined;
  const chart: FactorChartItem[] = result.contributions
    .filter((item) => item.score !== null)
    .map((item) => ({
      name: item.label.replace("Compatibilitat ", ""),
      score: item.score ?? 0,
    }));
  const unavailableFactors = snapshot.stale
    ? []
    : result.contributions.filter((item) => item.score === null);
  const unavailableFactorCopy = cellId
    ? "No disponible per a aquesta cel·la"
    : "No disponible en la lectura territorial";
  const data: Array<{
    label: string;
    period: string;
    current: string;
    context: string;
    stats: ConditionStat[];
    icon: typeof ThermometerSun;
  }> = [
    {
      label: "Temperatura",
      period: "ara",
      current: temperature(v.temperatureC),
      context: `Finestra ideal: ${species.ecologicalConfig.climate.temperatureRange[0]}–${species.ecologicalConfig.climate.temperatureRange[1]} °C`,
      stats: [
        { label: "Mín · 24 h", value: temperature(v.temperatureMin24hC) },
        { label: "Mitj · 24 h", value: temperature(v.temperatureAvg24hC) },
        { label: "Màx · 24 h", value: temperature(v.temperatureMax24hC) },
      ],
      icon: ThermometerSun,
    },
    {
      label: "Humitat del sòl",
      period: "ara · 3–9 cm",
      current: percentage(v.soilMoisture, true),
      context: `Perfil ideal: ${species.ecologicalConfig.climate.soilMoisture.toLowerCase()}`,
      stats: [
        { label: "Mín · 24 h", value: percentage(v.soilMoistureMin24h, true) },
        { label: "Mitj · 24 h", value: percentage(v.soilMoistureAvg24h, true) },
        { label: "Màx · 24 h", value: percentage(v.soilMoistureMax24h, true) },
      ],
      icon: Droplets,
    },
    {
      label: "Humitat de l’aire",
      period: "ara",
      current: percentage(v.relativeHumidity),
      context: `Perfil ideal: ${species.ecologicalConfig.climate.relativeHumidity.toLowerCase()}`,
      stats: [
        { label: "Mín · 24 h", value: percentage(v.relativeHumidityMin24h) },
        { label: "Mitj · 24 h", value: percentage(v.relativeHumidityAvg24h) },
        { label: "Màx · 24 h", value: percentage(v.relativeHumidityMax24h) },
      ],
      icon: Cloud,
    },
    {
      label: "Pluja acumulada",
      period: "últimes 168 h",
      current:
        v.rainfall7dMm === undefined ? "—" : `${Math.round(v.rainfall7dMm)} mm`,
      context: `Patró preferit de l’espècie: ${lowercaseInitial(species.ecologicalConfig.rainfall.preferredAccumulation)}`,
      stats: [],
      icon: CloudRain,
    },
    {
      label: "Vent",
      period: "ara",
      current: speed(v.windKmh),
      context: species.ecologicalConfig.climate.wind,
      stats: [
        { label: "Mitj · 24 h", value: speed(v.windAvg24hKmh) },
        { label: "Màx · 24 h", value: speed(v.windMax24hKmh) },
        { label: "Ratxa · 24 h", value: speed(v.windGustMax24hKmh) },
      ],
      icon: Wind,
    },
  ];
  const frostState =
    v.frostHours7d === undefined
      ? "unknown"
      : v.frostHours7d > 0
        ? "warning"
        : "clear";
  const sourceTime = v.weatherObservedAt
    ? readingTime(v.weatherObservedAt)
    : snapshot.stale
      ? "no disponible"
      : readingTime(snapshot.observedAt);
  return (
    <div
      className={`conditions-panel${expanded ? " conditions-panel-expanded" : ""}`}
    >
      <div className={`conditions-heading ${predictionStatus.kind}`}>
        <div>
          <p className="eyebrow">
            {cellId
              ? `Cel·la seleccionada · ${formatGridDimensions(cellGridSizeM ?? 250)}`
              : "Lectura territorial"}
          </p>
          <h3>Condicions actuals · {regionLabels[snapshot.regionId]}</h3>
          {cellId && onReset ? (
            <button
              type="button"
              className="conditions-reset"
              onClick={onReset}
            >
              Tornar a la lectura regional
            </button>
          ) : null}
        </div>
        <div
          className={`suitability-score ${predictionStatus.kind}`}
        >
          <strong>{result.score ?? "—"}</strong>
          <span>{predictionStatus.label}</span>
        </div>
      </div>
      {snapshot.stale && (
        <p className="data-note">
          No hi ha una instantània ambiental verificada per a aquesta àrea. No
          es calcula cap predicció fins que la ingestió diària publiqui dades
          amb data i procedència.
        </p>
      )}
      {predictionStatus.kind === "score-withheld" && (
        <p className="data-note prediction-withheld-note">
          <strong>Puntuació no disponible amb aquesta lectura.</strong>{" "}
          {cellId
            ? "Les dades ambientals visibles són vàlides, però aquesta cel·la no incorpora tots els factors necessaris per publicar una puntuació."
            : "Les dades meteorològiques són actuals, però cal seleccionar una cel·la del mapa per incorporar-hi l’hàbitat i el sòl."}
        </p>
      )}
      {cellId && (
        <p className="data-note">
          Relleu, coberta i sòl corresponen a aquesta cel·la.{" "}
          {v.weatherModel
            ? `Atmosfera: ${v.weatherModel}${atmosphericResolution ? ` · ${atmosphericResolution}` : ""}. `
            : ""}
          {soilResolution
            ? `Humitat del sòl: ${soilResolution}.`
            : "El temps pot ser compartit amb cel·les veïnes perquè la seva resolució real és més baixa."}
        </p>
      )}
      {cellId && occurrenceEvidenceStatus ? (
        <div className={`occurrence-evidence ${occurrenceEvidenceStatus}`}>
          <Database size={18} />
          <div>
            <strong>Evidència històrica · quadrícula de 10 km</strong>
            {occurrenceEvidenceStatus === "supported" && occurrenceEvidence ? (
              <>
                <span>
                  {occurrenceEvidence.recordCount}{" "}
                  {occurrenceEvidence.recordCount === 1
                    ? "registre publicat"
                    : "registres publicats"}
                  {occurrenceEvidence.observedYearMin &&
                  occurrenceEvidence.observedYearMax
                    ? occurrenceEvidence.observedYearMin ===
                      occurrenceEvidence.observedYearMax
                      ? ` · ${occurrenceEvidence.observedYearMin}`
                      : ` · ${occurrenceEvidence.observedYearMin}–${occurrenceEvidence.observedYearMax}`
                    : ""}
                  . És corroboració històrica; no modifica la puntuació
                  ambiental actual.
                </span>
                <small>
                  {occurrenceEvidence.sources.map((source, index) => (
                    <span key={source.datasetKey}>
                      {index > 0 ? " · " : ""}
                      <a
                        href={source.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {source.title}
                      </a>
                      {source.doi ? (
                        <>
                          {" "}
                          ·{" "}
                          <a
                            href={`https://doi.org/${source.doi}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            DOI
                          </a>
                        </>
                      ) : null}
                      <>
                        {" "}
                        ·{" "}
                        <a
                          href={source.licenseUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          llicència
                        </a>
                      </>
                    </span>
                  ))}
                </small>
              </>
            ) : occurrenceEvidenceStatus === "no-records" ? (
              <span>
                No s’hi han trobat registres publicats. Això no és evidència
                d’absència: el mostreig històric és incomplet i desigual.
              </span>
            ) : (
              <span>
                La capa d’ocurrències no està disponible ara mateix. La
                puntuació ambiental es manté independent d’aquesta incidència.
              </span>
            )}
          </div>
        </div>
      ) : null}
      <p className="condition-window-note">
        <Clock3 size={15} />
        <span>
          <strong>Lectura del model: {sourceTime}.</strong> «Ara» és la darrera
          estimació; mín/mitj/màx resumeixen les últimes 24 h i la pluja, les
          últimes 168 h. No són mesures d’una estació.
        </span>
      </p>
      <div className="condition-list">
        {data.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label}>
              <div className="condition-card-heading">
                <Icon size={18} />
                <span>{item.label}</span>
                <small>{item.period}</small>
              </div>
              <strong className="condition-current">{item.current}</strong>
              <p className="condition-context">{item.context}</p>
              {item.stats.length > 0 && (
                <dl className="condition-stats">
                  {item.stats.map((stat) => (
                    <div key={stat.label}>
                      <dt>{stat.label}</dt>
                      <dd>{stat.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </article>
          );
        })}
      </div>
      <div className={`frost-status ${frostState}`}>
        <Snowflake size={18} />
        <div>
          <strong>
            {frostState === "warning"
              ? "Gelada detectada els últims 7 dies"
              : frostState === "clear"
                ? "Cap gelada detectada els últims 7 dies"
                : "Historial de gelada no disponible"}
          </strong>
          <span>
            {frostState === "warning"
              ? `Mínima de ${temperature(v.temperatureMin7dC)} i ${v.frostHours7d} ${v.frostHours7d === 1 ? "hora" : "hores"} a 0 °C o menys. La predicció queda limitada encara que la mitjana sigui bona.`
              : frostState === "clear"
                ? `Mínima del període: ${temperature(v.temperatureMin7dC)}.`
                : "La predicció no pot descartar un episodi de fred extrem."}
          </span>
        </div>
      </div>
      <div className="factor-chart">
        <div className="chart-caption">
          <span>Idoneïtat per factor</span>
          <strong>
            {predictionStatus.kind === "available" && result.score !== null
              ? getSuitabilityBand(result.score).label
              : predictionStatus.label.charAt(0).toUpperCase() +
                predictionStatus.label.slice(1)}
          </strong>
        </div>
        <p className="factor-chart-explanation">
          La barra mostra com encaixa cada factor amb el perfil ideal de
          l’espècie; no és una probabilitat de trobar bolets.
        </p>
        {unavailableFactors.length > 0 && (
          <dl
            className="unavailable-factor-list"
            aria-label="Factors necessaris no disponibles"
          >
            {unavailableFactors.map((factor) => (
              <div key={factor.id}>
                <dt>{factor.label}</dt>
                <dd>{unavailableFactorCopy}</dd>
              </div>
            ))}
          </dl>
        )}
        <ResponsiveContainer width="100%" height={expanded ? 250 : 220}>
          <BarChart
            data={chart}
            layout="vertical"
            margin={{ left: 6, right: 8 }}
          >
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              dataKey="name"
              type="category"
              width={expanded ? 132 : 112}
              tick={{ fill: "#eadfca", fontSize: expanded ? 15 : 14 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(242,167,102,.08)" }}
              content={FactorTooltip}
              wrapperStyle={{ outline: "none" }}
            />
            <Bar dataKey="score" radius={[0, 5, 5, 0]}>
              {chart.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={getSuitabilityBand(entry.score).color}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div
          className="factor-scale"
          aria-label="Escala d’idoneïtat de molt dolent a excel·lent"
        >
          {suitabilityScale.map((band) => (
            <div key={band.id}>
              <i style={{ backgroundColor: band.color }} />
              <span>{band.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
