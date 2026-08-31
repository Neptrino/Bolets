import Link from "next/link";
import {
  ArrowUpRight,
  ChefHat,
  CircleHelp,
  ShieldAlert,
  ShieldCheck,
  Snowflake,
  Utensils,
} from "lucide-react";
import { CulinaryRating } from "@/components/culinary-rating";
import { EdibilityBadge } from "@/components/edibility-badge";
import { officialSafetySource } from "@/data/editorial";
import type { SpeciesProfile } from "@/src/lib/types";

export function SpeciesCulinarySection({
  species,
}: {
  species: SpeciesProfile;
}) {
  const hasToxicLookalike = species.similarSpecies.some(
    (item) => item.warning || item.edibility.includes("toxic"),
  );

  return (
<section id="cuina" className="content-section culinary-section">
  <div className="section-kicker">
    <ChefHat size={17} aria-hidden="true" />
    <span>02</span>
  </div>
  <div>
    <p className="eyebrow">Valor gastronòmic i seguretat</p>
    <h2>De la cistella a la cuina</h2>

    <div className={`culinary-rating-panel ${species.culinaryProfile.kind}`}>
      <div className="culinary-rating-score">
        <span>VALOR CULINARI ORIENTATIU</span>
        <CulinaryRating
          profile={species.culinaryProfile}
          status={species.identity.edibility}
        />
        <EdibilityBadge status={species.identity.edibility} />
      </div>
      <div className="culinary-rating-copy">
        <div className="culinary-rating-title">
          <strong>Per què aquesta nota?</strong>
          <span className="culinary-rating-help">
            <button
              type="button"
              aria-label="Com s’interpreta el valor culinari"
              aria-describedby={`culinary-rating-help-${species.speciesId}`}
            >
              <CircleHelp size={16} aria-hidden="true" />
            </button>
            <span
              className="culinary-rating-tooltip"
              id={`culinary-rating-help-${species.speciesId}`}
              role="tooltip"
            >
              Les estrelles valoren l’interès gastronòmic; la
              classificació de consum indica si calen condicions de
              seguretat.
            </span>
          </span>
        </div>
        <p>{species.culinaryProfile.ratingRationale}</p>
      </div>
    </div>

    {species.culinaryProfile.kind === "culinary" ? (
      <>
        <div className="culinary-profile-note">
          <p className="culinary-lede">
            {species.culinaryProfile.summary}
          </p>
          <dl className="culinary-senses" aria-label="Perfil sensorial">
            <div>
              <dt>Sabor i aroma</dt>
              <dd>{species.culinaryProfile.flavour}</dd>
            </div>
            <div>
              <dt>Textura</dt>
              <dd>{species.culinaryProfile.texture}</dd>
            </div>
          </dl>
        </div>

        <div className="culinary-uses">
          <div className="culinary-mini-heading">
            <Utensils size={16} aria-hidden="true" />
            <h3>On funciona millor</h3>
          </div>
          <div className="culinary-use-list">
            {species.culinaryProfile.bestUses.map((use) => (
              <span key={use}>{use}</span>
            ))}
          </div>
        </div>

        <div className="culinary-methods">
          <article>
            <div className="culinary-mini-heading">
              <ChefHat size={16} aria-hidden="true" />
              <h3>Abans de menjar</h3>
            </div>
            <ol>
              {species.culinaryProfile.preparation.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </article>
          <article>
            <div className="culinary-mini-heading">
              <Snowflake size={16} aria-hidden="true" />
              <h3>Com conservar-lo</h3>
            </div>
            <ul>
              {species.culinaryProfile.preservation.map((method) => (
                <li key={method}>{method}</li>
              ))}
            </ul>
          </article>
        </div>
        <p>
          <Link href="/conservar-bolets" className="text-link">
            Guia per conservar i congelar bolets amb seguretat <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </p>
      </>
    ) : (
      <div className="culinary-safety-only">
        <ShieldAlert size={24} aria-hidden="true" />
        <div>
          <strong>Sense usos culinaris recomanats</strong>
          <p>{species.culinaryProfile.summary}</p>
        </div>
      </div>
    )}

    <div className={`culinary-cautions ${species.culinaryProfile.kind}`}>
      <ShieldCheck size={19} aria-hidden="true" />
      <div>
        <strong>{species.culinaryProfile.kind === "culinary" ? "Punts de prudència" : "Advertiment de seguretat"}</strong>
        <ul>
          {species.culinaryProfile.cautions.map((caution) => (
            <li key={caution}>{caution}</li>
          ))}
        </ul>
      </div>
    </div>

    {(species.culinaryProfile.kind === "safety" || hasToxicLookalike) && (
      <aside className="species-official-safety">
        <div className="species-official-safety-title">
          <ShieldAlert size={18} aria-hidden="true" />
          <strong>Identificació i urgències</strong>
        </div>
        <p>No consumeixis aquest bolet sense una identificació experta. Davant una ingestió sospitosa, consulta la <a href={officialSafetySource.url} target="_blank" rel="noreferrer">guia de l’ACSA</a> i truca al <a href="tel:061">061 Salut Respon</a>.</p>
      </aside>
    )}

  </div>
</section>
  );
}
