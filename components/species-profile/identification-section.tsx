import Link from "next/link";
import {
  ArrowRightLeft,
  ArrowUpRight,
  BookOpen,
  CircleDot,
  MoveVertical,
  Palette,
  RefreshCw,
  Rows3,
  ScanLine,
  ShieldAlert,
  Wind,
} from "lucide-react";
import { EdibilityBadge } from "@/components/edibility-badge";
import { comparisonPagesForSpecies } from "@/data/comparison-pages";
import { getReferenceSpeciesByScientificName } from "@/data/reference-species";
import { getSpeciesByScientificName } from "@/data/species";
import { speciesPath } from "@/src/lib/seo";
import type { SpeciesProfile } from "@/src/lib/types";

export function SpeciesIdentificationSection({
  species,
}: {
  species: SpeciesProfile;
}) {
  const hasToxicLookalike = species.similarSpecies.some(
    (item) => item.warning || item.edibility.includes("toxic"),
  );
  const speciesComparisons = comparisonPagesForSpecies(species.speciesId);

  return (
<section id="identificació" className="content-section">
  <div className="section-kicker">
    <BookOpen size={17} />
    <span>01</span>
  </div>
  <div>
    <p className="eyebrow">Lectura de camp</p>
    <h2>Com reconèixer-lo</h2>
    <div className="morphology-grid">
      <article>
        <h3><CircleDot size={16} aria-hidden="true" />Barret</h3>
        <p>{species.morphology.cap}</p>
      </article>
      <article>
        <h3><Rows3 size={16} aria-hidden="true" />Himeni</h3>
        <p>{species.morphology.hymenium}</p>
      </article>
      <article>
        <h3><MoveVertical size={16} aria-hidden="true" />Peu</h3>
        <p>{species.morphology.stem}</p>
      </article>
      <article>
        <h3><ScanLine size={16} aria-hidden="true" />Carn i tacte</h3>
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
            Verifiqueu tots els trets abans de consumir-ne cap exemplar.
          </span>
        </div>
      )}
      <div className="similar-list">
        {species.similarSpecies.map((item) => {
          const relatedSpecies = getSpeciesByScientificName(
            item.scientificName,
          );
          const relatedProfile = relatedSpecies ?? getReferenceSpeciesByScientificName(item.scientificName);
          const comparison = relatedSpecies
            ? speciesComparisons.find((page) => (
                page.leftSpeciesId === relatedSpecies.speciesId
                || page.rightSpeciesId === relatedSpecies.speciesId
              ))
            : undefined;
          const comparisonHref = relatedSpecies
            ? comparison
              ? `/compare/${comparison.slug}`
              : `/compare?left=${species.speciesId}&right=${relatedSpecies.speciesId}`
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
                    Comparar
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {species.speciesId === "cantharellus-cibarius" && (
        <p>
          <Link href="/fals-rossinyol" className="text-link">
            Guia del fals rossinyol <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </p>
      )}
    </div>
  </div>
</section>
  );
}
