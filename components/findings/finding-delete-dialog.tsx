import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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
  return <ConfirmDialog open={open} busy={busy} title={title} description={description} confirmLabel={confirmLabel} busyLabel="Eliminant…" error={error} tone="danger" icon={<Trash2 size={24} />} onCancel={onCancel} onConfirm={onConfirm} />;
}
