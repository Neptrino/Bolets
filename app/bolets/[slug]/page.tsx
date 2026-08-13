import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ChefHat,
  CircleDot,
  CircleHelp,
  Clock3,
  CloudRain,
  Compass,
  Layers3,
  Map,
  MapPinned,
  Mountain,
  MoveVertical,
  Palette,
  RefreshCw,
  Rows3,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Snowflake,
  Sprout,
  ThermometerSun,
  Trees,
  Utensils,
  Wind,
} from "lucide-react";
import { CulinaryRating } from "@/components/culinary-rating";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { EdibilityBadge } from "@/components/edibility-badge";
import { JsonLd } from "@/components/json-ld";
import { LazyHabitatMap } from "@/components/lazy-habitat-map";
import { SeasonCalendar } from "@/components/season-calendar";
import { SpeciesGallery } from "@/components/species-gallery";
import {
  getSpecies,
  getSpeciesByScientificName,
  speciesProfiles,
} from "@/data/species";
import { editorialArticleFields, officialSafetySource } from "@/data/editorial";
import { isRegionId, regionLabels } from "@/data/regions";
import {
  locationPagePath,
  locationPagesForSpecies,
  getPlace,
} from "@/data/location-pages";
import {
  SITE_URL,
  speciesDescription,
  speciesImage,
  speciesPath,
} from "@/src/lib/seo";
import { territoryGuideForSpecies } from "@/src/lib/species-territory-guides";
import type { Month, RegionId, SeasonalActivity } from "@/src/lib/types";

const sections = ["Identificació", "Cuina", "Ecologia", "Distribució"];
const catalanList = new Intl.ListFormat("ca-ES", {
  style: "long",
  type: "conjunction",
});

const monthLabels: Record<Month, string> = {
  gen: "gen.",
  feb: "febr.",
  mar: "març",
  abr: "abr.",
  mai: "maig",
  jun: "juny",
  jul: "jul.",
  ago: "ag.",
  set: "set.",
  oct: "oct.",
  nov: "nov.",
  des: "des.",
};

function seasonSummary(seasonality: Record<Month, SeasonalActivity>) {
  const entries = Object.entries(seasonality) as [Month, SeasonalActivity][];
  const peakMonths = entries.filter(([, activity]) => activity === "peak").map(([month]) => monthLabels[month]);
  if (peakMonths.length > 0) return `Pic ${catalanList.format(peakMonths)}`;

  const activeMonths = entries.filter(([, activity]) => activity !== "inactive").map(([month]) => monthLabels[month]);
  if (activeMonths.length === 0) return "Sense temporada definida";
  if (activeMonths.length === 1) return activeMonths[0];
  return `${activeMonths[0]}–${activeMonths.at(-1)}`;
}

function detailId(label: string) {
  return label.toLocaleLowerCase("ca-ES").replaceAll(" ", "-");
}

export function generateStaticParams() {
  return speciesProfiles.map((species) => ({ slug: species.speciesId }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const species = getSpecies(slug);
  if (!species) notFound();

  const path = speciesPath(species);
  const description = speciesDescription(species);
  const image = speciesImage(species);
  const title = `${species.identity.commonName} (${species.identity.scientificName})`;

  return {
    title,
    description,
    alternates: { canonical: path },
    keywords: [
      species.identity.commonName,
      species.identity.scientificName,
      ...species.identity.alternateNames,
      `hàbitat ${species.identity.commonName}`,
      `temporada ${species.identity.commonName}`,
    ],
    openGraph: {
      type: "article",
      url: path,
      title,
      description,
      images: image
        ? [{ url: image, alt: species.media[0]?.alt ?? title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function SpeciesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ region?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const species = getSpecies(slug);
  if (!species) notFound();

  const region: RegionId = isRegionId(query.region)
    ? query.region
    : species.ecologicalConfig.regions[0] ?? "prepirineus";

  const displayImages = species.media;
  const hasToxicLookalike = species.similarSpecies.some(
    (item) => item.warning || item.edibility.includes("toxic"),
  );
  const climate = species.ecologicalConfig.climate;
  const rainfall = species.ecologicalConfig.rainfall;
  const habitat = species.ecologicalConfig.habitat;
  const soil = species.ecologicalConfig.soil;
  const season = seasonSummary(species.ecologicalConfig.seasonality);
  const canonicalUrl = `${SITE_URL}${speciesPath(species)}`;
  const image = speciesImage(species);
  const localGuides = locationPagesForSpecies(species.speciesId);
  const territoryGuide = territoryGuideForSpecies(species.speciesId);

  return (
    <section className="species-page compact-species-page">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Article",
              "@id": `${canonicalUrl}#article`,
              headline: `${species.identity.commonName} (${species.identity.scientificName})`,
              description: speciesDescription(species),
              url: canonicalUrl,
              inLanguage: "ca",
              image,
              isPartOf: { "@id": `${SITE_URL}/#website` },
              publisher: { "@id": `${SITE_URL}/#organization` },
              ...editorialArticleFields(`species:${species.speciesId}`),
              about: {
                "@type": "Taxon",
                name: species.identity.scientificName,
                alternateName: [
                  species.identity.commonName,
                  ...species.identity.alternateNames,
                ],
                taxonRank: "species",
                parentTaxon: {
                  "@type": "Taxon",
                  name: species.identity.genus,
                  taxonRank: "genus",
                },
              },
            },
            {
              "@type": "BreadcrumbList",
              "@id": `${canonicalUrl}#breadcrumb`,
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Inici",
                  item: SITE_URL,
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Bolets",
                  item: `${SITE_URL}/bolets`,
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: species.identity.commonName,
                  item: canonicalUrl,
                },
              ],
            },
          ],
        }}
      />
      <div className="species-hero">
        <div className="page-width">
          <Link href="/bolets" className="back-link">
            <ArrowLeft size={15} />
            Tots els bolets
          </Link>
          <div className="species-hero-grid">
            <div className="species-hero-copy">
              <p className="eyebrow light">
                {species.identity.family} · {species.identity.genus}
              </p>
              <h1>{species.identity.commonName}</h1>
              <em>{species.identity.scientificName}</em>
              {species.identity.alternateNames.length > 0 && (
                <p className="species-alternate-names">
                  <span>Altres noms catalans:</span>{" "}
                  {species.identity.alternateNames.join(", ")}
                </p>
              )}
              <p className="species-dek">
                {species.identity.shortDescription}
              </p>
              <div className="species-hero-status">
                <CulinaryRating
                  profile={species.culinaryProfile}
                  status={species.identity.edibility}
                />
              </div>
              <div className="species-hero-facts" aria-label="Dades principals">
                <div>
                  <Trees size={16} aria-hidden="true" />
                  <span>Hàbitat</span>
                  <strong>{habitat.forestTypes[0]}</strong>
                </div>
                <div>
                  <Mountain size={16} aria-hidden="true" />
                  <span>Altitud</span>
                  <strong>{habitat.altitude[0]}–{habitat.altitude[1]} m</strong>
                </div>
                <div>
                  <CalendarDays size={16} aria-hidden="true" />
                  <span>Temporada</span>
                  <strong>{season}</strong>
                </div>
                <div>
                  <ScanLine size={16} aria-hidden="true" />
                  <span>Identificació</span>
                  <strong>{species.identity.identificationDifficulty}</strong>
                </div>
              </div>
            </div>
            <div
              className={`specimen-panel${displayImages.length > 0 ? " has-photos" : ""}`}
            >
              {displayImages.length > 0 ? (
                <SpeciesGallery
                  images={displayImages}
                  speciesName={species.identity.scientificName}
                />
              ) : (
                <>
                  <div className="specimen-drawing" aria-hidden="true">
                    <span className="drawing-cap" />
                    <span className="drawing-stem" />
                    <span className="drawing-lines" />
                  </div>
                  <p>Sense fotografia verificada</p>
                  <span>
                    Les imatges d’identificació només s’afegeixen amb llicència,
                    atribució i validació explícites.
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {(territoryGuide || localGuides.length > 0) && (
        <section className="page-width species-local-guides" aria-labelledby="local-guides-title">
          <div>
            <p className="eyebrow"><MapPinned size={15} /> Guies territorials</p>
            <h2 id="local-guides-title">Aquesta espècie, llegida des del lloc.</h2>
          </div>
          <div className="species-local-guide-links">
            {territoryGuide && (
              <Link href={territoryGuide.path} className="species-territory-hub-link">
                <span>Guia de Catalunya</span>
                <strong>{territoryGuide.profileLinkTitle}</strong>
                <ArrowUpRight size={17} />
              </Link>
            )}
            {localGuides.map((guide) => (
              <Link href={locationPagePath(guide)} key={`${guide.placeSlug}-${guide.speciesSlug}`}>
                <span>{getPlace(guide.areaSlug, guide.placeSlug)?.typeLabel}</span>
                <strong>{guide.titlePhrase}</strong>
                <ArrowUpRight size={17} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="page-width species-content">
        <aside className="species-aside" aria-label="Contingut de la fitxa">
          <p>CONTINGUT</p>
          {sections.map((section) => (
            <a href={`#${detailId(section)}`} key={section}>
              {section}
            </a>
          ))}
          <Link
            href={`/map?species=${species.speciesId}&region=${region}${species.predictionMode === "habitat_only" ? "&mode=compatibility" : ""}`}
            className="aside-map-link"
          >
            <Map size={15} />
            {species.predictionMode === "habitat_only" ? "Mapa d’hàbitat" : "Mapa actual"}
          </Link>
        </aside>

        <div className="species-main">
          <section id="identificació" className="content-section">
            <div className="section-kicker">
              <BookOpen size={17} />
              <span>01</span>
            </div>
            <div>
              <p className="eyebrow">Lectura de camp</p>
              <h2>Com reconèixer-lo</h2>
              <div className="morphology-grid">
                <article>
                  <h3><CircleDot size={16} aria-hidden="true" />Barret</h3>
                  <p>{species.morphology.cap}</p>
                </article>
                <article>
                  <h3><Rows3 size={16} aria-hidden="true" />Himeni</h3>
                  <p>{species.morphology.hymenium}</p>
                </article>
                <article>
                  <h3><MoveVertical size={16} aria-hidden="true" />Peu</h3>
                  <p>{species.morphology.stem}</p>
                </article>
                <article>
                  <h3><ScanLine size={16} aria-hidden="true" />Carn i tacte</h3>
                  <p>
                    {species.morphology.flesh} {species.morphology.texture}
                  </p>
                </article>
              </div>
              <div className="field-notes">
                <div>
                  <span className="fact-label"><Wind size={14} aria-hidden="true" />OLOR</span>
                  <p>{species.morphology.smell}</p>
                </div>
                <div>
                  <span className="fact-label"><Palette size={14} aria-hidden="true" />COLOR</span>
                  <p>{species.morphology.colour}</p>
                </div>
                <div>
                  <span className="fact-label"><RefreshCw size={14} aria-hidden="true" />VARIACIÓ</span>
                  <p>{species.morphology.variation}</p>
                </div>
              </div>
              <div className="key-features">
                <span>Trets rellevants</span>
                {species.morphology.keyFeatures.map((feature) => (
                  <b key={feature}>{feature}</b>
                ))}
              </div>

              <div className="content-subsection lookalikes-subsection">
                <p className="eyebrow">Identificació responsable</p>
                <h3 className="subsection-title">Espècies semblants</h3>
                {hasToxicLookalike && (
                  <div className="warning-callout">
                    <ShieldAlert size={18} />
                    <strong>
                      Atenció: hi ha confusions possibles amb espècies tòxiques.
                    </strong>
                    <span>
                      Verifica tots els trets abans de consumir-ne cap exemplar.
                    </span>
                  </div>
                )}
                <div className="similar-list">
                  {species.similarSpecies.map((item) => {
                    const relatedSpecies = getSpeciesByScientificName(
                      item.scientificName,
                    );
                    const cardContent = (
                      <>
                        <div>
                          <em>{item.scientificName}</em>
                          <h3>{item.commonName}</h3>
                        </div>
                        <p>{item.mainDifferences}</p>
                        <EdibilityBadge status={item.edibility} compact />
                        {relatedSpecies && (
                          <ArrowUpRight
                            className="similar-link-indicator"
                            size={17}
                            aria-hidden="true"
                          />
                        )}
                      </>
                    );

                    if (!relatedSpecies) {
                      return (
                        <article key={item.scientificName}>
                          {cardContent}
                        </article>
                      );
                    }

                    return (
                      <Link
                        key={item.scientificName}
                        href={speciesPath(relatedSpecies)}
                        className="similar-card-link"
                        aria-label={`Veure la fitxa de ${item.commonName}`}
                      >
                        <article>{cardContent}</article>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section id="cuina" className="content-section culinary-section">
            <div className="section-kicker">
              <ChefHat size={17} aria-hidden="true" />
              <span>02</span>
            </div>
            <div>
              <p className="eyebrow">Valor gastronòmic i seguretat</p>
              <h2>De la cistella a la cuina</h2>

              <div className={`culinary-rating-panel ${species.culinaryProfile.kind}`}>
                <div className="culinary-rating-score">
                  <span>VALOR CULINARI ORIENTATIU</span>
                  <CulinaryRating
                    profile={species.culinaryProfile}
                    status={species.identity.edibility}
                  />
                  <EdibilityBadge status={species.identity.edibility} />
                </div>
                <div className="culinary-rating-copy">
                  <div className="culinary-rating-title">
                    <strong>Per què aquesta nota?</strong>
                    <span className="culinary-rating-help">
                      <button
                        type="button"
                        aria-label="Com s’interpreta el valor culinari"
                        aria-describedby={`culinary-rating-help-${species.speciesId}`}
                      >
                        <CircleHelp size={16} aria-hidden="true" />
                      </button>
                      <span
                        className="culinary-rating-tooltip"
                        id={`culinary-rating-help-${species.speciesId}`}
                        role="tooltip"
                      >
                        Les estrelles valoren l’interès gastronòmic; la
                        classificació de consum indica si calen condicions de
                        seguretat.
                      </span>
                    </span>
                  </div>
                  <p>{species.culinaryProfile.ratingRationale}</p>
                </div>
              </div>

              {species.culinaryProfile.kind === "culinary" ? (
                <>
                  <div className="culinary-profile-note">
                    <p className="culinary-lede">
                      {species.culinaryProfile.summary}
                    </p>
                    <dl className="culinary-senses" aria-label="Perfil sensorial">
                      <div>
                        <dt>Sabor i aroma</dt>
                        <dd>{species.culinaryProfile.flavour}</dd>
                      </div>
                      <div>
                        <dt>Textura</dt>
                        <dd>{species.culinaryProfile.texture}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="culinary-uses">
                    <div className="culinary-mini-heading">
                      <Utensils size={16} aria-hidden="true" />
                      <h3>On funciona millor</h3>
                    </div>
                    <div className="culinary-use-list">
                      {species.culinaryProfile.bestUses.map((use) => (
                        <span key={use}>{use}</span>
                      ))}
                    </div>
                  </div>

                  <div className="culinary-methods">
                    <article>
                      <div className="culinary-mini-heading">
                        <ChefHat size={16} aria-hidden="true" />
                        <h3>Abans de menjar</h3>
                      </div>
                      <ol>
                        {species.culinaryProfile.preparation.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    </article>
                    <article>
                      <div className="culinary-mini-heading">
                        <Snowflake size={16} aria-hidden="true" />
                        <h3>Com conservar-lo</h3>
                      </div>
                      <ul>
                        {species.culinaryProfile.preservation.map((method) => (
                          <li key={method}>{method}</li>
                        ))}
                      </ul>
                    </article>
                  </div>
                </>
              ) : (
                <div className="culinary-safety-only">
                  <ShieldAlert size={24} aria-hidden="true" />
                  <div>
                    <strong>Sense usos culinaris recomanats</strong>
                    <p>{species.culinaryProfile.summary}</p>
                  </div>
                </div>
              )}

              <div className={`culinary-cautions ${species.culinaryProfile.kind}`}>
                <ShieldCheck size={19} aria-hidden="true" />
                <div>
                  <strong>{species.culinaryProfile.kind === "culinary" ? "Punts de prudència" : "Advertiment de seguretat"}</strong>
                  <ul>
                    {species.culinaryProfile.cautions.map((caution) => (
                      <li key={caution}>{caution}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {(species.culinaryProfile.kind === "safety" || hasToxicLookalike) && (
                <aside className="species-official-safety">
                  <div className="species-official-safety-title">
                    <ShieldAlert size={18} aria-hidden="true" />
                    <strong>Identificació i urgències</strong>
                  </div>
                  <p>No consumiu aquest bolet sense una identificació experta. Davant una ingestió sospitosa, consulteu la <a href={officialSafetySource.url} target="_blank" rel="noreferrer">guia de l’ACSA</a> i truqueu al <a href="tel:061">061 Salut Respon</a>.</p>
                </aside>
              )}

            </div>
          </section>

          <section id="ecologia" className="content-section ecology-section">
            <div className="section-kicker">
              <Sprout size={17} />
              <span>03</span>
            </div>
            <div>
              <p className="eyebrow">Perfil ecològic</p>
              <h2>On i quan creix</h2>
              <div className="habitat-hero">
                <div>
                  <span className="fact-label"><Trees size={15} aria-hidden="true" />HÀBITAT PRINCIPAL</span>
                  <b>{catalanList.format(habitat.forestTypes)}</b>
                </div>
                <div>
                  <span className="fact-label"><Mountain size={15} aria-hidden="true" />ALTITUD</span>
                  <strong>
                    {habitat.altitude[0]}–{habitat.altitude[1]} m
                  </strong>
                  <p>{habitat.landscapePosition}</p>
                </div>
              </div>
              <div className="tree-tags">
                {habitat.treeAssociations.map((tree) => (
                  <span key={tree}>{tree}</span>
                ))}
              </div>
              <dl className="ecology-snapshot" aria-label="Condicions ecològiques principals">
                <div>
                  <span className="ecology-snapshot-icon" aria-hidden="true"><Compass size={16} /></span>
                  <dt>Orientació</dt>
                  <dd>{habitat.aspect}</dd>
                </div>
                <div>
                  <span className="ecology-snapshot-icon" aria-hidden="true"><Layers3 size={16} /></span>
                  <dt>Reacció del sòl</dt>
                  <dd>{soil.reaction}</dd>
                </div>
                <div>
                  <span className="ecology-snapshot-icon" aria-hidden="true"><ThermometerSun size={16} /></span>
                  <dt>Temperatura</dt>
                  <dd>{climate.temperatureRange[0]}–{climate.temperatureRange[1]} °C</dd>
                </div>
              </dl>
              <SeasonCalendar species={species} />
              {species.predictionMode === "habitat_only" && (
                <div className="habitat-map-explainer">
                  <p>
                    <strong>Només compatibilitat d’hàbitat.</strong>{" "}
                    {species.predictionCaveat}
                  </p>
                </div>
              )}

              <div className="disclosure-grid ecology-detail-panels">
                <section className="species-disclosure ecology-detail-panel soil-disclosure" aria-labelledby="soil-panel-title">
                  <div className="ecology-panel-heading">
                    <span aria-hidden="true"><Layers3 size={17} /></span>
                    <div>
                      <h3 id="soil-panel-title">Sòl i relleu</h3>
                      <p>{soil.texture} · {soil.drainage.toLocaleLowerCase("ca-ES")}</p>
                    </div>
                  </div>
                  <div className="disclosure-content">
                    <div className="soil-overview">
                      <div className="soil-primary">
                        <span>Reacció del sòl</span>
                        <strong>{soil.reaction}</strong>
                      </div>
                      <dl className="soil-vitals">
                        <div>
                          <dt>Textura</dt>
                          <dd>{soil.texture}</dd>
                        </div>
                        <div>
                          <dt>Drenatge</dt>
                          <dd>{soil.drainage}</dd>
                        </div>
                        <div>
                          <dt>Humitat</dt>
                          <dd>{habitat.moisture}</dd>
                        </div>
                      </dl>
                    </div>
                    <dl className="soil-facts">
                      <div>
                        <dt>Substrat</dt>
                        <dd>{soil.substrate}</dd>
                      </div>
                      <div>
                        <dt>Ombra</dt>
                        <dd>{habitat.shade}</dd>
                      </div>
                      <div>
                        <dt>Pendent</dt>
                        <dd>{habitat.slope}</dd>
                      </div>
                      <div>
                        <dt>Matèria orgànica</dt>
                        <dd>{soil.organicMatter}</dd>
                      </div>
                      <div>
                        <dt>Retenció d’aigua</dt>
                        <dd>{soil.waterRetention}</dd>
                      </div>
                      <div>
                        <dt>Humus</dt>
                        <dd>{soil.humus}</dd>
                      </div>
                    </dl>
                    <p className="soil-evidence">
                      Nivell d’evidència ecològica:{" "}
                      {soil.evidence === "limited"
                        ? "limitat; cal contrastar-lo amb la bibliografia local."
                        : soil.evidence}
                    </p>
                  </div>
                </section>

                <section className="species-disclosure ecology-detail-panel climate-disclosure" aria-labelledby="climate-panel-title">
                  <div className="ecology-panel-heading">
                    <span aria-hidden="true"><CloudRain size={17} /></span>
                    <div>
                      <h3 id="climate-panel-title">Clima i pluja</h3>
                      <p>{climate.temperatureRange[0]}–{climate.temperatureRange[1]} °C · humitat {climate.relativeHumidity.toLocaleLowerCase("ca-ES")}</p>
                    </div>
                  </div>
                  <div className="disclosure-content">
                    <div className="climate-overview">
                      <div className="climate-temperature">
                        <span>Temperatura orientativa</span>
                        <strong>
                          {climate.temperatureRange[0]}–
                          {climate.temperatureRange[1]} °C
                        </strong>
                      </div>
                      <dl className="climate-vitals">
                        <div>
                          <dt>Humitat</dt>
                          <dd>{climate.relativeHumidity}</dd>
                        </div>
                        <div>
                          <dt>Sequera</dt>
                          <dd>{climate.drought}</dd>
                        </div>
                        <div>
                          <dt>Vent</dt>
                          <dd>{climate.wind}</dd>
                        </div>
                      </dl>
                    </div>
                    <div className="rain-response">
                      <span className="rain-response-icon" aria-hidden="true">
                        <Clock3 size={17} />
                      </span>
                      <span>
                        <small>Després de ploure</small>
                        <strong>{rainfall.fruitingDelay}</strong>
                      </span>
                    </div>
                    <dl className="rainfall-facts">
                      <div>
                        <dt>Acumulació preferida</dt>
                        <dd>{rainfall.preferredAccumulation}</dd>
                      </div>
                      <div>
                        <dt>Humitat prèvia</dt>
                        <dd>{rainfall.priorMoisture}</dd>
                      </div>
                      <div>
                        <dt>Temperatura després</dt>
                        <dd>{rainfall.temperatureAfterRain}</dd>
                      </div>
                      <div>
                        <dt>Pot interrompre’s per</dt>
                        <dd>{rainfall.interruption}</dd>
                      </div>
                    </dl>
                    <p className="rainfall-uncertainty">{rainfall.uncertainty}</p>
                  </div>
                </section>
              </div>
            </div>
          </section>

          <section
            id="distribució"
            className="content-section compact-section distribution-section"
          >
            <div className="section-kicker">
              <MapPinned size={17} aria-hidden="true" />
              <span>04</span>
            </div>
            <div>
              <p className="eyebrow">Evidència territorial</p>
              <h2>On podria créixer a Catalunya</h2>
              <div className="habitat-map-explainer">
                <p>
                  <strong>
                    És un mapa de compatibilitat ecològica, no una predicció
                    d’avui.
                  </strong>{" "}
                  El blau indica on coincideixen la coberta del sòl, l’altitud i
                  el pH configurats per a l’espècie; no confirma que hi hagi
                  bolets.
                </p>
                <Link
                  href={`/map?species=${species.speciesId}&region=${region}${species.predictionMode === "habitat_only" ? "&mode=compatibility" : ""}`}
                  className="habitat-map-link"
                >
                  <span>{regionLabels[region]}</span>
                  <strong>Obrir el mapa interactiu</strong>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </div>
              <LazyHabitatMap
                activeRegions={species.ecologicalConfig.regions}
                selectedRegion={region}
                speciesId={species.speciesId}
              />
              <div className="region-pill-row habitat-evidence-row">
                <span>Coberta del sòl ICGC</span>
                <span>
                  {habitat.altitude[0]}–{habitat.altitude[1]} m
                </span>
                <span>
                  {soil.phRange
                    ? `pH ${soil.phRange[0]}–${soil.phRange[1]}`
                    : "Sòl compatible"}
                </span>
                <span>Cel·les exactes de 250 m</span>
                <span>FungaCAT/GBIF · generalitzat a 10 km</span>
              </div>
            </div>
          </section>
          <EditorialAttribution
            contentId={`species:${species.speciesId}`}
            sources={[...species.references, officialSafetySource]}
          />
        </div>
      </div>
    </section>
  );
}
