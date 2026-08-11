import Image from "next/image";
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
import { EdibilityBadge } from "@/components/edibility-badge";
import { QuerySelect } from "@/components/ui/query-select";
import { speciesById, speciesSelectItems } from "@/data/species";
import type { SpeciesProfile } from "@/src/lib/types";

export const metadata = { title: "Comparador · Bolets Atles" };

function pick(value: string | undefined, fallback: string) {
  return value && speciesById[value] ? speciesById[value] : speciesById[fallback];
}

function peakSeason(species: SpeciesProfile) {
  return Object.entries(species.ecologicalConfig.seasonality)
    .filter(([, value]) => value === "peak")
    .map(([month]) => month)
    .join(", ") || "—";
}

const comparisonRows = (left: SpeciesProfile, right: SpeciesProfile) => [
  { label: "Bosc", icon: Trees, left: left.ecologicalConfig.habitat.forestTypes.join(", "), right: right.ecologicalConfig.habitat.forestTypes.join(", ") },
  { label: "Arbres hoste", icon: Sprout, left: left.ecologicalConfig.habitat.treeAssociations.join(", "), right: right.ecologicalConfig.habitat.treeAssociations.join(", ") },
  { label: "Sòl", icon: Sprout, left: `${left.ecologicalConfig.soil.reaction} · ${left.ecologicalConfig.soil.substrate}`, right: `${right.ecologicalConfig.soil.reaction} · ${right.ecologicalConfig.soil.substrate}` },
  { label: "Altitud", icon: Mountain, left: `${left.ecologicalConfig.habitat.altitude[0]}–${left.ecologicalConfig.habitat.altitude[1]} m`, right: `${right.ecologicalConfig.habitat.altitude[0]}–${right.ecologicalConfig.habitat.altitude[1]} m` },
  { label: "Temperatura", icon: ThermometerSun, left: `${left.ecologicalConfig.climate.temperatureRange.join("–")} °C`, right: `${right.ecologicalConfig.climate.temperatureRange.join("–")} °C` },
  { label: "Pluja", icon: CloudRain, left: left.ecologicalConfig.rainfall.preferredAccumulation, right: right.ecologicalConfig.rainfall.preferredAccumulation },
  { label: "Temporada", icon: CalendarDays, left: peakSeason(left), right: peakSeason(right) }
];

function ComparisonProfileCard({
  species,
  side
}: {
  species: SpeciesProfile;
  side: "left" | "right";
}) {
  const image = species.media.find((asset) => asset.identificationReference && asset.localPath)
    ?? species.media.find((asset) => asset.localPath);
  const sideNumber = side === "left" ? "01" : "02";
  const sideLabel = side === "left" ? "Espècie esquerra" : "Espècie dreta";
  const imageSource = image?.localPath ?? image?.imageUrl ?? image?.sourceUrl;

  return (
    <article className={`compare-profile-card compare-profile-card-${side}`}>
      <div className="compare-profile-control">
        <span><b>{sideNumber}</b>{sideLabel}</span>
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
            sizes="(max-width: 800px) calc(100vw - 76px), 510px"
            unoptimized={Boolean(image?.imageUrl && !image.localPath)}
          />
        ) : (
          <span className="compare-profile-monogram" aria-hidden="true">{species.identity.genus.slice(0, 2)}</span>
        )}
        <div className="compare-profile-vignette" aria-hidden="true" />
        {image && (
          <Link className="compare-photo-credit" href={image.sourceUrl} target="_blank" rel="noreferrer" title={image.license}>
            Foto · {image.attribution}
          </Link>
        )}
      </div>
      <div className="compare-profile-body">
        <div className="compare-profile-meta">
          <EdibilityBadge status={species.identity.edibility} compact />
          <span>{species.identity.family} · {species.identity.genus}</span>
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
        <header className="compare-matrix-heading">
          <div>
            <p className="eyebrow">Perfil ecològic</p>
            <h2 id="compare-matrix-title">Cara a cara</h2>
          </div>
          <div className="compare-matrix-key" aria-hidden="true">
            <span><i>A</i>{left.identity.commonName}</span>
            <span><i>B</i>{right.identity.commonName}</span>
          </div>
        </header>
        <div className="compare-matrix-body">
          {comparisonRows(left, right).map((row) => {
            const Icon = row.icon;
            return (
              <article className="compare-matrix-row" key={row.label}>
                <div className="compare-matrix-label"><Icon size={18} aria-hidden="true" /><span>{row.label}</span></div>
                <div className="compare-matrix-cell compare-matrix-cell-left"><p>{row.left}</p></div>
                <div className="compare-matrix-cell compare-matrix-cell-right"><p>{row.right}</p></div>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
