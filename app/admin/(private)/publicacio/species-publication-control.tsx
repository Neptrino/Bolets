"use client";

import { Ban, Pencil, RotateCcw, Save, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormSelect, type FormSelectOption } from "@/components/ui/form-select";

import styles from "./instagram.module.css";

type InstagramSpeciesPublicationStatus = "cancelled" | "scheduled";

const SpeciesOptionsContext = createContext<FormSelectOption[] | null>(null);

export function SpeciesPublicationControls({
  children,
  speciesOptions,
}: {
  children: ReactNode;
  speciesOptions: FormSelectOption[];
}) {
  return <SpeciesOptionsContext.Provider value={speciesOptions}>{children}</SpeciesOptionsContext.Provider>;
}

type Props = {
  automaticSpeciesId: string;
  captionOverride: string | null;
  hasOverride: boolean;
  publicationDate: string;
  speciesId: string;
  status: InstagramSpeciesPublicationStatus;
};

export function SpeciesPublicationControl({
  automaticSpeciesId,
  captionOverride,
  hasOverride,
  publicationDate,
  speciesId: initialSpeciesId,
  status: initialStatus,
}: Props) {
  const speciesOptions = useContext(SpeciesOptionsContext);
  if (!speciesOptions) throw new Error("SpeciesPublicationControl requires SpeciesPublicationControls");
  const router = useRouter();
  const [editorOpen, setEditorOpen] = useState(false);
  const [skipConfirmationOpen, setSkipConfirmationOpen] = useState(false);
  const [speciesId, setSpeciesId] = useState(initialSpeciesId);
  const [caption, setCaption] = useState(captionOverride ?? "");
  const [status, setStatus] = useState(initialStatus);
  const [overridePresent, setOverridePresent] = useState(hasOverride);
  const [busyAction, setBusyAction] = useState<"save" | "skip" | "restore" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"error" | "success">("success");

  async function update(nextStatus: InstagramSpeciesPublicationStatus) {
    setBusyAction(nextStatus === "cancelled" ? "skip" : "save");
    setMessage(null);
    try {
      const response = await fetch("/admin/publicacio/species-overrides", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          captionOverride: caption.trim() || null,
          publicationDate,
          speciesId: speciesId === automaticSpeciesId ? null : speciesId,
          status: nextStatus,
        }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No s’han pogut desar els canvis.");
      setStatus(nextStatus);
      setOverridePresent(true);
      setMessageKind("success");
      setMessage(nextStatus === "cancelled"
        ? "Aquesta publicació s’ometrà."
        : "Canvis desats per a aquesta publicació.");
      setEditorOpen(false);
      router.refresh();
    } catch (error) {
      setMessageKind("error");
      setMessage(error instanceof Error ? error.message : "No s’han pogut desar els canvis.");
    } finally {
      setBusyAction(null);
      setSkipConfirmationOpen(false);
    }
  }

  async function restore() {
    setBusyAction("restore");
    setMessage(null);
    try {
      const response = await fetch("/admin/publicacio/species-overrides", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicationDate }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No s’ha pogut restaurar la publicació.");
      setSpeciesId(automaticSpeciesId);
      setCaption("");
      setStatus("scheduled");
      setOverridePresent(false);
      setEditorOpen(false);
      setMessageKind("success");
      setMessage("S’ha restaurat la versió automàtica.");
      router.refresh();
    } catch (error) {
      setMessageKind("error");
      setMessage(error instanceof Error ? error.message : "No s’ha pogut restaurar la publicació.");
    } finally {
      setBusyAction(null);
    }
  }

  const busy = busyAction !== null;
  return <div className={styles.speciesControl}>
    <div className={styles.speciesControlBar}>
      <span className={styles.publicationState} data-status={status} data-edited={overridePresent || undefined}>
        {status === "cancelled" ? "Omesa" : overridePresent ? "Personalitzada" : "Automàtica"}
      </span>
      <button
        className={styles.manageButton}
        disabled={busy}
        onClick={() => setEditorOpen((open) => !open)}
        type="button"
      >
        {editorOpen ? <><SlidersHorizontal aria-hidden="true" /> Tanca</> : <><Pencil aria-hidden="true" /> Edita</>}
      </button>
    </div>

    {editorOpen ? <div className={styles.speciesEditor}>
      <div className={styles.speciesEditorField}>
        <label>Espècie</label>
        <FormSelect
          aria-label="Espècie de la publicació"
          disabled={busy}
          onValueChange={setSpeciesId}
          options={speciesOptions}
          value={speciesId}
        />
        <small>Canvia les cinc diapositives i el text automàtic.</small>
      </div>
      <label className={styles.speciesCaptionField}>
        <span>Text personalitzat <small>Opcional</small></span>
        <textarea
          disabled={busy}
          maxLength={2100}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="Deixa-ho buit per conservar el text automàtic de l’espècie seleccionada."
          value={caption}
        />
        <small>{caption.length}/2100 · El marcador intern s’afegeix automàticament.</small>
      </label>
      <div className={styles.speciesEditorActions}>
        <button disabled={busy} onClick={() => void update("scheduled")} type="button">
          <Save aria-hidden="true" /> {busyAction === "save" ? "Desant…" : "Desa els canvis"}
        </button>
        <button className={styles.skipButton} disabled={busy || status === "cancelled"} onClick={() => setSkipConfirmationOpen(true)} type="button">
          <Ban aria-hidden="true" /> Omet aquesta publicació
        </button>
        {overridePresent ? <button className={styles.restoreButton} disabled={busy} onClick={() => void restore()} type="button">
          <RotateCcw aria-hidden="true" /> {busyAction === "restore" ? "Restaurant…" : "Restaura l’automàtica"}
        </button> : null}
      </div>
    </div> : null}

    {message ? <p className={styles.speciesControlMessage} data-kind={messageKind} role="status">{message}</p> : null}
    <ConfirmDialog
      busy={busyAction === "skip"}
      confirmLabel="Omet la publicació"
      description="El temporitzador continuarà actiu, però no enviarà aquesta peça a Buffer. La podràs restaurar abans de l’hora prevista."
      icon={<Ban aria-hidden="true" />}
      onCancel={() => setSkipConfirmationOpen(false)}
      onConfirm={() => void update("cancelled")}
      open={skipConfirmationOpen}
      title="Ometre aquesta publicació?"
      tone="warning"
    />
  </div>;
}
