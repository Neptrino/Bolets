"use client";

import { CircleCheck, LoaderCircle, ShieldX } from "lucide-react";
import { useFormStatus } from "react-dom";

import { overrideBacklinkProspectAction } from "./actions";
import styles from "./backlinks.module.css";

function QuickActionButton({
  decision,
  disabled,
  disabledReason,
  pageTitle,
}: {
  decision: "approve" | "exclude";
  disabled: boolean;
  disabledReason?: string | null;
  pageTitle: string;
}) {
  const { pending } = useFormStatus();
  const approving = decision === "approve";
  const label = approving ? "Aprova" : "Descarta";

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-label={`${label} ${pageTitle}${approving ? " per enviar" : " de les oportunitats actives"}`}
      title={disabledReason ?? (approving ? "Aprova per enviar" : "Descarta de la llista activa")}
      data-tone={approving ? "approve" : "reject"}
    >
      {pending ? <LoaderCircle aria-hidden="true" data-pending="true" /> : approving
        ? <CircleCheck aria-hidden="true" />
        : <ShieldX aria-hidden="true" />}
      <span>{pending ? "Desant…" : label}</span>
    </button>
  );
}

function QuickActionForm({
  decision,
  disabled = false,
  disabledReason,
  pageTitle,
  prospectId,
  returnTo,
}: {
  decision: "approve" | "exclude";
  disabled?: boolean;
  disabledReason?: string | null;
  pageTitle: string;
  prospectId: string;
  returnTo: string;
}) {
  const note = decision === "approve"
    ? "Revisió ràpida des del registre: aprovada per enviar."
    : "Revisió ràpida des del registre: oportunitat descartada.";

  return (
    <form action={overrideBacklinkProspectAction}>
      <input type="hidden" name="prospectId" value={prospectId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="decision" value={decision} />
      <input type="hidden" name="note" value={note} />
      <QuickActionButton decision={decision} disabled={disabled} disabledReason={disabledReason} pageTitle={pageTitle} />
    </form>
  );
}

export function BacklinkTableActions({
  canApprove,
  approvalDisabledReason,
  pageTitle,
  prospectId,
  returnTo,
}: {
  canApprove: boolean;
  approvalDisabledReason: string | null;
  pageTitle: string;
  prospectId: string;
  returnTo: string;
}) {
  return (
    <div className={styles.quickActions} role="group" aria-label={`Accions ràpides per a ${pageTitle}`}>
      <QuickActionForm
        decision="approve"
        disabled={!canApprove}
        disabledReason={approvalDisabledReason}
        pageTitle={pageTitle}
        prospectId={prospectId}
        returnTo={returnTo}
      />
      <QuickActionForm
        decision="exclude"
        pageTitle={pageTitle}
        prospectId={prospectId}
        returnTo={returnTo}
      />
    </div>
  );
}
