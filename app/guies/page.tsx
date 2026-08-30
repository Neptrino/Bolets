import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BookOpenText, MapPinned, Trees } from "lucide-react";
import { GuideDirectory } from "@/components/guide-directory";
import { JsonLd } from "@/components/json-ld";
import {
  PageHeader,
  PageShell,
  PageTitleAccent,
  SectionHeader,
} from "@/components/page-layout";
import {
  areaProfiles,
  areasBySlug,
  getPlace,
  locationPagePath,
  placeProfiles,
  speciesLocationPages,
} from "@/data/location-pages";
import { getSpecies } from "@/data/species";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE } from "@/src/lib/seo";
import { speciesTerritoryGuides } from "@/src/lib/species-territory-guides";

export const metadata: Metadata = {
  title: "Guies locals de bolets per territori",
  description:
    "Explora guies de bolets per comarca, massís, indret i espècie, amb hàbitat i temporada sense publicar punts sensibles.",
  alternates: { canonical: "/guies" },
  openGraph: {
    url: "/guies",
    title: "Guies locals de bolets de Catalunya",
    description:
      "Comarques, massissos i indrets documentats amb context ecològic i estacional.",
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
};

export default function GuidesPage() {
  const directoryItems = speciesLocationPages.flatMap((page) => {
    const species = getSpecies(page.speciesId);
    const area = areasBySlug[page.areaSlug];
    const place = getPlace(page.areaSlug, page.placeSlug);
    if (!species || !area || !place) return [];

    return [{
      href: locationPagePath(page),
      title: page.titlePhrase,
      introduction: page.habitatNote,
      speciesId: species.speciesId,
      speciesName: species.identity.commonName,
      scientificName: species.identity.scientificName,
      areaSlug: area.slug,
      areaName: area.name,
      areaType: area.typeLabel,
      placeName: place.name,
      placeType: place.typeLabel,
      habitats: species.ecologicalConfig.habitat.forestTypes,
      altitudeLabel: `${species.ecologicalConfig.habitat.altitude[0]}–${species.ecologicalConfig.habitat.altitude[1]} m`,
    }];
  });

  return (
    <PageShell className="guides-page">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Guies locals de bolets de Catalunya",
          url: absoluteUrl("/guies"),
          inLanguage: "ca",
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: speciesLocationPages.length + speciesTerritoryGuides.length,
            itemListElement: [
              ...speciesTerritoryGuides.map((guide, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: guide.title,
                url: absoluteUrl(guide.path),
              })),
              ...speciesLocationPages.map((page, index) => ({
                "@type": "ListItem",
                position: index + speciesTerritoryGuides.length + 1,
                name: page.titlePhrase,
                url: absoluteUrl(locationPagePath(page)),
              })),
            ],
          },
        }}
      />
      <PageHeader
        eyebrow={<><BookOpenText size={15} /> Guies locals publicades</>}
        title={<>Guies de bolets<br /><PageTitleAccent>per territori.</PageTitleAccent></>}
        description="Busca una espècie i un indret. Cada guia explica quin bosc hi encaixa, quan és temporada i què cal tenir en compte, sense publicar punts de recol·lecció."
        tone="forest"
      />

      <dl className="guides-summary" aria-label="Abast de les guies locals">
        <div><dt>Territoris</dt><dd>{areaProfiles.length}</dd></div>
        <div><dt>Indrets</dt><dd>{placeProfiles.length}</dd></div>
        <div><dt>Guies locals d’espècie</dt><dd>{speciesLocationPages.length}</dd></div>
      </dl>

      <Link href="/zones" className="location-species-feature location-current-feature guides-zones-feature">
        <span><MapPinned size={18} /> Directori territorial</span>
        <div><h2>Vols comparar territoris?</h2><p>Les zones agrupen massissos, paratges, comarques i regions amb les condicions actuals disponibles.</p></div>
        <strong>Comparar zones <ArrowUpRight size={17} /></strong>
      </Link>

      <section
        className="guides-species-module"
        aria-labelledby="guides-species-module-title"
        data-species-guide-list
      >
        <p className="guides-species-module-label" id="guides-species-module-title">
          <Trees size={18} aria-hidden="true" /> Guies d’espècie i territori
        </p>
        <div className="guides-species-module-list">
          {speciesTerritoryGuides.map((guide) => (
            <Link href={guide.path} className="guides-species-row" key={guide.path}>
              <div><h2>{guide.title}</h2><p>{guide.description}</p></div>
              <strong>Obrir la guia <ArrowUpRight size={17} aria-hidden="true" /></strong>
            </Link>
          ))}
        </div>
      </section>

      <section className="guides-directory" aria-labelledby="guides-directory-title">
        <SectionHeader
          meta={`${speciesLocationPages.length} guies disponibles`}
          title="Troba la guia concreta"
          titleId="guides-directory-title"
          description="Filtra per espècie, territori o hàbitat per arribar directament a la guia que necessites."
        />
        <GuideDirectory items={directoryItems} />
      </section>

      <Link href="/preguntes-frequents-bolets" className="location-species-feature location-current-feature">
        <span><BookOpenText size={18} aria-hidden="true" /> Abans de sortir</span>
        <div><h2>Preguntes sobre anar a buscar bolets</h2><p>Temporada, pluja, boscos, identificació i permisos: respostes curtes amb guies per aprofundir-hi.</p></div>
        <strong>Consultar les preguntes <ArrowUpRight size={17} aria-hidden="true" /></strong>
      </Link>

      <aside className="location-safety-note">
        <Trees size={22} />
        <div><strong>Hàbitat potencial, no una coordenada.</strong><p>Les guies no confirmen presència actual ni substitueixen una identificació experta. Abans de sortir, <Link href="/normativa-bolets">comprova els permisos i l’accés al bosc</Link>.</p></div>
      </aside>
    </PageShell>
  );
}
