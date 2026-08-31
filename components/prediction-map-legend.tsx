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
      <strong>Nivell de condicions</strong>
      <div
        className="prediction-map-legend-ramp"
        role="img"
        aria-label="Escala contínua: d’1, condicions molt poc favorables, a 100, condicions molt favorables"
      >
        <i style={{ background: `linear-gradient(90deg, ${gradient})` }} aria-hidden />
        <span aria-hidden="true"><small>1 · Molt baixa</small><small>50 · Mitjana</small><small>100 · Molt alta</small></span>
      </div>
    </div>
  );
}
