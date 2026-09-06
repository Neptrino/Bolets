import Link from "next/link";
import { ArrowUpRight, Compass } from "lucide-react";
import { locationPagePath, locationPagesForSpecies } from "@/data/location-pages";
import { comparisonPagesForSpecies } from "@/data/comparison-pages";
import { territoryGuideForSpecies } from "@/src/lib/species-territory-guides";
import { SEASON_MONTHS, seasonMonthPath, monthWithPreposition } from "@/src/lib/seasonality";
import type { SpeciesProfile } from "@/src/lib/types";

export function hasSearchSummary(speciesId: string) {
  return Boolean(territoryGuideForSpecies(speciesId)) ||
    speciesId === "craterellus-lutescens" || speciesId === "tricholoma-terreum";
}

export function SpeciesSearchSummary({ species }: { species: SpeciesProfile }) {
  const guides = locationPagesForSpecies(species.speciesId).slice(0, 3);
  const territoryGuide = territoryGuideForSpecies(species.speciesId);
  const preferredComparison: Record<string, string> = {
    "tricholoma-terreum": "fredolic-vs-fredolic-metzinos",
    "craterellus-lutescens": "camagroc-vs-fals-camagroc",
    "lactarius-sanguifluus": "rovello-vs-pinetell",
    "lactarius-deliciosus": "rovello-vs-pinetell",
  };
  const comparison = comparisonPagesForSpecies(species.speciesId).find((page) =>
    preferredComparison[species.speciesId]
      ? page.slug === preferredComparison[species.speciesId]
      : page.slug.includes("cep-vs-"),
  );
  const months = SEASON_MONTHS.filter(({ key }) => species.ecologicalConfig.seasonality[key] === "peak");

  return <section className="content-section species-search-summary" aria-labelledby="species-search-summary-title">
    <div className="section-kicker" aria-hidden="true"><Compass size={17} /></div>
    <div>
    <p className="eyebrow">Hàbitat, temporada i confusions</p>
    <h2 id="species-search-summary-title">{species.identity.commonName}: què cal saber</h2>
    <p>El perfil descriu hàbitat compatible en {species.ecologicalConfig.habitat.forestTypes.join(", ").toLocaleLowerCase("ca")}, amb sòl {species.ecologicalConfig.habitat.soilPreference.toLocaleLowerCase("ca")}.
      {" "}El pic habitual és {months.map(({ label }) => label).join(" i ")}; la pluja i la temperatura poden desplaçar o interrompre la temporada.</p>
    <p><strong>Trets que cal contrastar:</strong> {species.morphology.keyFeatures.slice(0, 3).join("; ")}. Revisa l’exemplar complet i les espècies semblants.</p>
    <nav aria-label={`Guies de ${species.identity.commonName}`}>
      {territoryGuide && <Link href={territoryGuide.path}>{territoryGuide.profileLinkTitle} <ArrowUpRight size={14} aria-hidden="true" /></Link>}
      {comparison && <Link href={`/compare/${comparison.slug}`}>{comparison.shortTitle} <ArrowUpRight size={14} aria-hidden="true" /></Link>}
      {guides.map((guide) => <Link key={locationPagePath(guide)} href={locationPagePath(guide)}>{guide.titlePhrase} <ArrowUpRight size={14} aria-hidden="true" /></Link>)}
      {months.map((month) => <Link key={month.key} href={seasonMonthPath(month.key)}>Bolets {monthWithPreposition(month.key)} <ArrowUpRight size={14} aria-hidden="true" /></Link>)}
      <Link href="/bolets-avui">Consulta les condicions d’avui per territori <ArrowUpRight size={14} aria-hidden="true" /></Link>
    </nav>
    </div>
  </section>;
}
