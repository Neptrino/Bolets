import type { Metadata } from "next";
import Link from "next/link";
import { FindingCard } from "@/components/findings/finding-card";
import { PublicFindingsMap } from "@/components/findings/public-findings-map";
import { PageHeader, PageShell, PageTitleAccent, SectionHeader } from "@/components/page-layout";
import { catalogueSpecies } from "@/data/catalogue";
import { readPublicFindings } from "@/src/lib/findings/reads.server";

export const metadata: Metadata = { title: "Troballes de bolets a Catalunya", description: "Anota les teves troballes al camp, guarda-les al quadern i comparteix-les en un mapa que mai no publica el punt exacte." };
export const dynamic = "force-dynamic";

export default async function FindingsPage({ searchParams }: { searchParams: Promise<{ casella?: string }> }) {
  const { casella } = await searchParams;
  const safeCell = casella?.match(/^[A-Za-z0-9_.:-]{1,100}$/) ? casella : undefined;
  const findings = await readPublicFindings(safeCell).catch(() => []);
  return <PageShell className="findings-page"><PageHeader eyebrow="Quadern de camp i atles compartit" title={<>Del bosc al teu mapa, <PageTitleAccent>fins i tot sense cobertura</PageTitleAccent></>} description={<span className="findings-hero-copy">
    <span>Converteix cada sortida en un record útil: afegeix fotos, indica l’espècie i recupera automàticament la data i el GPS quan la imatge els conserva. Si no tens cobertura, la troballa queda al dispositiu i se sincronitza més tard.</span>
    <span>Al teu quadern conserves l’historial; quan comparteixes, l’atles mostra només el dia i una àrea de 10 × 10 km.</span>
    <span className="findings-hero-benefits"><span>Captura sense cobertura</span><span>GPS i data automàtics</span><span>El punt exacte mai no és públic</span></span>
  </span>} actions={<div className="findings-actions"><Link className="finding-button" href="/troballes/nova">Anotar una troballa</Link><Link className="finding-button-secondary" href="/les-meves-troballes">El meu quadern</Link></div>} />
    <PublicFindingsMap species={catalogueSpecies} />
    <section className="finding-section"><SectionHeader meta={safeCell ? "Casella seleccionada" : "Publicacions recents"} title={safeCell ? "Troballes d’aquesta casella de 10 km" : "Últimes troballes compartides"} description="El nom de cada troballa és la identificació indicada per qui l’ha publicada; no ha estat verificat." actions={safeCell ? <Link className="finding-button-secondary" href="/troballes">Veure totes</Link> : null} />
      {findings.length ? <div className="finding-grid">{findings.map((finding) => <FindingCard finding={finding} key={finding.id} />)}</div> : <p className="finding-notice">Encara no hi ha troballes públiques en aquesta selecció, o el servei no està disponible ara mateix.</p>}
    </section>
  </PageShell>;
}
