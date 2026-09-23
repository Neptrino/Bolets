import { ProfileSection } from "@/components/species-profile/profile-section";
import Link from "next/link";
import { ArrowUpRight, Ban, Clock3, CloudRain, Compass, Droplets, Layers3, Mountain, Sun, ThermometerSun, Trees, Wind } from "lucide-react";
import { SeasonCalendar } from "@/components/season-calendar";
import { ProfileFacts } from "@/components/species-profile/profile-facts";
import type { SpeciesEditorialProse } from "@/data/species-editorial-prose";
import {
  altitudeCalendarSentence,
  altitudeCalendarShift,
  rainWindowSentence,
  scoredRainWindowForModel,
} from "@/src/lib/rain-response-summary";
import { rainfallLimitationCopy } from "@/src/lib/species-copy";
import { SEASON_MONTHS, seasonMonthPath, monthWithPreposition } from "@/src/lib/seasonality";
import { speciesHeadings } from "@/src/lib/species-headings";
import type { CatalogueSpecies } from "@/src/lib/types";

const catalanList = new Intl.ListFormat("ca-ES", {
  style: "long",
  type: "conjunction",
});

function lowerFirst(value: string) {
  return `${value.charAt(0).toLocaleLowerCase("ca-ES")}${value.slice(1)}`;
}

export function SpeciesEcologySection({
  species,
  prose,
}: {
  species: CatalogueSpecies;
  /** Hand-written territory prose; its searched heading, when present, replaces the generic one. */
  prose?: SpeciesEditorialProse;
}) {
  const headings = speciesHeadings(species.identity.commonName);
  const seasonLinks = (
    <nav className="profile-links species-season-links" aria-label="Continua explorant la temporada">
      {!("scope" in species) && SEASON_MONTHS.filter(({ key }) => species.ecologicalConfig.seasonality[key] === "peak").map(({ key }) => (
        <Link key={key} href={seasonMonthPath(key)} className="text-link">Bolets {monthWithPreposition(key)} <ArrowUpRight size={14} aria-hidden="true" /></Link>
      ))}
      <Link href="/bolets-avui" className="text-link">Consulta les condicions d’avui per territori <ArrowUpRight size={14} aria-hidden="true" /></Link>
      <Link href="/temporada" className="text-link">Calendari de bolets <ArrowUpRight size={14} aria-hidden="true" /></Link>
    </nav>
  );

  if ("scope" in species) {
    return (
      <ProfileSection species={species} id="ecologia" className="ecology-section" eyebrow="Perfil ecològic descriptiu" title={headings.ecology}>
          <div className="profile-panel">
            <div className="profile-panel-body">
          <p className="profile-lede">{species.ecology.description}</p>
          <ProfileFacts
            label="Hàbitat i temporada"
            items={[
              { key: "habitat", icon: <Trees size={16} />, term: "Hàbitat principal", detail: catalanList.format(species.ecology.habitats) },
              { key: "season", icon: <Clock3 size={16} />, term: "Temporada", detail: <><strong>{species.ecology.season}</strong>Període general documentat a les fonts</> },
            ]}
          />
          <p className="profile-note">{species.ecology.limitations}</p>
          {seasonLinks}
            </div>
          </div>
      </ProfileSection>
    );
  }

  const climate = species.ecologicalConfig.climate;
  const rainfall = species.ecologicalConfig.rainfall;
  const habitat = species.ecologicalConfig.habitat;
  const soil = species.ecologicalConfig.soil;
  // Derived from the shipped model parameters, so the printed window and
  // millimetres follow every refit instead of drifting from the editorial text.
  const rainWindow = scoredRainWindowForModel(species.modelConfig);
  const calendarShift = species.modelConfig.status === "supported" && species.modelConfig.model === "hydrothermal-v2"
    ? altitudeCalendarShift(species.modelConfig.phenology.altitudeShift, habitat.altitude)
    : null;
  const calendarShiftSentence = calendarShift ? altitudeCalendarSentence(calendarShift) : null;

  return (
<ProfileSection species={species} id="ecologia" className="ecology-section" eyebrow="Perfil ecològic" title={prose?.ecologyHeading ?? headings.ecology}>
    <div className="profile-panel">
      <div className="profile-panel-body">
    {prose && (
      <div className="profile-prose">
        {prose.ecology.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
    )}
    <ProfileFacts
      label="Condicions ecològiques principals"
      items={[
        { key: "habitat", icon: <Trees size={16} />, term: "Hàbitat principal", detail: catalanList.format(habitat.forestTypes), wide: true },
        { key: "altitude", icon: <Mountain size={16} />, term: "Altitud", detail: <><strong>{habitat.altitude[0]}–{habitat.altitude[1]} m</strong>{habitat.landscapePosition}</> },
        { key: "aspect", icon: <Compass size={16} />, term: "Orientació", detail: habitat.aspect },
        { key: "soil", icon: <Layers3 size={16} />, term: "Sòl", detail: `${soil.reaction} · ${lowerFirst(soil.texture)} · ${lowerFirst(soil.drainage)}` },
        { key: "climate", icon: <ThermometerSun size={16} />, term: "Temperatura", detail: `${climate.temperatureRange[0]}–${climate.temperatureRange[1]} °C · humitat ${lowerFirst(climate.relativeHumidity)}` },
        { key: "rain", icon: <CloudRain size={16} />, term: "Després de ploure", detail: rainWindow ? rainWindowSentence(rainWindow) : rainfall.fruitingDelay },
        { key: "interruption", icon: <Ban size={16} />, term: "Què ho pot frenar", detail: rainfall.interruption },
      ]}
    />
    <SeasonCalendar species={species} />
    {calendarShiftSentence && (
      <p className="profile-note">
        <Mountain size={14} aria-hidden="true" />
        <span>{calendarShiftSentence}</span>
      </p>
    )}
    {seasonLinks}
    {species.predictionMode === "habitat_only" && (
      <p className="profile-lede">
        <strong>Només terreny adequat.</strong>{" "}
        {species.predictionCaveat}
      </p>
    )}

    <details className="profile-more">
      <summary>Més detall de l’hàbitat, el sòl i el clima</summary>
      <ProfileFacts
        label="Detall de l’hàbitat, el sòl i el clima"
        items={[
          ...(habitat.treeAssociations.length ? [{ key: "trees", icon: <Trees size={16} />, term: "Arbres associats", detail: <span>{catalanList.format(habitat.treeAssociations)}</span> }] : []),
          { key: "moisture", icon: <Droplets size={16} />, term: "Humitat del sòl", detail: habitat.moisture },
          { key: "substrate", icon: <Layers3 size={16} />, term: "Substrat", detail: soil.substrate },
          { key: "shade", icon: <Sun size={16} />, term: "Ombra", detail: habitat.shade },
          { key: "drought", icon: <Sun size={16} />, term: "Sequera", detail: climate.drought },
          { key: "wind", icon: <Wind size={16} />, term: "Vent", detail: climate.wind },
          ...(!rainWindow ? [{ key: "accumulation", icon: <CloudRain size={16} />, term: "Pluja habitual", detail: rainfall.preferredAccumulation }] : []),
          { key: "prior", icon: <Droplets size={16} />, term: "Humitat prèvia", detail: rainfall.priorMoisture },
          { key: "after", icon: <ThermometerSun size={16} />, term: "Temperatura després", detail: rainfall.temperatureAfterRain },
        ]}
      />
      <p className="profile-note">{rainfallLimitationCopy(species.speciesId, rainfall.uncertainty)}</p>
    </details>
      </div>
    </div>

</ProfileSection>
  );
}
