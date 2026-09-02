import type { Metadata } from "next";
import Link from "next/link";
import { ContributionGuide } from "@/components/contribution-guide";
import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";

export const metadata: Metadata = {
  title: "Col·labora amb Bolets",
  description: "Publica una troballa per obrir 1 km o proposa una aportació revisada per obrir també 250 m.",
  alternates: { canonical: "/col-labora" },
};

export default function ContributePage() {
  return (
    <PageShell as="article" className="contribution-page">
      <PageHeader
        eyebrow="Comunitat · coneixement compartit"
        title={<>Col·labora i obre el <PageTitleAccent>mapa detallat</PageTitleAccent></>}
        description={
          <span className="contribution-hero-copy">
            <span>
              El mapa públic mostra sectors de 2,5 km. Una troballa pública amb foto obre
              1 km durant 7 dies; una aportació aprovada obre també 250 m durant 30 dies.
            </span>
            <Link className="button" href="/compte/col-laboracio">Proposar una aportació</Link>
          </span>
        }
        layout="split"
        tone="forest"
      />

      <ContributionGuide />
    </PageShell>
  );
}
