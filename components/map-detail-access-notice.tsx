"use client";

import { ArrowUpRight, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useContributorMapAccess } from "@/components/use-contributor-map-access";
import type { SpatialGridSizeM } from "@/src/lib/types";

export function MapDetailAccessNotice({
  resolution,
  inline = false,
}: {
  resolution: SpatialGridSizeM;
  inline?: boolean;
}) {
  const access = useContributorMapAccess();
  if (!access.checked || resolution >= access.minimumResolutionM) return null;
  const findingLevel = access.level === "finding";

  return (
    <div className={`map-detail-access${inline ? " map-detail-access--inline" : ""}`}>
      <div className="map-detail-access-copy" role="status">
        <strong>
          <LockKeyhole size={16} aria-hidden="true" />
          {findingLevel ? "Vols arribar als sectors de 250 m?" : "Vols veure sectors d’1 km?"}
        </strong>
        <span>
          {findingLevel
            ? "Proposa una aportació útil: si l’aprovem, obriràs també els sectors de 250 m durant 30 dies."
            : "Publica una troballa amb una foto pública i obriràs els sectors d’1 km durant 7 dies."}
        </span>
      </div>
      <Link href={findingLevel ? "/compte/col-laboracio" : "/troballes/nova"} className="button">
        {findingLevel ? "Proposar una aportació" : "Publicar una troballa"} <ArrowUpRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
}
