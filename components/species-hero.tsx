import Link from "next/link";
import { ArrowLeft, CalendarDays, Mountain, MoveVertical, ScanLine, ShieldAlert, Trees } from "lucide-react";
import { CulinaryRating } from "@/components/culinary-rating";
import { EdibilityBadge } from "@/components/edibility-badge";
import { UmamiEventLink } from "@/components/umami-event-link";
import { UMAMI_EVENTS } from "@/src/lib/umami-goals";
import { SpeciesGallery } from "@/components/species-gallery";
import { identificationDifficultyLabel } from "@/src/lib/identification-difficulty";
import type { EdibilityStatus, SpeciesProfile } from "@/src/lib/types";

export type HeroLookalike = { name: string; edibility: EdibilityStatus; href: string };

const camagrocCaptions: Record<string, string> = {
  "wikimedia-craterellus-lutescens": "Barrets bruns i peus grocs: aquesta vista mostra el contrast de colors. Cal examinar també la cara inferior i la resta de trets de la fitxa.",
  "wikimedia-craterellus-lutescens-gallery-3": "Cara inferior del barret: observa les arrugues irregulars i com baixen cap al peu groc. Aquesta fotografia de detall no substitueix la comparació de l’exemplar complet.",
};

export function SpeciesHero({ species, habitatLabel, altitudeLabel, seasonLabel, lookalike, lead, spanishNames, updatedLabel }: {
  species: Pick<SpeciesProfile, "identity" | "culinaryProfile" | "media">;
  habitatLabel: string;
  altitudeLabel?: string;
  seasonLabel: string;
  lookalike?: HeroLookalike;
  /** Answer-first opening sentence; the short description follows it. */
  lead?: string;
  spanishNames?: readonly string[];
  /** Formatted editorial update date shown under the facts. */
  updatedLabel?: string;
}) {
  const hasSpanishNames = Boolean(spanishNames && spanishNames.length > 0);
  const hasAlternateNames = species.identity.alternateNames.length > 0;
  return (
    <div className="species-hero">
      <div className="page-width">
        <Link href="/bolets" className="back-link"><ArrowLeft size={15} />Tots els bolets</Link>
        <div className="species-hero-grid">
          <div className="species-hero-copy">
            <p className="eyebrow light">{species.identity.scientificName}</p>
            <h1>{species.identity.commonName}</h1>
          </div>
          <div className={`specimen-panel${species.media.length > 0 ? " has-photos" : ""}`}>
            {species.media.length > 0 ? <SpeciesGallery images={species.media} speciesName={species.identity.scientificName} captions={species.identity.scientificName === "Craterellus lutescens" ? camagrocCaptions : undefined} /> : (
              <>
                <div className="specimen-drawing" aria-hidden="true"><span className="drawing-cap" /><span className="drawing-stem" /><span className="drawing-lines" /></div>
                <p>Sense fotografia verificada</p>
                <span>Les imatges d’identificació només s’afegeixen amb llicència, atribució i validació explícites.</span>
              </>
            )}
          </div>
          <div className="species-hero-details">
            <p className="species-dek">{lead ? `${lead} ` : ""}{species.identity.shortDescription}</p>
            <div className="species-hero-status">
              <CulinaryRating profile={species.culinaryProfile} status={species.identity.edibility} />
              {lookalike && (
                <UmamiEventLink href={lookalike.href} className="species-hero-lookalike" analyticsEvent={UMAMI_EVENTS.speciesLookalikeClick}>
                  <ShieldAlert size={15} aria-hidden="true" />
                  <span>No el confonguis amb <strong>{lookalike.name}</strong></span>
                  <EdibilityBadge status={lookalike.edibility} compact />
                </UmamiEventLink>
              )}
            </div>
            {(hasAlternateNames || hasSpanishNames) && (
              <p className="species-alternate-names">
                {hasAlternateNames && (
                  <><span className="species-names-label">Altres noms catalans:</span>{" "}{species.identity.alternateNames.join(", ")}</>
                )}
                {hasAlternateNames && hasSpanishNames ? " · " : null}
                {hasSpanishNames && (
                  <><span className="species-names-label">En castellà:</span>{" "}<span lang="es">{spanishNames!.join(", ")}</span></>
                )}
              </p>
            )}
            <div className="species-hero-facts" aria-label="Dades principals">
              <div className="species-hero-habitats"><Trees size={16} aria-hidden="true" /><span>Hàbitat</span><strong><a href="#ecologia">{habitatLabel}</a></strong></div>
              {altitudeLabel
                ? <div><Mountain size={16} aria-hidden="true" /><span>Altitud</span><strong>{altitudeLabel}</strong></div>
                : <div><MoveVertical size={16} aria-hidden="true" /><span>Mida</span><strong>{species.identity.typicalSize}</strong></div>}
              <div><CalendarDays size={16} aria-hidden="true" /><span>Temporada</span><strong>{seasonLabel}</strong></div>
              <div><ScanLine size={16} aria-hidden="true" /><span>Identificació</span><strong>{identificationDifficultyLabel(species.identity.identificationDifficulty)}</strong></div>
            </div>
            {updatedLabel && <p className="species-updated">Fitxa actualitzada el {updatedLabel}.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
