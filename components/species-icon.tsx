import Image from "next/image";
import { speciesDrawing } from "@/src/lib/species-illustrations";

/* The drawn icon for a species, for places where a photograph would be too
   heavy or too detailed to read at a glance: a table row, a label in a panel.
   The published files are cut out, so they sit on any background. Decorative
   by default — the species name is always next to it, so the alt stays empty
   and screen readers are not made to hear the name twice. Pages that present
   the drawings themselves (the infographic) pass a descriptive alt for image
   search and name their links explicitly. */
export function SpeciesIcon({
  speciesId,
  size = 40,
  className = "species-icon",
  alt = "",
}: {
  speciesId: string;
  size?: number;
  className?: string;
  alt?: string;
}) {
  const drawing = speciesDrawing(speciesId)?.src;
  if (!drawing) return null;
  return (
    <Image
      src={drawing}
      alt={alt}
      width={size}
      height={size}
      className={className}
      unoptimized
    />
  );
}
