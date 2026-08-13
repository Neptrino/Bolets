"use client";

import {
  Clock3,
  Cloud,
  CloudRain,
  CircleHelp,
  Database,
  Droplets,
  Layers3,
  Mountain,
  Snowflake,
  ThermometerSun,
  Trees,
  Wind,
} from "lucide-react";
import type {
  ConditionSnapshot,
  CoordinateBounds,
  GeologicalSubstrateEvidence,
  HistoricalOccurrenceEvidence,
  ModelFactor,
  OccurrenceEvidenceStatus,
  RegionalPredictionSummary,
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

type FactorChartItem = { name: string; fullName: string; score: number };
type ConditionStat = {
  label: string;
  value: string;
  explanation?: string;
};

const factorChartNames: Record<ModelFactor["id"], string> = {
  forest: "Hàbitat",
  soil: "Sòl",
  rainfall: "Pluja recent",
  soilMoisture: "Humitat sòl",
  temperature: "Temperatura",
  altitude: "Altitud",
  humidity: "Humitat aire",
  seasonality: "Temporada",
};

const temperature = (value: number | undefined) =>
  value === undefined ? "—" : `${value.toFixed(1)} °C`;
const percentage = (value: number | undefined, ratio = false) =>
  value === undefined ? "—" : `${Math.round(value * (ratio ? 100 : 1))}%`;
const speed = (value: number | undefined) =>
  value === undefined ? "—" : `${Math.round(value)} km/h`;
const millimetres = (value: number | undefined) =>
  value === undefined ? "—" : `${Math.round(value * 10) / 10} mm`;
const days = (value: number | undefined) =>
  value === undefined ? "—" : `${Math.round(value * 10) / 10} dies`;
const moistureTrend = (value: number | undefined) =>
  value === undefined
    ? "—"
    : `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)} punts`;
const lowercaseInitial = (value: string) =>
  value
    ? `${value.charAt(0).toLocaleLowerCase("ca-ES")}${value.slice(1)}`
    : value;
const uppercaseInitial = (value: string) =>
  value
    ? `${value.charAt(0).toLocaleUpperCase("ca-ES")}${value.slice(1)}`
    : value;

const geologicalSubstrateLabels: Record<
  GeologicalSubstrateEvidence["class"],
  string
> = {
  silicic: "Silícic",
  calcareous: "Calcari",
  mixed: "Mixt",
  unconsolidated: "Materials no consolidats",
  unknown: "Substrat no determinat",
};

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

function cellCoordinates(bounds: CoordinateBounds | undefined) {
  if (!bounds) return undefined;
  const [[west, south], [east, north]] = bounds;
  const latitude = (south + north) / 2;
  const longitude = (west + east) / 2;
  return `${Math.abs(latitude).toFixed(5)}° ${latitude >= 0 ? "N" : "S"}, ${Math.abs(longitude).toFixed(5)}° ${longitude >= 0 ? "E" : "O"}`;
}

export function ConditionComparison({
  species,
  snapshot,
  result,
  cellId,
  cellGridSizeM,
  cellBounds,
  occurrenceEvidence,
  occurrenceEvidenceStatus,
  regionalSummary,
  expanded = false,
}: {
  species: SpeciesProfile;
  snapshot: ConditionSnapshot;
  result: SuitabilityResult;
  cellId?: string;
  cellGridSizeM?: SpatialGridSizeM;
  cellBounds?: CoordinateBounds;
  occurrenceEvidence?: HistoricalOccurrenceEvidence | null;
  occurrenceEvidenceStatus?: OccurrenceEvidenceStatus;
  regionalSummary?: RegionalPredictionSummary | null;
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
      name: factorChartNames[item.id],
      fullName: item.label,
      score: item.score ?? 0,
    }));
  const unavailableFactors = snapshot.stale
    ? []
    : result.contributions.filter((item) => item.score === null);
  const unavailableFactorCopy = cellId
    ? "No disponible per a aquesta cel·la"
    : "No disponible en la lectura territorial";
  const [altitudeMin, altitudeMax] = species.ecologicalConfig.habitat.altitude;
  const preferredPhRange = species.ecologicalConfig.soil.phRange;
  const unknownGeologyDescription = v.geologicalSubstrate?.class === "unknown"
    ? v.geologicalSubstrate.dominantUnitDescription
    : undefined;
  const selectedCellCoordinates = cellCoordinates(cellBounds);
  const resultBand = result.score === null ? undefined : getSuitabilityBand(result.score);
  const frostState =
    (v.frostHours10d ?? v.frostHours7d) === undefined
      ? "unknown"
      : (v.frostHours10d ?? v.frostHours7d ?? 0) > 0
        ? "warning"
        : "clear";
  const frostWindowDays = v.frostHours10d !== undefined ? 10 : 7;
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
      context: `Puntuació sobre 10 dies · finestra ideal: ${species.ecologicalConfig.climate.temperatureRange[0]}–${species.ecologicalConfig.climate.temperatureRange[1]} °C`,
      stats: [
        {
          label: "Mín · 10 dies",
          value: temperature(v.temperatureMin10dC),
          explanation:
            "Temperatura més baixa estimada durant els últims 10 dies. Un episodi de fred o gelada pot frenar la fructificació encara que la mitjana sigui adequada.",
        },
        {
          label: "Mitj · 10 dies",
          value: temperature(v.temperatureAvg10dC),
          explanation:
            "Temperatura mitjana estimada durant els últims 10 dies. Mostra si el període recent s’acosta al rang tèrmic favorable per a l’espècie.",
        },
        {
          label: "Màx · 10 dies",
          value: temperature(v.temperatureMax10dC),
          explanation:
            "Temperatura més alta estimada durant els últims 10 dies. Valors elevats poden accelerar l’assecament del sòl i reduir les condicions favorables.",
        },
      ],
      icon: ThermometerSun,
    },
    {
      label: "Humitat del sòl",
      period: "ara · profunditat 3–9 cm",
      current: percentage(v.soilMoisture, true),
      context: `Perfil ideal: ${species.ecologicalConfig.climate.soilMoisture.toLowerCase()}`,
      stats: [
        {
          label: "Mín · 24 h",
          value: percentage(v.soilMoistureMin24h, true),
          explanation:
            "Humitat més baixa estimada a 3–9 cm de profunditat durant les últimes 24 h. Indica el moment més sec del dia, que pot limitar l’activitat si és massa baix.",
        },
        {
          label: "Mitj · 24 h",
          value: percentage(v.soilMoistureAvg24h, true),
          explanation:
            "Humitat mitjana estimada a 3–9 cm durant les últimes 24 h. És una referència de l’aigua disponible a la capa superficial del sòl.",
        },
        {
          label: "Màx · 24 h",
          value: percentage(v.soilMoistureMax24h, true),
          explanation:
            "Humitat més alta estimada a 3–9 cm durant les últimes 24 h. Pot reflectir la resposta del sòl a la pluja, la rosada o una menor evaporació.",
        },
        {
          label: "Mín · 7 dies",
          value: percentage(v.soilMoistureMin7d, true),
          explanation:
            "Humitat més baixa estimada a 3–9 cm durant la darrera setmana. Ajuda a detectar si hi ha hagut una fase seca recent, encara que ara el sòl sembli humit.",
        },
        {
          label: "Mitj · 7 dies",
          value: percentage(v.soilMoistureAvg7d, true),
          explanation:
            "Humitat mitjana estimada a 3–9 cm durant la darrera setmana. Resumeix la disponibilitat d’aigua recent, no només la lectura actual.",
        },
        {
          label: "Tendència · 7 dies",
          value: moistureTrend(v.soilMoistureTrend7d),
          explanation:
            "Canvi estimat de la humitat del sòl durant set dies. Un valor positiu indica que el sòl s’ha anat humitejant; un de negatiu, que s’ha anat assecant.",
        },
      ],
      icon: Droplets,
    },
    {
      label: "Humitat de l’aire",
      period: "ara",
      current: percentage(v.relativeHumidity),
      context: `Perfil ideal: ${species.ecologicalConfig.climate.relativeHumidity.toLowerCase()}`,
      stats: [
        {
          label: "Mín · 24 h",
          value: percentage(v.relativeHumidityMin24h),
          explanation:
            "Humitat relativa més baixa estimada durant les últimes 24 h. Els mínims baixos afavoreixen l’evaporació i poden assecar la superfície.",
        },
        {
          label: "Mitj · 24 h",
          value: percentage(v.relativeHumidityAvg24h),
          explanation:
            "Humitat relativa mitjana estimada durant les últimes 24 h. Una humitat ambiental alta redueix la pèrdua d’aigua i afavoreix un microclima més humit.",
        },
        {
          label: "Màx · 24 h",
          value: percentage(v.relativeHumidityMax24h),
          explanation:
            "Humitat relativa més alta estimada durant les últimes 24 h. Indica els períodes més favorables per mantenir la superfície humida, sovint de nit o a primera hora.",
        },
        {
          label: "Mitj · 7 dies",
          value: percentage(v.relativeHumidityAvg7d),
          explanation:
            "Humitat relativa mitjana estimada durant els últims set dies. Només penalitza la puntuació quan mostra una sequedat persistent pitjor que la de les últimes 24 hores.",
        },
      ],
      icon: Cloud,
    },
    {
      label: "Pluja acumulada",
      period: "últimes 168 h",
      current: millimetres(v.rainfall7dMm),
      context: `Balanç continu amb evapotranspiració, ratxa seca i humitat del sòl · ${lowercaseInitial(species.ecologicalConfig.rainfall.priorMoisture)}`,
      stats: [
        {
          label: "Pluja · 3 dies",
          value: millimetres(v.rainfall3dMm),
          explanation:
            "Precipitació de les últimes 72 h. Mulla la capa superficial i pot reactivar ràpidament la fructificació; si és baixa, el sòl superficial pot assecar-se de pressa.",
        },
        {
          label: "Pluja · dies 8–30",
          value: millimetres(v.rainfallPrevious23dMm),
          explanation:
            "Precipitació caiguda entre fa 8 i 30 dies; no inclou l’última setmana. Indica si hi havia una reserva d’aigua prèvia que pugui mantenir la humitat del sòl.",
        },
        {
          label: "Pluja · 30 dies",
          value: millimetres(v.rainfall30dMm),
          explanation:
            "Tota la precipitació dels últims 30 dies, incloses les pluges recents. Dona el context general d’humitat, però no substitueix una pluja recent ni una mesura directa del sòl.",
        },
        {
          label: "Ratxa seca",
          value: days(v.drySpellDays),
          explanation:
            "Dies consecutius sense una pluja significativa. Com més llarga és la ratxa, més probable és que el sòl perdi humitat, fins i tot si havia plogut abans.",
        },
        {
          label: "ET₀ · 7 dies",
          value: millimetres(v.evapotranspiration7dMm),
          explanation:
            "Aigua estimada que s’ha perdut en set dies per evaporació i transpiració de les plantes. Una ET₀ alta accelera l’assecament; es llegeix juntament amb la pluja, no com una pluja negativa exacta.",
        },
      ],
      icon: CloudRain,
    },
    {
      label: "Vent",
      period: "ara",
      current: speed(v.windKmh),
      context: species.ecologicalConfig.climate.wind,
      stats: [
        {
          label: "Mitj · 24 h",
          value: speed(v.windAvg24hKmh),
          explanation:
            "Velocitat mitjana del vent durant les últimes 24 h. El vent constant augmenta la pèrdua d’aigua de la vegetació i de la capa superficial del sòl.",
        },
        {
          label: "Màx · 24 h",
          value: speed(v.windMax24hKmh),
          explanation:
            "Velocitat màxima sostinguda estimada durant les últimes 24 h. Episodis de vent intens poden assecar ràpidament ambients exposats.",
        },
        {
          label: "Ratxa · 24 h",
          value: speed(v.windGustMax24hKmh),
          explanation:
            "Ratxa de vent més forta estimada durant les últimes 24 h. És un indicador d’episodis puntuals d’assecament, especialment en terreny obert.",
        },
      ],
      icon: Wind,
    },
  ];
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
              ? `Cel·la seleccionada · ${formatGridDimensions(cellGridSizeM ?? 250)} · ${regionLabels[snapshot.regionId]}`
              : regionalSummary
                ? `Resum regional · ${regionalSummary.scoredCellCount} quadrícules de ${formatGridDimensions(regionalSummary.gridSizeM)}`
                : "Lectura territorial"}
          </p>
          <h3>
            Condicions actuals · {selectedCellCoordinates ?? regionLabels[snapshot.regionId]}
          </h3>
        </div>
        <div
          className={`suitability-score ${predictionStatus.kind}`}
        >
          <strong style={resultBand ? { color: resultBand.color } : undefined}>{result.score ?? "—"}</strong>
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
      {regionalSummary && result.score !== null && (
        <p className="data-note regional-summary-note">
          <strong>Resum de les zones amb hàbitat compatible.</strong>{" "}
          La puntuació és la mediana ponderada per cobertura d’hàbitat de{" "}
          {regionalSummary.scoredCellCount} quadrícules verificades de{" "}
          {formatGridDimensions(regionalSummary.gridSizeM)}. El tram central va de{" "}
          {regionalSummary.scoreRange[0]} a {regionalSummary.scoreRange[1]}/100;
          no descriu tota la regió de manera uniforme.
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
                  {item.stats.map((stat, statIndex) => (
                    <div key={stat.label}>
                      <dt>
                        <span>{stat.label}</span>
                        {stat.explanation ? (
                          <>
                            <button
                              type="button"
                              className="condition-stat-help"
                              aria-label={`Explicació de ${stat.label}`}
                              aria-describedby={`condition-stat-${item.label}-${statIndex}`}
                            >
                              <CircleHelp aria-hidden="true" size={14} />
                            </button>
                            <span
                              className="condition-stat-tooltip"
                              id={`condition-stat-${item.label}-${statIndex}`}
                              role="tooltip"
                            >
                              {stat.explanation}
                            </span>
                          </>
                        ) : null}
                      </dt>
                      <dd>{stat.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {item.label === "Temperatura" ? (
                <div className={`condition-frost-inline ${frostState}`}>
                  <Snowflake size={15} />
                  <span>
                    {frostState === "warning"
                      ? `Gelada detectada · mínima ${temperature(v.temperatureMin10dC ?? v.temperatureMin7dC)}`
                      : frostState === "clear"
                        ? `Sense gelada en ${frostWindowDays} dies · mínima ${temperature(v.temperatureMin10dC ?? v.temperatureMin7dC)}`
                        : "Historial de gelada no disponible"}
                  </span>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
      {cellId ? (
        <section className="cell-static-factors" aria-labelledby="cell-static-factors-title">
          <div className="cell-static-factors-heading">
            <h4 id="cell-static-factors-title">Hàbitat, relleu i sòl</h4>
          </div>
          <dl className="cell-static-factor-list">
            <div>
              <dt><Mountain size={17} aria-hidden="true" />Altitud</dt>
              <dd>{v.altitudeM === undefined ? "No verificada" : `${Math.round(v.altitudeM)} m`}</dd>
              <small>{v.habitatAltitudeSuitability === undefined
                ? `Ideal: ${altitudeMin}–${altitudeMax} m`
                : `Idoneïtat d’altitud dins l’hàbitat: ${Math.round(v.habitatAltitudeSuitability)}%`}</small>
            </div>
            <div>
              <dt><Trees size={17} aria-hidden="true" />Coberta compatible</dt>
              <dd>{v.forestCompatibility === undefined ? "No verificada" : `${Math.round(v.forestCompatibility)}%`}</dd>
              <small>Part de la cel·la amb coberta forestal compatible</small>
            </div>
            <div>
              <dt><Layers3 size={17} aria-hidden="true" />pH del sòl</dt>
              <dd>{v.soilPh === undefined ? "No verificat" : v.soilPh.toFixed(1)}</dd>
              <small>{preferredPhRange ? `Ideal: pH ${preferredPhRange[0]}–${preferredPhRange[1]}` : `Preferència: ${species.ecologicalConfig.soil.reaction}`}</small>
            </div>
            <div>
              <dt><Layers3 size={17} aria-hidden="true" />Textura del sòl</dt>
              <dd>{v.soilTexture ? uppercaseInitial(v.soilTexture) : "No verificada"}</dd>
              <small>Preferida: {uppercaseInitial(species.ecologicalConfig.soil.texture)}</small>
            </div>
            <div>
              <dt><Layers3 size={17} aria-hidden="true" />Substrat geològic</dt>
              <dd
                className={unknownGeologyDescription ? "geological-unit-description" : undefined}
                title={unknownGeologyDescription}
              >{v.geologicalSubstrate
                ? unknownGeologyDescription
                  ? unknownGeologyDescription
                  : geologicalSubstrateLabels[v.geologicalSubstrate.class]
                : "Sense cartografia geològica"}</dd>
              <small>Preferència de l’espècie: {uppercaseInitial(species.ecologicalConfig.soil.substrate)}</small>
            </div>
            <div>
              <dt><Layers3 size={17} aria-hidden="true" />Drenatge preferit</dt>
              <dd>{uppercaseInitial(species.ecologicalConfig.soil.drainage)}</dd>
              <small>Característica ecològica de l’espècie</small>
            </div>
          </dl>
        </section>
      ) : null}
      <div className="factor-chart">
        <div className="chart-caption">
          <span>Idoneïtat per factor</span>
          <strong style={resultBand ? { color: resultBand.color } : undefined}>
            {predictionStatus.kind === "available" && result.score !== null
              ? getSuitabilityBand(result.score).label
              : predictionStatus.label.charAt(0).toUpperCase() +
                predictionStatus.label.slice(1)}
          </strong>
        </div>
        <p className="factor-chart-explanation">
          {regionalSummary
            ? "Cada barra resumeix les quadrícules compatibles de la regió, ponderades per cobertura d’hàbitat; no és una probabilitat de trobar bolets."
            : "La barra mostra com encaixa cada factor amb el perfil ideal de l’espècie; no és una probabilitat de trobar bolets."}
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
        <ul className="factor-bars" aria-label="Idoneïtat per factor">
          {chart.map((entry) => {
            const band = getSuitabilityBand(entry.score);
            return (
              <li key={entry.name} title={`${entry.fullName}: ${band.label}. ${band.description}`}>
                <span className="factor-bar-label">{entry.name}</span>
                <span
                  className="factor-bar-meter"
                  role="meter"
                  aria-label={`${entry.fullName}: ${entry.score} sobre 100, ${band.label}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={entry.score}
                >
                  <span
                    className="factor-bar-fill"
                    style={{
                      backgroundColor: band.color,
                      width: `${entry.score}%`,
                    }}
                  />
                </span>
              </li>
            );
          })}
        </ul>
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
