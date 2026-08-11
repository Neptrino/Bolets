import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BookOpen, CalendarDays, ChartNoAxesCombined, CloudRain, Layers3, Map, MapPinned, ShieldAlert, Sprout, ThermometerSun } from "lucide-react";
import { ConditionComparison } from "@/components/condition-comparison";
import { EdibilityBadge } from "@/components/edibility-badge";
import { ModelProfile } from "@/components/model-profile";
import { RegionMap } from "@/components/region-map";
import { QuerySelect } from "@/components/ui/query-select";
import { SeasonCalendar } from "@/components/season-calendar";
import { getSpecies, speciesProfiles } from "@/data/species";
import { isRegionId, regionLabels, regionSelectItems } from "@/data/regions";
import { getConditionPredictionStatus } from "@/src/lib/condition-presentation";
import { getConditionSnapshot } from "@/src/lib/conditions";
import { calculateSuitability } from "@/src/lib/scoring";
import type { RegionId } from "@/src/lib/types";

const sections = ["Descripció", "Espècies semblants", "Hàbitat", "Sòl", "Clima", "Pluja", "Temporada", "Distribució", "Model"];

export function generateStaticParams() { return speciesProfiles.map((species) => ({ slug: species.speciesId })); }

export default async function SpeciesPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ region?: string }> }) {
  const { slug } = await params;
  const query = await searchParams;
  const species = getSpecies(slug);
  if (!species) notFound();
  const region: RegionId = isRegionId(query.region) ? query.region : species.ecologicalConfig.regions[0] ?? "prepirineus";
  const snapshot = await getConditionSnapshot(region);
  const result = calculateSuitability(species, snapshot);
  const predictionStatus = getConditionPredictionStatus(snapshot.stale, result);
  const seasonalityScore = result.contributions.find((factor) => factor.id === "seasonality")?.score;
  const currentStatus = result.score === null
    ? seasonalityScore === 0
      ? "Fora de temporada"
      : predictionStatus.kind === "environment-unavailable"
        ? "Sense dades ambientals"
        : "Puntuació regional no disponible"
    : `${result.score}/100 · ${result.label}`;
  const referenceImage = species.media.find((asset) => asset.identificationReference);
  const localImages = species.media.filter((asset) => asset.localPath);
  const displayImages = localImages.length > 0
    ? localImages.slice(0, 2)
    : referenceImage
      ? [referenceImage, ...species.media.filter((asset) => asset.id !== referenceImage.id).slice(0, 1)]
      : species.media.slice(0, 2);
  const displayLicenses = [...new Set(displayImages.map((asset) => asset.license))];
  const hasToxicLookalike = species.similarSpecies.some((item) => item.warning || item.edibility.includes("toxic"));
  return <section className="species-page"><div className="species-hero"><div className="page-width"><Link href="/species" className="back-link"><ArrowLeft size={15} />Totes les espècies</Link><div className="species-hero-grid"><div><p className="eyebrow light">{species.identity.family} · {species.identity.genus}</p><h1>{species.identity.commonName}</h1><em>{species.identity.scientificName}</em><p className="species-dek">{species.identity.shortDescription}</p><EdibilityBadge status={species.identity.edibility} /></div><div className={`specimen-panel${displayImages.length > 0 ? " has-photos" : ""}`}>{displayImages.length > 0 ? <><div className={`specimen-gallery${displayImages.length === 1 ? " single-photo" : ""}`} aria-label={`Fotografies aportades de ${species.identity.scientificName}`}>{displayImages.map((asset, index) => <div className="specimen-photo-frame" key={asset.id}><Image className="specimen-photo" src={asset.localPath ?? asset.imageUrl ?? asset.sourceUrl} alt={asset.alt} fill loading={index === 0 ? "eager" : "lazy"} sizes={displayImages.length === 1 ? "(max-width: 680px) calc(100vw - 48px), 430px" : "(max-width: 680px) 50vw, 280px"} unoptimized={Boolean(asset.imageUrl)} /></div>)}</div><div className="specimen-photo-vignette" aria-hidden="true" /><div className="specimen-caption"><p><i>{species.identity.scientificName}</i> · {displayImages.length === 1 ? "una vista" : "dues vistes"}</p><div className="specimen-meta">{displayImages.map((asset, index) => <Link href={asset.sourceUrl} target="_blank" rel="noreferrer" title={asset.license} key={asset.id}>{asset.attribution}{displayImages.length > 1 ? ` ${index + 1}` : ""}</Link>)}<span>· {displayLicenses.join(" · ")} · imatge orientativa; verifica tots els trets</span></div></div></> : <><div className="specimen-drawing" aria-hidden="true"><span className="drawing-cap" /><span className="drawing-stem" /><span className="drawing-lines" /></div><p>Sense fotografia verificada</p><span>Les imatges d’identificació només s’afegeixen amb llicència, atribució i validació explícites.</span></>}</div></div></div></div>
    <div className="page-width species-content"><aside className="species-aside" aria-label="Contingut de la fitxa"><p>CONTINGUT</p>{sections.map((section) => <a href={`#${section.toLowerCase().replaceAll(" ", "-")}`} key={section}>{section}</a>)}<Link href={`/map?species=${species.speciesId}&region=${region}`} className="aside-map-link"><Map size={15} />Mapa actual</Link></aside><div className="species-main">
      <section id="descripció" className="content-section"><div className="section-kicker"><BookOpen size={17} /><span>01</span></div><div><p className="eyebrow">Lectura de camp</p><h2>Descripció</h2><div className="morphology-grid"><article><h3>Barret</h3><p>{species.morphology.cap}</p></article><article><h3>Himeni</h3><p>{species.morphology.hymenium}</p></article><article><h3>Peu</h3><p>{species.morphology.stem}</p></article><article><h3>Carn i tacte</h3><p>{species.morphology.flesh} {species.morphology.texture}</p></article></div><div className="field-notes"><div><span>OLOR</span><p>{species.morphology.smell}</p></div><div><span>COLOR</span><p>{species.morphology.colour}</p></div><div><span>VARIACIÓ</span><p>{species.morphology.variation}</p></div></div><div className="key-features"><span>Trets rellevants</span>{species.morphology.keyFeatures.map((feature) => <b key={feature}>{feature}</b>)}</div></div></section>
      <section id="espècies-semblants" className="content-section"><div className="section-kicker"><ShieldAlert size={17} /><span>02</span></div><div><p className="eyebrow">Identificació responsable</p><h2>Espècies semblants</h2>{hasToxicLookalike && <div className="warning-callout"><ShieldAlert size={18} /><strong>Atenció: hi ha confusions possibles amb espècies tòxiques.</strong><span>Verifica tots els trets abans de consumir-ne cap exemplar.</span></div>}<div className="similar-list">{species.similarSpecies.map((item) => <article key={item.scientificName}><div><em>{item.scientificName}</em><h3>{item.commonName}</h3></div><p>{item.mainDifferences}</p><EdibilityBadge status={item.edibility} compact /></article>)}</div></div></section>
      <section id="hàbitat" className="content-section"><div className="section-kicker"><Sprout size={17} /><span>03</span></div><div><p className="eyebrow">Relacions ecològiques</p><h2>Hàbitat i vegetació associada</h2><div className="habitat-hero"><div><span>HÀBITAT PRINCIPAL</span>{species.ecologicalConfig.habitat.forestTypes.map((item) => <b key={item}>{item}</b>)}</div><div><span>ALTITUD</span><strong>{species.ecologicalConfig.habitat.altitude[0]}–{species.ecologicalConfig.habitat.altitude[1]} m</strong><p>{species.ecologicalConfig.habitat.landscapePosition}</p></div></div><div className="tree-tags">{species.ecologicalConfig.habitat.treeAssociations.map((tree) => <span key={tree}>{tree}</span>)}</div><div className="detail-pairs"><p><span>Orientació</span>{species.ecologicalConfig.habitat.aspect}</p><p><span>Ombra</span>{species.ecologicalConfig.habitat.shade}</p><p><span>Pendent</span>{species.ecologicalConfig.habitat.slope}</p><p><span>Humitat</span>{species.ecologicalConfig.habitat.moisture}</p></div></div></section>
      <section id="sòl" className="content-section compact-section"><div className="section-kicker"><Layers3 size={17} aria-hidden="true" /><span>04</span></div><div><p className="eyebrow">Edafologia</p><h2>Sòl</h2><div className="soil-grid"><p><span>Textura</span>{species.ecologicalConfig.soil.texture}</p><p><span>Reacció</span>{species.ecologicalConfig.soil.reaction}</p><p><span>Substrat</span>{species.ecologicalConfig.soil.substrate}</p><p><span>Drenatge</span>{species.ecologicalConfig.soil.drainage}</p><p><span>Matèria orgànica</span>{species.ecologicalConfig.soil.organicMatter}</p><p><span>Humus</span>{species.ecologicalConfig.soil.humus}</p></div><p className="evidence-note">Nivell d’evidència ecològica: {species.ecologicalConfig.soil.evidence === "limited" ? "limitat; cal contrastar-lo amb la bibliografia local." : species.ecologicalConfig.soil.evidence}</p></div></section>
      <section id="clima" className="content-section compact-section"><div className="section-kicker"><ThermometerSun size={17} aria-hidden="true" /><span>05</span></div><div><p className="eyebrow">Finestra de fructificació</p><h2>Clima</h2><div className="climate-strip"><div><strong>{species.ecologicalConfig.climate.temperatureRange[0]}–{species.ecologicalConfig.climate.temperatureRange[1]} °C</strong><span>temperatura orientativa</span></div><p><b>Humitat:</b> {species.ecologicalConfig.climate.relativeHumidity}</p><p><b>Sequera:</b> {species.ecologicalConfig.climate.drought}</p><p><b>Vent:</b> {species.ecologicalConfig.climate.wind}</p></div></div></section>
      <section id="pluja" className="content-section compact-section"><div className="section-kicker"><CloudRain size={17} aria-hidden="true" /><span>06</span></div><div><p className="eyebrow">Després de ploure</p><h2>Fruïtificació i pluja</h2><blockquote>“{species.ecologicalConfig.rainfall.fruitingDelay}”</blockquote><div className="detail-pairs"><p><span>Acumulació preferida</span>{species.ecologicalConfig.rainfall.preferredAccumulation}</p><p><span>Humitat prèvia</span>{species.ecologicalConfig.rainfall.priorMoisture}</p><p><span>Temperatura després</span>{species.ecologicalConfig.rainfall.temperatureAfterRain}</p><p><span>Pot interrompre’s per</span>{species.ecologicalConfig.rainfall.interruption}</p></div><p className="evidence-note">{species.ecologicalConfig.rainfall.uncertainty}</p></div></section>
      <section id="temporada" className="content-section compact-section"><div className="section-kicker"><CalendarDays size={17} aria-hidden="true" /><span>07</span></div><div><p className="eyebrow">Calendari català</p><h2>Temporada</h2><SeasonCalendar species={species} /></div></section>
      <section id="distribució" className="content-section compact-section">
        <div className="section-kicker"><MapPinned size={17} aria-hidden="true" /><span>08</span></div>
        <div>
          <p className="eyebrow">Evidència territorial</p>
          <h2>On podria créixer a Catalunya</h2>
          <div className="habitat-map-explainer">
            <p><strong>És un mapa permanent d’hàbitat, no una predicció d’avui.</strong> Només mostra on coincideixen la coberta del sòl, l’altitud i el pH configurats per a l’espècie.</p>
            <Link href={`/map?species=${species.speciesId}&region=${region}`} className="habitat-current-status">
              <span>Condicions d’avui · {regionLabels[region]}</span>
              <strong>{currentStatus}</strong>
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <RegionMap activeRegions={species.ecologicalConfig.regions} speciesId={species.speciesId} habitat className="species-map" />
          <div className="region-pill-row habitat-evidence-row">
            <span>Coberta del sòl ICGC</span>
            <span>{species.ecologicalConfig.habitat.altitude[0]}–{species.ecologicalConfig.habitat.altitude[1]} m</span>
            <span>{species.ecologicalConfig.soil.phRange ? `pH ${species.ecologicalConfig.soil.phRange[0]}–${species.ecologicalConfig.soil.phRange[1]}` : "Sòl compatible"}</span>
            <span>Cel·les exactes de 250 m</span>
            <span>FungaCAT/GBIF · generalitzat a 10 km</span>
          </div>
        </div>
      </section>
      <section id="model" className="content-section model-section"><div className="section-kicker"><ChartNoAxesCombined size={17} aria-hidden="true" /><span>09</span></div><div><p className="eyebrow">Predicció explicable</p><h2>Condicions ideals i mapa actual</h2><div className="ideal-list">{species.idealConditions.map((item, index) => <p key={item}><span>0{index + 1}</span>{item}</p>)}</div><div className="region-control"><span>Consulta territorial</span><QuerySelect value={region} items={regionSelectItems} parameter="region" variant="region" aria-label="Àrea de Catalunya seleccionada" /></div><ConditionComparison species={species} snapshot={snapshot} result={result} /><ModelProfile species={species} /><Link href={`/map?species=${species.speciesId}&region=${region}`} className="button moss-button">Veure el mapa de predicció <ArrowUpRight size={17} /></Link></div></section>
    </div></div></section>;
}
