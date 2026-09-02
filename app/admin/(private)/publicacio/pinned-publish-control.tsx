"use client";

import { Check, Send } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import styles from "./instagram.module.css";

export function PinnedPublishControl({ initialPublishedCount }: { initialPublishedCount: number }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [publishedCount, setPublishedCount] = useState(initialPublishedCount);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const allPublished = publishedCount === 3;

  async function publish() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/admin/publicacio/publish-pinned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = await response.json().catch(() => ({})) as {
        error?: string;
        message?: string;
        posts?: Array<{ status?: string }>;
        status?: string;
      };
      if (!response.ok) {
        throw new Error(payload.message || payload.error || "No s’han pogut publicar les tres peces.");
      }
      const count = payload.posts?.length ?? 0;
      setPublishedCount(count);
      setMessage(payload.status === "already_published"
        ? "Les tres publicacions ja existien a Buffer. No se n’ha duplicat cap."
        : "Les tres publicacions s’han enviat a Buffer. Quan apareguin a Instagram, fixa-les al perfil.");
      setDialogOpen(false);
    } catch (publicationError) {
      setError(publicationError instanceof Error
        ? publicationError.message
        : "No s’han pogut publicar les tres peces.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className={styles.pinnedActions}>
        <span className={styles.draftBadge} data-published={allPublished || undefined}>
          {allPublished ? <><Check aria-hidden="true" /> Publicades</> : `${publishedCount}/3 publicades`}
        </span>
        <button
          className={styles.publishButton}
          disabled={busy}
          onClick={() => setDialogOpen(true)}
          type="button"
        >
          <Send aria-hidden="true" />
          {allPublished ? "Comprova a Buffer" : "Publica les 3"}
        </button>
      </div>
      {message ? <p className={styles.publishFeedback} role="status">{message}</p> : null}
      <ConfirmDialog
        open={dialogOpen}
        busy={busy}
        title={allPublished ? "Comprovar de nou les publicacions?" : "Publicar ara les tres peces?"}
        description="S’enviaran al feed públic de @bolets.app. El procés evita duplicats, però fixar-les i comprovar l’ordre 01–02–03 continuarà sent una acció manual a Instagram."
        confirmLabel={allPublished ? "Comprova a Buffer" : "Publica-les ara"}
        busyLabel="Publicant…"
        error={error}
        icon={<Send aria-hidden="true" />}
        onCancel={() => {
          setDialogOpen(false);
          setError(null);
        }}
        onConfirm={() => { void publish(); }}
      />
    </>
  );
}
