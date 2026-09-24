"use client";

import "@/app/styles/season-timeline.css";
import Link from "next/link";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { ArrowRight, Pause, Play } from "lucide-react";
import { SeasonSpores, seasonLevel, useCountUp } from "@/components/season-timeline-effects";
import type { SeasonEdibilityKind, SeasonTimeline } from "@/src/lib/season-timeline";
import { monthWithPreposition, seasonMonthPath, SEASON_MONTHS } from "@/src/lib/seasonality";
import type { Month } from "@/src/lib/types";

/** Time each month stays on screen while the year plays. */
const PLAY_INTERVAL_MS = 1800;

const kinds: { id: SeasonEdibilityKind; label: string }[] = [
  { id: "edible", label: "comestibles" },
  { id: "avoid", label: "no recomanats" },
  { id: "toxic", label: "tòxics" },
];

function capitalise(value: string) {
  return value.charAt(0).toLocaleUpperCase("ca") + value.slice(1);
}

/**
 * “Un any de bolets”: the season calendar as a film. Each month bar is a link
 * to its month page; a plain click plays that month on stage instead, and the
 * play button runs through the year.
 */
export function SeasonTimelineStage({
  timeline,
  initialMonth,
  currentMonth,
  footer,
}: {
  timeline: SeasonTimeline;
  initialMonth: Month;
  currentMonth: Month;
  footer?: ReactNode;
}) {
  const [month, setMonth] = useState<Month>(initialMonth);
  const [playing, setPlaying] = useState(false);
  const frame = timeline[month];
  const tallest = Math.max(...SEASON_MONTHS.map(({ key }) => timeline[key].total));
  const level = seasonLevel(frame.total, tallest);
  const shownTotal = useCountUp(frame.total);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setMonth((previous) => {
        const index = SEASON_MONTHS.findIndex(({ key }) => key === previous);
        return SEASON_MONTHS[(index + 1) % SEASON_MONTHS.length]!.key;
      });
    }, PLAY_INTERVAL_MS);
    const stopWhenHidden = () => {
      if (document.visibilityState === "hidden") setPlaying(false);
    };
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", stopWhenHidden);
    };
  }, [playing]);

  function showMonth(event: MouseEvent<HTMLAnchorElement>, next: Month) {
    // Modified clicks keep their browser meaning: open the month page.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    setPlaying(false);
    setMonth(next);
  }

  return (
    <section
      className="panel-dark season-stage"
      aria-labelledby="season-stage-title"
      data-playing={playing || undefined}
      data-level={level.tone}
      style={{ "--season-step": `${PLAY_INTERVAL_MS}ms`, "--intensity": level.intensity } as React.CSSProperties}
    >
      <SeasonSpores intensity={level.intensity} />
      <div className="season-stage-copy">
        <h2 id="season-stage-title" className="label-caps season-stage-eyebrow">Un any de bolets a Catalunya</h2>
        <p className="season-stage-month" key={`month-${month}`} aria-live={playing ? "off" : "polite"}>
          {capitalise(SEASON_MONTHS.find(({ key }) => key === month)!.label)}
        </p>
        <p className="season-stage-level" key={`level-${month}`} data-tone={level.tone}>{level.label}</p>
        <p className="season-stage-count">
          <strong>{shownTotal}</strong>
          <span>espècies poden fructificar {monthWithPreposition(month)}</span>
        </p>
        <div className="season-stage-mix">
          <span className="season-stage-mix-bar" aria-hidden="true">
            {kinds.map((kind) => (
              <span key={kind.id} data-kind={kind.id} style={{ flexGrow: frame.byKind[kind.id] }} />
            ))}
          </span>
          <dl className="season-stage-mix-totals">
            {kinds.map((kind) => (
              <div key={kind.id}>
                <dt><span className="season-stage-swatch" data-kind={kind.id} aria-hidden="true" />{kind.label}</dt>
                <dd>{frame.byKind[kind.id]}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <ul
        className="season-stage-parade"
        key={`parade-${month}`}
        data-dense={frame.highlights.length > 8 || undefined}
        aria-label={`Bolets en bona temporada ${monthWithPreposition(month)}`}
      >
        {frame.highlights.map((species, index) => (
          <li key={species.speciesId} style={{ "--i": index } as React.CSSProperties}>
            <Link href={species.href}>
              {/* Cut-out drawings already published at their display size. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={species.icon} alt="" width={160} height={160} decoding="async" />
              <span>{species.commonName}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="season-stage-timeline">
        <button
          type="button"
          className="season-stage-play"
          aria-pressed={playing}
          onClick={() => setPlaying(!playing)}
        >
          {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
          {playing ? "Atura" : "Reprodueix l’any"}
        </button>
        <nav className="season-stage-bars" aria-label="Temporada de bolets per mesos">
          {SEASON_MONTHS.map(({ key, shortLabel, narrowLabel }) => {
            const { total, byKind } = timeline[key];
            const richest = total === tallest;
            return (
              <a
                key={key}
                href={seasonMonthPath(key)}
                className="season-stage-bar"
                aria-current={month === key ? "true" : undefined}
                aria-label={`Bolets ${monthWithPreposition(key)}: ${total} espècies${richest ? ", el mes amb més espècies" : ""}${key === currentMonth ? " (mes actual)" : ""}`}
                data-current={key === currentMonth || undefined}
                data-richest={richest || undefined}
                onClick={(event) => showMonth(event, key)}
              >
                <span className="season-stage-bar-stack" style={{ "--fill": total / tallest } as React.CSSProperties}>
                  {kinds.filter((kind) => byKind[kind.id] > 0).map((kind) => (
                    <span key={kind.id} data-kind={kind.id} style={{ flexGrow: byKind[kind.id] }} />
                  ))}
                </span>
                <span className="season-stage-bar-total" aria-hidden="true">{richest ? `★ ${total}` : total}</span>
                <span className="season-stage-bar-label" aria-hidden="true">
                  <span className="season-stage-bar-label-long">{shortLabel}</span>
                  <span className="season-stage-bar-label-short">{narrowLabel}</span>
                </span>
                {month === key && playing && <span className="season-stage-progress" key={`progress-${key}`} aria-hidden="true" />}
              </a>
            );
          })}
        </nav>
      </div>

      <div className="season-stage-footer">
        <Link href={seasonMonthPath(month)} className="text-link season-stage-month-link">
          Bolets {monthWithPreposition(month)}: espècies i calendari <ArrowRight size={16} aria-hidden="true" />
        </Link>
        {footer}
      </div>
    </section>
  );
}
