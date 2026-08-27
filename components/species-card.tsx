import Link from "next/link";
import { ArrowRight, CalendarDays, Mountain, Trees } from "lucide-react";
import { CulinaryRating } from "@/components/culinary-rating";
import { MediaImage } from "@/components/media-image";
import { SeasonIndicator } from "@/components/season-indicator";
import { speciesPath } from "@/src/lib/seo";
import type { SpeciesCardProfile } from "@/src/lib/species-card-profile";
import type { Month } from "@/src/lib/types";

export function SpeciesCard({
  species,
  index = 0,
  currentMonth,
  sizes = "(max-width: 580px) calc(100vw - 48px), (max-width: 1000px) calc(50vw - 37px), (max-width: 1228px) calc(33.333vw - 33px), 377px",
}: {
  species: SpeciesCardProfile;
  index?: number;
  currentMonth?: Month;
  sizes?: string;
}) {
  const palettes = [["#f28a2e", "#9f4d24"], ["#f2a766", "#6e3d25"], ["#96958e", "#bd592a"], ["#c86b32", "#3b3b3b"]] as const;
  const [toneA, toneB] = palettes[index % palettes.length];
  const referenceImage = species.media.find((asset) => asset.identificationReference);
  return (
    <Link
      href={speciesPath(species)}
      className="species-card"
      aria-label={`Obriu la fitxa de ${species.identity.commonName}`}
      style={{ "--tone-a": toneA ?? "#f28a2e", "--tone-b": toneB ?? "#9f4d24", animationDelay: `${index * 45}ms` } as React.CSSProperties}
    >
      <div className={`species-card-illustration${referenceImage ? " has-photo" : ""}`}>
        {referenceImage && (
          <MediaImage
            asset={referenceImage}
            className="species-card-photo"
            alt={referenceImage.alt}
            fill
            sizes={sizes}
          />
        )}
        <CulinaryRating
          profile={species.culinaryProfile}
          status={species.identity.edibility}
          compact
        />
      </div>
      <div className="species-card-content">
        <span className="species-card-genus">{species.identity.genus}</span>
        <div className="species-card-heading">
          <h3>{species.identity.commonName}</h3>
          <em>{species.identity.scientificName}</em>
        </div>
        <p className="species-card-description">{species.identity.shortDescription}</p>
        <dl className="species-card-facts">
          <div>
            <Trees size={15} aria-hidden="true" />
            <dt>Hàbitat</dt>
            <dd>{species.ecologicalConfig.habitat.forestTypes[0]}</dd>
          </div>
          {species.ecologicalConfig.habitat.altitude ? <div>
            <Mountain size={15} aria-hidden="true" />
            <dt>Altitud</dt>
            <dd>{species.ecologicalConfig.habitat.altitude[0]}–{species.ecologicalConfig.habitat.altitude[1]} m</dd>
          </div> : species.seasonLabel ? <div>
            <CalendarDays size={15} aria-hidden="true" />
            <dt>Temporada</dt>
            <dd>{species.seasonLabel}</dd>
          </div> : null}
        </dl>
        {currentMonth && species.ecologicalConfig.seasonality && (
          <SeasonIndicator species={species} currentMonth={currentMonth} />
        )}
        <span className="card-link">Veure la fitxa <ArrowRight size={15} aria-hidden="true" /></span>
      </div>
    </Link>
  );
}
