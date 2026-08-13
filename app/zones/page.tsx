import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpenText, Gauge, Map as MapIcon, MapPinned, Trees } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import {
  PageHeader,
  PageShell,
  PageTitleAccent,
  SectionHeader,
} from "@/components/page-layout";
import { speciesAlphabetical } from "@/data/species";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE, speciesPath } from "@/src/lib/seo";
import { predictionZoneDirectory } from "@/src/lib/zone-directory";

const predictionZones = predictionZoneDirectory();

function habitatDisplayName(habitat: string) {
  return habitat.charAt(0).toLocaleUpperCase("ca") + habitat.slice(1);
}

export const metadata: Metadata = {
  title: "Zones de bolets de Catalunya: 9 regions",
  description:
    "Explora les nou regions generals de predicció de bolets de Catalunya, amb espècies destacades i accés directe al mapa de cada zona.",
  alternates: { canonical: "/zones" },
  openGraph: {
    url: "/zones",
    title: "9 zones de bolets de Catalunya",
    description: "Regions generals de predicció, perfils compatibles i accés al mapa, sense revelar localitzacions sensibles.",
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
};

export default function ZonesPage() {
  const habitatCounts = new Map<string, number>();
  for (const species of speciesAlphabetical) {
    for (const habitat of species.ecologicalConfig.habitat.forestTypes) {
      habitatCounts.set(habitat, (habitatCounts.get(habitat) ?? 0) + 1);
    }
  }
  const habitats = [...habitatCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6);
  const largestHabitatCount = habitats[0]?.[1] ?? 1;

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
            numberOfItems: predictionZones.length,
            itemListElement: predictionZones.map((zone, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: `Bolets a ${zone.label}`,
              description: zone.species.map((species) => species.identity.commonName).join(", "),
              url: absoluteUrl(`/map?species=${zone.species[0]?.speciesId}&region=${zone.regionId}`),
            })),
          },
        }}
      />
      <PageHeader
        eyebrow={<><MapPinned size={15} /> 9 regions de predicció</>}
        title={<>Zones de bolets<br /><PageTitleAccent>de Catalunya.</PageTitleAccent></>}
        description="Una lectura territorial comuna per al mapa i les condicions d’avui. Cada zona agrupa perfils ecològicament compatibles, sense convertir el bosc en una llista de coordenades."
        tone="forest"
      />
      <Link href="/bolets-avui" className="location-species-feature location-current-feature">
        <span><Gauge size={18} /> Predicció territorial</span>
        <div><h2>Quines són les millors combinacions avui?</h2><p>Compara el top 10 entre les candidates estacionals més rellevants de cada zona, sense revelar punts sensibles.</p></div>
        <strong>Comparar 9 zones <ArrowUpRight size={17} /></strong>
      </Link>
      <section className="prediction-zone-directory" aria-labelledby="prediction-zone-directory-title">
        <SectionHeader
          meta="9 regions generals"
          title="Zones de predicció"
          titleId="prediction-zone-directory-title"
          description="Són les mateixes zones que fem servir al mapa i a la lectura d’avui. A cada una hi destaquem cinc perfils comestibles coneguts i indiquem quants perfils actuals hi són compatibles."
        />
        <ol className="prediction-zone-grid" data-prediction-zone-list>
          {predictionZones.map((zone, index) => {
            const featuredSpecies = zone.species[0];
            return (
              <li className="prediction-zone-card" data-region={zone.regionId} key={zone.regionId}>
                <header>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <h3>{zone.label}</h3>
                </header>
                <p className="prediction-zone-count">
                  <strong>{zone.species.length} destacades</strong> de {zone.compatibleSpeciesCount} perfils compatibles
                </p>
                <div className="prediction-zone-species">
                  <span>Espècies destacades</span>
                  <ul>
                    {zone.species.map((species) => (
                      <li key={species.speciesId}>
                        <Link href={speciesPath(species)}>{species.identity.commonName}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
                {featuredSpecies ? (
                  <Link
                    href={`/map?species=${featuredSpecies.speciesId}&region=${zone.regionId}`}
                    className="prediction-zone-map"
                  >
                    Veure la zona al mapa <MapIcon size={16} />
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ol>
        <p className="prediction-zone-note">Les destacades prioritzen interès de cerca i rellevància editorial dins dels perfils ecològicament compatibles. No són un recompte d’abundància i no confirmen presència ni fructificació actual.</p>
      </section>
      <section className="catalogue-habitats" aria-labelledby="zone-habitats-title">
        <header>
          <p className="eyebrow"><Trees size={15} /> Hàbitats</p>
          <h2 id="zone-habitats-title">Els boscos darrere de les zones</h2>
          <p>Els ambients més representats a les fitxes. Cada zona combina diversos hàbitats i una mateixa espècie pot aparèixer en més d’un.</p>
        </header>
        <ol>
          {habitats.map(([habitat, count], index) => (
            <li
              key={habitat}
              style={{ "--habitat-strength": `${Math.round((count / largestHabitatCount) * 100)}%` } as CSSProperties}
            >
              <span className="catalogue-habitat-rank" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <span className="catalogue-habitat-name">
                <span>{habitatDisplayName(habitat)}</span>
                <i aria-hidden="true" />
              </span>
              <span className="catalogue-habitat-count"><strong>{count}</strong><small>espècies</small></span>
            </li>
          ))}
        </ol>
      </section>
      <aside className="location-safety-note">
        <Trees size={22} />
        <div><strong>Regions generals, no una coordenada.</strong><p>Aquest directori organitza la lectura territorial del model. Les condicions ambientals i l’hàbitat decideixen si una combinació concreta es pot publicar al mapa.</p></div>
      </aside>
      <Link href="/guies" className="location-species-feature zones-guides-feature">
        <span><BookOpenText size={18} /> Lectura local</span>
        <div><h2>Busques una comarca o un massís?</h2><p>Les guies locals baixen de les nou regions generals a territoris documentats, amb context d’hàbitat, temporada i fonts.</p></div>
        <strong>Veure les guies <ArrowUpRight size={17} /></strong>
      </Link>
    </PageShell>
  );
}
