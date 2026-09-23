import { CulinaryRatingHelp } from "@/components/species-profile/culinary-rating-help";
import { ProfileSection } from "@/components/species-profile/profile-section";
import Link from "next/link";
import { ArrowUpRight, ChefHat, Flame, Hand, ShieldAlert, ShieldCheck, Snowflake, Utensils } from "lucide-react";
import { CulinaryRating } from "@/components/culinary-rating";
import { EdibilityBadge } from "@/components/edibility-badge";
import { ProfileFacts } from "@/components/species-profile/profile-facts";
import { officialSafetySource } from "@/data/editorial";
import { speciesHeadings } from "@/src/lib/species-headings";
import type { CatalogueSpecies } from "@/src/lib/types";

function preservationGuideHref(speciesId: string) {
  if (speciesId === "boletus-edulis") return "/conservar-bolets#conservar-ceps";
  if (speciesId === "lactarius-sanguifluus" || speciesId === "lactarius-deliciosus") return "/conservar-bolets#conservar-rovellons";
  if (speciesId === "craterellus-lutescens") return "/conservar-bolets#congelar-camagrocs";
  if (speciesId === "hygrophorus-latitabundus") return "/conservar-bolets#conservar-llenegues";
  return "/conservar-bolets";
}

export function SpeciesCulinarySection({
  species,
  prose,
}: {
  species: CatalogueSpecies;
  /** Hand-written cooking, keeping or safety text: replaces the one-line summary on edible species and follows the safety verdict on toxic ones. */
  prose?: readonly string[];
}) {
  const hasToxicLookalike = species.similarSpecies.some(
    (item) => item.warning || item.edibility.includes("toxic"),
  );
  const profile = species.culinaryProfile;
  // Safety profiles already show their consumption warning in CulinaryRating.
  const showConsumptionBadge = profile.kind === "culinary"
    && species.identity.edibility !== "excellent_edible"
    && species.identity.edibility !== "edible";
  const headings = speciesHeadings(species.identity.commonName);

  return (
<ProfileSection species={species} id="cuina" className="culinary-section" eyebrow="Valor gastronòmic i seguretat" title={profile.kind === "culinary" ? headings.cuisine : headings.edible}>
    <div className="profile-panel">
    <div className="profile-panel-head profile-rating">
      <span className="profile-rating-scale">
        <CulinaryRating profile={profile} status={species.identity.edibility} />
        <CulinaryRatingHelp />
      </span>
      {showConsumptionBadge && <EdibilityBadge status={species.identity.edibility} />}
      <p className="profile-rating-why">
        <strong>Per què aquesta nota?</strong>
        {" "}{profile.ratingRationale}
      </p>
    </div>
    <div className="profile-panel-body">
    {profile.kind === "culinary" ? (
      <>
        {/* The hand-written text covers the one-line summary in more detail, so it replaces it. */}
        {prose ? (
          <div className="profile-prose">
            {prose.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        ) : <p className="profile-lede">{profile.summary}</p>}
        <ProfileFacts
          label="Perfil culinari"
          items={[
            { key: "flavour", icon: <Flame size={16} />, term: "Sabor i aroma", detail: profile.flavour },
            { key: "texture", icon: <Hand size={16} />, term: "Textura", detail: profile.texture },
            { key: "uses", icon: <Utensils size={16} />, term: "On funciona millor", wide: true, detail: <span className="profile-tags">{profile.bestUses.map((use) => <b key={use}>{use}</b>)}</span> },
            { key: "preparation", icon: <ChefHat size={16} />, term: "Abans de menjar", detail: <ol>{profile.preparation.map((step) => <li key={step}>{step}</li>)}</ol> },
            { key: "preservation", icon: <Snowflake size={16} />, term: "Com conservar-lo", detail: <><ul>{profile.preservation.map((method) => <li key={method}>{method}</li>)}</ul><Link href={preservationGuideHref(species.speciesId)} className="text-link">Guia per conservar i congelar bolets amb seguretat <ArrowUpRight size={15} aria-hidden="true" /></Link></> },
          ]}
        />
      </>
    ) : (
      <>
        <p className="profile-lede"><strong>Sense usos culinaris recomanats.</strong> {profile.summary}</p>
        {prose && (
          <div className="profile-prose">
            {prose.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        )}
      </>
    )}
    </div>
    </div>

    <aside className="profile-safety">
      <p className="profile-safety-title">
        <ShieldCheck size={18} aria-hidden="true" />
        <strong>{profile.kind === "culinary" ? "Punts de prudència" : "Advertiment de seguretat"}</strong>
      </p>
      <ul>
        {profile.cautions.map((caution) => (
          <li key={caution}>{caution}</li>
        ))}
      </ul>
      {(profile.kind === "safety" || hasToxicLookalike) && (
        <p>
          <ShieldAlert size={15} aria-hidden="true" />
          <span>No consumeixis aquest bolet sense una identificació experta. Davant una ingestió sospitosa, consulta la <a href={officialSafetySource.url} target="_blank" rel="noreferrer">guia de l’ACSA</a> i truca al <a href="tel:061">061 Salut Respon</a>.</span>
        </p>
      )}
    </aside>
</ProfileSection>
  );
}
