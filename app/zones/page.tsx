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
import {
  areaPath,
  areaProfiles,
  locationPagePath,
  placePath,
  placeProfiles,
  speciesLocationPages,
  type AreaProfile,
} from "@/data/location-pages";
import { speciesTerritoryGuides } from "@/src/lib/species-territory-guides";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE } from "@/src/lib/seo";
import { predictionZoneDirectory } from "@/src/lib/zone-directory";

const predictionZones = predictionZoneDirectory();
const massisAreas = areaProfiles.filter((area) => area.typeLabel === "massís");
const comarcaAreas = areaProfiles.filter((area) => area.typeLabel === "comarca");
// Paratges surfaced next to the massís cards: only those buried inside a
// comarca hub — a paratge whose parent is a massís already shows in its card.
const paratgePlaces = placeProfiles.filter((place) =>
  place.typeLabel === "paratge" &&
  areaProfiles.some((area) => area.slug === place.areaSlug && area.typeLabel === "comarca"),
);

function habitatDisplayName(habitat: string) {
  return habitat.charAt(0).toLocaleUpperCase("ca") + habitat.slice(1);
}

function guideCountForArea(areaSlug: string) {
  return speciesLocationPages.filter((page) => page.areaSlug === areaSlug).length;
}

function placesSummary(areaSlug: string) {
  return placeProfiles.filter((place) => place.areaSlug === areaSlug);
}

function guidesForArea(areaSlug: string) {
  return speciesLocationPages.filter((page) => page.areaSlug === areaSlug);
}

export const metadata: Metadata = {
  title: "Zones de bolets de Catalunya: massissos i comarques",
  description:
    "Massissos, paratges i comarques de Catalunya amb guies locals i accés al mapa de condicions.",
  alternates: { canonical: "/zones" },
  openGraph: {
    url: "/zones",
    title: "Zones de bolets de Catalunya",
    description: "Massissos, paratges i comarques amb guies locals i accés al mapa de condicions, sense revelar localitzacions sensibles.",
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
};

function AreaCardGrid({ areas, listLabel }: { areas: AreaProfile[]; listLabel: string }) {
  return (
    <ol className="prediction-zone-grid" aria-label={listLabel}>
      {areas.map((area, index) => {
        const places = placesSummary(area.slug);
        const guideCount = guideCountForArea(area.slug);
        return (
          <li className="prediction-zone-card" key={area.slug}>
            <header>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{area.name}</h3>
            </header>
            <p className="prediction-zone-count">
              <strong>{guideCount} guies locals</strong> · {places.length} {places.length === 1 ? "indret documentat" : "indrets documentats"}
            </p>
            <div className="prediction-zone-species">
              <ul aria-label="Guies locals">
                {guidesForArea(area.slug).map((page) => (
                  <li key={`${page.placeSlug}/${page.speciesSlug}`}>
                    <Link href={locationPagePath(page)}>{page.titlePhrase}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <Link href={areaPath(area)} className="prediction-zone-map">
              Bolets {area.prepositionalName} <ArrowUpRight size={16} />
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

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
          name: "Zones de bolets de Catalunya",
          url: absoluteUrl("/zones"),
          inLanguage: "ca",
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: areaProfiles.length,
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
        eyebrow={<><MapPinned size={15} /> Massissos, comarques i regions</>}
        title={<>Zones de bolets<br /><PageTitleAccent>de Catalunya.</PageTitleAccent></>}
        description="Explora massissos, paratges i comarques amb guies d’hàbitat i temporada, o compara les condicions actuals de les regions del mapa."
        tone="forest"
      />
      <Link href="/bolets-avui" className="location-species-feature location-current-feature">
        <span><Gauge size={18} /> Condicions actuals</span>
        <div><h2>Quines zones tenen millors condicions avui?</h2><p>Compara massissos, comarques i regions sense revelar punts sensibles.</p></div>
        <strong>Veure les condicions d’avui <ArrowUpRight size={17} /></strong>
      </Link>

      <section
        className="guides-species-module"
        aria-labelledby="species-guides-title"
        data-species-guide-list
      >
        <p className="guides-species-module-label" id="species-guides-title">
          <BookOpenText size={18} aria-hidden="true" /> Guies per espècie
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

      <section className="prediction-zone-directory" aria-labelledby="massis-directory-title">
        <SectionHeader
          meta={`${massisAreas.length} massissos · ${paratgePlaces.length} paratges`}
          title="Massissos i paratges"
          titleId="massis-directory-title"
          description="Cada territori agrupa les seves guies d’hàbitat i temporada per espècie."
        />
        <ol className="prediction-zone-grid" aria-label="Massissos i paratges amb guies locals">
          {massisAreas.map((area, index) => {
            const places = placesSummary(area.slug);
            return (
              <li className="prediction-zone-card" key={area.slug}>
                <header>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <h3>{area.name}</h3>
                </header>
                <p className="prediction-zone-count">
                  <strong>{guideCountForArea(area.slug)} guies locals</strong> · {places.length} {places.length === 1 ? "indret documentat" : "indrets documentats"}
                </p>
                <div className="prediction-zone-species">
                  <ul aria-label="Guies locals">
                    {guidesForArea(area.slug).map((page) => (
                      <li key={`${page.placeSlug}/${page.speciesSlug}`}>
                        <Link href={locationPagePath(page)}>{page.titlePhrase}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link href={areaPath(area)} className="prediction-zone-map">
                  Bolets {area.prepositionalName} <ArrowUpRight size={16} />
                </Link>
              </li>
            );
          })}
          {paratgePlaces.map((place, index) => {
            const parentArea = areaProfiles.find((area) => area.slug === place.areaSlug)!;
            const guides = speciesLocationPages.filter(
              (page) => page.areaSlug === place.areaSlug && page.placeSlug === place.slug,
            );
            return (
              <li className="prediction-zone-card" key={`${place.areaSlug}/${place.slug}`}>
                <header>
                  <span>{String(massisAreas.length + index + 1).padStart(2, "0")}</span>
                  <h3>{place.name}</h3>
                </header>
                <p className="prediction-zone-count">
                  <strong>{guides.length} guies locals</strong> · paratge {parentArea.prepositionalName}
                </p>
                <div className="prediction-zone-species">
                  <ul aria-label="Guies locals">
                    {guides.map((page) => (
                      <li key={page.speciesSlug}>
                        <Link href={locationPagePath(page)}>{page.titlePhrase}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link href={placePath(place)} className="prediction-zone-map">
                  Bolets {place.prepositionalName} <ArrowUpRight size={16} />
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="prediction-zone-directory" aria-labelledby="comarca-directory-title">
        <SectionHeader
          meta={`${comarcaAreas.length} comarques boletaires`}
          title="Comarques boletaires"
          titleId="comarca-directory-title"
          description="Les comarques amb més tradició i cerca boletaire, amb els seus indrets documentats. Només hi publiquem comarques amb contingut territorial propi."
        />
        <AreaCardGrid areas={comarcaAreas} listLabel="Comarques amb guies locals" />
      </section>

      <section className="prediction-zone-directory" aria-labelledby="prediction-zone-directory-title">
        <SectionHeader
          meta={`${predictionZones.length} regions generals`}
          title="Regions àmplies del mapa"
          titleId="prediction-zone-directory-title"
          description="Serveixen per comparar grans àrees. Per a una lectura més local, consulta els massissos i les comarques."
        />
        <ol className="region-map-link-list" data-prediction-zone-list>
          {predictionZones.map((zone) => {
            const featuredSpecies = zone.species[0];
            return (
              <li data-region={zone.regionId} key={zone.regionId}>
                <Link
                  href={featuredSpecies ? `/map?species=${featuredSpecies.speciesId}&region=${zone.regionId}` : `/map?region=${zone.regionId}`}
                  aria-label={`Veure ${zone.label} al mapa`}
                >
                  <span className="region-map-link-name">{zone.label}</span>
                  <span className="region-map-link-count">{zone.compatibleSpeciesCount} espècies</span>
                  <MapIcon size={15} aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ol>
        <p className="prediction-zone-note">Una bona puntuació compara condicions; no confirma presència ni abundància.</p>
      </section>

      <section className="catalogue-habitats" aria-labelledby="zone-habitats-title">
        <header>
          <p className="eyebrow"><Trees size={15} /> Hàbitats</p>
          <h2 id="zone-habitats-title">Els boscos darrere de les zones</h2>
          <p>Els ambients més representats a les fitxes. Cada zona combina diversos hàbitats i una mateixa espècie pot aparèixer en més d’un hàbitat.</p>
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
        <div><strong>Territoris, no coordenades.</strong><p>Les pàgines comparen massissos, comarques i regions sense revelar punts de recol·lecció.</p></div>
      </aside>
      <Link href="/guies" className="location-species-feature zones-guides-feature">
        <span><BookOpenText size={18} /> Lectura local</span>
        <div><h2>Totes les guies locals</h2><p>El directori complet de guies per indret i espècie, amb context d’hàbitat, temporada i fonts territorials.</p></div>
        <strong>Veure les guies <ArrowUpRight size={17} /></strong>
      </Link>
    </PageShell>
  );
}
