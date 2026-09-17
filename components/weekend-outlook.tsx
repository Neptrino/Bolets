import { cache } from "react";
import { connection } from "next/server";
import { CalendarDays } from "lucide-react";
import { isAreaOverviewItem, rankOverviewItems } from "@/src/lib/current-overview";
import { loadOverview, overviewLocationName } from "@/src/lib/current-overview-page";
import { GLOBAL_SPECIES_ID } from "@/src/lib/global-map";
import { getCachedPredictionMapTimelineFrame } from "@/src/lib/prediction-response-cache";
import { opportunityLabel } from "@/src/lib/scoring";
import type { GlobalPredictionMapCell } from "@/src/lib/types";
import { weekendWindow } from "@/src/lib/week-window";
import {
  WEEKEND_OUTLOOK_FRAME_LIMIT,
  WEEKEND_OUTLOOK_GRID_M,
  WEEKEND_OUTLOOK_ROWS,
  loadWeekendOutlook,
  weekendOutlookIntro,
  weekendOutlookTarget,
} from "@/src/lib/weekend-outlook";

const loadWeekend = cache(async () => {
  await connection();
  const target = weekendOutlookTarget(new Date());
  return loadWeekendOutlook(target, async (bounds, offset) => {
    const frame = await getCachedPredictionMapTimelineFrame(GLOBAL_SPECIES_ID, bounds, WEEKEND_OUTLOOK_FRAME_LIMIT, WEEKEND_OUTLOOK_GRID_M, offset);
    // The combined frame carries the leading species per cell; the type is shared with single-species frames.
    return { truncated: frame.truncated, cells: frame.cells.map((cell): GlobalPredictionMapCell => ({ ...cell, topSpeciesId: (cell as Partial<GlobalPredictionMapCell>).topSpeciesId ?? null })) };
  });
});

/**
 * The weekend block reads the same forecast frame the map slider shows for
 * the target day, summarised per territory. On Sunday the weekend is today,
 * so the block quotes the current readings instead of a forecast.
 */
export async function WeekendOutlook() {
  const outlook = await loadWeekend();
  const { target } = outlook;
  const weekend = weekendWindow(new Date());
  const todayRows = target.offset === 0
    ? rankOverviewItems([...(await loadOverview()).loadedCurrentItems, ...(await loadOverview()).loadedAreaItems])
        .filter((item) => item.status === "available" && typeof item.summary?.bestCell.score === "number")
        .filter((item, index, all) => all.findIndex((other) => overviewLocationName(other) === overviewLocationName(item)) === index)
        .slice(0, WEEKEND_OUTLOOK_ROWS)
    : [];
  const rows = target.offset === 0
    ? todayRows.map((item) => ({
        key: `${isAreaOverviewItem(item) ? `area:${item.areaSlug}` : `region:${item.regionId}`}:${item.speciesId}`,
        name: overviewLocationName(item),
        speciesName: item.speciesName,
        score: item.summary!.bestCell.score as number,
      }))
    : outlook.rows.map((row) => ({
        key: `${row.slug}:${row.speciesId}`,
        name: row.name,
        speciesName: row.speciesName,
        score: row.score,
      }));

  return (
    <section id="cap-de-setmana" className="current-weekend" aria-labelledby="current-weekend-title">
      <p className="eyebrow"><CalendarDays size={14} aria-hidden="true" /> {target.offset === 0 ? "Cap de setmana" : "Predicció · cap de setmana"}</p>
      <h2 id="current-weekend-title">On trobar bolets aquest cap de setmana, {weekend.label}</h2>
      <p>{weekendOutlookIntro(target)}</p>
      {rows.length > 0 ? (
        <ol className="current-weekend-list" aria-label={target.offset === 0 ? "Zones amb millors condicions avui" : `Zones amb millor predicció per a ${target.label}`}>
          {rows.map((row, index) => (
            <li key={row.key}>
              <span className="current-weekend-rank" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <strong>{row.name}</strong>
              <span>{row.speciesName} · {row.score}/100, {opportunityLabel(row.score)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="current-weekend-empty">{outlook.partial
          ? "La predicció del cap de setmana no està disponible ara mateix. Torna-ho a provar més tard."
          : "Cap territori arriba a condicions favorables en la predicció d’aquest cap de setmana."}</p>
      )}
      <p className="current-weekend-note">
        {target.offset === 0
          ? "Lectures d’avui, no una predicció."
          : `Predicció calculada amb el model meteorològic sobre les lectures d’avui${outlook.partial && rows.length > 0 ? ", amb alguns territoris sense dades" : ""}.`}
        {" "}Una pluja o una gelada la pot canviar: revisa la lectura el dia abans de sortir.
      </p>
    </section>
  );
}

export function WeekendOutlookLoading() {
  return (
    <section id="cap-de-setmana" className="current-weekend current-weekend-loading" aria-busy="true" aria-live="polite">
      <p className="eyebrow"><CalendarDays size={14} aria-hidden="true" /> Predicció · cap de setmana</p>
      <h2>Preparant la predicció del cap de setmana…</h2>
    </section>
  );
}
