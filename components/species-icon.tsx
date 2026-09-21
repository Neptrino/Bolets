import Image from "next/image";
import { speciesDrawing } from "@/src/lib/species-illustrations";

/* The drawn icon for a species, for places where a photograph would be too
   heavy or too detailed to read at a glance: a table row, a label in a panel.
   The published files are cut out, so they sit on any background. Decorative
   by design — the species name is always next to it, so the alt stays empty
   and screen readers are not made to hear the name twice. */
export function SpeciesIcon({
  speciesId,
  size = 40,
  className = "species-icon",
}: {
  speciesId: string;
  size?: number;
  className?: string;
}) {
  const drawing = speciesDrawing(speciesId)?.src;
  if (!drawing) return null;
  return (
    <Image
      src={drawing}
      alt=""
      width={size}
      height={size}
      className={className}
      unoptimized
    />
  );
}
