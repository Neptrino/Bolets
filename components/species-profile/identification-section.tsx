import Link from "next/link";
import {
  ArrowRightLeft,
  ArrowUpRight,
  BookOpen,
  CircleHelp,
  Palette,
  RefreshCw,
  ShieldAlert,
  Wind,
  Languages,
} from "lucide-react";
import { EdibilityBadge } from "@/components/edibility-badge";
import {
  MushroomCapIcon,
  MushroomFleshIcon,
  MushroomHymeniumIcon,
  MushroomStemIcon,
} from "@/components/mushroom-anatomy-icons";
import { comparisonPagesForSpecies } from "@/data/comparison-pages";
import { getSpanishSpeciesNames } from "@/data/species-common-names";
import { getReferenceSpeciesByScientificName } from "@/data/reference-species";
import { getSpeciesByScientificName } from "@/data/species";
import { commonNameDisplayLabel } from "@/src/lib/common-name";
import { speciesPath } from "@/src/lib/seo";
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
  const spanishNames = getSpanishSpeciesNames(species.speciesId);

  return (
<section id="identificació" className="content-section">
  <div className="section-kicker">
    <BookOpen size={17} />
    <span>01</span>
  </div>
  <div>
    <p className="eyebrow">Lectura de camp</p>
    <div className="species-identification-heading">
      <h2>Com reconèixer-lo</h2>
      <Link href="/parts-dun-bolet" className="species-anatomy-guide-link">
        Guia de les parts
        <ArrowUpRight size={14} aria-hidden="true" />
      </Link>
    </div>
    <div className="morphology-grid">
      <article>
        <h3><MushroomCapIcon size={20} />Barret</h3>
        <p>{species.morphology.cap}</p>
      </article>
      <article>
        <h3><MushroomHymeniumIcon size={20} />Himeni</h3>
        <p>{species.morphology.hymenium}</p>
      </article>
      <article>
        <h3><MushroomStemIcon size={20} />Peu</h3>
        <p>{species.morphology.stem}</p>
      </article>
      <article>
        <h3><MushroomFleshIcon size={20} />Carn i tacte</h3>
        <p>
          {species.morphology.flesh} {species.morphology.texture}
        </p>
      </article>
    </div>
    <div className="field-notes">
      <div>
        <span className="fact-label"><Wind size={14} aria-hidden="true" />OLOR</span>
        <p>{species.morphology.smell}</p>
      </div>
      <div>
        <span className="fact-label"><Palette size={14} aria-hidden="true" />COLOR</span>
        <p>{species.morphology.colour}</p>
      </div>
      <div>
        <span className="fact-label"><RefreshCw size={14} aria-hidden="true" />VARIACIÓ</span>
        <p>{species.morphology.variation}</p>
      </div>
    </div>
    <div className="key-features">
      <span>Trets rellevants</span>
      {species.morphology.keyFeatures.map((feature) => (
        <b key={feature}>{feature}</b>
      ))}
    </div>

    <div className="species-language-names">
      <div><Languages size={19} aria-hidden="true" /><span>Noms en català i castellà</span></div>
      <dl>
        <div><dt>Català</dt><dd>{[species.identity.commonName, ...species.identity.alternateNames].join(" · ")}</dd></div>
        <div><dt>Castellà</dt><dd lang="es">{spanishNames ? [commonNameDisplayLabel(spanishNames.primary, "es-ES"), ...(spanishNames.alternatives ?? [])].join(" · ") : "Sense equivalència verificada"}</dd></div>
        <div><dt>Nom científic</dt><dd><i>{species.identity.scientificName}</i></dd></div>
      </dl>
      <Link href="/noms-de-bolets-catala-castella" className="text-link">Consultar el glossari complet <ArrowUpRight size={15} aria-hidden="true" /></Link>
    </div>

    <div className="content-subsection lookalikes-subsection">
      <p className="eyebrow">Identificació responsable</p>
      <h3 className="subsection-title">Espècies semblants</h3>
      {hasToxicLookalike && (
        <div className="warning-callout">
          <ShieldAlert size={18} />
          <strong>
            Atenció: hi ha confusions possibles amb espècies tòxiques.
          </strong>
          <span>
            Verifica tots els trets abans de consumir-ne cap exemplar.
          </span>
        </div>
      )}
      <div className="similar-list">
        {species.similarSpecies.map((item) => {
          const relatedSpecies = getSpeciesByScientificName(
            item.scientificName,
          );
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

          return (
            <article key={item.scientificName}>
              <div>
                <em>{item.scientificName}</em>
                <h3>
                  {relatedProfile ? (
                    <Link
                      href={speciesPath(relatedProfile)}
                      className="similar-profile-link"
                    >
                      {item.commonName}
                      <ArrowUpRight size={17} aria-hidden="true" />
                    </Link>
                  ) : item.commonName}
                </h3>
              </div>
              <p>{item.mainDifferences}</p>
              <div className="similar-card-footer">
                <EdibilityBadge status={item.edibility} compact />
                {comparisonHref && (
                  <Link
                    href={comparisonHref}
                    className="similar-comparison-link"
                    aria-label={`Comparar ${species.identity.commonName} i ${item.commonName}`}
                  >
                    <ArrowRightLeft size={15} aria-hidden="true" />
                    Comparar amb {item.commonName}
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {(species.speciesId === "cantharellus-cibarius" || species.speciesId === "hygrophoropsis-aurantiaca") && (
        <p>
          <Link href="/fals-rossinyol" className="text-link">
            Guia del fals rossinyol <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </p>
      )}
    </div>

    {species.seo?.faqs?.length ? (
      <div className="content-subsection species-search-answers">
        <p className="eyebrow">Preguntes habituals</p>
        <h3 className="subsection-title">Comestibilitat i confusions</h3>
        <div className="species-search-answer-list">
          {species.seo.faqs.map((faq) => (
            <article key={faq.question}>
              <h3><CircleHelp size={17} aria-hidden="true" /> {faq.question}</h3>
              <p>{faq.answer}</p>
            </article>
          ))}
        </div>
      </div>
    ) : null}
  </div>
</section>
  );
}
