import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, TriangleAlert } from "lucide-react";
import { SectionHeader } from "@/components/page-layout";
import { SpeciesCollection } from "@/components/species-collection";
import { SpeciesIcon } from "@/components/species-icon";
import { seasonGuides, speciesForSeasonGuide, type SeasonGuide } from "@/src/lib/season-guides";
import { seasonMonthHighlights, seasonProtagonists, splitSeasonSpecies } from "@/src/lib/season-highlights";
import { SEASON_MONTHS } from "@/src/lib/seasonality";
import { speciesPath } from "@/src/lib/seo";
import { toSpeciesCardProfile } from "@/src/lib/species-card-profile";
import type { Month, SpeciesProfile } from "@/src/lib/types";
import "@/app/styles/season-guide.css";

const catalanList = new Intl.ListFormat("ca-ES", { style: "long", type: "conjunction" });
const shortMonth = (month: Month) => SEASON_MONTHS.find((entry) => entry.key === month)?.shortLabel ?? month;
const seasonName = (guide: SeasonGuide) => guide.cardTitle.replace(/^Bolets /u, "");
const inSeason: Record<SeasonGuide["id"], string> = { primavera: "a la primavera", estiu: "a l’estiu", tardor: "a la tardor", hivern: "a l’hivern" };

const shortRange: Record<SeasonGuide["id"], string> = { primavera: "mar–jun", estiu: "jun–ago", tardor: "set–nov", hivern: "des–feb" };

/** Season tabs for the page header's eyebrow line: every guide, the current one with its months. */
export function SeasonTabs({ current }: { current: SeasonGuide["id"] }) {
  return (
    <span className="season-tabs">
      {seasonGuides.map((guide) => guide.id === current ? (
        <span key={guide.id} className="is-current" aria-current="page">{guide.id} <small>{shortRange[guide.id]}</small></span>
      ) : (
        <Link key={guide.id} href={guide.path} aria-label={guide.cardTitle}>{guide.id}</Link>
      ))}
    </span>
  );
}

/** Answer-first opening: the question, a short answer and the season's best-known edibles as icon tiles. */
export function SeasonProtagonists({ guide, species }: { guide: SeasonGuide; species: readonly SpeciesProfile[] }) {
  const protagonists = seasonProtagonists(guide, species);
  if (!protagonists.length) return null;
  const names = catalanList.format(protagonists.map(({ species: item }) => item.identity.commonName.toLocaleLowerCase("ca-ES")));
  const range = guide.rangeSentence.charAt(0).toLocaleUpperCase("ca-ES") + guide.rangeSentence.slice(1);
  return (
    <section className="season-protagonists" aria-labelledby={`${guide.id}-answer-title`}>
      <SectionHeader
        meta="Resposta de temporada"
        title={`Quins bolets surten ${inSeason[guide.id]} a Catalunya?`}
        titleId={`${guide.id}-answer-title`}
        description={<>{range}, els comestibles més buscats amb bona activitat al calendari són: {names}. La combinació concreta canvia cada mes; consulta les <Link href="/bolets-avui">condicions actuals</Link> abans de preparar una sortida.</>}
      />
      <ul className="season-protagonist-list">
        {protagonists.map(({ species: item, bestMonths }) => (
          <li key={item.speciesId}>
            <Link href={speciesPath(item)}>
              <SpeciesIcon speciesId={item.speciesId} size={72} />
              <strong>{item.identity.commonName}</strong>
              <small>Millor: {bestMonths.map(shortMonth).join(" · ")}</small>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** One column per month of the season with the edibles at their best. */
export function SeasonMonthColumns({ guide, species, description }: {
  guide: SeasonGuide;
  species: readonly SpeciesProfile[];
  description?: ReactNode;
}) {
  const months = seasonMonthHighlights(guide, species);
  return (
    <section className="season-months" aria-labelledby={`${guide.id}-months-title`}>
      <SectionHeader
        meta={guide.rangeLabel}
        title="Què surt cada mes"
        titleId={`${guide.id}-months-title`}
        description={description}
        actions={<Link href="/temporada" className="text-link">Calendari mensual <ArrowUpRight size={16} /></Link>}
      />
      <ol className="season-month-grid" style={{ "--season-months": months.length } as React.CSSProperties}>
        {months.map((month) => (
          <li key={month.month}>
            <h3><Link href={`/temporada/${SEASON_MONTHS.find((entry) => entry.key === month.month)?.slug}`}>{month.label}</Link></h3>
            {month.species.length ? (
              <ul>
                {month.species.map((item) => (
                  <li key={item.speciesId}>
                    <Link href={speciesPath(item)}><SpeciesIcon speciesId={item.speciesId} size={32} />{item.identity.commonName}</Link>
                  </li>
                ))}
              </ul>
            ) : <p>Cap comestible del catàleg en el seu millor moment.</p>}
            {month.more > 0 && <p className="season-month-more">i {month.more} més al calendari</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The season's cards: edibles first, then the toxic and inedible species in their own block. */
export function SeasonSpeciesCollections({ guide, species, currentMonth, meta }: {
  guide: SeasonGuide;
  species: readonly SpeciesProfile[];
  currentMonth?: Month;
  meta?: ReactNode;
}) {
  const { edible, caution } = splitSeasonSpecies(species);
  return (
    <>
      <section className="intent-species-section" aria-labelledby={`${guide.id}-catalogue-title`}>
        <SectionHeader
          meta={meta}
          title={`${edible.length} comestibles ${seasonName(guide)}`}
          titleId={`${guide.id}-catalogue-title`}
          description={`Ordenats pels més buscats. El calendari del catàleg inclou ${species.length} espècies amb activitat ${guide.rangeSentence}.`}
          actions={<Link href="/bolets-comestibles" className="text-link">Tots els comestibles <ArrowUpRight size={16} /></Link>}
        />
        <SpeciesCollection species={edible.map(toSpeciesCardProfile)} currentMonth={currentMonth} />
      </section>
      {caution.length > 0 && (
        <section className="intent-species-section season-caution-section" aria-labelledby={`${guide.id}-caution-title`}>
          <SectionHeader
            meta={<span className="season-caution-meta"><TriangleAlert size={14} aria-hidden="true" /> No es mengen</span>}
            title={`${caution.length} tòxics i no comestibles que cal conèixer`}
            titleId={`${guide.id}-caution-title`}
            description="Surten en els mateixos mesos i boscos, i alguns es confonen amb els comestibles de dalt."
            actions={<Link href="/bolets-verinosos" className="text-link">Guia de bolets verinosos <ArrowUpRight size={16} /></Link>}
          />
          <SpeciesCollection species={caution.map(toSpeciesCardProfile)} currentMonth={currentMonth} showLayoutControl={false} />
        </section>
      )}
    </>
  );
}

/** Cards linking the four season guides, each previewed by its protagonists; `highlight` marks
    the season of the month being read. Season guides use `SeasonTabs` in the header instead. */
export function SeasonGuideCards({
  highlight,
  highlightLabel = "Ara",
  meta = "Per estacions",
  title = "Bolets de primavera, estiu, tardor i hivern",
  className,
}: {
  highlight?: SeasonGuide["id"];
  /** Badge on the highlighted card: “Ara” for the current season, or the month it contains. */
  highlightLabel?: string;
  meta?: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <nav className={className ? `other-season-guides ${className}` : "other-season-guides"} aria-labelledby="other-season-guides-title">
      <SectionHeader meta={meta} title={title} titleId="other-season-guides-title" />
      <ul>
        {seasonGuides.map((guide) => (
          <li key={guide.id}>
            <Link href={guide.path}>
              <span className="other-season-icons" aria-hidden="true">
                {seasonProtagonists(guide, speciesForSeasonGuide(guide), 3).map(({ species: item }) => (
                  <SpeciesIcon key={item.speciesId} speciesId={item.speciesId} size={44} />
                ))}
              </span>
              <strong>{guide.cardTitle}</strong>
              <small>
                {guide.rangeLabel}
                {/* A badge, not a selected state: every card is a link to its guide. */}
                {guide.id === highlight ? <span className="pill other-season-badge">{highlightLabel}</span> : null}
              </small>
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
