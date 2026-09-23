import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  ArrowUpRight,
  CalendarDays,
  CloudRain,
  Mountain,
  Sprout,
  ThermometerSun,
  Trees
} from "lucide-react";
import { CulinaryRating } from "@/components/culinary-rating";
import { MediaImage } from "@/components/media-image";
import { SectionHeader } from "@/components/page-layout";
import { SeasonIndicator } from "@/components/season-indicator";
import { HrefSelect } from "@/components/ui/query-select";
import { speciesSelectItems } from "@/data/species";
import { comparisonHref } from "@/data/comparison-pages";
import { speciesPath } from "@/src/lib/seo";
import { monthInTimeZone, SEASON_MONTHS } from "@/src/lib/seasonality";
import type { Month, SpeciesProfile } from "@/src/lib/types";

/* The interactive comparator: two species cards with selectors and the
   ecological matrix. Shared by /compare and every published pair page, so a
   known pair has one page carrying both the tool and its written guide. */

function peakSeason(species: SpeciesProfile) {
  const peakMonths = SEASON_MONTHS
    .filter(({ key }) => species.ecologicalConfig.seasonality[key] === "peak")
    .map(({ label }) => label);

  return peakMonths.length
    ? new Intl.ListFormat("ca-ES", { style: "long", type: "conjunction" }).format(peakMonths)
    : "Sense pic definit";
}

const comparisonRows = (left: SpeciesProfile, right: SpeciesProfile) => [
  { label: "Bosc", icon: Trees, left: left.ecologicalConfig.habitat.forestTypes.join(", "), right: right.ecologicalConfig.habitat.forestTypes.join(", ") },
  { label: "Arbres hoste", icon: Sprout, left: left.ecologicalConfig.habitat.treeAssociations.join(", "), right: right.ecologicalConfig.habitat.treeAssociations.join(", ") },
  { label: "Sòl", icon: Sprout, left: `${left.ecologicalConfig.soil.reaction} · ${left.ecologicalConfig.soil.substrate}`, right: `${right.ecologicalConfig.soil.reaction} · ${right.ecologicalConfig.soil.substrate}` },
  { label: "Altitud", icon: Mountain, left: `${left.ecologicalConfig.habitat.altitude[0]}–${left.ecologicalConfig.habitat.altitude[1]} m`, right: `${right.ecologicalConfig.habitat.altitude[0]}–${right.ecologicalConfig.habitat.altitude[1]} m` },
  { label: "Temperatura", icon: ThermometerSun, left: `${left.ecologicalConfig.climate.temperatureRange.join("–")} °C`, right: `${right.ecologicalConfig.climate.temperatureRange.join("–")} °C` },
  { label: "Pluja", icon: CloudRain, left: left.ecologicalConfig.rainfall.preferredAccumulation, right: right.ecologicalConfig.rainfall.preferredAccumulation }
];

function ComparisonSeason({
  species,
  currentMonth,
}: {
  species: SpeciesProfile;
  currentMonth: Month;
}) {
  return (
    <div className="compare-season">
      <div className="compare-season-summary">
        <span>Pic de temporada:</span>{" "}
        <strong>{peakSeason(species)}</strong>
      </div>
      <SeasonIndicator species={species} currentMonth={currentMonth} />
    </div>
  );
}

function ComparisonProfileCard({
  species,
  other,
  side
}: {
  species: SpeciesProfile;
  other: SpeciesProfile;
  side: "left" | "right";
}) {
  const hrefByValue = Object.fromEntries(speciesSelectItems.map(({ value }) => [
    value,
    side === "left" ? comparisonHref(value, other.speciesId) : comparisonHref(other.speciesId, value),
  ]));
  const image = species.media.find((asset) => asset.identificationReference && asset.localPath)
    ?? species.media.find((asset) => asset.localPath);
  const sideLetter = side === "left" ? "A" : "B";

  return (
    <article className={`compare-profile-card compare-profile-card-${side}`}>
      <div className="compare-profile-control">
        <span><b>{sideLetter}</b>Espècie</span>
        <HrefSelect
          value={species.speciesId}
          items={speciesSelectItems}
          hrefByValue={hrefByValue}
          variant="comparison"
          aria-label={`Selecciona l’espècie ${side === "left" ? "esquerra" : "dreta"}`}
        />
      </div>
      <div className={`compare-profile-visual${image ? " has-image" : ""}`}>
        {image ? (
          <MediaImage
            asset={image}
            className="compare-profile-photo"
            alt={image.alt}
            fill
            loading={side === "left" ? "eager" : "lazy"}
            fetchPriority={side === "left" ? "high" : "auto"}
            sizes="(max-width: 520px) calc(100vw - 52px), (max-width: 800px) calc(100vw - 80px), (max-width: 1228px) calc(50vw - 85px), 529px"
          />
        ) : (
          <span className="compare-profile-monogram" aria-hidden="true">{species.identity.genus.slice(0, 2)}</span>
        )}
        <div className="compare-profile-vignette" aria-hidden="true" />
        <CulinaryRating
          profile={species.culinaryProfile}
          status={species.identity.edibility}
          compact
        />
        {image && (
          <Link className="compare-photo-credit" href={image.sourceUrl} target="_blank" rel="noreferrer" title={image.license}>
            Foto · {image.attribution}
          </Link>
        )}
      </div>
      <div className="compare-profile-body">
        <div className="compare-profile-meta">
          <span>{species.identity.genus}</span>
          <span>{species.identity.family}</span>
        </div>
        <h2>{species.identity.commonName}</h2>
        <em>{species.identity.scientificName}</em>
        <p>{species.identity.shortDescription}</p>
        <div className="compare-quick-facts">
          <span><Trees size={15} aria-hidden="true" /><small>Bosc</small><strong>{species.ecologicalConfig.habitat.forestTypes[0]}</strong></span>
          <span><Mountain size={15} aria-hidden="true" /><small>Altitud</small><strong>{species.ecologicalConfig.habitat.altitude.join("–")} m</strong></span>
          <span><ThermometerSun size={15} aria-hidden="true" /><small>Temperatura</small><strong>{species.ecologicalConfig.climate.temperatureRange.join("–")} °C</strong></span>
        </div>
        <Link className="compare-profile-link" href={speciesPath(species)}>
          Obrir la fitxa completa <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export function SpeciesComparator({
  left,
  right,
  swappable = true,
  children,
  matrixHeading,
}: {
  left: SpeciesProfile;
  right: SpeciesProfile;
  /** A published pair page has one fixed order, so it shows "vs." instead of a swap link. */
  swappable?: boolean;
  /** Written guide content placed between the species cards and the ecological matrix. */
  children?: ReactNode;
  /** Replaces the matrix heading, e.g. with a pair's written habitat and season answer. */
  matrixHeading?: { meta: string; title: string; description: ReactNode };
}) {
  const currentMonth = monthInTimeZone();

  return (
    <>
      <div className="compare-stage">
        <ComparisonProfileCard species={left} other={right} side="left" />
        {swappable ? (
          <Link
            className="icon-tile compare-swap"
            href={`/compare?left=${right.speciesId}&right=${left.speciesId}`}
            aria-label="Intercanvia les espècies"
            title="Intercanvia les espècies"
          >
            <ArrowRightLeft size={22} aria-hidden="true" />
            <span>Intercanvia</span>
          </Link>
        ) : (
          <span className="icon-tile compare-swap compare-versus" aria-hidden="true">vs.</span>
        )}
        <ComparisonProfileCard species={right} other={left} side="right" />
      </div>

      {children}

      <section className="compare-matrix" aria-labelledby="compare-matrix-title">
        <SectionHeader
          meta={matrixHeading?.meta ?? "Perfil ecològic"}
          title={matrixHeading?.title ?? "Cara a cara"}
          titleId="compare-matrix-title"
          description={matrixHeading?.description}
        />
        <div
          className="compare-matrix-table"
          role="table"
          aria-labelledby="compare-matrix-title"
        >
          <header className="compare-matrix-heading" role="row">
            <div className="label-caps compare-matrix-criterion" role="columnheader">
              Criteri
            </div>
            <div
              className="compare-matrix-species compare-matrix-species-left"
              role="columnheader"
              aria-label={`Espècie A: ${left.identity.commonName}, ${left.identity.scientificName}`}
            >
              <i aria-hidden="true">A</i>
              <span>
                <strong>{left.identity.commonName}</strong>
                <em>{left.identity.scientificName}</em>
              </span>
            </div>
            <div
              className="compare-matrix-species compare-matrix-species-right"
              role="columnheader"
              aria-label={`Espècie B: ${right.identity.commonName}, ${right.identity.scientificName}`}
            >
              <i aria-hidden="true">B</i>
              <span>
                <strong>{right.identity.commonName}</strong>
                <em>{right.identity.scientificName}</em>
              </span>
            </div>
          </header>
          {comparisonRows(left, right).map((row) => {
            const Icon = row.icon;
            return (
              <article className="compare-matrix-row" role="row" key={row.label}>
                <div className="compare-matrix-label" role="rowheader"><Icon size={18} aria-hidden="true" /><span>{row.label}</span></div>
                <div
                  className="compare-matrix-cell compare-matrix-cell-left"
                  role="cell"
                  aria-label={`${left.identity.commonName}: ${row.left}`}
                >
                  <span className="label-caps compare-matrix-cell-key" aria-hidden="true">A · {left.identity.commonName}</span>
                  <p>{row.left}</p>
                </div>
                <div
                  className="compare-matrix-cell compare-matrix-cell-right"
                  role="cell"
                  aria-label={`${right.identity.commonName}: ${row.right}`}
                >
                  <span className="label-caps compare-matrix-cell-key" aria-hidden="true">B · {right.identity.commonName}</span>
                  <p>{row.right}</p>
                </div>
              </article>
            );
          })}
          <article className="compare-matrix-row compare-matrix-row-season" role="row">
            <div className="compare-matrix-label" role="rowheader">
              <CalendarDays size={18} aria-hidden="true" />
              <span>Temporada</span>
            </div>
            <div className="compare-matrix-cell compare-matrix-cell-left" role="cell">
              <span className="label-caps compare-matrix-cell-key" aria-hidden="true">A · {left.identity.commonName}</span>
              <ComparisonSeason species={left} currentMonth={currentMonth} />
            </div>
            <div className="compare-matrix-cell compare-matrix-cell-right" role="cell">
              <span className="label-caps compare-matrix-cell-key" aria-hidden="true">B · {right.identity.commonName}</span>
              <ComparisonSeason species={right} currentMonth={currentMonth} />
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
