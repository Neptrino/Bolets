import type { SpeciesProfile } from "@/src/lib/types";
import { SEASON_MONTHS, SEASONAL_ACTIVITY_LABELS } from "@/src/lib/seasonality";

export function SeasonCalendar({ species }: { species: SpeciesProfile }) {
  return (
    <div className="season-calendar" role="img" aria-label={`Calendari de temporada de ${species.identity.commonName}`}>
      <div className="season-calendar-label">Activitat potencial</div>
      <div className="season-grid">
        {SEASON_MONTHS.map(({ key, shortLabel }) => {
          const activity = species.ecologicalConfig.seasonality[key];
          return <div key={key} className="season-month"><span>{shortLabel}</span><i className={`season-level ${activity}`} title={SEASONAL_ACTIVITY_LABELS[activity]} /></div>;
        })}
      </div>
      <div className="season-legend"><span><i className="season-level possible" />possible</span><span><i className="season-level good" />bona</span><span><i className="season-level peak" />pic</span></div>
    </div>
  );
}
