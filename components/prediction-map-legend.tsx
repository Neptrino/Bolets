import { predictionMapCellColour, suitabilityScale } from "@/src/lib/suitability-scale";

/**
 * Band-swatch legend for the prediction map. The bands and colours come from
 * the shared ordinal scale so the legend can never drift from the painted map.
 */
export function PredictionMapLegend({ variant = "bands" }: { variant?: "bands" | "gradient" }) {
  if (variant === "gradient") {
    const gradient = `linear-gradient(90deg, ${suitabilityScale
      .map((band) => `${band.color} ${band.minimum}%`)
      .join(", ")}, ${suitabilityScale.at(-1)!.color} 100%)`;
    return (
      <div className="prediction-map-legend prediction-map-legend-gradient">
        <strong>Intensitat de la predicció</strong>
        <div className="prediction-gradient-scale">
          <i style={{ backgroundImage: gradient }} aria-hidden />
          <span><small>1 · molt baixa</small><small>100 · molt alta</small></span>
        </div>
      </div>
    );
  }
  return (
    <div className="prediction-map-legend">
      <strong>Escala de puntuació</strong>
      <ol>
        <li>
          <i className="is-zero" style={{ backgroundColor: predictionMapCellColour(0) }} aria-hidden />
          <span>Zero</span>
          <small>0</small>
        </li>
        {suitabilityScale.map((band, index) => {
          const maximum = suitabilityScale[index + 1]
            ? suitabilityScale[index + 1].minimum - 1
            : 100;
          return (
            <li key={band.id}>
              <i style={{ backgroundColor: band.color }} aria-hidden />
              <span>{band.label}</span>
              <small>
                {index === 0 ? 1 : band.minimum}–{maximum}
              </small>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
