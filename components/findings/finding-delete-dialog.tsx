"use client";

import { Trash2, X } from "lucide-react";
import { useEffect, useRef } from "react";

export function FindingDeleteDialog({
  busy,
  confirmLabel,
  description,
  error,
  onCancel,
  onConfirm,
  open,
  title,
}: {
  busy: boolean;
  confirmLabel: string;
  description: string;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className="finding-delete-dialog"
      aria-labelledby="finding-delete-dialog-title"
      aria-describedby="finding-delete-dialog-description"
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div className="finding-delete-dialog-card">
        <button
          type="button"
          className="finding-delete-dialog-close"
          onClick={onCancel}
          disabled={busy}
          aria-label="Tancar"
        >
          <X size={20} aria-hidden="true" />
        </button>
        <span className="finding-delete-dialog-icon" aria-hidden="true">
          <Trash2 size={24} />
        </span>
        <div className="finding-delete-dialog-copy">
          <h2 id="finding-delete-dialog-title">{title}</h2>
          <p id="finding-delete-dialog-description">{description}</p>
        </div>
        {error ? <p className="finding-notice" data-tone="danger" aria-live="polite">{error}</p> : null}
        <div className="finding-delete-dialog-actions">
          <button type="button" className="finding-button-secondary" onClick={onCancel} disabled={busy}>
            Cancel·lar
          </button>
          <button type="button" className="finding-button-danger" onClick={onConfirm} disabled={busy}>
            <Trash2 size={17} aria-hidden="true" /> {busy ? "Eliminant…" : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
