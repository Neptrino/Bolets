import type { Metadata } from "next";
import { ArrowUpRight, CalendarDays, Map, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { FindingFlagButton } from "@/components/findings/finding-flag-button";
import { PublicFindingLocationMap } from "@/components/findings/public-finding-location-map";
import { PageHeader, PageShell } from "@/components/page-layout";
import { getCatalogueSpecies } from "@/data/catalogue";
import { readPublicFinding } from "@/src/lib/findings/reads.server";
import { speciesPath } from "@/src/lib/seo";

export const dynamic = "force-dynamic";
const getPublicFinding = cache((id: string) => readPublicFinding(id).catch(() => null));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const finding = await getPublicFinding((await params).id);
  return {
    title: finding ? `Troballa de ${finding.reportedSpeciesName}` : "Troballa",
    description: finding ? "Observació comunitària generalitzada en una casella de 10 × 10 km; no confirma la identificació ni la presència actual." : undefined,
    robots: { index: false, follow: true },
  };
}

export default async function FindingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const finding = await getPublicFinding(id);
  if (!finding) notFound();
  const species = getCatalogueSpecies(finding.reportedSpeciesId);
  const profileHref = species ? speciesPath(species) : "/bolets";
  const date = new Date(`${finding.observedOn}T12:00:00`);
  const observedDate = new Intl.DateTimeFormat("ca-ES", { dateStyle: "long" }).format(date);
  const observedDay = new Intl.DateTimeFormat("ca-ES", { day: "numeric" }).format(date);
  const observedMonth = new Intl.DateTimeFormat("ca-ES", { month: "long" }).format(date);
  const observedYear = new Intl.DateTimeFormat("ca-ES", { year: "numeric" }).format(date);
  return <PageShell className="findings-page">
    <PageHeader
      eyebrow="Troballa compartida"
      title={finding.reportedSpeciesName}
      actions={<div className="findings-actions"><Link className="finding-button" href={profileHref}>Fitxa de l’espècie <ArrowUpRight size={15} aria-hidden="true" /></Link><Link className="finding-button-secondary" href="/troballes">Tornar al mapa</Link></div>}
    />
    <div className="finding-detail-grid">
      <div className="finding-gallery">
        {finding.photos.length
          ? finding.photos.map((photo, index) => <Image key={photo.id} src={photo.url} alt={`Fotografia pública ${index + 1} de la troballa`} width={photo.width} height={photo.height} unoptimized />)
          : <p className="finding-notice">Aquesta troballa no té cap fotografia pública.</p>}
      </div>
      <div className="finding-detail-sidebar">
        <aside className="finding-detail-panel">
          <div className="finding-detail-panel-heading">
            <span>Fitxa pública</span>
            <h2>Detalls de la troballa</h2>
          </div>
          <time className="finding-detail-date" dateTime={finding.observedOn} aria-label={observedDate}>
            <small className="finding-detail-date-label">Data de la troballa</small>
            <CalendarDays size={21} aria-hidden="true" />
            <strong>{observedDay}</strong>
            <span><b>{observedMonth}</b><small>{observedYear}</small></span>
          </time>
          <dl className="finding-detail-facts">
            <div>
              <dt>Identificació indicada</dt>
              <dd><Link className="finding-detail-species-link" href={profileHref}>{finding.reportedSpeciesName} <ArrowUpRight size={14} aria-hidden="true" /></Link><small>Aportada per qui l’ha compartida; no verificada. La fitxa ajuda a contrastar-ne els trets.</small></dd>
            </div>
            <div>
              <dt><UserRound size={16} aria-hidden="true" /> Compartida per</dt>
              <dd>{finding.alias ?? "Aportació anònima"}</dd>
            </div>
          </dl>
          <section className="finding-detail-location" aria-labelledby="finding-detail-location-title">
            <div className="finding-detail-location-heading">
              <Map size={21} aria-hidden="true" />
              <div><h3 id="finding-detail-location-title">Ubicació publicada</h3><p>Àrea generalitzada de 10 × 10 km</p></div>
            </div>
            <PublicFindingLocationMap bounds={finding.cellBounds} />
          </section>
        </aside>
        <div className="finding-detail-report">
          <p>Has detectat informació incorrecta, insegura o que afecta la privadesa?</p>
          <FindingFlagButton findingId={finding.id} />
        </div>
      </div>
    </div>
  </PageShell>;
}
