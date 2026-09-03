import { LockKeyhole, LockKeyholeOpen } from "lucide-react";

import type { BacklinkProspectDetail } from "@/src/lib/backlinks/types";

import { controlBacklinkDomainAction } from "./actions";
import styles from "./backlinks.module.css";

const errorMessages: Record<string, string> = {
  "domain-not-blocked": "Aquest domini ja no està bloquejat.",
  "invalid-domain-action": "Cal indicar un motiu vàlid.",
  "protected-suppression": "Aquest bloqueig prové d’una baixa o protecció permanent i no es pot retirar des d’aquí.",
  "manual-action": "No s’ha pogut actualitzar el domini.",
};

export function BacklinkDomainControl({
  error,
  prospect,
  returnTo,
  updated,
}: {
  error: string | null;
  prospect: BacklinkProspectDetail;
  returnTo: string;
  updated: string | null;
}) {
  const domainUpdate = updated === "domain-block" || updated === "domain-allow" ? updated : null;
  const domainError = error && errorMessages[error] ? error : null;
  const notice = domainError
    ? errorMessages[domainError]
    : domainUpdate === "domain-block"
      ? `S’ha bloquejat ${prospect.domain}. No es tornarà a rastrejar ni contactar.`
      : domainUpdate === "domain-allow"
        ? `S’ha tornat a permetre ${prospect.domain}. Reescaneja les oportunitats abans d’aprovar-les.`
        : null;

  return (
    <section className={styles.domainControl} aria-labelledby={`prospect-domain-${prospect.id}`}>
      <div>
        {prospect.domainSuppressed ? <LockKeyhole aria-hidden="true" /> : <LockKeyholeOpen aria-hidden="true" />}
        <div>
          <strong id={`prospect-domain-${prospect.id}`}>
            {prospect.domainSuppressed ? "Domini bloquejat" : "Bloqueig de domini"}
          </strong>
          <span>{prospect.domainSuppressed
            ? `No es rastrejarà ni contactarà cap pàgina de ${prospect.domain}.`
            : `Bloqueja ${prospect.domain} i tots els seus subdominis en futurs cicles.`}</span>
        </div>
      </div>
      {notice ? <p data-error={Boolean(domainError)} role={domainError ? "alert" : "status"}>{notice}</p> : null}
      <form action={controlBacklinkDomainAction}>
        <input type="hidden" name="prospectId" value={prospect.id} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <input type="hidden" name="intent" value={prospect.domainSuppressed ? "allow" : "block"} />
        <label>
          Motiu
          <input
            name="note"
            minLength={3}
            maxLength={90}
            required
            defaultValue={prospect.domainSuppressed ? "Tornar a revisar aquest domini" : "No aporta oportunitats editorials útils"}
          />
        </label>
        <button type="submit" data-action={prospect.domainSuppressed ? "allow" : "block"}>
          {prospect.domainSuppressed
            ? <><LockKeyholeOpen aria-hidden="true" /> Torna a permetre el domini</>
            : <><LockKeyhole aria-hidden="true" /> Bloqueja el domini</>}
        </button>
      </form>
    </section>
  );
}
