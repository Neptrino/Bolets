import type { Metadata } from "next";
import Link from "next/link";
import { ContributionGuide } from "@/components/contribution-guide";
import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";

export const metadata: Metadata = {
  title: "Col·labora amb Bolets",
  description: "Ajuda a millorar Bolets i obre durant 90 dies el detall d’1 km i 250 m del mapa.",
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
              El mapa públic mostra sectors de 2,5 km. Quan aprovem una aportació útil,
              el teu compte pot consultar sectors d’1 km i 250 m durant 90 dies.
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
