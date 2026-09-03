import { CircleCheck, Mail, RotateCcw, ShieldX } from "lucide-react";

import type { BacklinkProspectDetail } from "@/src/lib/backlinks/types";

import { overrideBacklinkProspectAction, updateBacklinkContactAction } from "./actions";
import styles from "./backlinks.module.css";

const errorMessages: Record<string, string> = {
  "already-contacted": "Ja hi ha hagut un intent d’enviament; el contacte i la decisió ja no es poden redirigir.",
  "delivery-in-progress": "El correu ja està en procés d’enviament i no es pot aturar des d’aquest control.",
  "domain-cooldown": "El domini encara és dins del període de refredament.",
  "domain-not-blocked": "Aquest domini ja no està bloquejat.",
  "domain-pending": "Ja hi ha un altre correu pendent per a aquest domini.",
  "existing-link": "La pàgina ja enllaça Bolets Atles; no cal preparar cap contacte.",
  "invalid-contact": "Cal un correu institucional vàlid: una bústia general o una adreça del mateix domini que el web.",
  "invalid-manual-action": "La decisió o el motiu no són vàlids.",
  "manual-action": "No s’ha pogut aplicar el canvi manual.",
  "missing-config": "Falta la configuració privada necessària per regenerar el correu.",
  "not-found": "L’oportunitat ja no existeix.",
  "protected-suppression": "Aquest bloqueig prové d’una baixa protegida i no es pot retirar.",
  suppressed: "Aquest correu o domini és a la llista de supressió i no es pot aprovar.",
};

const updatedMessages: Record<string, string> = {
  "manual-approve": "Aprovació manual desada. El correu queda preparat per al proper cicle d’enviament.",
  "manual-exclude": "Exclusió manual desada. S’han cancel·lat els correus pendents d’aquesta oportunitat.",
  "manual-automatic": "S’ha restaurat la decisió automàtica.",
  contact: "Contacte actualitzat. Qualsevol correu pendent s’ha regenerat abans de l’enviament.",
};

export function BacklinkManualControls({
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
  const contacted = prospect.sendCount > 0 || prospect.deliveries.some((delivery) => (
    delivery.attemptCount > 0 || ["sending", "sent", "failed"].includes(delivery.status)
  ));
  const immutableState = contacted || ["sent", "linked", "lost"].includes(prospect.status);
  const manualError = error && error !== "rescan-failed" ? error : null;
  const manualUpdate = updated && updated !== "rescan" ? updated : null;
  const notice = manualError
    ? errorMessages[manualError] ?? errorMessages["manual-action"]
    : manualUpdate ? updatedMessages[manualUpdate] : null;

  return (
    <section className={styles.manualControl} aria-labelledby={`prospect-manual-${prospect.id}`}>
      <header>
        <div>
          <span>Control humà</span>
          <h3 id={`prospect-manual-${prospect.id}`}>Decisió i contacte</h3>
        </div>
        <strong data-decision={prospect.manualDecision ?? "automatic"}>
          {prospect.manualDecision === "approved"
            ? "Aprovació manual"
            : prospect.manualDecision === "excluded" ? "No enviar" : "Automàtica"}
        </strong>
      </header>

      {notice ? <p className={styles.manualNotice} data-error={Boolean(manualError)} role={manualError ? "alert" : "status"}>{notice}</p> : null}
      {immutableState ? (
        <p className={styles.manualLock}>El registre queda bloquejat després del primer intent d’enviament. Això evita canviar el destinatari o repetir un lliurament ambigu.</p>
      ) : null}

      <form action={overrideBacklinkProspectAction} className={styles.manualDecisionForm}>
        <input type="hidden" name="prospectId" value={prospect.id} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <label>
          Motiu de la decisió
          <textarea name="note" minLength={3} maxLength={500} required disabled={immutableState} placeholder="Per què cal aprovar, excloure o tornar a la política automàtica?" />
        </label>
        <div>
          <button type="submit" name="decision" value="approve" disabled={immutableState || prospect.existingLink || prospect.manualDecision === "approved"}>
            <CircleCheck aria-hidden="true" /> Aprova per enviar
          </button>
          <button type="submit" name="decision" value="exclude" data-tone="danger" disabled={immutableState || prospect.manualDecision === "excluded"}>
            <ShieldX aria-hidden="true" /> No enviïs
          </button>
          <button type="submit" name="decision" value="automatic" data-tone="neutral" disabled={immutableState || !prospect.manualDecision}>
            <RotateCcw aria-hidden="true" /> Torna a automàtic
          </button>
        </div>
      </form>

      <form action={updateBacklinkContactAction} className={styles.contactEditForm}>
        <input type="hidden" name="prospectId" value={prospect.id} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <label>
          Correu de contacte
          <input name="contactEmail" type="email" maxLength={254} required disabled={immutableState} defaultValue={prospect.contactEmail ?? ""} placeholder="editorial@exemple.cat" />
          <small>Les bústies no reconegudes automàticament només s’enviaran després d’una aprovació manual.</small>
        </label>
        <label>
          Font o motiu del canvi
          <input name="note" minLength={3} maxLength={500} required disabled={immutableState} placeholder="P. ex. pàgina de contacte oficial" />
        </label>
        <button type="submit" disabled={immutableState}><Mail aria-hidden="true" /> Actualitza el contacte</button>
      </form>
    </section>
  );
}
