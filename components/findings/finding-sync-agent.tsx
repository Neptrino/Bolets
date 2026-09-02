"use client";

import { ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { syncFindingOutbox } from "@/src/lib/findings/sync-client";
import { TurnstileWidget } from "./turnstile-widget";

const FINDING_TURNSTILE_ACTION = "finding_publish";

export function FindingSyncAgent() {
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sync = useCallback(async (turnstileToken?: string | null) => {
    const result = await syncFindingOutbox(turnstileToken);
    setVerificationRequired(result.turnstileRequired);
    if (!result.turnstileRequired) setToken(null);
  }, []);

  useEffect(() => {
    const backgroundSync = () => void sync();
    backgroundSync();
    window.addEventListener("online", backgroundSync);
    const onVisibility = () => { if (document.visibilityState === "visible") backgroundSync(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("online", backgroundSync);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [sync]);

  if (!verificationRequired) return null;
  return <aside className="finding-sync-verification" aria-live="polite">
    <div>
      <ShieldCheck size={20} aria-hidden="true" />
      <strong>Verifica la publicació pendent</strong>
      <p>Aquesta comprovació evita publicacions automàtiques i no comparteix les dades de la troballa.</p>
    </div>
    <TurnstileWidget action={FINDING_TURNSTILE_ACTION} onToken={setToken} />
    <button
      className="finding-button"
      type="button"
      disabled={!token || busy}
      onClick={() => {
        setBusy(true);
        void sync(token).finally(() => setBusy(false));
      }}
    >
      {busy ? "Verificant…" : "Verificar i publicar"}
    </button>
  </aside>;
}
