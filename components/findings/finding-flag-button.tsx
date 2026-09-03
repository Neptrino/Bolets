"use client";

import { CircleAlert, Send, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { FormSelect } from "@/components/ui/form-select";

type FlagReason = "spam" | "privacy" | "unsafe" | "other";

export function FindingFlagButton({ findingId }: { findingId: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState<FlagReason>("other");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  const close = () => {
    if (busy) return;
    setOpen(false);
  };

  const flag = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/findings/${findingId}/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, detail: detail.trim() || undefined }),
      });
      const body = response.ok ? null : await response.json();
      if (!response.ok) {
        setError(body?.error ?? "No s’ha pogut enviar l’avís.");
        return;
      }
      setOpen(false);
      setReason("other");
      setDetail("");
      setMessage("Avís enviat a moderació.");
    } catch {
      setError("No s’ha pogut enviar l’avís. Torna-ho a provar.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="finding-stack">
    <button className="finding-button-secondary" type="button" onClick={() => { setError(null); setMessage(null); setOpen(true); }}>Avisar d’un problema</button>
    {message ? <small aria-live="polite">{message}</small> : null}
    <dialog
      ref={dialog}
      className="finding-report-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <form className="finding-report-dialog-card" onSubmit={flag}>
        <button type="button" className="finding-report-dialog-close" onClick={close} disabled={busy} aria-label="Tancar">
          <X size={20} aria-hidden="true" />
        </button>
        <span className="finding-report-dialog-icon" aria-hidden="true"><CircleAlert size={24} /></span>
        <div className="finding-report-dialog-copy">
          <h2 id={titleId}>Avisar d’un problema</h2>
          <p id={descriptionId}>Explica’ns què cal revisar. No hi incloguis dades personals ni sensibles.</p>
        </div>
        <div className="finding-field"><span>Tipus de problema</span>
          <FormSelect aria-label="Tipus de problema" value={reason} onValueChange={(value) => setReason(value as FlagReason)} options={[{ value: "other", label: "Informació incorrecta" }, { value: "privacy", label: "Privadesa" }, { value: "unsafe", label: "Contingut insegur" }, { value: "spam", label: "Contingut brossa" }]} portalContainer={dialog} />
        </div>
        <label className="finding-field">Detalls opcionals
          <textarea value={detail} maxLength={500} onChange={(event) => setDetail(event.target.value)} placeholder="Què hauríem de revisar?" />
          <small>{detail.length}/500</small>
        </label>
        {error ? <p className="finding-notice" data-tone="danger" aria-live="polite">{error}</p> : null}
        <div className="finding-report-dialog-actions">
          <button type="button" className="finding-button-secondary" onClick={close} disabled={busy}>Cancel·lar</button>
          <button type="submit" className="finding-button" disabled={busy}><Send size={17} aria-hidden="true" /> {busy ? "Enviant…" : "Enviar l’avís"}</button>
        </div>
      </form>
    </dialog>
  </div>;
}
