import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getPlace, locationPagePath, speciesLocationPages } from "@/data/location-pages";
import { getSpecies } from "@/data/species";
import { cepSpeciesIds } from "@/src/lib/ceps-guide";
import { SEASON_MONTHS } from "@/src/lib/seasonality";

const featuredPaths = [
  "/zones/solsones/port-del-comte/ceps",
  "/zones/bergueda/rasos-de-peguera/ceps",
  "/zones/cerdanya/bellver-de-cerdanya/ceps-de-pi",
  "/zones/ripolles/setcases/ceps-de-pi",
];
const guides = speciesLocationPages.filter((guide) =>
  cepSpeciesIds.some((id) => id === guide.speciesId),
);

export function CepsLocalGuides() {
  const featured = featuredPaths.flatMap((path) => {
    const guide = guides.find((item) => locationPagePath(item) === path);
    return guide ? [guide] : [];
  });
  const otherGuides = guides.filter((guide) => !featuredPaths.includes(locationPagePath(guide)));

  return (
    <section className="guide-types ceps-local-guides" aria-labelledby="ceps-published-title">
      <header>
        <p className="eyebrow">On buscar ceps</p>
        <h2 id="ceps-published-title">Tria el bosc i consulta la lectura local.</h2>
        <p>Les {guides.length} guies expliquen l’hàbitat al voltant de cada lloc. Els mesos són orientatius; obre la guia per consultar les condicions actuals i el mapa.</p>
      </header>
      <p className="guide-types-scroll-hint">Fes lliscar la taula per comparar els boscos i la temporada.</p>
      <div className="guide-types-table-scroll" role="region" aria-label="Comparació de guies locals de ceps" tabIndex={0}>
        <table className="guide-types-table" data-cep-local-guides>
          <caption className="sr-only">Guies locals de ceps: lloc, espècie, bosc i pic habitual</caption>
          <thead><tr><th scope="col">Guia local</th><th scope="col">Tipus de cep</th><th scope="col">Bosc compatible</th><th scope="col">Pic habitual</th></tr></thead>
          <tbody>{featured.map((guide) => {
            const species = getSpecies(guide.speciesId)!;
            const place = getPlace(guide.areaSlug, guide.placeSlug)!;
            return <tr key={locationPagePath(guide)}>
              <th scope="row"><Link href={locationPagePath(guide)}>{guide.titlePhrase} <ArrowUpRight size={14} aria-hidden="true" /></Link><small>{place.typeLabel} · entorn del lloc</small></th>
              <td>{species.identity.commonName}</td>
              <td>{species.ecologicalConfig.habitat.forestTypes.join(", ")}</td>
              <td>{SEASON_MONTHS.filter(({ key }) => species.ecologicalConfig.seasonality[key] === "peak").map(({ label }) => label).join(" i ")}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <details className="ceps-other-guides">
        <summary>Explora les altres {otherGuides.length} guies locals de ceps</summary>
        <ul>{otherGuides.map((guide) => <li key={locationPagePath(guide)}><Link href={locationPagePath(guide)}>{guide.titlePhrase}</Link></li>)}</ul>
      </details>
      <p className="prediction-zone-note">A les muntanyes de Prades, consulta la <Link href="/zones/prades/bosc-de-poblet/ceps">guia de ceps al bosc de Poblet</Link>. La <Link href="/zones/prades/prades">guia de Prades</Link> compara altres espècies documentades a l’entorn del municipi.</p>
      <Link href="/bolets-avui" className="text-link">Compara les condicions d’avui a Catalunya <ArrowUpRight size={16} aria-hidden="true" /></Link>
    </section>
  );
}
