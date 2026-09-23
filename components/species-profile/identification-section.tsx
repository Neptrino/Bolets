import { ProfileSection } from "@/components/species-profile/profile-section";
import Link from "next/link";
import {
  ArrowRightLeft,
  ArrowUpRight,
  FlaskConical,
  Languages,
  Palette,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Wind,
} from "lucide-react";
import { EdibilityBadge } from "@/components/edibility-badge";
import { MediaImage } from "@/components/media-image";
import {
  MushroomCapIcon,
  MushroomFleshIcon,
  MushroomHymeniumIcon,
  MushroomStemIcon,
} from "@/components/mushroom-anatomy-icons";
import { ProfileFacts } from "@/components/species-profile/profile-facts";
import { comparisonPagesForSpecies } from "@/data/comparison-pages";
import { getSpanishSpeciesNames } from "@/data/species-common-names";
import { getReferenceSpeciesByScientificName } from "@/data/reference-species";
import { getSpeciesByScientificName } from "@/data/species";
import { commonNameDisplayLabel } from "@/src/lib/common-name";
import { lookalikeGuideHref } from "@/src/lib/lookalike-guide";
import { speciesPath } from "@/src/lib/seo";
import { territoryGuideForSpecies } from "@/src/lib/species-territory-guides";
import { speciesHeadings } from "@/src/lib/species-headings";
import type { CatalogueSpecies } from "@/src/lib/types";

export function SpeciesIdentificationSection({
  species,
}: {
  species: CatalogueSpecies;
}) {
  const hasToxicLookalike = species.similarSpecies.some(
    (item) => item.warning || item.edibility.includes("toxic"),
  );
  const speciesComparisons = comparisonPagesForSpecies(species.speciesId);
  const guideHref = lookalikeGuideHref(species.speciesId);
  const spanishNames = getSpanishSpeciesNames(species.speciesId);
  const headings = speciesHeadings(species.identity.commonName);
  const morphology = species.morphology;
  const territoryGuide = territoryGuideForSpecies(species.speciesId);

  return (
<>
<ProfileSection species={species} id="identificació" eyebrow="Lectura de camp" title={headings.identify}
  action={<Link href="/parts-dun-bolet" className="species-anatomy-guide-link">Parts d’un bolet <ArrowUpRight size={14} aria-hidden="true" /></Link>}>
    <div className="profile-panel">
      <div className="profile-panel-head">
        <Sparkles size={18} aria-hidden="true" />
        <p className="profile-tags">
          <span>Trets clau</span>
          {morphology.keyFeatures.map((feature) => (
            <b key={feature}>{feature}</b>
          ))}
        </p>
      </div>
      <div className="profile-panel-body">
      <ProfileFacts
        label="Trets d’identificació"
        items={[
          { key: "cap", icon: <MushroomCapIcon size={18} />, term: "Barret", detail: morphology.cap },
          { key: "hymenium", icon: <MushroomHymeniumIcon size={18} />, term: "Himeni", detail: morphology.hymenium },
          { key: "stem", icon: <MushroomStemIcon size={18} />, term: "Peu", detail: morphology.stem },
          { key: "flesh", icon: <MushroomFleshIcon size={18} />, term: "Carn i tacte", detail: `${morphology.flesh} ${morphology.texture}` },
          { key: "smell", icon: <Wind size={16} />, term: "Olor", detail: morphology.smell },
          { key: "colour", icon: <Palette size={16} />, term: "Color", detail: morphology.colour },
          { key: "variation", icon: <RefreshCw size={16} />, term: "Variació", detail: morphology.variation, wide: true },
        ]}
      />
      </div>
    </div>

    {territoryGuide && <p className="profile-links">
      <Link href={territoryGuide.path} className="text-link">
        {territoryGuide.profileLinkTitle} <ArrowUpRight size={16} aria-hidden="true" />
      </Link>
    </p>}
</ProfileSection>
<ProfileSection species={species} id="confusions" eyebrow="Identificació responsable" title={headings.lookalikes} className="lookalikes-subsection">
      {hasToxicLookalike && (
        <div className="profile-warning">
          <ShieldAlert size={18} aria-hidden="true" />
          <strong>Atenció: hi ha confusions possibles amb espècies tòxiques.</strong>
          <span>Verifica tots els trets abans de consumir-ne cap exemplar.</span>
        </div>
      )}
      <div className="profile-lookalikes">
        {species.similarSpecies.map((item) => {
          const relatedSpecies = getSpeciesByScientificName(item.scientificName);
          const relatedProfile = relatedSpecies ?? getReferenceSpeciesByScientificName(item.scientificName);
          const comparison = relatedProfile
            ? speciesComparisons.find((page) => (
                page.leftSpeciesId === relatedProfile.speciesId
                || page.rightSpeciesId === relatedProfile.speciesId
              ))
            : undefined;
          const comparisonHref = comparison
            ? `/compare/${comparison.slug}`
            : relatedSpecies && "ecologicalConfig" in species
              ? `/compare?left=${species.speciesId}&right=${relatedSpecies.speciesId}`
              : undefined;
          const thumbnail = relatedProfile?.media.find((asset) => asset.identificationReference) ?? relatedProfile?.media[0];

          return (
            <article key={item.scientificName} className={thumbnail ? undefined : "no-thumb"}>
              {thumbnail && relatedProfile && (
                <Link href={speciesPath(relatedProfile)} className="profile-lookalike-photo-link">
                  <MediaImage
                    asset={thumbnail}
                    alt={`${item.commonName} (${item.scientificName})`}
                    className="profile-lookalike-thumb"
                    width={168}
                    height={168}
                    sizes="84px"
                  />
                </Link>
              )}
              <div>
                <em>{item.scientificName}</em>
                <h3>
                  {relatedProfile ? (
                    <Link href={speciesPath(relatedProfile)}>
                      {item.commonName}
                      <ArrowUpRight size={17} aria-hidden="true" />
                    </Link>
                  ) : item.commonName}
                </h3>
                <p>{item.mainDifferences}</p>
              </div>
              <div className="profile-lookalike-footer">
                <EdibilityBadge status={item.edibility} compact />
                {comparisonHref && (
                  <Link
                    href={comparisonHref}
                    className="profile-compare-link"
                    aria-label={`Comparar ${species.identity.commonName} i ${item.commonName}`}
                  >
                    <ArrowRightLeft size={14} aria-hidden="true" />
                    Comparar amb {item.commonName}
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {(species.speciesId === "cantharellus-cibarius" || species.speciesId === "hygrophoropsis-aurantiaca") && (
        <p className="profile-links">
          <Link href="/fals-rossinyol" className="text-link">
            Guia del fals rossinyol <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </p>
      )}
      {(speciesComparisons.length > 0 || guideHref) && <nav className="profile-links" aria-label="Comparacions de l’espècie">
        {speciesComparisons.map((comparison) => <Link key={comparison.slug} href={`/compare/${comparison.slug}`} className="text-link">{comparison.shortTitle} <ArrowUpRight size={15} aria-hidden="true" /></Link>)}
        {guideHref && <Link href={guideHref} className="text-link">Bolets típics i les seves confusions <ArrowUpRight size={15} aria-hidden="true" /></Link>}
      </nav>}
</ProfileSection>

    <ProfileSection species={species} id="noms" eyebrow="Noms" title={headings.names}>
      <ProfileFacts
        label="Noms de l’espècie"
        items={[
          { key: "ca", icon: <Languages size={16} />, term: "Català", detail: [species.identity.commonName, ...species.identity.alternateNames].join(" · ") },
          { key: "es", icon: <Languages size={16} />, term: "Castellà", detail: <span lang="es">{spanishNames ? [commonNameDisplayLabel(spanishNames.primary, "es-ES"), ...(spanishNames.alternatives ?? [])].join(" · ") : "Sense equivalència verificada"}</span> },
          { key: "sci", icon: <FlaskConical size={16} />, term: "Nom científic", detail: <i>{species.identity.scientificName}</i> },
        ]}
      />
      <p className="profile-links">
        <Link href="/noms-de-bolets-catala-castella" className="text-link">Consultar el glossari complet <ArrowUpRight size={15} aria-hidden="true" /></Link>
      </p>
    </ProfileSection>
</>
  );
}
