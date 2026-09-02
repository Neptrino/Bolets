import type { Metadata } from "next";
import { ArrowUpRight, Eye, Grid3X3, MapPinOff, Sprout } from "lucide-react";
import Link from "next/link";
import { FindingCard } from "@/components/findings/finding-card";
import { JsonLd } from "@/components/json-ld";
import { PublicFindingsMap } from "@/components/findings/public-findings-map";
import { PageHeader, PageShell, PageTitleAccent, SectionHeader } from "@/components/page-layout";
import { catalogueSpecies, getCatalogueSpecies } from "@/data/catalogue";
import { summarizePublicFindings } from "@/src/lib/findings/public-summary";
import { readPublicFindings } from "@/src/lib/findings/reads.server";
import { absoluteUrl, speciesPath } from "@/src/lib/seo";

const baseMetadata: Metadata = {
  title: "Troballes de bolets a Catalunya",
  description: "Consulta troballes comunitàries de bolets a Catalunya en caselles de 10 km, amb enllaços a fitxes d’espècies i sense publicar el punt exacte.",
  alternates: { canonical: "/troballes" },
};
export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ casella?: string }> }): Promise<Metadata> {
  const { casella } = await searchParams;
  return casella ? { ...baseMetadata, robots: { index: false, follow: true } } : baseMetadata;
}

export default async function FindingsPage({ searchParams }: { searchParams: Promise<{ casella?: string }> }) {
  const { casella } = await searchParams;
  const safeCell = casella?.match(/^[A-Za-z0-9_.:-]{1,100}$/) ? casella : undefined;
  const findingResult = await readPublicFindings(safeCell).catch(() => null);
  const findings = findingResult ?? [];
  const findingsAvailable = findingResult !== null;
  const summary = summarizePublicFindings(findings);
  const speciesSummaries = summary.species.flatMap((item) => {
    const species = getCatalogueSpecies(item.speciesId);
    return species ? [{ ...item, href: speciesPath(species) }] : [];
  });
  const latestDate = summary.latestObservedOn
    ? new Intl.DateTimeFormat("ca-ES", { dateStyle: "long" }).format(new Date(`${summary.latestObservedOn}T12:00:00`))
    : null;
  const visibleFindingLabel = !findingsAvailable
    ? "publicacions no disponibles"
    : summary.visibleFindingCount === 1 ? "publicació visible" : "publicacions visibles";
  const visibleSpeciesLabel = !findingsAvailable
    ? "espècies no disponibles"
    : summary.visibleSpeciesCount === 1 ? "espècie indicada" : "espècies indicades";
  return <PageShell className="findings-page">
    {!safeCell && speciesSummaries.length ? <JsonLd data={{
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Troballes de bolets a Catalunya",
      description: baseMetadata.description,
      url: absoluteUrl("/troballes"),
      inLanguage: "ca",
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: speciesSummaries.length,
        itemListElement: speciesSummaries.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.speciesName, url: absoluteUrl(item.href) })),
      },
    }} /> : null}
    <PageHeader eyebrow="Quadern de camp i atles compartit" title={<>Del bosc al teu mapa, <PageTitleAccent>fins i tot sense cobertura</PageTitleAccent></>} description={<span className="findings-hero-copy">
    <span>Converteix cada sortida en un record útil: afegeix fotos, indica l’espècie i recupera automàticament la data i el GPS quan la imatge els conserva. Si no tens cobertura, la troballa queda al dispositiu i se sincronitza més tard.</span>
    <span>Al teu quadern conserves l’historial; quan comparteixes, l’atles mostra només el dia i una àrea de 10 × 10 km.</span>
    <span className="findings-hero-benefits"><span>Captura sense cobertura</span><span>GPS i data automàtics</span><span>El punt exacte mai no és públic</span></span>
  </span>} actions={<div className="findings-actions"><Link className="finding-button" href="/troballes/nova">Anotar una troballa</Link><Link className="finding-button-secondary" href="/les-meves-troballes">El meu quadern</Link></div>} />
    <PublicFindingsMap species={catalogueSpecies} />
    {!safeCell ? <section className="finding-section finding-community-reading" aria-labelledby="finding-community-reading-title">
      <SectionHeader meta="Lectura comunitària" title="Què expliquen aquestes troballes?" titleId="finding-community-reading-title" description="Són observacions compartides per la comunitat: aporten context històric i enllacen amb les fitxes del catàleg, però no indiquen on trobar bolets avui." />
      <div className="finding-community-panel">
        <div className="finding-community-stats" aria-label="Resum de les publicacions visibles">
          <div><strong>{findingsAvailable ? summary.visibleFindingCount : "—"}</strong><span>{visibleFindingLabel}</span></div>
          <div><strong>{findingsAvailable ? summary.visibleSpeciesCount : "—"}</strong><span>{visibleSpeciesLabel}</span></div>
          <div><strong>{latestDate ?? "—"}</strong><span>darrera data comunicada</span></div>
        </div>
        <div className="finding-community-species">
          <div><Sprout size={20} aria-hidden="true" /><div><h3>Espècies comunicades recentment</h3><p>El recompte resumeix les publicacions visibles en aquesta pàgina, no tot el bosc.</p></div></div>
          {speciesSummaries.length ? <nav aria-label="Fitxes de les espècies comunicades">{speciesSummaries.map((item) => <Link href={item.href} key={item.speciesId}><span>{item.speciesName}</span><small>{item.findingCount} {item.findingCount === 1 ? "troballa" : "troballes"}</small><ArrowUpRight size={15} aria-hidden="true" /></Link>)}</nav> : <p className="finding-community-empty">Encara no hi ha espècies públiques per resumir.</p>}
        </div>
      </div>
      <ul className="finding-community-limits">
        <li><Eye size={19} aria-hidden="true" /><span><strong>Identificació declarada</strong><small>El nom l’indica qui publica. La fitxa ajuda a contrastar trets, però no valida la fotografia.</small></span></li>
        <li><Grid3X3 size={19} aria-hidden="true" /><span><strong>Privadesa de 10 × 10 km</strong><small>La vista pública mostra una zona aproximada i el dia; mai no publica el punt exacte ni l’hora.</small></span></li>
        <li><MapPinOff size={19} aria-hidden="true" /><span><strong>Separades del mapa de condicions</strong><small>Les troballes no canvien les condicions mostrades ni confirmen presència actual.</small></span></li>
      </ul>
    </section> : null}
    <section className="finding-section"><SectionHeader meta={safeCell ? "Zona seleccionada" : "Publicacions recents"} title={safeCell ? "Troballes d’aquesta zona aproximada de 10 km" : "Últimes troballes compartides"} description="El nom de cada troballa és la identificació indicada per qui l’ha publicada; no ha estat verificat." actions={safeCell ? <Link className="finding-button-secondary" href="/troballes">Veure totes</Link> : null} />
      {findings.length ? <div className="finding-grid">{findings.map((finding) => <FindingCard finding={finding} key={finding.id} />)}</div> : <p className="finding-notice">Encara no hi ha troballes públiques en aquesta selecció, o el servei no està disponible ara mateix.</p>}
    </section>
  </PageShell>;
}
