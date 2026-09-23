"use client";

import type { ReactNode } from "react";
import { SpeciesCard } from "@/components/species-card";
import { SpeciesDirectoryLayoutControl, useSpeciesDirectoryLayout, type SpeciesDirectoryLayout } from "@/components/species-directory-layout";
import type { SpeciesCardProfile } from "@/src/lib/species-card-profile";
import type { Month } from "@/src/lib/types";
import "@/app/styles/species-directory-layouts.css";

const imageSizes: Record<SpeciesDirectoryLayout, string | undefined> = {
  cards: undefined,
  compact: "(max-width: 580px) calc(50vw - 30px), (max-width: 1000px) calc(33.333vw - 30px), 280px",
  list: "160px",
};

/** Species cards with the viewer's card / compact / list layout switch. Pass card
    profiles (see `toSpeciesCardProfile`), not full species records, so the client
    payload stays small. */
export function SpeciesCollection({
  species,
  currentMonth,
  toolbar,
  beforeGrid,
  className,
  showLayoutControl = true,
}: {
  species: SpeciesCardProfile[];
  currentMonth?: Month;
  /** Status shown at the start of the bar, before the layout switch. */
  toolbar?: ReactNode;
  /** Content between the bar and the cards. */
  beforeGrid?: ReactNode;
  className?: string;
  /** Off for a second collection on the same page; the shared layout still applies. */
  showLayoutControl?: boolean;
}) {
  const [layout, setLayout] = useSpeciesDirectoryLayout();
  return (
    <div className={className ? `species-collection ${className}` : "species-collection"}>
      {(toolbar || showLayoutControl) && (
        <div className="directory-results-bar">
          {toolbar}
          {showLayoutControl && <SpeciesDirectoryLayoutControl layout={layout} onChange={setLayout} />}
        </div>
      )}
      {beforeGrid}
      <div className="species-grid" data-layout={layout}>
        {species.map((item, index) => <SpeciesCard key={item.speciesId} species={item} index={index} currentMonth={currentMonth} sizes={imageSizes[layout]} />)}
      </div>
    </div>
  );
}
