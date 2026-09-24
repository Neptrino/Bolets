import Link from "next/link";
import { SectionHeader } from "@/components/page-layout";
import { SpeciesIcon } from "@/components/species-icon";
import { infographicSpeciesGroups } from "@/src/lib/catalogue-infographic";
import { speciesPath } from "@/src/lib/seo";
import { speciesArticle } from "@/src/lib/species-headings";

/**
 * The species on the poster, as a short linked list grouped like the sheet.
 * It names every species for search without repeating the catalogue's
 * per-species data.
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
        title={`Els ${speciesCount} bolets dibuixats a la infografia`}
        titleId="catalogue-infographic-species-title"
        description={<>Agrupats com al pòster, per comestibilitat. Cada nom obre la fitxa completa amb confusions, temporada i hàbitat; per comparar-los en una taula, consulta tots els <Link href="/bolets">tipus de bolets del catàleg</Link>.</>}
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
                  {/* The link keeps the plain name; the alt describes the drawing for image search. */}
                  <Link href={speciesPath(row.species)} title={row.scientificName} aria-label={row.commonName}>
                    <SpeciesIcon
                      speciesId={row.speciesId}
                      size={28}
                      className="catalogue-infographic-species-icon"
                      alt={`Dibuix ${speciesArticle(row.commonName).ofSpecies} (${row.scientificName})`}
                    />
                    <span>{row.commonName}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
