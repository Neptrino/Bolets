import Link from "next/link";
import { SpeciesIcon } from "@/components/species-icon";

/* The row header of the catalogue tables: drawn icon beside the Catalan name and
   the scientific name, so a long list can be scanned by shape as well as by name. */
export function CatalogueSpeciesCell({
  speciesId,
  href,
  name,
  scientificName,
}: {
  speciesId: string;
  href: string;
  name: string;
  scientificName: string;
}) {
  return (
    <th scope="row">
      <span className="catalogue-list-species">
        <SpeciesIcon speciesId={speciesId} size={40} />
        <span><Link href={href}>{name}</Link><small>{scientificName}</small></span>
      </span>
    </th>
  );
}
