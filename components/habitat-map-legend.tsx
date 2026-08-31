import type { ReactNode } from "react";
import { Grid3X3 } from "lucide-react";

export function HabitatMapLegend({
  compact = false,
  detail = (
    <>
      —— sectors amb hàbitat compatible. Apropa el mapa per veure més detall.
    </>
  ),
  hidden = false,
  historicalEvidenceDetail =
    "—— registres en — quadrícules de 10 km; —— sectors coincideixen.",
  title = "Zones que encaixen amb l’espècie",
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
      aria-label={hidden ? undefined : "Com llegir el terreny adequat"}
    >
      {compact ? (
        <div className="habitat-map-legend-items">
          <div className="habitat-map-legend-item">
            <i className="habitat-coverage-swatch" aria-hidden />
            <strong>Blau · terreny adequat</strong>
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
                <strong>Blau · terreny adequat</strong>
                <span>
                  Més intensitat indica que una part més gran del sector és adequada.
                </span>
              </div>
            </div>
            <div className="habitat-map-legend-item">
              <i className="habitat-history-swatch" aria-hidden />
              <div>
                <strong>Ratllat lila · registres històrics</strong>
                <span>
                  Mostra presències documentades en el passat; no indica l’estat actual.{" "}
                  {historicalEvidenceDetail}
                </span>
              </div>
            </div>
          </div>
          <p className="habitat-map-legend-note">
            Aquest mapa descriu l’hàbitat; no mostra troballes actuals.
          </p>
        </>
      )}
    </aside>
  );
}
