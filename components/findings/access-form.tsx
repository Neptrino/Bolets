"use client";

import { KeyRound, LogIn, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { resolveAccessDestination } from "@/src/lib/findings/access-destination";
import { syncFindingOutbox } from "@/src/lib/findings/sync-client";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { isNewAuthUser, queueUmamiEvent, UMAMI_EVENTS } from "@/src/lib/umami-goals";

type AccessAction = "google" | "passkey" | "email" | "code";

function passkeyErrorMessage(error: unknown) {
  const details = error as { code?: string; name?: string } | null;
  if (details?.code === "passkey_disabled") {
    return "Les claus d’accés encara no estan disponibles en aquest servidor.";
  }
  if (details?.code === "ERROR_CEREMONY_ABORTED" || details?.name === "NotAllowedError") {
    return "No s’ha completat l’accés. Pots tornar-ho a provar quan vulguis.";
  }
  if (details?.code === "ERROR_INVALID_DOMAIN" || details?.code === "ERROR_INVALID_RP_ID") {
    return "La clau d’accés no és vàlida per a aquest domini.";
  }
  return "No hem pogut entrar amb la clau d’accés. Prova el codi per correu si el problema continua.";
}

export function AccessForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState<AccessAction | null>(null);
  const [message, setMessage] = useState<string | null>(() =>
    params.get("error") === "oauth"
      ? "No hem pogut completar l’accés amb Google. Torna-ho a provar o entra amb el correu."
      : null,
  );
  const destination = resolveAccessDestination(params.get("retorn"));

  const finishSignIn = async () => {
    await syncFindingOutbox();
    router.replace(destination);
    router.refresh();
  };

  const signInWithGoogle = async () => {
    setBusy("google");
    setMessage(null);
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("retorn", destination);
    const { data, error } = await createSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl.toString(), skipBrowserRedirect: true },
    });
    if (error) {
      setMessage("No hem pogut iniciar l’accés amb Google. Torna-ho a provar o entra amb el correu.");
      setBusy(null);
      return;
    }
    if (!data.url) {
      setMessage("No hem pogut obrir l’accés amb Google. Torna-ho a provar o entra amb el correu.");
      setBusy(null);
      return;
    }
    queueUmamiEvent(UMAMI_EVENTS.signupStarted);
    window.location.assign(data.url);
  };

  const signInWithPasskey = async () => {
    if (!window.isSecureContext || !("PublicKeyCredential" in window)) {
      setMessage("Aquest navegador o aquesta connexió no admet claus d’accés. Pots entrar amb el correu.");
      return;
    }
    setBusy("passkey");
    setMessage(null);
    const { error } = await createSupabaseBrowserClient().auth.signInWithPasskey();
    if (error) {
      setMessage(passkeyErrorMessage(error));
      setBusy(null);
      return;
    }
    await finishSignIn();
  };

  const sendCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy("email");
    setMessage(null);
    const response = await fetch("/api/auth/email-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setBusy(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setMessage(body?.error ?? "No hem pogut enviar el codi. Torna-ho a provar d’aquí a uns minuts.");
    }
    else {
      queueUmamiEvent(UMAMI_EVENTS.signupStarted);
      setStep("code");
    }
  };

  const verifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy("code");
    setMessage(null);
    const { data, error } = await createSupabaseBrowserClient().auth.verifyOtp({
      email,
      token: code.replace(/\s/g, ""),
      type: "email",
    });
    if (error) {
      setMessage("El codi no és correcte o ha caducat.");
      setBusy(null);
      return;
    }
    if (isNewAuthUser(data.user)) queueUmamiEvent(UMAMI_EVENTS.userSignup);
    await finishSignIn();
  };

  return (
    <div className="finding-account-card finding-stack">
      {step === "email" ? (
        <>
          <div className="finding-auth-options" aria-label="Opcions d’accés">
            {googleEnabled ? (
              <button
                className="finding-button-secondary finding-auth-option"
                type="button"
                disabled={busy !== null}
                onClick={() => void signInWithGoogle()}
              >
                <LogIn size={18} aria-hidden="true" />
                {busy === "google" ? "Obrint Google…" : "Continuar amb Google"}
              </button>
            ) : null}
            <button
              className="finding-button-secondary finding-auth-option"
              type="button"
              disabled={busy !== null}
              onClick={() => void signInWithPasskey()}
            >
              <KeyRound size={18} aria-hidden="true" />
              {busy === "passkey" ? "Comprovant…" : "Entrar amb una clau d’accés"}
            </button>
            <small>La clau d’accés funciona després d’afegir-la des del teu compte.</small>
          </div>

          <div className="finding-auth-divider"><span>o rep un codi per correu</span></div>

          <form className="finding-stack" onSubmit={sendCode}>
            <label className="finding-field">
              Correu electrònic
              <input
                type="email"
                autoComplete="email"
                required
                disabled={busy !== null}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@exemple.cat"
              />
            </label>
            <p className="finding-notice">No cal crear ni recordar cap contrasenya.</p>
            {message ? <p className="finding-notice" data-tone="danger" aria-live="polite">{message}</p> : null}
            <button className="finding-button" type="submit" disabled={busy !== null}>
              <Mail size={18} aria-hidden="true" />
              {busy === "email" ? "Enviant…" : "Enviar-me el codi"}
            </button>
          </form>
        </>
      ) : (
        <form className="finding-stack" onSubmit={verifyCode}>
          <p>Hem enviat un codi a <strong>{email}</strong>.</p>
          <label className="finding-field">
            Codi de verificació
            <input
              className="finding-auth-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              minLength={6}
              maxLength={8}
              disabled={busy !== null}
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </label>
          {message ? <p className="finding-notice" data-tone="danger" aria-live="polite">{message}</p> : null}
          <button className="finding-button" type="submit" disabled={busy !== null}>
            {busy === "code" ? "Comprovant…" : "Entrar"}
          </button>
          <button
            className="finding-button-secondary"
            type="button"
            disabled={busy !== null}
            onClick={() => {
              setStep("email");
              setCode("");
              setMessage(null);
            }}
          >
            Canviar el correu
          </button>
        </form>
      )}
    </div>
  );
}
