import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getCatalogueSpecies } from "@/data/catalogue";
import type { PublicFinding } from "@/src/lib/findings/types";
import { speciesPath } from "@/src/lib/seo";

export function FindingCard({ finding }: { finding: PublicFinding }) {
  const photo = finding.photos[0];
  const species = getCatalogueSpecies(finding.reportedSpeciesId);
  const profileHref = species ? speciesPath(species) : "/bolets";
  const observedDate = new Intl.DateTimeFormat("ca-ES", { dateStyle: "medium" })
    .format(new Date(`${finding.observedOn}T12:00:00`));
  return <article className="finding-card">
    <Link className="finding-card-media-link" href={`/troballes/${finding.id}`} aria-label={`Obrir la troballa de ${finding.reportedSpeciesName}`}>
      {photo ? <Image className="finding-card-image" src={photo.url} alt={`Troballa proposada com a ${finding.reportedSpeciesName}`} width={photo.width} height={photo.height} unoptimized /> : <div className="finding-card-placeholder">Sense foto pública</div>}
    </Link>
    <div className="finding-card-body">
      <div className="finding-card-meta">
        <time dateTime={finding.observedOn}>{observedDate}</time>
        <span aria-hidden="true">·</span>
        <span className="finding-card-author" aria-label={finding.alias ? `Compartida per ${finding.alias}` : "Compartida anònimament"}>{finding.alias ?? "Anònima"}</span>
      </div>
      <h2><Link className="finding-card-species-link" href={profileHref}>{finding.reportedSpeciesName}</Link></h2>
      <Link className="finding-card-detail-link" href={`/troballes/${finding.id}`}>Veure la troballa <ArrowUpRight size={15} aria-hidden="true" /></Link>
    </div>
  </article>;
}
