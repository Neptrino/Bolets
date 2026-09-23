import "@/app/styles/comparison-guides.css";
import "@/app/styles/species-comparison.css";
import Link from "next/link";
import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { ArrowUpRight, ScanLine } from "lucide-react";
import { PageHeader, PageShell } from "@/components/page-layout";
import { ComparisonGuideList } from "@/components/comparison-guide-list";
import { SpeciesComparator } from "@/components/species-comparator";
import { speciesById } from "@/data/species";
import { comparisonPageForPair } from "@/data/comparison-pages";
import { LOOKALIKE_GUIDE_PATH } from "@/src/lib/lookalike-guide";
import { DEFAULT_SOCIAL_IMAGE } from "@/src/lib/seo";

export const metadata: Metadata = {
  title: "Comparador de bolets",
  description: "Compara dues espècies de bolets de Catalunya: identificació, hàbitat, altitud, temporada, clima i comestibilitat.",
  alternates: { canonical: "/compare" },
  openGraph: {
    url: "/compare",
    title: "Comparador de bolets",
    description: "Compara la identificació, l’hàbitat, la temporada i la comestibilitat de dues espècies.",
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Comparador de bolets",
    description: "Compara la identificació, l’hàbitat, la temporada i la comestibilitat de dues espècies.",
    images: [DEFAULT_SOCIAL_IMAGE],
  },
};

function pick(value: string | undefined, fallback: string) {
  return value && speciesById[value] ? speciesById[value] : speciesById[fallback];
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ left?: string; right?: string }> }) {
  const query = await searchParams;
  const left = pick(query.left, "boletus-edulis");
  const right = pick(query.right, "lactarius-deliciosus");
  // A pair with a published page has exactly one URL: that page carries the
  // comparator and the written guide together.
  const published = comparisonPageForPair(left.speciesId, right.speciesId);
  if (published) permanentRedirect(`/compare/${published.slug}`);

  return (
    <PageShell as="section">
      <PageHeader
        eyebrow="Comparador d’espècies"
        title={<>Dos bolets,<br />cara a cara.</>}
        description="Compara l’aspecte, el bosc, la temporada i el risc de confusió de dues espècies."
        actions={(
          <Link href={LOOKALIKE_GUIDE_PATH} className="button">
            <ScanLine size={18} aria-hidden="true" /> Bolets típics i confusions <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        )}
      />

      <SpeciesComparator left={left} right={right} />

      <ComparisonGuideList />
    </PageShell>
  );
}
