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
  ModelComponentId,
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

type ComponentChartItem = { name: string; fullName: string; score: number };
type ConditionStat = {
  label: string;
  value: string;
  explanation?: string;
};
type ConditionContext =
  | {
      scoreLabel?: string;
      scoreValue?: string;
      targetLabel: string;
      targetValue: string;
    }
  | { note: string };

const componentChartNames: Record<ModelComponentId, string> = {
  habitatCoverage: "Coberta",
  altitude: "Altitud",
  phenology: "Fenologia",
  water: "Estat hídric",
  temperature: "Temperatura",
  extremes: "Fred i calor",
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
const dayCount = (value: number | undefined) =>
  value === undefined ? "—" : `${Math.round(value)} dies`;
const moistureTrend = (value: number | undefined) =>
  value === undefined
    ? "—"
    : `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)} punts`;
const uppercaseInitial = (value: string) =>
  value
    ? `${value.charAt(0).toLocaleUpperCase("ca-ES")}${value.slice(1)}`
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
  const weatherUpdatedAt = v.weatherObservedAt
    ? readingTime(v.weatherObservedAt)
    : snapshot.stale
      ? "no disponible"
      : readingTime(snapshot.observedAt);
  const predictionStatus = getConditionPredictionStatus(snapshot.stale, result);
  const atmosphericResolution = v.atmosphericResolutionM
    ? `${(v.atmosphericResolutionM / 1000).toLocaleString("ca-ES")} km`
    : undefined;
  const soilResolution = v.soilMoistureResolutionM
    ? `${(v.soilMoistureResolutionM / 1000).toLocaleString("ca-ES")} km`
    : undefined;
  const chart: ComponentChartItem[] = result.components
    .filter((item) => item.score !== null)
    .map((item) => ({
      name: componentChartNames[item.id],
      fullName: item.label,
      score: item.score ?? 0,
    }));
  const unavailableComponents = snapshot.stale
    ? []
    : result.components.filter((item) => item.score === null);
  const unavailableComponentCopy = cellId
    ? "No disponible per a aquesta cel·la"
    : "No disponible en la lectura territorial";
  const [altitudeMin, altitudeMax] = species.ecologicalConfig.habitat.altitude;
  const preferredPhRange = species.ecologicalConfig.soil.phRange;
  const unknownGeologyDescription = v.geologicalSubstrate?.class === "unknown"
    ? v.geologicalSubstrate.dominantUnitDescription
    : undefined;
  const selectedCellCoordinates = cellCoordinates(cellBounds);
  const resultBand = result.score === null ? undefined : getSuitabilityBand(result.score);
  const supportedModel = species.modelConfig.status === "supported"
    ? species.modelConfig
    : null;
  const temperatureWindowDays = supportedModel?.temperature.windowDays;
  const temperatureWindowAverage = temperatureWindowDays === 14
    ? v.temperatureAvg14dC
    : temperatureWindowDays === 20
      ? v.temperatureAvg20dC
      : undefined;
  const frostHours = temperatureWindowDays === 14
    ? v.frostHours14d
    : temperatureWindowDays === 20
      ? v.frostHours20d
      : undefined;
  const heatHours = temperatureWindowDays === 14
    ? v.heatHours14d
    : temperatureWindowDays === 20
      ? v.heatHours20d
      : undefined;
  const frostState =
    frostHours === undefined
      ? "unknown"
      : frostHours > 0
        ? "warning"
        : "clear";
  const rainfallWindowDays = supportedModel?.water.rainfallWindowDays;
  const rainfallWindowAmount = rainfallWindowDays === 14
    ? v.rainfall14dMm
    : rainfallWindowDays === 21
      ? v.rainfall21dMm
      : rainfallWindowDays === 26
        ? v.rainfall26dMm
        : v.rainfall7dMm;
  const rainfallWindowWetDays = rainfallWindowDays === 14
    ? v.rainfallDays14d
    : rainfallWindowDays === 21
      ? v.rainfallDays21d
      : rainfallWindowDays === 26
        ? v.rainfallDays26d
        : undefined;
  const rainfallWindowEt0 = rainfallWindowDays === 14
    ? v.evapotranspiration14dMm
    : rainfallWindowDays === 21
      ? v.evapotranspiration21dMm
      : rainfallWindowDays === 26
        ? v.evapotranspiration26dMm
        : v.evapotranspiration7dMm;
  const data: Array<{
    label: string;
    period: string;
    current: string;
    context: ConditionContext;
    stats: ConditionStat[];
    icon: typeof ThermometerSun;
  }> = [
    {
      label: "Temperatura",
      period: "darrera lectura",
      current: temperature(v.temperatureC),
      context: supportedModel
        ? {
            targetLabel: `Resposta no lineal · ${temperatureWindowDays} dies`,
            targetValue: `Òptim inicial: ${supportedModel.temperature.optimumC} °C`,
          }
        : { note: "Sense model hidrotermal de curt termini per a aquesta espècie" },
      stats: [
        {
          label: `Mitj · ${temperatureWindowDays ?? "—"} dies`,
          value: temperature(temperatureWindowAverage),
          explanation:
            "Mitjana tèrmica de la finestra configurada per al gremi o l’espècie. La resposta té un òptim i decau suaument tant per fred com per calor.",
        },
        {
          label: "Hores ≤ 0 °C",
          value: frostHours === undefined ? "—" : `${Math.round(frostHours)} h`,
          explanation:
            "Hores de gelada dins la mateixa finestra. Actuen com un multiplicador de dany segons la semivida configurada, no com un tall arbitrari.",
        },
        {
          label: "Hores ≥ 27 °C",
          value: heatHours === undefined ? "—" : `${Math.round(heatHours)} h`,
          explanation:
            "Hores de calor dins la mateixa finestra. L’exposició acumulada redueix gradualment la resposta, amb tolerància pròpia del gremi.",
        },
      ],
      icon: ThermometerSun,
    },
    {
      label: "Humitat del sòl",
      period: "darrera lectura · profunditat 3–9 cm",
      current: percentage(v.soilMoisture, true),
      context: {
        note: "Normalitzada per textura entre punt de marciment i capacitat de camp; forma part d’un únic estat hídric",
      },
      stats: [
        {
          label: "Mín. · 24 h",
          value: percentage(v.soilMoistureMin24h, true),
          explanation:
            "Humitat més baixa estimada a 3–9 cm de profunditat durant les últimes 24 h. Indica el moment més sec del dia, que pot limitar l’activitat si és massa baix.",
        },
        {
          label: "Mitj. · 24 h",
          value: percentage(v.soilMoistureAvg24h, true),
          explanation:
            "Humitat mitjana estimada a 3–9 cm durant les últimes 24 h. És una referència de l’aigua disponible a la capa superficial del sòl.",
        },
        {
          label: "Màx. · 24 h",
          value: percentage(v.soilMoistureMax24h, true),
          explanation:
            "Humitat més alta estimada a 3–9 cm durant les últimes 24 h. Pot reflectir la resposta del sòl a la pluja, la rosada o una menor evaporació.",
        },
        {
          label: "Mín. · 7 dies",
          value: percentage(v.soilMoistureMin7d, true),
          explanation:
            "Humitat més baixa estimada a 3–9 cm durant la darrera setmana. Ajuda a detectar si hi ha hagut una fase seca recent, encara que ara el sòl sembli humit.",
        },
        {
          label: "Mitj. · 7 dies",
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
      period: "darrera lectura",
      current: percentage(v.relativeHumidity),
      context: {
        note: "S’utilitza amb la temperatura per estimar el dèficit de pressió de vapor dins l’estat hídric; no puntua per separat",
      },
      stats: [
        {
          label: "Mín. · 24 h",
          value: percentage(v.relativeHumidityMin24h),
          explanation:
            "Humitat relativa més baixa estimada durant les últimes 24 h. Els mínims baixos afavoreixen l’evaporació i poden assecar la superfície.",
        },
        {
          label: "Mitj. · 24 h",
          value: percentage(v.relativeHumidityAvg24h),
          explanation:
            "Humitat relativa mitjana estimada durant les últimes 24 h. Una humitat ambiental alta redueix la pèrdua d’aigua i afavoreix un microclima més humit.",
        },
        {
          label: "Màx. · 24 h",
          value: percentage(v.relativeHumidityMax24h),
          explanation:
            "Humitat relativa més alta estimada durant les últimes 24 h. Indica els períodes més favorables per mantenir la superfície humida, sovint de nit o a primera hora.",
        },
        {
          label: "Mitj. · 7 dies",
          value: percentage(v.relativeHumidityAvg7d),
          explanation:
            "Humitat relativa mitjana dels últims set dies. Combinada amb la temperatura, estima la demanda atmosfèrica que pot accelerar l’assecament.",
        },
      ],
      icon: Cloud,
    },
    {
      label: "Pluja acumulada",
      period: rainfallWindowDays ? `finestra del model · ${rainfallWindowDays} dies` : "últimes 168 h",
      current: millimetres(rainfallWindowAmount),
      context: rainfallWindowDays
        ? { note: `Finestra de ${rainfallWindowDays} dies amb nombre de dies plujosos, ET₀, ratxa seca i humitat del sòl` }
        : { note: "Context hídric; no hi ha model de curt termini per a aquesta espècie" },
      stats: [
        {
          label: "Pluja · 24 h",
          value: millimetres(v.rainfall24hMm),
          explanation:
            "Precipitació acumulada durant les últimes 24 h. Mostra si hi ha hagut un pols de pluja molt recent que pugui començar a rehidratar la capa superficial del sòl.",
        },
        {
          label: "Pluja · 3 dies",
          value: millimetres(v.rainfall3dMm),
          explanation:
            "Precipitació de les últimes 72 h. Mulla la capa superficial i pot reactivar ràpidament la fructificació; si és baixa, el sòl superficial pot assecar-se de pressa.",
        },
        {
          label: "Pluja · 7 dies",
          value: millimetres(v.rainfall7dMm),
          explanation:
            "Precipitació de la darrera setmana. Es mostra com a context recent, però el model utilitza la finestra hídrica configurada completa.",
        },
        {
          label: `Dies amb ≥ 1 mm · ${rainfallWindowDays ?? "—"} dies`,
          value: dayCount(rainfallWindowWetDays),
          explanation:
            "Nombre de dies amb almenys un mil·límetre de pluja dins la finestra configurada. Distingeix un pols concentrat d’una rehidratació distribuïda.",
        },
        {
          label: `ET₀ · ${rainfallWindowDays ?? 7} dies`,
          value: millimetres(rainfallWindowEt0),
          explanation:
            "Evapotranspiració de referència acumulada a la mateixa finestra que la pluja. Entra en la pluja efectiva i no es puntua per separat.",
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
      ],
      icon: CloudRain,
    },
    {
      label: "Vent",
      period: "darrera lectura",
      current: speed(v.windKmh),
      context: {
        note: `${species.ecologicalConfig.climate.wind} · es mostra com a context i no puntua separadament`,
      },
      stats: [
        {
          label: "Mitj. · 24 h",
          value: speed(v.windAvg24hKmh),
          explanation:
            "Velocitat mitjana del vent durant les últimes 24 h. El vent constant augmenta la pèrdua d’aigua de la vegetació i de la capa superficial del sòl.",
        },
        {
          label: "Màx. · 24 h",
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
          <p className="condition-last-updated">
            <Clock3 size={13} aria-hidden="true" />
            Dades meteorològiques actualitzades: {weatherUpdatedAt}
          </p>
          <h3>
            Condicions actuals · {selectedCellCoordinates ?? regionLabels[snapshot.regionId]}
          </h3>
        </div>
        <div
          className={`suitability-score ${predictionStatus.kind}`}
        >
          <strong style={resultBand ? { color: resultBand.color } : undefined}>{result.score ?? "—"}</strong>
          <span>oportunitat territorial · {predictionStatus.label}</span>
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
            ? "Les dades ambientals visibles són vàlides, però aquesta cel·la no incorpora tots els components necessaris per publicar una puntuació."
            : "Les dades meteorològiques són actuals, però cal seleccionar una cel·la del mapa per incorporar-hi l’hàbitat i el sòl."}
        </p>
      )}
      {regionalSummary && result.score !== null && (
        <p className="data-note regional-summary-note">
          <strong>Resum de les zones amb hàbitat compatible.</strong>{" "}
          L’oportunitat és la mediana per àrea, sense tornar a ponderar la coberta, de{" "}
          {regionalSummary.scoredCellCount} quadrícules verificades de{" "}
          {formatGridDimensions(regionalSummary.gridSizeM)}. El tram central va de{" "}
          {regionalSummary.scoreRange[0]} a {regionalSummary.scoreRange[1]}/100;
          no descriu tota la regió de manera uniforme.
        </p>
      )}
      {result.fruitingConditionsScore !== null && (
        <p className="data-note">
          <strong>Condicions dins l’hàbitat: {result.fruitingConditionsScore}/100.</strong>{" "}
          L’índex d’oportunitat territorial ({result.opportunityIndex}/100) també incorpora
          quina part de la cel·la és hàbitat compatible i la seva idoneïtat altitudinal.
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
                  . És una corroboració històrica; no modifica la puntuació
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
              {"note" in item.context ? (
                <p className="condition-context condition-context-note">
                  {item.context.note}
                </p>
              ) : (
                <dl className="condition-context condition-context-readings">
                  {item.context.scoreLabel && item.context.scoreValue ? (
                    <div>
                      <dt>{item.context.scoreLabel}</dt>
                      <dd>{item.context.scoreValue}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>{item.context.targetLabel}</dt>
                    <dd>{item.context.targetValue}</dd>
                  </div>
                </dl>
              )}
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
                  <span className="condition-frost-icon" aria-hidden="true">
                    <Snowflake size={15} />
                  </span>
                  <span className="condition-frost-copy">
                    {frostState === "warning"
                      ? <><strong>Gelada detectada</strong><span>{Math.round(frostHours ?? 0)} hores dins la finestra</span></>
                      : frostState === "clear"
                        ? <><strong>Sense gelada</strong><span>{temperatureWindowDays ? `en ${temperatureWindowDays} dies` : "a la finestra configurada"}</span></>
                        : <strong>Historial de gelada no disponible</strong>}
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
              <dd>{v.habitatCoveragePercent === undefined ? "No verificada" : `${Math.round(v.habitatCoveragePercent)}%`}</dd>
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
          <span>Resposta dels components</span>
          <strong style={resultBand ? { color: resultBand.color } : undefined}>
            {predictionStatus.kind === "available" && result.score !== null
              ? getSuitabilityBand(result.score).label
              : predictionStatus.label.charAt(0).toUpperCase() +
                predictionStatus.label.slice(1)}
          </strong>
        </div>
        <p className="factor-chart-explanation">
          {regionalSummary
            ? "Cada barra resumeix les condicions dins l’hàbitat compatible. Un component baix limita el producte geomètric; no és una probabilitat de trobar bolets."
            : "Un component baix limita el producte geomètric i no queda compensat per components aliens molt alts; no és una probabilitat de trobar bolets."}
        </p>
        {unavailableComponents.length > 0 && (
          <dl
            className="unavailable-factor-list"
            aria-label="Components necessaris no disponibles"
          >
            {unavailableComponents.map((item) => (
              <div key={item.id}>
                <dt>{item.label}</dt>
                <dd>{unavailableComponentCopy}</dd>
              </div>
            ))}
          </dl>
        )}
        <ul className="factor-bars" aria-label="Resposta dels components">
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
          aria-label="Escala ordinal del model de molt baixa a molt alta"
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
