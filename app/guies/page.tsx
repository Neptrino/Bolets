import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BookOpenText, MapPinned, Trees } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import {
  PageHeader,
  PageShell,
  PageTitleAccent,
  SectionHeader,
} from "@/components/page-layout";
import {
  areaPath,
  areaProfiles,
  placeProfiles,
  placesForArea,
  speciesLocationPages,
} from "@/data/location-pages";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE } from "@/src/lib/seo";
import { speciesTerritoryGuides } from "@/src/lib/species-territory-guides";

export const metadata: Metadata = {
  title: "Guies locals de bolets per territori",
  description:
    "Exploreu guies locals de bolets per comarca, massís, indret i espècie, amb hàbitat, temporada i fonts territorials, sense publicar punts sensibles.",
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
            numberOfItems: areaProfiles.length + speciesTerritoryGuides.length,
            itemListElement: [
              ...speciesTerritoryGuides.map((guide, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: guide.title,
                url: absoluteUrl(guide.path),
              })),
              ...areaProfiles.map((area, index) => ({
                "@type": "ListItem",
                position: index + speciesTerritoryGuides.length + 1,
                name: `Bolets ${area.prepositionalName}`,
                url: absoluteUrl(areaPath(area)),
              })),
            ],
          },
        }}
      />
      <PageHeader
        eyebrow={<><BookOpenText size={15} /> Guies locals publicades</>}
        title={<>Guies de bolets<br /><PageTitleAccent>per territori.</PageTitleAccent></>}
        description="Baixa de la regió general a comarques, massissos i indrets documentats. Cada guia connecta espècie, hàbitat, temporada i fonts territorials sense publicar punts de recol·lecció."
        tone="forest"
      />

      <dl className="guides-summary" aria-label="Abast de les guies locals">
        <div><dt>Territoris</dt><dd>{areaProfiles.length}</dd></div>
        <div><dt>Indrets</dt><dd>{placeProfiles.length}</dd></div>
        <div><dt>Guies locals d’espècie</dt><dd>{speciesLocationPages.length}</dd></div>
      </dl>

      <Link href="/zones" className="location-species-feature location-current-feature guides-zones-feature">
        <span><MapPinned size={18} /> Directori territorial</span>
        <div><h2>Comenceu per les nou zones generals</h2><p>Compareu regions, perfils compatibles i condicions actuals abans de baixar al detall local.</p></div>
        <strong>Veure les zones <ArrowUpRight size={17} /></strong>
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
          meta="Comarques i massissos"
          title="Guies locals publicades"
          titleId="guides-directory-title"
          description="Cada territori reuneix indrets amb context propi i només les espècies que tenen una relació ecològica documentable."
        />
        <div className="location-place-grid" data-local-guide-list>
          {areaProfiles.map((area) => {
            const places = placesForArea(area.slug);
            const pages = speciesLocationPages.filter((page) => page.areaSlug === area.slug);
            return (
              <article className="location-place-card" key={area.slug}>
                <span>{area.typeLabel} · {places.length} {places.length === 1 ? "indret" : "indrets"}</span>
                <h2>{area.name}</h2>
                <p>{area.description}</p>
                <Link href={areaPath(area)} className="text-link">
                  Veure {pages.length === 1 ? "la guia" : `${pages.length} guies`} <ArrowUpRight size={16} />
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <aside className="location-safety-note">
        <Trees size={22} />
        <div><strong>Hàbitat potencial, no una coordenada.</strong><p>Les guies descriuen compatibilitat ecològica agregada. No demostren presència actual ni substitueixen una identificació experta.</p></div>
      </aside>
    </PageShell>
  );
}
