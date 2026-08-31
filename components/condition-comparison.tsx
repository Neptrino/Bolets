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
  ModelComponentId,
  RegionalPredictionSummary,
  SpatialGridSizeM,
  SpeciesProfile,
  SuitabilityResult,
} from "@/src/lib/types";
import {
  getConditionPredictionStatus,
  publicConditionFactorLabel,
} from "@/src/lib/condition-presentation";
import { getSuitabilityBand } from "@/src/lib/suitability-scale";
import { regionLabels } from "@/data/regions";

type ComponentChartItem = {
  id: ModelComponentId;
  name: string;
  fullName: string;
  score: number;
};
const uppercaseInitial = (value: string) =>
  value
    ? `${value.charAt(0).toLocaleUpperCase("ca-ES")}${value.slice(1)}`
    : value;

function soilReactionLabel(ph: number | undefined) {
  if (ph === undefined) return "Sense informació";
  if (ph < 6.5) return "Àcid";
  if (ph <= 7.5) return "Neutre";
  return "Calcari o alcalí";
}

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

export function ConditionComparison({
  species,
  snapshot,
  result,
  cellId,
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
      name: publicConditionFactorLabel(item.id),
      fullName: item.label,
      score: item.score ?? 0,
    }));
  const unavailableComponents = snapshot.stale
    ? []
    : result.components.filter((item) => item.score === null);
  const unavailableComponentCopy = cellId
    ? "No disponible per a aquest sector"
    : "No disponible per al resum territorial";
  const [altitudeMin, altitudeMax] = species.ecologicalConfig.habitat.altitude;
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
        water: waterScore,
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
        return `${score} Part del sector amb bosc i sòl compatibles. No és una probabilitat de trobar bolets.`;
      case "altitude":
        return `${score} Encaix de l’altitud amb el rang habitual de l’espècie.`;
      case "phenology":
        return `${score} Encaix de la data actual amb la temporada habitual de l’espècie.`;
      case "water":
        return `${score} Resumeix la humitat del sòl, la pluja recent i l’assecament.`;
      case "temperature":
        return `${score} Compara la temperatura recent amb el rang preferit de l’espècie.`;
      case "extremes":
        return `${score} Reflecteix l’efecte recent de les gelades i la calor extrema.`;
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
              ? `Sector seleccionat · ${regionLabels[snapshot.regionId]}`
              : regionalSummary
                ? `Resum de ${regionLabels[snapshot.regionId]}`
                : "Lectura territorial"}
          </p>
          <p className="condition-last-updated">
            <Clock3 size={13} aria-hidden="true" />
            Dades meteorològiques actualitzades: {weatherUpdatedAt}
          </p>
          <h3>
            Condicions actuals · {regionLabels[snapshot.regionId]}
          </h3>
        </div>
        <div
          className={`suitability-score ${predictionStatus.kind}`}
        >
          <strong style={resultBand ? { color: resultBand.color } : undefined}>{result.score ?? "—"}</strong>
          <span>{cellId ? "valoració del sector" : "valoració territorial"} · {predictionStatus.label}</span>
        </div>
      </div>
      {snapshot.stale && (
        <p className="data-note">
          Falten lectures recents per a aquesta zona. La valoració tornarà
          quan tinguem tota la informació necessària.
        </p>
      )}
      {predictionStatus.kind === "score-withheld" && (
        <p className="data-note prediction-withheld-note">
          <strong>Valoració no disponible.</strong>{" "}
          {cellId
            ? "Falta alguna lectura necessària per valorar aquest sector."
            : "Selecciona un sector del mapa per combinar el temps amb el bosc i el sòl."}
        </p>
      )}
      {regionalSummary && result.score !== null && (
        <p className="data-note regional-summary-note">
          <strong>Resultat habitual dins el terreny adequat.</strong>{" "}
          La majoria de lectures centrals es mouen entre {regionalSummary.scoreRange[0]} i{" "}
          {regionalSummary.scoreRange[1]}/100. Les condicions poden variar dins la regió.
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
                        ? <><strong>Sense gelada</strong><span>{temperatureWindowDays ? `en ${temperatureWindowDays} dies` : "durant el període analitzat"}</span></>
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
              <dd>{v.altitudeM === undefined ? "Sense informació" : `${Math.round(v.altitudeM)} m`}</dd>
              <small>
                Preferència: {altitudeMin}–{altitudeMax} m
                {v.habitatAltitudeSuitability === undefined
                  ? ""
                  : ` · Coincidència amb l’altitud habitual: ${Math.round(v.habitatAltitudeSuitability)}%`}
              </small>
            </div>
            <div>
              <dt><Trees size={17} aria-hidden="true" />Bosc i terreny adequats</dt>
              <dd>{v.habitatCoveragePercent === undefined ? "Sense informació" : `${Math.round(v.habitatCoveragePercent)}%`}</dd>
              <small>Part del sector on el tipus de bosc i de sòl encaixen</small>
            </div>
            <div>
              <dt><Layers3 size={17} aria-hidden="true" />Tipus de sòl</dt>
              <dd>{soilReactionLabel(v.soilPh)}</dd>
              <small>Preferència: {species.ecologicalConfig.soil.reaction}</small>
            </div>
            <div>
              <dt><Layers3 size={17} aria-hidden="true" />Textura del sòl</dt>
              <dd>{v.soilTexture ? uppercaseInitial(v.soilTexture) : "Sense informació"}</dd>
              <small>Preferència: {uppercaseInitial(species.ecologicalConfig.soil.texture)}</small>
            </div>
          </dl>
        </section>
      ) : null}
      <div className="factor-chart">
        <div className="chart-caption">
          <span>{cellCalculation ? "Com s’obté la valoració" : "Factors que afavoreixen o limiten"}</span>
          <strong style={resultBand ? { color: resultBand.color } : undefined}>
            {predictionStatus.kind === "available" && result.score !== null
              ? getSuitabilityBand(result.score).label
              : predictionStatus.label.charAt(0).toUpperCase() +
                predictionStatus.label.slice(1)}
          </strong>
        </div>
        {cellCalculation && (
          <ol className="score-calculation" aria-label="Resum de la valoració del sector">
            <li>
              <span className="score-calculation-step">1 · Condicions del moment</span>
              <strong>{cellCalculation.fruiting}<small>/100</small></strong>
              <p>Valorem si coincideixen la temporada habitual, l’aigua disponible, la temperatura i els episodis extrems.</p>
            </li>
            <li>
              <span className="score-calculation-step">2 · Terreny adequat</span>
              <strong>{cellCalculation.effectiveHabitat}<small>% del sector</small></strong>
              <p>Indica quina part del sector té un tipus de bosc, un sòl i una altitud adequats per a l’espècie.</p>
            </li>
            <li className="score-calculation-result">
              <span className="score-calculation-step">3 · Valoració final</span>
              <strong style={resultBand ? { color: resultBand.color } : undefined}>
                {cellCalculation.opportunity}<small>/100</small>
              </strong>
              <p>Resumeix si el lloc i el moment coincideixen. No és una probabilitat de trobar bolets.</p>
            </li>
          </ol>
        )}
        <p className="factor-chart-explanation">
          {regionalSummary
            ? "Cada barra resumeix les condicions dins el terreny adequat. Una condició molt desfavorable redueix tota la valoració, encara que les altres siguin bones; no és una probabilitat de trobar bolets."
            : cellCalculation
              ? "La condició més desfavorable pot limitar el resultat, encara que la resta siguin bones."
              : "Una condició molt desfavorable redueix tota la valoració, encara que les altres siguin bones; no és una probabilitat de trobar bolets."}
        </p>
        {unavailableComponents.length > 0 && (
          <dl
            className="unavailable-factor-list"
            aria-label="Factors necessaris no disponibles"
          >
            {unavailableComponents.map((item) => (
              <div key={item.id}>
                <dt>{item.label}</dt>
                <dd>{unavailableComponentCopy}</dd>
              </div>
            ))}
          </dl>
        )}
        <ul className="factor-bars" aria-label="Factors que influeixen en la valoració">
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
                  aria-label={`${entry.name}: ${entry.score} sobre 100, ${band.label}`}
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
