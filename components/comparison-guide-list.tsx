import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, ShieldAlert } from "lucide-react";
import { SectionHeader } from "@/components/page-layout";
import { comparisonPages, type ComparisonPage } from "@/data/comparison-pages";
import { getCatalogueSpecies } from "@/data/catalogue";
import { getEdibilityPresentation } from "@/src/lib/edibility-presentation";
import { LOOKALIKE_GUIDE_PATH } from "@/src/lib/lookalike-guide";
import type { EdibilityStatus } from "@/src/lib/types";

/* Every published pair, risky ones first. Closes /compare and every pair page;
   on a pair page the current pair is marked instead of linked. */

const edibleComparisonStatuses = new Set<EdibilityStatus>([
  "excellent_edible",
  "edible",
  "edible_with_conditions",
]);

const avoidComparisonStatuses = new Set<EdibilityStatus>([
  "not_recommended",
  "inedible",
  "toxic",
  "dangerously_toxic",
]);

function getComparisonRiskStatus(page: ComparisonPage) {
  const species = [getCatalogueSpecies(page.leftSpeciesId), getCatalogueSpecies(page.rightSpeciesId)];
  const hasEdibleSpecies = species.some((profile) => (
    profile && edibleComparisonStatuses.has(profile.identity.edibility)
  ));
  const avoidSpecies = species.find((profile) => (
    profile && avoidComparisonStatuses.has(profile.identity.edibility)
  ));

  return hasEdibleSpecies && avoidSpecies ? avoidSpecies.identity.edibility : null;
}

const riskComparisons = comparisonPages.flatMap((page) => {
  const status = getComparisonRiskStatus(page);
  return status ? [{ page, status }] : [];
});
const identificationComparisons = comparisonPages.filter((page) => (
  getComparisonRiskStatus(page) === null
));

function PairLink({ page, currentSlug, children }: { page: ComparisonPage; currentSlug?: string; children: ReactNode }) {
  return (
    <Link href={`/compare/${page.slug}`} aria-current={page.slug === currentSlug ? "page" : undefined}>
      {children}
    </Link>
  );
}

export function ComparisonGuideList({ currentSlug }: { currentSlug?: string }) {
  return (
    <section className="comparison-guides" aria-labelledby="comparison-guides-title">
      <SectionHeader
        meta="Comparacions publicades"
        title="Confusions freqüents"
        titleId="comparison-guides-title"
        description={<>Comença per les parelles que poden acabar al mateix cistell i amplia després la identificació entre espècies properes. La guia de <Link href={LOOKALIKE_GUIDE_PATH}>bolets típics i confusions</Link> les agrupa per espècie comestible.</>}
      />
      <div className="comparison-guide-groups">
        <div className="comparison-guide-list comparison-guide-list-risk">
          <h3><ShieldAlert size={17} aria-hidden="true" /> Comestibles i dobles de risc</h3>
          {riskComparisons.map(({ page, status }) => (
            <PairLink page={page} currentSlug={currentSlug} key={page.slug}>
              <span>{page.shortTitle}</span>
              <small className={`label-caps comparison-risk-label ${status}`}>
                {getEdibilityPresentation(status).label}
              </small>
              <ArrowUpRight size={16} aria-hidden="true" />
            </PairLink>
          ))}
        </div>
        <div className="comparison-guide-list">
          <h3>Altres comparacions d’identificació</h3>
          {identificationComparisons.map((page) => (
            <PairLink page={page} currentSlug={currentSlug} key={page.slug}>
              <span>{page.shortTitle}</span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </PairLink>
          ))}
        </div>
      </div>
    </section>
  );
}
