"use client";

import { EyeOff } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import actionStyles from "../management-actions.module.css";
import { hideFindingAction } from "./actions";

function HideFindingControl({
  confirming,
  findingName,
  onCancel,
  onConfirm,
  onOpen,
}: {
  confirming: boolean;
  findingName: string;
  onCancel: () => void;
  onConfirm: () => void;
  onOpen: () => void;
}) {
  const { pending } = useFormStatus();
  return (
    <>
      <button type="button" data-tone="danger" disabled={pending} onClick={onOpen}>
        {pending ? "Retirant…" : "Retirar"}
        <span className="visually-hidden"> {findingName} del mapa públic</span>
      </button>
      <ConfirmDialog
        open={confirming}
        busy={pending}
        title={`Retirar ${findingName} del públic?`}
        description="La troballa deixarà de ser pública i es revocarà l’accés que hagués concedit. No s’eliminaran les dades privades del seu propietari."
        confirmLabel="Sí, retirar-la"
        busyLabel="Retirant…"
        tone="danger"
        icon={<EyeOff size={24} />}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    </>
  );
}

export function FindingAdminActions({
  findingId,
  findingName,
  openFlagCount,
  publicationState,
  showDetailLink = true,
  visibility,
}: {
  findingId: string;
  findingName: string;
  openFlagCount: number;
  publicationState: "draft" | "published" | "hidden";
  showDetailLink?: boolean;
  visibility: "private" | "public";
}) {
  const form = useRef<HTMLFormElement>(null);
  const [confirming, setConfirming] = useState(false);
  const isPublic = visibility === "public" && publicationState === "published";
  const canHideDirectly = isPublic && openFlagCount === 0;

  return (
    <div className={actionStyles.tableActions}>
      {showDetailLink ? <Link href={`/admin/troballes/${findingId}`}>Veure</Link> : null}
      {isPublic ? <Link href={`/troballes/${findingId}`}>Vista pública</Link> : null}
      {openFlagCount > 0 ? (
        <Link href={`/admin/avisos?status=open&finding=${findingId}`}>Revisar {openFlagCount === 1 ? "avís" : "avisos"}</Link>
      ) : null}
      {canHideDirectly ? (
        <form ref={form} action={hideFindingAction}>
          <input type="hidden" name="findingId" value={findingId} />
          <HideFindingControl
            confirming={confirming}
            findingName={findingName}
            onCancel={() => setConfirming(false)}
            onConfirm={() => form.current?.requestSubmit()}
            onOpen={() => setConfirming(true)}
          />
        </form>
      ) : null}
    </div>
  );
}
