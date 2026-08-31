import {
  Clock3,
  CloudRain,
  Compass,
  Layers3,
  Mountain,
  Sprout,
  ThermometerSun,
  Trees,
} from "lucide-react";
import { SeasonCalendar } from "@/components/season-calendar";
import { rainfallLimitationCopy } from "@/src/lib/species-copy";
import type { SpeciesProfile } from "@/src/lib/types";

const catalanList = new Intl.ListFormat("ca-ES", {
  style: "long",
  type: "conjunction",
});

export function SpeciesEcologySection({
  species,
}: {
  species: SpeciesProfile;
}) {
  const climate = species.ecologicalConfig.climate;
  const rainfall = species.ecologicalConfig.rainfall;
  const habitat = species.ecologicalConfig.habitat;
  const soil = species.ecologicalConfig.soil;

  return (
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
          <strong>Només terreny adequat.</strong>{" "}
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
          </dl>
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
              <dt>Pluja habitual</dt>
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
              <dt>Què ho pot frenar</dt>
              <dd>{rainfall.interruption}</dd>
            </div>
          </dl>
          <p className="rainfall-uncertainty">{rainfallLimitationCopy(species.speciesId, rainfall.uncertainty)}</p>
        </div>
      </section>
    </div>
  </div>
</section>
  );
}
