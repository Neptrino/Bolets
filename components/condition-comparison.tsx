"use client";

import {
  Clock3,
  CircleHelp,
  Layers3,
  Mountain,
  Snowflake,
  Trees,
} from "lucide-react";
import { conditionReadings } from "@/components/condition-readings";
import type {
  ConditionSnapshot,
  CoordinateBounds,
  GeologicalSubstrateEvidence,
  ModelComponentId,
  RegionalPredictionSummary,
  SpatialGridSizeM,
  SpeciesProfile,
  SuitabilityResult,
} from "@/src/lib/types";
import { formatGridDimensions } from "@/src/lib/map-grid";
import { getConditionPredictionStatus } from "@/src/lib/condition-presentation";
import { getSuitabilityBand } from "@/src/lib/suitability-scale";
import { regionLabels } from "@/data/regions";

type ComponentChartItem = {
  id: ModelComponentId;
  name: string;
  fullName: string;
  score: number;
};
const componentChartNames: Record<ModelComponentId, string> = {
  habitatCoverage: "Coberta",
  altitude: "Altitud",
  phenology: "Fenologia",
  water: "Estat hídric",
  temperature: "Temperatura mitjana",
  extremes: "Gelades i calor extrema",
};

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
  regionalSummary,
  expanded = false,
}: {
  species: SpeciesProfile;
  snapshot: ConditionSnapshot;
  result: SuitabilityResult;
  cellId?: string;
  cellGridSizeM?: SpatialGridSizeM;
  cellBounds?: CoordinateBounds;
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
  const chart: ComponentChartItem[] = result.components
    .filter((item) => item.score !== null)
    .map((item) => ({
      id: item.id,
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
  const componentScore = (id: ModelComponentId) =>
    result.components.find((item) => item.id === id)?.score ?? null;
  const habitatCoverageScore = componentScore("habitatCoverage");
  const altitudeScore = componentScore("altitude");
  const phenologyScore = componentScore("phenology");
  const waterScore = componentScore("water");
  const temperatureScore = componentScore("temperature");
  const extremesScore = componentScore("extremes");
  const effectiveHabitatScore = result.effectiveHabitatCoverage === null
    ? null
    : Math.round(result.effectiveHabitatCoverage * 100);
  const cellCalculation = cellId && supportedModel &&
      result.fruitingConditionsScore !== null &&
      result.opportunityIndex !== null &&
      effectiveHabitatScore !== null &&
      habitatCoverageScore !== null &&
      altitudeScore !== null &&
      phenologyScore !== null &&
      waterScore !== null &&
      temperatureScore !== null &&
      extremesScore !== null
    ? {
        altitude: altitudeScore,
        effectiveHabitat: effectiveHabitatScore,
        extremes: extremesScore,
        fruiting: result.fruitingConditionsScore,
        habitatCoverage: habitatCoverageScore,
        opportunity: result.opportunityIndex,
        phenology: phenologyScore,
        temperature: temperatureScore,
        temperatureWeight: 1 - supportedModel.water.waterExponent,
        water: waterScore,
        waterWeight: supportedModel.water.waterExponent,
      }
    : null;
  const appliedComponentMultiplier = (entry: ComponentChartItem) => {
    const normalizedScore = entry.score / 100;
    if (entry.id === "water" && supportedModel) {
      return normalizedScore ** supportedModel.water.waterExponent;
    }
    if (entry.id === "temperature" && supportedModel) {
      return normalizedScore ** (1 - supportedModel.water.waterExponent);
    }
    return normalizedScore;
  };
  const componentExplanation = (entry: ComponentChartItem) => {
    const score = `${entry.score}/100.`;
    switch (entry.id) {
      case "habitatCoverage":
        return `${score} És la part de la cel·la amb coberta i sòl compatibles per a l’espècie, abans d’aplicar l’altitud. Per exemple, 83 indica aproximadament un 83% de superfície compatible; no és una probabilitat de trobar bolets.`;
      case "altitude":
        return `${score} Indica com encaixa l’altitud de l’hàbitat compatible amb el rang de l’espècie. 100 correspon al rang central; baixa gradualment als marges i arriba a 0 fora del marge ecològic.`;
      case "phenology":
        return `${score} Situa el dia i l’hora exactes dins el calendari de fructificació de l’espècie, en hora local. Interpola suaument entre els valors del centre de cada mes: l’1 d’agost encara combina juliol i agost, el 15 correspon a l’ancoratge d’agost i el 31 ja transita cap al setembre. 100 és el pic estacional, 25 una fase només possible i 0 una temporada inactiva. Multiplica directament les condicions.`;
      case "water":
        return supportedModel
          ? `${score} Resumeix la humitat del sòl de 7 dies, la pluja, els dies plujosos i l’ET₀ de ${supportedModel.water.rainfallWindowDays} dies, més la sequedat atmosfèrica i la ratxa seca. 100 és la resposta hídrica òptima del model. En el càlcul s’aplica amb l’exponent ${supportedModel.water.waterExponent.toLocaleString("ca-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
          : `${score} Resumeix la disponibilitat recent d’aigua al sòl i l’assecament atmosfèric. 100 representa la resposta hídrica òptima del model.`;
      case "temperature":
        return supportedModel
          ? `${score} Compara la temperatura mitjana de l’aire de ${supportedModel.temperature.windowDays} dies amb l’òptim inicial de ${supportedModel.temperature.optimumC.toLocaleString("ca-ES")} °C. 100 és a prop de l’òptim i disminueix tant per fred com per calor. En el càlcul s’aplica amb l’exponent ${(1 - supportedModel.water.waterExponent).toLocaleString("ca-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}; les hores extremes es tracten a part.`
          : `${score} Compara la temperatura mitjana recent amb el rang òptim de l’espècie. 100 és a prop de l’òptim i disminueix tant per fred com per calor.`;
      case "extremes":
        return supportedModel
          ? `${score} Penalitza les hores ≤ 0 °C i ≥ 27 °C acumulades durant ${supportedModel.temperature.windowDays} dies. 100 significa que no hi ha penalització tèrmica; 75 conserva tres quartes parts de la resposta i 0 la redueix pràcticament del tot.`
          : `${score} Penalitza l’exposició recent a gelades i calor extrema. 100 significa que no hi ha penalització tèrmica.`;
    }
  };
  const lowestAppliedMultiplier = chart.length
    ? Math.min(...chart.map(appliedComponentMultiplier))
    : null;
  const {
    frostHours,
    frostState,
    readings,
    temperatureWindowDays,
  } = conditionReadings(species, v);

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
          <span>{cellId ? "puntuació de la cel·la" : "puntuació territorial"} · {predictionStatus.label}</span>
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
      <div className="condition-list">
        {readings.map((item, itemIndex) => {
          const Icon = item.icon;
          const contextTooltipId = `condition-card-context-${itemIndex}`;
          return (
            <article
              key={item.label}
              className="condition-card-with-note"
            >
              <div className="condition-card-heading">
                <Icon size={18} />
                <span className="condition-card-label">{item.label}</span>
                <button
                  type="button"
                  className="condition-card-help"
                  aria-label={`Informació de ${item.label}`}
                  aria-describedby={contextTooltipId}
                >
                  <CircleHelp aria-hidden="true" size={14} />
                </button>
                <span
                  className="condition-card-tooltip"
                  id={contextTooltipId}
                  role="tooltip"
                >
                  <strong>Període: {item.period}</strong>
                  <span>{item.context.note}</span>
                </span>
              </div>
              <strong className="condition-current">{item.current}</strong>
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
              <small>
                Preferència: {altitudeMin}–{altitudeMax} m
                {v.habitatAltitudeSuitability === undefined
                  ? ""
                  : ` · Ajust de la cel·la: ${Math.round(v.habitatAltitudeSuitability)}%`}
              </small>
            </div>
            <div>
              <dt><Trees size={17} aria-hidden="true" />Coberta compatible</dt>
              <dd>{v.habitatCoveragePercent === undefined ? "No verificada" : `${Math.round(v.habitatCoveragePercent)}%`}</dd>
              <small>Part de la cel·la que coincideix amb la coberta preferida</small>
            </div>
            <div>
              <dt><Layers3 size={17} aria-hidden="true" />pH del sòl</dt>
              <dd>{v.soilPh === undefined ? "No verificat" : v.soilPh.toFixed(1)}</dd>
              <small>{preferredPhRange ? `Preferència: pH ${preferredPhRange[0]}–${preferredPhRange[1]}` : `Preferència: ${species.ecologicalConfig.soil.reaction}`}</small>
            </div>
            <div>
              <dt><Layers3 size={17} aria-hidden="true" />Textura del sòl</dt>
              <dd>{v.soilTexture ? uppercaseInitial(v.soilTexture) : "No verificada"}</dd>
              <small>Preferència: {uppercaseInitial(species.ecologicalConfig.soil.texture)}</small>
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
              <small>Context no puntuat · afinitat descrita: {uppercaseInitial(species.ecologicalConfig.soil.substrate)}</small>
            </div>
            <div>
              <dt><Layers3 size={17} aria-hidden="true" />Drenatge de l’espècie</dt>
              <dd>{uppercaseInitial(species.ecologicalConfig.soil.drainage)}</dd>
              <small>Preferència ecològica · sense dada de drenatge de la cel·la</small>
            </div>
          </dl>
        </section>
      ) : null}
      <div className="factor-chart">
        <div className="chart-caption">
          <span>{cellCalculation ? "Com es calcula la puntuació" : "Resposta dels components"}</span>
          <strong style={resultBand ? { color: resultBand.color } : undefined}>
            {predictionStatus.kind === "available" && result.score !== null
              ? getSuitabilityBand(result.score).label
              : predictionStatus.label.charAt(0).toUpperCase() +
                predictionStatus.label.slice(1)}
          </strong>
        </div>
        {cellCalculation && (
          <ol className="score-calculation" aria-label="Càlcul de la puntuació de la cel·la">
            <li>
              <span className="score-calculation-step">1 · Condicions per fructificar</span>
              <strong>{cellCalculation.fruiting}<small>/100</small></strong>
              <p
                className="score-calculation-expression"
                aria-label={`Fenologia ${cellCalculation.phenology} per cent, estat hídric ${cellCalculation.water} per cent amb pes ${Math.round(cellCalculation.waterWeight * 100)} per cent, temperatura mitjana ${cellCalculation.temperature} per cent amb pes ${Math.round(cellCalculation.temperatureWeight * 100)} per cent, i gelades i calor extrema ${cellCalculation.extremes} per cent`}
              >
                <span>{cellCalculation.phenology}%</span>
                <b>×</b>
                <span>{cellCalculation.water}%<sup>{cellCalculation.waterWeight.toLocaleString("ca-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</sup></span>
                <b>×</b>
                <span>{cellCalculation.temperature}%<sup>{cellCalculation.temperatureWeight.toLocaleString("ca-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</sup></span>
                <b>×</b>
                <span>{cellCalculation.extremes}%</span>
                <b>=</b>
                <span>{cellCalculation.fruiting}</span>
              </p>
              <small>Fenologia × estat hídric × temperatura mitjana × extrems tèrmics. Els exponents reparteixen el pes entre aigua i temperatura.</small>
            </li>
            <li>
              <span className="score-calculation-step">2 · Hàbitat efectiu</span>
              <strong>{cellCalculation.effectiveHabitat}<small>% de la cel·la</small></strong>
              <p
                className="score-calculation-expression"
                aria-label={`Coberta compatible ${cellCalculation.habitatCoverage} per cent per idoneïtat altitudinal ${cellCalculation.altitude} per cent igual a ${cellCalculation.effectiveHabitat} per cent d’hàbitat efectiu`}
              >
                <span>{cellCalculation.habitatCoverage}%</span>
                <b>×</b>
                <span>{cellCalculation.altitude}%</span>
                <b>=</b>
                <span>{cellCalculation.effectiveHabitat}%</span>
              </p>
              <small>Coberta compatible × idoneïtat altitudinal.</small>
            </li>
            <li className="score-calculation-result">
              <span className="score-calculation-step">3 · Puntuació de la cel·la</span>
              <strong style={resultBand ? { color: resultBand.color } : undefined}>
                {cellCalculation.opportunity}<small>/100</small>
              </strong>
              <p
                className="score-calculation-expression"
                aria-label={`Condicions per fructificar ${cellCalculation.fruiting} per cent per hàbitat efectiu ${cellCalculation.effectiveHabitat} per cent igual a una puntuació de ${cellCalculation.opportunity} sobre 100`}
              >
                <span>{cellCalculation.fruiting}</span>
                <b>×</b>
                <span>{cellCalculation.effectiveHabitat}%</span>
                <b>=</b>
                <span>{cellCalculation.opportunity}</span>
              </p>
              <small>Condicions per fructificar × part efectiva de la cel·la.</small>
            </li>
          </ol>
        )}
        <p className="factor-chart-explanation">
          {regionalSummary
            ? "Cada barra resumeix les condicions dins l’hàbitat compatible. Una condició molt desfavorable redueix tota la puntuació, encara que les altres siguin bones; no és una probabilitat de trobar bolets."
            : cellCalculation
              ? "Les barres són multiplicadors, no punts que se sumin. Un 50% redueix el producte a la meitat encara que la resta de respostes siguin altes."
              : "Una condició molt desfavorable redueix tota la puntuació, encara que les altres siguin bones; no és una probabilitat de trobar bolets."}
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
        <ul className="factor-bars" aria-label="Multiplicadors del càlcul">
          {chart.map((entry) => {
            const band = getSuitabilityBand(entry.score);
            const appliedMultiplier = appliedComponentMultiplier(entry);
            const limiting = lowestAppliedMultiplier !== null &&
              lowestAppliedMultiplier < 0.999 &&
              Math.abs(appliedMultiplier - lowestAppliedMultiplier) < 0.000_001;
            return (
              <li
                key={entry.id}
                className={limiting ? "is-limiting" : undefined}
              >
                <span className="factor-bar-heading">
                  <span className="factor-bar-label">{entry.name}</span>
                  <button
                    type="button"
                    className="factor-bar-help"
                    aria-label={`Què significa ${entry.name}: ${entry.score} sobre 100?`}
                    aria-describedby={`factor-tooltip-${entry.id}`}
                  >
                    <CircleHelp aria-hidden="true" size={16} />
                  </button>
                  <span
                    id={`factor-tooltip-${entry.id}`}
                    className="factor-bar-tooltip"
                    role="tooltip"
                  >
                    {componentExplanation(entry)}
                  </span>
                </span>
                <span className="factor-bar-reading">
                  <strong>{entry.score}%</strong>
                  {limiting && <small>Més restrictiu</small>}
                </span>
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
      </div>
    </div>
  );
}
