import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { SpeciesProfile } from "@/src/lib/types";

export function SpeciesCard({ species, index = 0 }: { species: SpeciesProfile; index?: number }) {
  const palettes = [["#f28a2e", "#9f4d24"], ["#f2a766", "#6e3d25"], ["#96958e", "#bd592a"], ["#c86b32", "#3b3b3b"]] as const;
  const [toneA, toneB] = palettes[index % palettes.length];
  const referenceImage = species.media.find((asset) => asset.identificationReference);
  return (
    <Link href={`/species/${species.speciesId}`} className="species-card" style={{ "--tone-a": toneA ?? "#f28a2e", "--tone-b": toneB ?? "#9f4d24", animationDelay: `${index * 65}ms` } as React.CSSProperties}>
      <div className={`species-card-illustration${referenceImage ? " has-photo" : ""}`} aria-hidden="true">
        {referenceImage && <Image className="species-card-photo" src={referenceImage.localPath ?? referenceImage.imageUrl ?? referenceImage.sourceUrl} alt="" fill sizes="(max-width: 680px) calc(100vw - 48px), (max-width: 1000px) 50vw, 380px" unoptimized={Boolean(referenceImage.imageUrl)} />}
      </div>
      <div className="species-card-content">
        <h3>{species.identity.commonName}</h3>
        <em>{species.identity.scientificName}</em>
        <p>{species.identity.shortDescription}</p>
        <span className="card-link">Obre la fitxa <ArrowUpRight size={15} /></span>
      </div>
    </Link>
  );
}
