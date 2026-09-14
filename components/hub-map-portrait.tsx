import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPinned } from "lucide-react";
import type { HubMapSpec } from "@/src/lib/place-map";

/** Static ICGC topographic portrait used in the place and zone hub heroes. */
export function HubMapPortrait({
  src,
  spec,
  name,
  regionLabel,
  atlasLabel,
  count,
  countLabel,
  liveMapHref,
  marker = true,
}: {
  src: string;
  spec: HubMapSpec;
  name: string;
  regionLabel: string;
  atlasLabel: string;
  count: number;
  countLabel: string;
  liveMapHref?: string;
  /** A place has a centre worth marking; an area does not. */
  marker?: boolean;
}) {
  const scaleKm = spec.scaleBar.metres / 1000;
  return (
    <figure className="place-map-portrait">
      <Image
        src={src}
        alt={`Mapa topogràfic de ${name}, uns ${Math.round(spec.groundWidthKm)} km d’amplada`}
        width={spec.width}
        height={spec.height}
        unoptimized
        priority
      />
      {marker ? <span className="place-map-marker" aria-hidden="true" /> : null}
      {/* Spans the full image width so the bar's percentage is true to the ground scale. */}
      <div className="place-map-scale" role="img" aria-label={`Escala: ${scaleKm} km`}>
        <i style={{ width: `${spec.scaleBar.widthPercent}%` }} />
        <span>{scaleKm} km</span>
      </div>
      <div className="place-map-place">
        <MapPinned size={22} aria-hidden="true" />
        <span>{regionLabel}</span>
        <strong>{name}</strong>
      </div>
      <figcaption className="place-map-caption">
        <div className="place-map-count">
          <span>{atlasLabel} · {name.toLocaleUpperCase("ca")}</span>
          <strong>{count.toString().padStart(2, "0")}</strong>
          <small>{countLabel}</small>
        </div>
        {liveMapHref ? (
          <Link href={liveMapHref} className="place-map-live">Mapa en viu <ArrowUpRight size={15} aria-hidden="true" /></Link>
        ) : null}
        <small className="place-map-credit">Base topogràfica © ICGC</small>
      </figcaption>
    </figure>
  );
}
