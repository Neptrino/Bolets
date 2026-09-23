import Link from "next/link";
import { ArrowUpRight, Languages } from "lucide-react";
import { getSpanishSpeciesNames } from "@/data/species-common-names";
import { speciesPath } from "@/src/lib/seo";
import type { CatalogueSpecies } from "@/src/lib/types";

/* The names block a species hub carries. People search the same mushroom in
   both languages and in half a dozen local variants — "rovellons en
   castellano", "níscalo en català", "ceps catalán", "sureny", and the Latin
   name on its own — and the catalogue already holds every one of them. This
   puts them in one table instead of leaving them scattered across the fitxes. */
export function SpeciesNamesTable({
  species,
  titleId,
  title,
  intro,
}: {
  species: readonly CatalogueSpecies[];
  titleId: string;
  title: string;
  intro: string;
}) {
  return (
    <section className="guide-types" aria-labelledby={titleId}>
      <header>
        <p className="eyebrow"><Languages size={15} /> Noms en català i castellà</p>
        <h2 id={titleId}>{title}</h2>
        <p>{intro}</p>
      </header>
      <p className="guide-types-scroll-hint">Fes lliscar la taula per veure totes les columnes.</p>
      <div className="card guide-types-table-scroll">
        <table className="guide-types-table">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr>
              <th scope="col">Nom en català</th>
              <th scope="col">Altres noms catalans</th>
              <th scope="col">En castellà</th>
              <th scope="col">Nom científic</th>
            </tr>
          </thead>
          <tbody>
            {species.map((item) => {
              const spanish = getSpanishSpeciesNames(item.speciesId);
              const spanishNames = spanish
                ? [spanish.primary, ...(spanish.alternatives ?? [])].join(", ")
                : "Sense nom castellà documentat";
              const alternates = item.identity.alternateNames.length
                ? item.identity.alternateNames.join(", ")
                : "—";
              return (
                <tr key={item.speciesId}>
                  <th scope="row">
                    <Link href={speciesPath(item)}>{item.identity.commonName}</Link>
                  </th>
                  <td>{alternates}</td>
                  <td>{spanishNames}</td>
                  <td><i>{item.identity.scientificName}</i></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="guide-types-footnote">
        <Link href="/noms-de-bolets-catala-castella" className="text-link">
          Tots els noms de bolets en català i castellà <ArrowUpRight size={16} />
        </Link>
      </p>
    </section>
  );
}
