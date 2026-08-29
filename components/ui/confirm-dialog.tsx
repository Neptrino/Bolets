"use client";

import { CircleAlert, X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

type ConfirmDialogProps = {
  open: boolean;
  busy: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busyLabel?: string;
  cancelLabel?: string;
  error?: string | null;
  icon?: ReactNode;
  tone?: "warning" | "danger";
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  busy,
  title,
  description,
  confirmLabel,
  busyLabel = "Processant…",
  cancelLabel = "Cancel·lar",
  error = null,
  icon,
  tone = "warning",
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return <dialog
    ref={dialog}
    className="site-confirm-dialog"
    aria-labelledby={titleId}
    aria-describedby={descriptionId}
    aria-busy={busy}
    onCancel={(event) => {
      event.preventDefault();
      if (!busy) onCancel();
    }}
    onClick={(event) => {
      if (event.target === event.currentTarget && !busy) onCancel();
    }}
  >
    <div className="site-confirm-dialog-card" data-tone={tone}>
      <button type="button" className="site-confirm-dialog-close" onClick={onCancel} disabled={busy} aria-label="Tancar"><X size={20} aria-hidden="true" /></button>
      <span className="site-confirm-dialog-icon" aria-hidden="true">{icon ?? <CircleAlert size={24} />}</span>
      <div className="site-confirm-dialog-copy"><h2 id={titleId}>{title}</h2><p id={descriptionId}>{description}</p></div>
      {error ? <p className="site-confirm-dialog-error" aria-live="polite">{error}</p> : null}
      <div className="site-confirm-dialog-actions">
        <button type="button" className="site-confirm-dialog-button" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
        <button type="button" className="site-confirm-dialog-button" data-tone={tone} onClick={onConfirm} disabled={busy}>{busy ? busyLabel : confirmLabel}</button>
      </div>
    </div>
  </dialog>;
}
