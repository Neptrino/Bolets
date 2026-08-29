import type { Metadata } from "next";
import { FindingReportForm } from "@/components/findings/finding-report-form";
import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import { catalogueSpecies } from "@/data/catalogue";

export const metadata: Metadata = { title: "Anota una troballa", description: "Quadern de camp de bolets que funciona sense cobertura i protegeix la ubicació exacta.", robots: { index: false, follow: false } };

export default function NewFindingPage() {
  return <PageShell className="findings-page"><PageHeader eyebrow="Quadern de camp" title={<>Anota-ho <PageTitleAccent>al bosc</PageTitleAccent></>} description="Fes les fotos al bosc i completa la troballa a casa. Si conserven el GPS, la data i l’hora, els recuperarem perquè només els hagis de revisar. També pots anotar-la al moment, fins i tot sense cobertura." /><FindingReportForm species={catalogueSpecies} /></PageShell>;
}
