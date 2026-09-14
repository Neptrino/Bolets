import Link from "next/link";
import { SectionHeader } from "@/components/page-layout";
import { infographicSpeciesGroups } from "@/src/lib/catalogue-infographic";
import { speciesPath } from "@/src/lib/seo";

/**
 * The species on the poster, as compact linked text. It names every species
 * for search without repeating the catalogue's per-species data.
 */
export function CatalogueInfographicSpecies({ speciesCount }: { speciesCount: number }) {
  const groups = infographicSpeciesGroups();

  return (
    <section
      id="infografia-especies"
      className="catalogue-infographic-species"
      aria-labelledby="catalogue-infographic-species-title"
    >
      <SectionHeader
        meta="Al pòster"
        title={`Els ${speciesCount} bolets de la infografia`}
        titleId="catalogue-infographic-species-title"
        description="Agrupades com al pòster, per comestibilitat. Cada nom obre la fitxa completa amb fotografies, confusions, temporada i hàbitat."
      />
      <div className="catalogue-infographic-species-groups">
        {groups.map((group) => (
          <div key={group.id} className="catalogue-infographic-species-group" data-group={group.id}>
            <h3>
              <span className="catalogue-infographic-species-swatch" style={{ background: group.colour }} aria-hidden="true" />
              {group.title} <small>{group.rows.length}</small>
            </h3>
            <ul>
              {group.rows.map((row) => (
                <li key={row.speciesId}>
                  <Link href={speciesPath(row.species)} title={row.scientificName}>{row.commonName}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
