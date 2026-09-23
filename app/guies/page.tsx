import "@/app/styles/territorial-guides.css";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BookOpenText, Languages, Search, Snowflake, Trees } from "lucide-react";
import { GuideDirectory } from "@/components/guide-directory";
import { JsonLd } from "@/components/json-ld";
import { MushroomSpecimen } from "@/components/mushroom-game-illustrations";
import {
  PageHeader,
  PageShell,
  PageTitleAccent,
  SectionHeader,
} from "@/components/page-layout";
import {
  areaPath,
  areaProfiles,
  areasBySlug,
  getPlace,
  locationPagePath,
  PIRINEU_AREA_SLUGS,
  placeProfiles,
  speciesLocationPages,
} from "@/data/location-pages";
import { getSpecies } from "@/data/species";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE } from "@/src/lib/seo";
import { areaMapPath, hubRegionMapPath, PIRINEU_MAP_SLUG } from "@/src/lib/place-map";
import { speciesDrawing, speciesIllustration } from "@/src/lib/species-illustrations";
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

const catalanCollator = new Intl.Collator("ca", { sensitivity: "base" });

/** Species list forest types with a capital only on the first entry; the filter shows them all the same way. */
function sentenceCase(value: string) {
  const lower = value.toLocaleLowerCase("ca");
  return lower.charAt(0).toLocaleUpperCase("ca") + lower.slice(1);
}

function guideCountForArea(areaSlug: string) {
  return speciesLocationPages.filter((page) => page.areaSlug === areaSlug).length;
}

function placeCountForArea(areaSlug: string) {
  return placeProfiles.filter((place) => place.areaSlug === areaSlug).length;
}

/**
 * Species with a guide in the area, in guide order. Species that share a game
 * drawing (rovelló and pinetell, the ceps) collapse into one icon unless each
 * has its own editorial drawing; the tooltip names every species behind an icon.
 */
function speciesForArea(areaSlugs: string | readonly string[]) {
  const slugs = new Set(typeof areaSlugs === "string" ? [areaSlugs] : areaSlugs);
  const species = [...new Set(speciesLocationPages.filter((page) => slugs.has(page.areaSlug)).map((page) => page.speciesId))]
    .flatMap((speciesId) => getSpecies(speciesId) ?? []);
  const icons = new Map<string, { drawing?: string; illustration: ReturnType<typeof speciesIllustration>; label: string }>();
  for (const entry of species) {
    const drawing = speciesDrawing(entry.speciesId)?.src;
    const illustration = speciesIllustration(entry.speciesId);
    const key = drawing ? entry.speciesId : illustration ?? `initial:${entry.identity.commonName.charAt(0).toLocaleLowerCase("ca")}`;
    const existing = icons.get(key);
    icons.set(key, { drawing, illustration, label: existing ? `${existing.label} · ${entry.identity.commonName}` : entry.identity.commonName });
  }
  return { names: species.map((entry) => entry.identity.commonName), icons: [...icons.entries()].map(([key, icon]) => ({ key, ...icon })) };
}

export default function GuidesPage() {
  const pirineuSpecies = speciesForArea(PIRINEU_AREA_SLUGS);
  const pirineuGuideCount = PIRINEU_AREA_SLUGS.reduce((total, slug) => total + guideCountForArea(slug), 0);
  const territories = [...areaProfiles].sort((left, right) =>
    catalanCollator.compare(left.name, right.name),
  );
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
      habitats: species.ecologicalConfig.habitat.forestTypes.map(sentenceCase),
      altitudeLabel: `${species.ecologicalConfig.habitat.altitude[0]}–${species.ecologicalConfig.habitat.altitude[1]} m`,
    }];
  }).sort((left, right) =>
    catalanCollator.compare(left.areaName, right.areaName)
    || catalanCollator.compare(left.placeName, right.placeName)
    || catalanCollator.compare(left.speciesName, right.speciesName),
  );

  return (
    <PageShell className="guides-page">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
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
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Inici", item: absoluteUrl() },
                { "@type": "ListItem", position: 2, name: "Guies", item: absoluteUrl("/guies") },
              ],
            },
          ],
        }}
      />
      <PageHeader
        eyebrow={<><BookOpenText size={15} /> Guies locals publicades</>}
        title={<>Guies de bolets<br /><PageTitleAccent>per territori.</PageTitleAccent></>}
        description="Busca una espècie i un indret. Cada guia explica quin bosc hi encaixa, quan és temporada i què cal tenir en compte, sense publicar punts de recol·lecció."
        actions={<a href="#cerca-una-guia" className="button"><Search size={17} aria-hidden="true" /> Cerca una guia</a>}
        tone="forest"
      />

      <section className="guides-territories" aria-labelledby="guides-territories-title">
        <SectionHeader
          meta={`${territories.length} territoris · ${placeProfiles.length} indrets · ${speciesLocationPages.length} guies locals`}
          title="Guies per territori"
          titleId="guides-territories-title"
          description="Cada comarca o massís agrupa els seus indrets documentats i les guies d’espècie que hi encaixen."
          actions={<Link href="/bolets-avui" className="text-link">Condicions d’avui per zona <ArrowUpRight size={16} aria-hidden="true" /></Link>}
          size="compact"
        />
        <ul className="guides-territory-list" data-guides-territory-list>
          <li>
            <Link href="/zones/pirineu">
              <span className="guides-territory-map">
                <Image src={hubRegionMapPath(PIRINEU_MAP_SLUG)} alt="" width={650} height={812} unoptimized sizes="400px" />
                <span className="guides-territory-species" role="img" aria-label={`Espècies: ${pirineuSpecies.names.join(", ")}`}>
                  {pirineuSpecies.icons.slice(0, 4).map(({ key, drawing, illustration, label }) => (
                    <span key={key} className="guides-territory-species-icon" data-tooltip={label}>
                      {drawing
                        ? <Image src={drawing} alt="" width={64} height={64} unoptimized />
                        : illustration ? <MushroomSpecimen kind={illustration} /> : <i>{label.charAt(0)}</i>}
                    </span>
                  ))}
                </span>
              </span>
              <span className="guides-territory-copy">
                <span className="guides-territory-type">Regió</span>
                <strong>Pirineu</strong>
                <small>{PIRINEU_AREA_SLUGS.length} comarques · {pirineuGuideCount} guies</small>
                <ArrowUpRight size={16} aria-hidden="true" />
              </span>
            </Link>
          </li>
          {territories.map((area) => {
            const guideCount = guideCountForArea(area.slug);
            const placeCount = placeCountForArea(area.slug);
            const areaSpecies = speciesForArea(area.slug);
            return (
              <li key={area.slug}>
                <Link href={areaPath(area)}>
                  <span className="guides-territory-map">
                    <Image src={areaMapPath(area)} alt="" width={650} height={812} unoptimized sizes="400px" />
                    <span className="guides-territory-species" role="img" aria-label={`Espècies: ${areaSpecies.names.join(", ")}`}>
                      {areaSpecies.icons.map(({ key, drawing, illustration, label }) => (
                        <span key={key} className="guides-territory-species-icon" data-tooltip={label}>
                          {drawing
                            ? <Image src={drawing} alt="" width={64} height={64} unoptimized />
                            : illustration ? <MushroomSpecimen kind={illustration} /> : <i>{label.charAt(0)}</i>}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span className="guides-territory-copy">
                    <span className="guides-territory-type">{area.typeLabel}</span>
                    <strong>{area.name}</strong>
                    <small>{guideCount} {guideCount === 1 ? "guia" : "guies"} · {placeCount} {placeCount === 1 ? "indret" : "indrets"}</small>
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

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

      <section className="guides-directory" id="cerca-una-guia" aria-labelledby="guides-directory-title">
        <SectionHeader
          meta={`${speciesLocationPages.length} guies disponibles`}
          title="Troba la guia concreta"
          titleId="guides-directory-title"
          description="Filtra per espècie, territori o hàbitat per arribar directament a la guia que necessites."
        />
        <GuideDirectory items={directoryItems} />
      </section>

      <section className="guides-reading" aria-labelledby="guides-reading-title">
        <SectionHeader
          meta="Abans de sortir"
          title="Lectura complementària"
          titleId="guides-reading-title"
          size="compact"
        />
        <ul className="guides-reading-links">
          <li>
            <Link href="/preguntes-frequents-bolets">
              <BookOpenText size={20} aria-hidden="true" />
              <span><strong>Preguntes sobre anar a buscar bolets</strong><small>Temporada, pluja, boscos, identificació i permisos.</small></span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </li>
          <li>
            <Link href="/conservar-bolets">
              <Snowflake size={20} aria-hidden="true" />
              <span><strong>Com conservar i congelar bolets</strong><small>Escaldat, cocció, porcions i descongelació segura.</small></span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </li>
          <li>
            <Link href="/noms-de-bolets-catala-castella">
              <Languages size={20} aria-hidden="true" />
              <span><strong>Noms de bolets en català i castellà</strong><small>Noms populars, variants i noms científics.</small></span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </li>
        </ul>
      </section>

    </PageShell>
  );
}
