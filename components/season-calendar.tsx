import "@/app/styles/season-calendar.css";
import type { SpeciesProfile } from "@/src/lib/types";
import { monthInTimeZone } from "@/src/lib/seasonality";
import { SeasonIndicator } from "@/components/season-indicator";

export function SeasonCalendar({ species }: { species: SpeciesProfile }) {
  return (
    <div className="season-calendar" role="group" aria-label={`Calendari de temporada de ${species.identity.commonName}`}>
      <div className="season-calendar-label">Activitat potencial</div>
      <SeasonIndicator species={species} currentMonth={monthInTimeZone()} />
      <div className="season-legend">
        <span><i className="card-season-level possible" />possible</span>
        <span><i className="card-season-level moderate" />moderada</span>
        <span><i className="card-season-level good" />bona</span>
        <span><i className="card-season-level peak" />pic</span>
        <span>Mes emmarcat: mes actual</span>
      </div>
    </div>
  );
}
