import Link from "next/link";
import { ArrowLeft, CalendarDays, Mountain, MoveVertical, ScanLine, Trees } from "lucide-react";
import { CulinaryRating } from "@/components/culinary-rating";
import { SpeciesGallery } from "@/components/species-gallery";
import { identificationDifficultyLabel } from "@/src/lib/identification-difficulty";
import type { SpeciesProfile } from "@/src/lib/types";

export function SpeciesHero({ species, habitatLabel, altitudeLabel, seasonLabel }: {
  species: Pick<SpeciesProfile, "identity" | "culinaryProfile" | "media">;
  habitatLabel: string;
  altitudeLabel?: string;
  seasonLabel: string;
}) {
  return (
    <div className="species-hero">
      <div className="page-width">
        <Link href="/bolets" className="back-link"><ArrowLeft size={15} />Tots els bolets</Link>
        <div className="species-hero-grid">
          <div className="species-hero-copy">
            <p className="eyebrow light">{species.identity.family} · {species.identity.genus}</p>
            <h1>{species.identity.commonName}</h1>
            <em>{species.identity.scientificName}</em>
            {species.identity.alternateNames.length > 0 && (
              <p className="species-alternate-names"><span>Altres noms catalans:</span>{" "}{species.identity.alternateNames.join(", ")}</p>
            )}
            <p className="species-dek">{species.identity.shortDescription}</p>
            <div className="species-hero-status"><CulinaryRating profile={species.culinaryProfile} status={species.identity.edibility} /></div>
            <div className="species-hero-facts" aria-label="Dades principals">
              <div><Trees size={16} aria-hidden="true" /><span>Hàbitat</span><strong>{habitatLabel}</strong></div>
              {altitudeLabel
                ? <div><Mountain size={16} aria-hidden="true" /><span>Altitud</span><strong>{altitudeLabel}</strong></div>
                : <div><MoveVertical size={16} aria-hidden="true" /><span>Mida</span><strong>{species.identity.typicalSize}</strong></div>}
              <div><CalendarDays size={16} aria-hidden="true" /><span>Temporada</span><strong>{seasonLabel}</strong></div>
              <div><ScanLine size={16} aria-hidden="true" /><span>Identificació</span><strong>{identificationDifficultyLabel(species.identity.identificationDifficulty)}</strong></div>
            </div>
          </div>
          <div className={`specimen-panel${species.media.length > 0 ? " has-photos" : ""}`}>
            {species.media.length > 0 ? <SpeciesGallery images={species.media} speciesName={species.identity.scientificName} /> : (
              <>
                <div className="specimen-drawing" aria-hidden="true"><span className="drawing-cap" /><span className="drawing-stem" /><span className="drawing-lines" /></div>
                <p>Sense fotografia verificada</p>
                <span>Les imatges d’identificació només s’afegeixen amb llicència, atribució i validació explícites.</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
