import type { Metadata } from "next";
import { ArrowUpRight, MapPinned } from "lucide-react";
import Link from "next/link";
import { FindingReportForm } from "@/components/findings/finding-report-form";
import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import { catalogueSpecies } from "@/data/catalogue";

export const metadata: Metadata = { title: "Anota una troballa", description: "Quadern de camp de bolets que funciona sense cobertura i protegeix la ubicació exacta.", robots: { index: false, follow: false } };

export default function NewFindingPage() {
  return (
    <PageShell className="findings-page">
      <PageHeader
        eyebrow="Quadern de camp"
        title={<>Anota-ho <PageTitleAccent>al bosc</PageTitleAccent></>}
        description="Fes les fotos al bosc i completa la troballa a casa. Si conserven el GPS, la data i l’hora, els recuperarem perquè només els hagis de revisar. També pots anotar-la al moment, fins i tot sense cobertura."
      />
      <aside className="findings-contribution-callout" aria-labelledby="findings-contribution-title">
        <span className="findings-contribution-icon" aria-hidden="true"><MapPinned size={22} /></span>
        <div className="findings-contribution-copy">
          <p>Troballes i catàleg són fluxos diferents</p>
          <h2 id="findings-contribution-title">Les fotos no passen al catàleg automàticament</h2>
          <span>Aquí només queden publicades amb la troballa i no passen al catàleg automàticament. Una troballa pública amb foto obre el mapa d’1 km durant 7 dies. Si després ens proposes les imatges com a col·laboració i les aprovem, les podrem incorporar al catàleg i obriràs també 250 m durant 30 dies.</span>
        </div>
        <Link className="finding-button-secondary findings-contribution-link" href="/col-labora">
          Com col·laborar <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </aside>
      <FindingReportForm species={catalogueSpecies} />
    </PageShell>
  );
}
