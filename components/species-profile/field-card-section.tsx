import { PanelsTopLeft, ShieldAlert } from "lucide-react";
import { SpeciesFieldCardActions } from "@/components/species-field-card-actions";
import { speciesFieldCardPath } from "@/src/lib/seo";
import type { CatalogueSpecies } from "@/src/lib/types";

export function SpeciesFieldCardSection({
  species,
}: {
  species: CatalogueSpecies;
}) {
  const imagePath = speciesFieldCardPath(species);

  return (
    <section
      id="targeta-de-camp"
      className="content-section species-field-card-section"
      aria-labelledby="field-card-title"
    >
      <div className="section-kicker">
        <PanelsTopLeft size={17} aria-hidden="true" />
        <span>05</span>
      </div>
      <div>
        <p className="eyebrow">Per guardar i compartir</p>
        <h2 id="field-card-title">Targeta de camp</h2>
        <div className="species-field-card-layout">
          <div className="species-field-card-copy">
            <p>
              Una fitxa visual en format 4:5 amb els trets principals, els millors
              mesos, el bosc o hàbitat, l’altitud documentada i la confusió més
              rellevant.
            </p>
            <div className="species-field-card-safety">
              <ShieldAlert size={19} aria-hidden="true" />
              <p>
                És una ajuda de camp, no una confirmació d’identitat. Revisa la
                fitxa completa i consulta una persona experta abans de consumir
                cap bolet.
              </p>
            </div>
            <SpeciesFieldCardActions
              imagePath={imagePath}
              speciesId={species.speciesId}
              speciesName={species.identity.commonName}
            />
          </div>
          <figure className="species-field-card-preview">
            <a href={imagePath} target="_blank" rel="noreferrer">
              {/* The image is produced by the species-specific server route. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePath}
                width="1080"
                height="1350"
                loading="lazy"
                alt={`Infografia vertical del ${species.identity.commonName} amb fotografia, comestibilitat, trets d’identificació, temporada, hàbitat i advertiment de confusió.`}
              />
            </a>
            <figcaption>1080 × 1350 px · Format 4:5</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
