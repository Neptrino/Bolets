import { predictionMapCellColour, suitabilityScale } from "@/src/lib/suitability-scale";

/**
 * Compact legend for the continuously painted prediction score. The detailed
 * five-band interpretation remains available in the method page.
 */
export function PredictionMapLegend() {
  const gradient = [
    `${predictionMapCellColour(1)} 0%`,
    ...suitabilityScale.slice(1).map((band) =>
      `${predictionMapCellColour(band.minimum)} ${band.minimum}%`
    ),
    `${predictionMapCellColour(100)} 100%`,
  ].join(", ");

  return (
    <div className="prediction-map-legend">
      <strong>Puntuació</strong>
      <span className="prediction-map-legend-zero">
        <i style={{ backgroundColor: predictionMapCellColour(0) }} aria-hidden />
        0
      </span>
      <div
        className="prediction-map-legend-ramp"
        role="img"
        aria-label="Escala contínua: d’1, puntuació molt baixa, a 100, puntuació molt alta"
      >
        <i style={{ background: `linear-gradient(90deg, ${gradient})` }} aria-hidden />
        <span aria-hidden="true"><small>1 · Molt baixa</small><small>50 · Mitjana</small><small>100 · Molt alta</small></span>
      </div>
    </div>
  );
}
