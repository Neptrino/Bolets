import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  FlaskConical,
  Info,
  LockKeyhole,
  Map as MapIcon,
  MapPinned,
  NotebookPen,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import { SectionHeader } from "@/components/page-layout";
import { opportunityLabel } from "@/src/lib/scoring";
import type {
  ForestPreferences,
  JournalSeasonSummary,
  SavedForestReading,
  SavedForestUnavailableCombination,
} from "@/src/lib/my-forest/types";

const dateFormat = new Intl.DateTimeFormat("ca-ES", {
  dateStyle: "medium",
  timeZone: "Europe/Madrid",
});
const dateTimeFormat = new Intl.DateTimeFormat("ca-ES", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Madrid",
});

function AvailableReadingGroups({
  readings,
  simulation,
}: {
  readings: SavedForestReading[];
  simulation: boolean;
}) {
  const groups = new Map<string, {
    name: string;
    path: string;
    type: string;
    readings: SavedForestReading[];
  }>();
  for (const reading of readings) {
    const group = groups.get(reading.territorySlug) ?? {
      name: reading.territoryName,
      path: reading.territoryPath,
      type: reading.territoryType,
      readings: [],
    };
    group.readings.push(reading);
    groups.set(reading.territorySlug, group);
  }

  return (
    <div className="forest-reading-groups">
      {[...groups.entries()].map(([slug, group]) => {
        const observedAt = group.readings[0]?.summary?.snapshot.observedAt;
        return <section className="forest-reading-group" aria-labelledby={`reading-${slug}`} key={slug}>
          <header>
            <div>
              <p><MapPinned size={14} aria-hidden="true" /> {group.type}</p>
              <h3 id={`reading-${slug}`}><Link href={group.path}>{group.name}</Link></h3>
            </div>
            <p className="forest-reading-updated"><Clock3 size={14} aria-hidden="true" /> {simulation
              ? "Dades simulades"
              : observedAt ? `Dades de ${dateTimeFormat.format(new Date(observedAt))}` : "Dades actuals"}</p>
            {simulation ? <span className="forest-simulation-badge">Simulació</span> : null}
          </header>
          <div className="forest-reading-columns" aria-hidden="true">
            <span>Espècie</span><span>Millor sector</span><span>Extensió del territori</span><span />
          </div>
          <ul>{group.readings.map((reading) => {
            const summary = reading.summary!;
            return <li key={reading.speciesId}>
              <strong className="forest-reading-species">{reading.speciesName}</strong>
              <span className="forest-reading-score"><strong>{summary.bestCell.score}</strong><small>/100 · {opportunityLabel(summary.bestCell.score)}</small></span>
              <dl className="forest-reading-coverage">
                <div><dt>Positius</dt><dd>{Math.round(summary.positiveCellShare * 100)}% <small>{summary.positiveCellCount} sectors</small></dd></div>
                <div><dt>Amb 20 o més</dt><dd>{Math.round(summary.score20CellShare * 100)}% <small>{summary.score20CellCount} sectors</small></dd></div>
              </dl>
              <Link href={reading.mapPath} aria-label={`Veure al mapa: ${reading.speciesName} ${reading.territoryName}`}>
                <MapIcon size={15} aria-hidden="true" /> Veure el mapa <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </li>;
          })}</ul>
        </section>;
      })}
    </div>
  );
}

function compactReadingState(reading: SavedForestReading) {
  if (reading.status === "outside-season") return {
    label: "Fora de la temporada general",
    detail: "Calendari general inactiu",
    icon: CalendarDays,
  };
  if (reading.status === "unavailable") return {
    label: "Temporalment no disponible",
    detail: "Sense dades actuals",
    icon: ShieldCheck,
  };
  return {
    label: "Dades incompletes",
    detail: "Dades incompletes o no vigents",
    icon: ShieldCheck,
  };
}

function CompactReadingGroups({ readings }: { readings: SavedForestReading[] }) {
  const groups = new Map<string, {
    name: string;
    path: string;
    type: string;
    readings: SavedForestReading[];
  }>();
  for (const reading of readings) {
    const group = groups.get(reading.territorySlug) ?? {
      name: reading.territoryName,
      path: reading.territoryPath,
      type: reading.territoryType,
      readings: [],
    };
    group.readings.push(reading);
    groups.set(reading.territorySlug, group);
  }

  return (
    <div className="forest-compact-groups">
      {[...groups.entries()].map(([slug, group]) => (
        <section className="forest-compact-group" aria-labelledby={`compact-${slug}`} key={slug}>
          <header>
            <p><MapPinned size={14} aria-hidden="true" /> {group.type}</p>
            <h3 id={`compact-${slug}`}><Link href={group.path}>{group.name}</Link></h3>
          </header>
          <ul>{group.readings.map((reading) => {
            const state = compactReadingState(reading);
            const StateIcon = state.icon;
            return (
              <li key={reading.speciesId} className={`is-${reading.status}`}>
                <strong>{reading.speciesName}</strong>
                <span className="forest-compact-state">
                  <StateIcon size={16} aria-hidden="true" />
                  <span><strong>{state.label}</strong><small>{state.detail}</small></span>
                </span>
                <Link href={reading.mapPath} aria-label={`Veure al mapa: ${reading.speciesName} ${reading.territoryName}`}>
                  <MapIcon size={15} aria-hidden="true" /> Veure el mapa <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              </li>
            );
          })}</ul>
        </section>
      ))}
    </div>
  );
}

export function TodayForYou({
  preferences,
  readings,
  unavailableCombinations = [],
  simulation = false,
}: {
  preferences: ForestPreferences;
  readings: SavedForestReading[];
  unavailableCombinations?: SavedForestUnavailableCombination[];
  simulation?: boolean;
}) {
  const hasBoth = preferences.speciesIds.length > 0 && preferences.territorySlugs.length > 0;
  const availableReadings = readings.filter((reading) =>
    reading.status === "available" && reading.summary
  );
  const compactReadings = readings.filter((reading) =>
    reading.status !== "available" || !reading.summary
  );
  return (
    <section className="forest-section" aria-labelledby="your-forest-today-title">
      <SectionHeader
        meta="Lectura personal"
        title="El teu bosc avui"
        titleId="your-forest-today-title"
        description="Les mateixes lectures territorials públiques, filtrades per les teves espècies i zones. Cap troballa privada intervé en el càlcul."
      />
      {simulation ? (
        <aside className="forest-simulation-note">
          <FlaskConical size={18} aria-hidden="true" />
          <p><strong>Previsualització local.</strong> Aquestes valoracions i superfícies són simulades per revisar la interfície; no descriuen condicions reals i no es desen.</p>
          <Link href="/compte/bosc">Veure les dades reals</Link>
        </aside>
      ) : null}
      {availableReadings.length ? (
        <AvailableReadingGroups readings={availableReadings} simulation={simulation} />
      ) : null}
      {compactReadings.length ? <CompactReadingGroups readings={compactReadings} /> : null}
      {!readings.length ? (
        <div className="forest-empty">
          <Sprout size={25} aria-hidden="true" />
          <div>
            <strong>{hasBoth ? "Encara no hi ha cap lectura per a aquesta combinació." : "Tria espècies i territoris per començar."}</strong>
            <p>{hasBoth
              ? "Les preferències queden desades, però ara no coincideixen amb cap guia local que tingui lectura actual. Pots ajustar-les més avall."
              : "Quan en desis almenys una de cada, aquí apareixeran les combinacions que ja disposen de guia local i dades territorials."}</p>
          </div>
        </div>
      ) : null}
      {unavailableCombinations.length ? (
        <aside className="forest-unavailable-combinations" aria-label="Combinacions sense lectura territorial">
          <Info size={17} aria-hidden="true" />
          <div>
            <p><strong>{unavailableCombinations.length} {unavailableCombinations.length === 1 ? "combinació" : "combinacions"} sense lectura territorial:</strong></p>
            <ul>{unavailableCombinations.map((combination) => (
              <li key={`${combination.territorySlug}:${combination.speciesId}`}>
                {combination.speciesName} <span>·</span> {combination.territoryName}
              </li>
            ))}</ul>
            <small>Les preferències estan desades; només mostrem una targeta quan ja existeix una guia local per a l’espècie i el territori.</small>
          </div>
        </aside>
      ) : null}
      <p className="forest-trend-note"><ShieldCheck size={15} aria-hidden="true" /> No etiquetem cap tendència com a millorant, estable o baixant: la lectura territorial actual encara no incorpora una sèrie històrica comparable per afirmar-ho.</p>
    </section>
  );
}

export function JournalSummary({ summary }: { summary: JournalSeasonSummary }) {
  return (
    <section className="forest-section" aria-labelledby="journal-summary-title">
      <SectionHeader
        meta={`Temporada ${summary.seasonLabel}`}
        title="La teva temporada"
        titleId="journal-summary-title"
        description="Resum privat de les troballes del teu compte. Les coordenades, les notes i les fotos privades no formen part d’aquest resum."
      />
      {summary.total ? (
        <div className="forest-journal-card">
          <div className="forest-journal-total"><NotebookPen size={22} aria-hidden="true" /><span><strong>{summary.total}</strong><small>{summary.total === 1 ? "troballa" : "troballes"}</small></span></div>
          <dl>
            <div><dt>Espècies registrades</dt><dd>{summary.speciesCount}</dd></div>
            <div><dt>Més anotada</dt><dd>{summary.topSpecies ? `${summary.topSpecies.name} · ${summary.topSpecies.count}` : "—"}</dd></div>
            <div><dt>Publicades / privades</dt><dd>{summary.publicCount} / {summary.privateCount}</dd></div>
            <div><dt>Primera / més recent</dt><dd>{summary.firstObservedOn && summary.latestObservedOn ? `${dateFormat.format(new Date(`${summary.firstObservedOn}T12:00:00Z`))} / ${dateFormat.format(new Date(`${summary.latestObservedOn}T12:00:00Z`))}` : "—"}</dd></div>
          </dl>
          <p><LockKeyhole size={15} aria-hidden="true" /> Aquestes xifres només són visibles dins el teu compte.</p>
        </div>
      ) : (
        <div className="forest-empty">
          <NotebookPen size={25} aria-hidden="true" />
          <div><strong>La temporada encara és en blanc.</strong><p>Quan anotis una troballa, aquí en veuràs el recompte privat. Pots crear l’esborrany al bosc encara que no tinguis connexió.</p><Link className="text-link" href="/troballes/nova">Anotar una troballa <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
        </div>
      )}
    </section>
  );
}
