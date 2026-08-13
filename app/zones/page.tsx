import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, MapPinned, Trees } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import {
  areaPath,
  areaProfiles,
  placesForArea,
  speciesLocationPages,
} from "@/data/location-pages";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE } from "@/src/lib/seo";

export const metadata: Metadata = {
  title: "On buscar bolets a Catalunya: zones i hàbitats",
  description:
    "Guia de zones de bolets de Catalunya amb hàbitat, temporada i condicions ecològiques per territori, sense publicar punts de recol·lecció.",
  alternates: { canonical: "/zones" },
  openGraph: {
    url: "/zones",
    title: "Bolets per zones de Catalunya",
    description: "Guies locals de bolets per espècie i territori, sense revelar localitzacions sensibles.",
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
};

export default function ZonesPage() {
  return (
    <PageShell>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Bolets per zones de Catalunya",
          url: absoluteUrl("/zones"),
          inLanguage: "ca",
          mainEntity: {
            "@type": "ItemList",
            itemListElement: areaProfiles.map((area, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: `Bolets ${area.prepositionalName}`,
              url: absoluteUrl(areaPath(area)),
            })),
          },
        }}
      />
      <PageHeader
        eyebrow={<><MapPinned size={15} /> Lectures locals</>}
        title={<>Bolets, territori<br /><PageTitleAccent>i temporada.</PageTitleAccent></>}
        description="Si busques on trobar bolets a Catalunya, comença pel territori i l’hàbitat: aquestes guies expliquen quines condicions necessita cada espècie, sense publicar punts de recol·lecció."
        tone="forest"
      />
      <Link href="/zones/rovellons" className="location-species-feature">
        <span><Trees size={18} /> Guia d’espècie i territori</span>
        <div><h2>On trobar rovellons a Catalunya</h2><p>Hàbitat, temporada, condicions actuals i diferències entre rovelló i pinetell.</p></div>
        <strong>Obrir la guia <ArrowUpRight size={17} /></strong>
      </Link>
      <div className="location-place-grid">
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
      <aside className="location-safety-note">
        <Trees size={22} />
        <div><strong>Hàbitat potencial, no una coordenada.</strong><p>Les guies descriuen compatibilitat ecològica agregada. No demostren presència actual ni substitueixen una identificació experta.</p></div>
      </aside>
    </PageShell>
  );
}
