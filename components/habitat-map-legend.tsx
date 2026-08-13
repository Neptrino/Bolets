import type { ReactNode } from "react";
import { Grid3X3 } from "lucide-react";

export function HabitatMapLegend({
  compact = false,
  detail = (
    <>
      —— sectors de 2,5 km × 2,5 km amb alguna cel·la base compatible.
      Apropeu-vos per veure la graella de 250 m.
    </>
  ),
  hidden = false,
  historicalEvidenceDetail =
    "—— registres en — quadrícules de 10 km; —— sectors coincideixen.",
  title = "Coberta del sòl, altitud i pH compatibles",
}: {
  compact?: boolean;
  detail?: ReactNode;
  hidden?: boolean;
  historicalEvidenceDetail?: ReactNode;
  title?: ReactNode;
}) {
  return (
    <aside
      className={`habitat-map-legend${compact ? " habitat-map-legend-compact" : ""}`}
      aria-hidden={hidden || undefined}
      aria-label={hidden ? undefined : "Com llegir les zones compatibles"}
    >
      {compact ? (
        <div className="habitat-map-legend-items">
          <div className="habitat-map-legend-item">
            <i className="habitat-coverage-swatch" aria-hidden />
            <strong>Blau · zones compatibles</strong>
          </div>
          <div className="habitat-map-legend-item">
            <i className="habitat-history-swatch" aria-hidden />
            <strong>Ratllat lila · registres històrics</strong>
          </div>
        </div>
      ) : (
        <>
          <div className="habitat-map-legend-heading">
            <Grid3X3 size={18} aria-hidden />
            <div aria-live={hidden ? undefined : "polite"}>
              <strong>{title}</strong>
              <span>{detail}</span>
            </div>
          </div>
          <div className="habitat-map-legend-items">
            <div className="habitat-map-legend-item">
              <i className="habitat-coverage-swatch" aria-hidden />
              <div>
                <strong>Blau · zones compatibles</strong>
                <span>
                  Més intensitat indica més cobertura; els límits d’altitud
                  tenen una transició suau.
                </span>
              </div>
            </div>
            <div className="habitat-map-legend-item">
              <i className="habitat-history-swatch" aria-hidden />
              <div>
                <strong>Ratllat lila · registres històrics</strong>
                <span>
                  Context històric; no amplia les zones compatibles.{" "}
                  {historicalEvidenceDetail}
                </span>
              </div>
            </div>
          </div>
          <p className="habitat-map-legend-note">
            Aquest mapa no indica presència actual ni si les condicions de
            fructificació són bones avui.
          </p>
        </>
      )}
    </aside>
  );
}
