"use client";

import { RefreshCw } from "lucide-react";
import { useFormStatus } from "react-dom";

export function RunBacklinkCycleButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      data-pending={pending}
    >
      <RefreshCw aria-hidden="true" />
      {pending ? "Executant el cicle…" : "Executa un cicle ara"}
    </button>
  );
}
