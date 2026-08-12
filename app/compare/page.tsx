import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
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
import { SeasonIndicator } from "@/components/season-indicator";
import { QuerySelect } from "@/components/ui/query-select";
import { speciesById, speciesSelectItems } from "@/data/species";
import { comparisonPages } from "@/data/comparison-pages";
import { monthInTimeZone, SEASON_MONTHS } from "@/src/lib/seasonality";
import { DEFAULT_SOCIAL_IMAGE } from "@/src/lib/seo";
import type { Month, SpeciesProfile } from "@/src/lib/types";

export const metadata: Metadata = {
  title: "Comparador de bolets",
  description: "Compara dues espècies de bolets de Catalunya: identificació, hàbitat, altitud, temporada, clima i comestibilitat.",
  alternates: { canonical: "/compare" },
  openGraph: {
    url: "/compare",
    title: "Comparador de bolets",
    description: "Compara identificació, hàbitat, temporada i comestibilitat de dues espècies.",
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Comparador de bolets",
    description: "Compara identificació, hàbitat, temporada i comestibilitat de dues espècies.",
    images: [DEFAULT_SOCIAL_IMAGE],
  },
};

function pick(value: string | undefined, fallback: string) {
  return value && speciesById[value] ? speciesById[value] : speciesById[fallback];
}

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
  side
}: {
  species: SpeciesProfile;
  side: "left" | "right";
}) {
  const image = species.media.find((asset) => asset.identificationReference && asset.localPath)
    ?? species.media.find((asset) => asset.localPath);
  const sideLetter = side === "left" ? "A" : "B";
  const imageSource = image?.localPath ?? image?.imageUrl ?? image?.sourceUrl;

  return (
    <article className={`compare-profile-card compare-profile-card-${side}`}>
      <div className="compare-profile-control">
        <span><b>{sideLetter}</b>Espècie</span>
        <QuerySelect
          value={species.speciesId}
          parameter={side}
          items={speciesSelectItems}
          variant="comparison"
          aria-label={`Selecciona l’espècie ${side === "left" ? "esquerra" : "dreta"}`}
        />
      </div>
      <div className={`compare-profile-visual${imageSource ? " has-image" : ""}`}>
        {imageSource ? (
          <Image
            className="compare-profile-photo"
            src={imageSource}
            alt={image?.alt ?? ""}
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
        <Link className="compare-profile-link" href={`/species/${species.speciesId}`}>
          Obrir la fitxa completa <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ left?: string; right?: string }> }) {
  const query = await searchParams;
  const left = pick(query.left, "boletus-edulis");
  const right = pick(query.right, "lactarius-deliciosus");
  const currentMonth = monthInTimeZone();

  return (
    <section className="page-width compare-page">
      <div className="page-intro compare-intro">
        <p className="eyebrow">Lectura comparada</p>
        <h1>Dos bolets,<br />dos paisatges.</h1>
        <p>Compara condicions ecològiques estructurades. Les diferències vénen de les fitxes, no d’un text paral·lel.</p>
      </div>

      <div className="compare-stage">
        <ComparisonProfileCard species={left} side="left" />
        <Link
          className="compare-swap"
          href={`/compare?left=${right.speciesId}&right=${left.speciesId}`}
          aria-label="Intercanvia les espècies"
          title="Intercanvia les espècies"
        >
          <ArrowRightLeft size={22} aria-hidden="true" />
          <span>Intercanvia</span>
        </Link>
        <ComparisonProfileCard species={right} side="right" />
      </div>

      <section className="compare-matrix" aria-labelledby="compare-matrix-title">
        <header className="compare-matrix-intro">
          <p className="eyebrow">Perfil ecològic</p>
          <h2 id="compare-matrix-title">Cara a cara</h2>
        </header>
        <div
          className="compare-matrix-table"
          role="table"
          aria-labelledby="compare-matrix-title"
        >
          <header className="compare-matrix-heading" role="row">
            <div className="compare-matrix-criterion" role="columnheader">
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
                  <span className="compare-matrix-cell-key" aria-hidden="true">A · {left.identity.commonName}</span>
                  <p>{row.left}</p>
                </div>
                <div
                  className="compare-matrix-cell compare-matrix-cell-right"
                  role="cell"
                  aria-label={`${right.identity.commonName}: ${row.right}`}
                >
                  <span className="compare-matrix-cell-key" aria-hidden="true">B · {right.identity.commonName}</span>
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
              <span className="compare-matrix-cell-key" aria-hidden="true">A · {left.identity.commonName}</span>
              <ComparisonSeason species={left} currentMonth={currentMonth} />
            </div>
            <div className="compare-matrix-cell compare-matrix-cell-right" role="cell">
              <span className="compare-matrix-cell-key" aria-hidden="true">B · {right.identity.commonName}</span>
              <ComparisonSeason species={right} currentMonth={currentMonth} />
            </div>
          </article>
        </div>
      </section>
      <section className="comparison-guides" aria-labelledby="comparison-guides-title">
        <div><p className="eyebrow">Comparacions publicades</p><h2 id="comparison-guides-title">Confusions freqüents</h2></div>
        <div>{comparisonPages.map((page) => <Link href={`/compare/${page.slug}`} key={page.slug}><span>{page.shortTitle}</span><ArrowUpRight size={16} /></Link>)}</div>
      </section>
    </section>
  );
}
