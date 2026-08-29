import type { Metadata } from "next";
import { CalendarDays, Map, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FindingFlagButton } from "@/components/findings/finding-flag-button";
import { PublicFindingLocationMap } from "@/components/findings/public-finding-location-map";
import { PageHeader, PageShell } from "@/components/page-layout";
import { readPublicFinding } from "@/src/lib/findings/reads.server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const finding = await readPublicFinding((await params).id).catch(() => null);
  return finding ? { title: `Troballa de ${finding.reportedSpeciesName}`, description: `Observació comunitària publicada només en una casella de 10 × 10 km.` } : { title: "Troballa" };
}

export default async function FindingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const finding = await readPublicFinding(id).catch(() => null);
  if (!finding) notFound();
  const date = new Date(`${finding.observedOn}T12:00:00`);
  const observedDate = new Intl.DateTimeFormat("ca-ES", { dateStyle: "long" }).format(date);
  const observedDay = new Intl.DateTimeFormat("ca-ES", { day: "numeric" }).format(date);
  const observedMonth = new Intl.DateTimeFormat("ca-ES", { month: "long" }).format(date);
  const observedYear = new Intl.DateTimeFormat("ca-ES", { year: "numeric" }).format(date);
  return <PageShell className="findings-page">
    <PageHeader
      eyebrow="Troballa compartida"
      title={finding.reportedSpeciesName}
      actions={<Link className="finding-button-secondary" href="/troballes">Tornar al mapa</Link>}
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
              <dd><strong>{finding.reportedSpeciesName}</strong><small>Aportada per qui l’ha compartida; no verificada.</small></dd>
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
