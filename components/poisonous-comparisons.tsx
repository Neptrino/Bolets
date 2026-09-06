import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { comparisonPages } from "@/data/comparison-pages";
import { getCatalogueSpecies } from "@/data/catalogue";
import { MediaImage } from "@/components/media-image";
import { SectionHeader } from "@/components/page-layout";

const slugs = [
  "ou-de-reig-vs-reig-bord", "rossinyol-vs-bolet-olivera", "cep-vs-matagent",
  "fredolic-vs-fredolic-metzinos", "murgola-vs-bolet-greix", "rovello-vs-rovello-de-cabra",
];

export function PoisonousComparisons() {
  return <section className="poisonous-comparisons" aria-labelledby="poisonous-comparisons-title">
    <SectionHeader meta="Confusions a revisar" title="Compara els exemplars i tots els trets" titleId="poisonous-comparisons-title" />
    <p>Les fotografies mostren exemplars de referència. El color o una semblança visual no confirmen una identificació; obre la comparació completa per revisar-ne els límits i les fonts.</p>
    <div className="poisonous-comparison-grid">{slugs.map((slug) => {
      const comparison = comparisonPages.find((page) => page.slug === slug)!;
      const pair = [getCatalogueSpecies(comparison.leftSpeciesId)!, getCatalogueSpecies(comparison.rightSpeciesId)!];
      return <article key={slug}>
        <h3><Link href={`/compare/${slug}`}>{comparison.shortTitle} <ArrowUpRight size={16} aria-hidden="true" /></Link></h3>
        <div className="poisonous-photo-pair">{pair.map((species) => {
          const asset = species.media.find((image) => image.identificationReference) ?? species.media[0];
          return <figure key={species.speciesId}>
            {asset && <div><MediaImage asset={asset} alt={asset.alt} fill sizes="(max-width: 760px) 40vw, 240px" /></div>}
            <figcaption><strong>{species.identity.commonName}</strong>{asset && !asset.hideCredit && <a href={asset.sourceUrl} target="_blank" rel="noreferrer">{asset.attribution} · {asset.license}</a>}</figcaption>
          </figure>;
        })}</div>
        <p>{comparison.decisiveDifference}</p>
        <Link className="text-link" href={`/compare/${slug}`}>Revisa la comparació i les fonts <ArrowUpRight size={15} aria-hidden="true" /></Link>
      </article>;
    })}</div>
  </section>;
}
