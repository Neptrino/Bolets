import { ProfileSection } from "@/components/species-profile/profile-section";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { SpeciesFieldCardActions } from "@/components/species-field-card-actions";
import { speciesFieldCardPath } from "@/src/lib/seo";
import { speciesHeadings } from "@/src/lib/species-headings";
import type { CatalogueSpecies } from "@/src/lib/types";

export function SpeciesFieldCardSection({
  species,
}: {
  species: CatalogueSpecies;
}) {
  const imagePath = speciesFieldCardPath(species);

  return (
    <ProfileSection species={species} id="targeta-de-camp" className="species-field-card-section" eyebrow="Per guardar i compartir" title={speciesHeadings(species.identity.commonName).fieldCard}>
        <div className="species-field-card-layout">
          <figure className="species-field-card-preview">
            <a href={imagePath} target="_blank" rel="noreferrer">
              {/* The image is produced by the species-specific server route. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${imagePath}?preview=384`}
                srcSet={`${imagePath}?preview=384 384w, ${imagePath}?preview=768 768w`}
                sizes="(max-width: 600px) 160px, 132px"
                width="384"
                height="480"
                loading="lazy"
                decoding="async"
                alt={`Targeta de camp del ${species.identity.commonName} amb fotografia, comestibilitat, trets d’identificació, temporada, hàbitat i advertiment de confusió.`}
              />
            </a>
          </figure>
          <div className="species-field-card-copy">
            <p>
              Fitxa visual 4:5 amb els trets principals, la temporada, l’hàbitat i la confusió més rellevant, a punt per guardar al mòbil o compartir.
            </p>
            <p className="species-field-card-safety">
              <ShieldAlert size={16} aria-hidden="true" />
              <span>És una ajuda de camp, no una confirmació d’identitat: revisa la fitxa completa i consulta una persona experta abans de consumir-ne cap.</span>
            </p>
            <SpeciesFieldCardActions
              imagePath={imagePath}
              speciesId={species.speciesId}
              speciesName={species.identity.commonName}
            />
            <p className="species-field-card-poster-link">
              Vols totes les espècies en una sola làmina?{" "}
              <Link href="/bolets/infografia">Consulta la infografia del catàleg de bolets</Link>.
            </p>
          </div>
        </div>
    </ProfileSection>
  );
}
