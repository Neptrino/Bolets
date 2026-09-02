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
  if (!access.checked || access.active || resolution >= 2500) return null;

  return (
    <div className={`map-detail-access${inline ? " map-detail-access--inline" : ""}`}>
      <div className="map-detail-access-copy" role="status">
        <strong><LockKeyhole size={16} aria-hidden="true" />Vols veure el mapa amb més detall?</strong>
        <span>El mapa públic mostra sectors de 2,5 km. Col·labora per veure’n de més petits, sense pagar.</span>
      </div>
      <Link href="/col-labora" className="button">
        Com obtenir més detall <ArrowUpRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
}
