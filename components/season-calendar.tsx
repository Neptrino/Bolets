import type { SpeciesProfile } from "@/src/lib/types";

const monthLabels = ["Gen", "Feb", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Des"] as const;
const monthKeys = ["gen", "feb", "mar", "abr", "mai", "jun", "jul", "ago", "set", "oct", "nov", "des"] as const;

export function SeasonCalendar({ species }: { species: SpeciesProfile }) {
  return (
    <div className="season-calendar" role="img" aria-label={`Calendari de temporada de ${species.identity.commonName}`}>
      <div className="season-calendar-label">Activitat potencial</div>
      <div className="season-grid">
        {monthKeys.map((month, index) => <div key={month} className="season-month"><span>{monthLabels[index]}</span><i className={`season-level ${species.ecologicalConfig.seasonality[month]}`} title={species.ecologicalConfig.seasonality[month]} /></div>)}
      </div>
      <div className="season-legend"><span><i className="season-level possible" />possible</span><span><i className="season-level good" />bona</span><span><i className="season-level peak" />pic</span></div>
    </div>
  );
}
