import { RefreshCw } from "lucide-react";

import { rescanBacklinkProspectAction } from "./actions";
import styles from "./backlinks.module.css";

export function BacklinkRescanControl({
  error,
  prospectId,
  returnTo,
  updated,
}: {
  error: string | null;
  prospectId: string;
  returnTo: string;
  updated: string | null;
}) {
  const notice = error === "rescan-failed"
    ? "No s’ha pogut tornar a inspeccionar la pàgina pública. No s’ha modificat la puntuació."
    : updated === "rescan"
      ? "Reescaneig completat. La puntuació i la decisió s’han actualitzat sense enviar cap correu."
      : null;

  return (
    <div className={styles.scoreRescan}>
      {notice ? <p className={styles.manualNotice} data-error={error === "rescan-failed"} role={error === "rescan-failed" ? "alert" : "status"}>{notice}</p> : null}
      <div className={styles.rescanControl}>
        <div>
          <strong>Actualitza les dades de la pàgina</strong>
          <span>Recalcula la puntuació, els enllaços externs i el contacte detectat. No envia cap correu.</span>
        </div>
        <form action={rescanBacklinkProspectAction}>
          <input type="hidden" name="prospectId" value={prospectId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <button type="submit"><RefreshCw aria-hidden="true" /> Reescaneja ara</button>
        </form>
      </div>
    </div>
  );
}
