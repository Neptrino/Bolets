import { ArrowUpRight, CameraOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getCatalogueSpecies } from "@/data/catalogue";
import type { PublicFinding } from "@/src/lib/findings/types";
import { speciesPath } from "@/src/lib/seo";
import { speciesDrawing } from "@/src/lib/species-illustrations";

export function FindingCard({ finding }: { finding: PublicFinding }) {
  const photo = finding.photos[0];
  // A finding may be published without any photo. The editorial drawing stands
  // for the reported species, never for the specimen someone found, so it is
  // labelled; the overview credits the drawings that carry one.
  const drawing = speciesDrawing(finding.reportedSpeciesId);
  const species = getCatalogueSpecies(finding.reportedSpeciesId);
  const profileHref = species ? speciesPath(species) : "/bolets";
  const observedDate = new Intl.DateTimeFormat("ca-ES", { dateStyle: "medium" })
    .format(new Date(`${finding.observedOn}T12:00:00`));
  return <article className="card finding-card">
    <Link className="finding-card-media-link" href={`/troballes/${finding.id}`} aria-label={`Obrir la troballa de ${finding.reportedSpeciesName}`}>
      {photo ? <Image className="finding-card-image" src={photo.url} alt={`Troballa proposada com a ${finding.reportedSpeciesName}`} width={photo.width} height={photo.height} unoptimized /> : <div className="finding-card-placeholder">
        {drawing ? <Image className="finding-card-drawing" src={drawing.src} alt="" width={480} height={354} sizes="(max-width: 700px) 60vw, 200px" unoptimized /> : <CameraOff size={30} aria-hidden="true" />}
        <strong>Sense fotografia</strong>
        {drawing ? <small>Dibuix de l’espècie indicada</small> : null}
      </div>}
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
