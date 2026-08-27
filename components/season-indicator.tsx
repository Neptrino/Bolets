import {
  SEASON_MONTHS,
  SEASONAL_ACTIVITY_LABELS,
} from "@/src/lib/seasonality";
import type { SpeciesCardProfile } from "@/src/lib/species-card-profile";
import type { Month } from "@/src/lib/types";

export function SeasonIndicator({
  species,
  currentMonth,
}: {
  species: SpeciesCardProfile;
  currentMonth: Month;
}) {
  const seasonality = species.ecologicalConfig.seasonality;
  if (!seasonality) return null;
  return (
    <div
      className="card-season"
      role="group"
      aria-label={`Temporada anual de ${species.identity.commonName}`}
    >
      <ol className="card-season-grid" aria-label="Activitat potencial per mes">
        {SEASON_MONTHS.map(({ key, shortLabel, narrowLabel, label }) => {
          const activity = seasonality[key];
          const isCurrent = key === currentMonth;

          return (
            <li
              key={key}
              className={`card-season-month${isCurrent ? " is-current" : ""}`}
              aria-current={isCurrent ? "date" : undefined}
              aria-label={`${label}: ${SEASONAL_ACTIVITY_LABELS[activity]}${isCurrent ? ", mes actual" : ""}`}
            >
              <span className="card-season-month-label" aria-hidden="true">
                <span className="card-season-label-wide">{shortLabel}</span>
                <span className="card-season-label-narrow">{narrowLabel}</span>
              </span>
              <i className={`card-season-level ${activity}`} aria-hidden="true" />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
