import { predictionMapCellColour, suitabilityScale } from "@/src/lib/suitability-scale";

/**
 * Band-swatch legend for the prediction map. The bands and colours come from
 * the shared ordinal scale so the legend can never drift from the painted map.
 */
export function PredictionMapLegend() {
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
