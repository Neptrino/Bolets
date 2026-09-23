import type { CSSProperties } from "react";
import { CloudRain } from "lucide-react";
import { SpeciesIcon } from "@/components/species-icon";
import {
  rainResponseAtGaugeMm,
  type RainWindowGroup,
  type ScoredRainWindow,
} from "@/src/lib/rain-response-summary";

/* Server-rendered infographics for the rain guide. Every position comes from
   the scored rain windows, so the drawings follow each model refit exactly as
   the table beside them does. */

const TIMELINE_DAYS = 30;
const AXIS_DAYS = [7, 14, 21, 28] as const;
const MAX_ROW_ICONS = 5;

function percent(value: number) {
  return `${Math.round(value * 1000) / 10}%`;
}

/** One window on the 30-day axis: dashed while the rain does not count yet,
    solid while it does. Shared by the timeline and the species cards. */
export function RainWindowTrack({ window, compact = false }: { window: ScoredRainWindow; compact?: boolean }) {
  const start = (window.startDaysAgo - 1) / TIMELINE_DAYS;
  const end = window.endDaysAgo / TIMELINE_DAYS;
  const label = compact
    ? `dies ${window.excludesRecent ? window.startDaysAgo : 1}–${window.endDaysAgo}`
    : window.excludesRecent
      ? `del dia ${window.startDaysAgo} al ${window.endDaysAgo}`
      : `fins al dia ${window.endDaysAgo}`;
  return (
    <div className={compact ? "rain-timeline-track is-compact" : "rain-timeline-track"}>
      {window.excludesRecent && (
        <span className="rain-timeline-wait" style={{ "--from": "0%", "--to": percent(start) } as CSSProperties}>
          {compact ? "" : "encara no"}
        </span>
      )}
      <span className="panel-dark rain-timeline-bar" style={{ "--from": percent(start), "--to": percent(end) } as CSSProperties}>
        {label}
      </span>
    </div>
  );
}

/** Coarse level for the catalogue's prior-moisture wording; null keeps text only. */
export function priorMoistureLevel(text: string): 1 | 2 | 3 | null {
  if (/^Moderadament/i.test(text)) return 1;
  if (/^(Molt important|Essencial)/i.test(text)) return 3;
  if (/^Important/i.test(text)) return 2;
  return null;
}

export function RainTimeline({
  groups,
  speciesIdByName,
}: {
  groups: RainWindowGroup[];
  speciesIdByName: ReadonlyMap<string, string>;
}) {
  return (
    <figure className="card rain-timeline">
      <figcaption>
        <strong>Si plou avui, quins dies comptarà aquesta pluja?</strong>
        <span>Cada barra marca els dies en què el mapa encara suma la pluja d’avui per a aquell grup d’espècies.</span>
      </figcaption>
      <div className="rain-timeline-chart">
        <div className="rain-timeline-axis" aria-hidden="true">
          <span className="rain-timeline-today" style={{ "--at": "0%" } as CSSProperties}><CloudRain size={16} /> Plou</span>
          {AXIS_DAYS.map((day) => (
            <span key={day} style={{ "--at": percent(day / TIMELINE_DAYS) } as CSSProperties}>dia {day}</span>
          ))}
        </div>
        <ol>
          {groups.map((group) => {
            const { window } = group;
            const icons = group.speciesNames
              .map((name) => speciesIdByName.get(name))
              .filter((id): id is string => Boolean(id))
              .slice(0, MAX_ROW_ICONS);
            return (
              <li key={`${window.startDaysAgo}-${window.endDaysAgo}`}>
                <div className="rain-timeline-label">
                  <span className="rain-timeline-icons" aria-hidden="true">
                    {icons.map((id) => <SpeciesIcon key={id} speciesId={id} size={30} />)}
                  </span>
                  <span>{group.speciesNames.length} {group.speciesNames.length === 1 ? "espècie" : "espècies"}</span>
                </div>
                <RainWindowTrack window={window} />
              </li>
            );
          })}
        </ol>
      </div>
      <p className="rain-graphic-note">
        Les barres marquen els dies de més pes. La pluja d’uns dies abans o després encara hi compta una mica.
      </p>
    </figure>
  );
}

const CURVE_SAMPLES = 60;

export function RainResponseCurve({ window, appliesToAll }: { window: ScoredRainWindow; appliesToAll: boolean }) {
  // Room past the "strong" threshold so the plateau reads as a plateau.
  const maxMm = Math.ceil((window.typicalNearFullMm * 1.6) / 50) * 50;
  const x = (mm: number) => mm / maxMm;
  const points = Array.from({ length: CURVE_SAMPLES + 1 }, (_, index) => {
    const mm = (index / CURVE_SAMPLES) * maxMm;
    return `${(x(mm) * 100).toFixed(2)},${((1 - rainResponseAtGaugeMm(window, mm)) * 100).toFixed(2)}`;
  });
  const markers = [
    { mm: window.typicalHalfResponseMm, label: "Comença a sortir" },
    { mm: window.typicalNearFullMm, label: "Surt amb força" },
  ];
  const lossMm = Math.round(window.typicalLossMm);
  return (
    <figure className="card rain-curve">
      <div
        className="rain-curve-plot"
        role="img"
        aria-label={`Corba de resposta a la pluja: els primers ${lossMm} mm es perden, amb ${window.typicalHalfResponseMm} mm arriba a la meitat de l’efecte i amb ${window.typicalNearFullMm} mm gairebé al màxim; més pluja hi afegeix poc.`}
      >
        <span className="rain-curve-loss" aria-hidden="true" style={{ "--to": percent(x(window.typicalLossMm)) } as CSSProperties} />
        <span className="rain-curve-plateau" style={{ "--from": percent(x(window.typicalNearFullMm)) } as CSSProperties}>
          <span>Més pluja hi afegeix poc</span>
        </span>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <line x1="0" y1="50" x2="100" y2="50" />
          <line x1="0" y1="0" x2="100" y2="0" />
          <polyline points={points.join(" ")} vectorEffect="non-scaling-stroke" />
        </svg>
        {markers.map((marker) => (
          <span
            key={marker.label}
            className="rain-curve-marker"
            style={{
              "--x": percent(x(marker.mm)),
              "--y": percent(1 - rainResponseAtGaugeMm(window, marker.mm)),
            } as CSSProperties}
          >
            <b>≈ {marker.mm} mm</b>
            {marker.label}
          </span>
        ))}
        <span className="rain-curve-y rain-curve-y-max">Màxim</span>
        <span className="rain-curve-y rain-curve-y-half">Meitat</span>
      </div>
      <div className="rain-curve-axis" aria-hidden="true">
        <span>0 mm</span>
        <span>{maxMm / 2} mm</span>
        <span>{maxMm} mm</span>
      </div>
      <p className="rain-curve-legend"><i aria-hidden="true" /> Els primers ≈ {lossMm} mm es queden a les fulles o s’evaporen.</p>
      <figcaption className="rain-graphic-note">
        Pluja de pluviòmetre caiguda dins la finestra de l’espècie, en una tardor típica. {appliesToAll ? "Val per a totes les espècies del mapa." : "Exemple: el cep."}
      </figcaption>
    </figure>
  );
}
