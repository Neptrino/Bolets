"use client";

import { EyeOff, ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import { moderateReportAction } from "./actions";
import actionStyles from "../management-actions.module.css";

type ModerationDecision = "hide" | "dismiss";

function ModerationFormContent({
  decision,
  findingName,
  onCancel,
  onChoose,
  onConfirm,
}: {
  decision: ModerationDecision | null;
  findingName: string;
  onCancel: () => void;
  onChoose: (decision: ModerationDecision) => void;
  onConfirm: () => void;
}) {
  const { pending } = useFormStatus();
  const hiding = decision === "hide";

  return (
    <>
      <div className={actionStyles.moderationActions} aria-label="Accions de moderació">
        <button type="button" onClick={() => onChoose("dismiss")} disabled={pending}>
          Desestimar l’avís
        </button>
        <button type="button" data-tone="danger" onClick={() => onChoose("hide")} disabled={pending}>
          Ocultar la troballa
        </button>
      </div>
      <ConfirmDialog
        open={decision !== null}
        busy={pending}
        title={hiding ? `Ocultar ${findingName}?` : "Desestimar aquest avís?"}
        description={hiding
          ? "La troballa deixarà de ser pública, se’n resoldran tots els avisos oberts i es revocarà l’accés que hagués concedit."
          : "L’avís quedarà desestimat. La troballa continuarà igual i no es penalitzarà el compte que l’ha publicat."}
        confirmLabel={hiding ? "Sí, ocultar-la" : "Sí, desestimar-lo"}
        busyLabel="Desant…"
        tone={hiding ? "danger" : "warning"}
        icon={hiding ? <EyeOff size={24} /> : <ShieldCheck size={24} />}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    </>
  );
}

export function ReportModerationControls({
  findingName,
  reportId,
}: {
  findingName: string;
  reportId: string;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [decision, setDecision] = useState<ModerationDecision | null>(null);

  return (
    <form ref={form} action={moderateReportAction}>
      <input type="hidden" name="reportId" value={reportId} />
      <input type="hidden" name="decision" value={decision ?? ""} />
      <ModerationFormContent
        decision={decision}
        findingName={findingName}
        onCancel={() => setDecision(null)}
        onChoose={setDecision}
        onConfirm={() => form.current?.requestSubmit()}
      />
    </form>
  );
}
