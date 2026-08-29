import Image from "next/image";
import Link from "next/link";
import type { PublicFinding } from "@/src/lib/findings/types";

export function FindingCard({ finding }: { finding: PublicFinding }) {
  const photo = finding.photos[0];
  return <article className="finding-card">
    <Link className="finding-card-link" href={`/troballes/${finding.id}`} aria-label={`Obrir la troballa de ${finding.reportedSpeciesName}`}>
      {photo ? <Image className="finding-card-image" src={photo.url} alt={`Troballa proposada com a ${finding.reportedSpeciesName}`} width={photo.width} height={photo.height} unoptimized /> : <div className="finding-card-placeholder">Sense foto pública</div>}
      <div className="finding-card-body">
        <div className="finding-card-meta"><span>{new Intl.DateTimeFormat("ca-ES", { dateStyle: "medium" }).format(new Date(`${finding.observedOn}T12:00:00`))}</span><span>Casella de 10 × 10 km</span></div>
        <h2>{finding.reportedSpeciesName}</h2>
        <p>{finding.alias ? `Compartida per ${finding.alias}.` : "Compartida de manera anònima."}</p>
      </div>
    </Link>
  </article>;
}
