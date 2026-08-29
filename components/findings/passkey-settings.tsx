"use client";

import type { PasskeyListItem } from "@supabase/supabase-js";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { FindingDeleteDialog } from "@/components/findings/finding-delete-dialog";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";

function passkeyErrorMessage(error: unknown, action: "load" | "register" | "delete") {
  const details = error as { code?: string; name?: string } | null;
  if (details?.code === "passkey_disabled") {
    return "Les claus d’accés encara no estan disponibles en aquest servidor.";
  }
  if (details?.code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED") {
    return "Aquesta clau d’accés ja està afegida al compte.";
  }
  if (details?.code === "ERROR_CEREMONY_ABORTED" || details?.name === "NotAllowedError") {
    return "No s’ha completat l’operació. No s’ha fet cap canvi.";
  }
  if (action === "load") return "No hem pogut carregar les claus d’accés.";
  if (action === "delete") return "No hem pogut eliminar la clau d’accés.";
  return "No hem pogut afegir la clau d’accés. Torna-ho a provar.";
}

function passkeyName(passkey: PasskeyListItem) {
  return passkey.friendly_name?.trim() || "Clau d’accés";
}

export function PasskeySettings() {
  const [passkeys, setPasskeys] = useState<PasskeyListItem[]>([]);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"register" | "delete" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PasskeyListItem | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await createSupabaseBrowserClient().auth.passkey.list();
    setLoading(false);
    if (error) {
      setMessage(passkeyErrorMessage(error, "load"));
      return;
    }
    setPasskeys(data);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const canUsePasskeys = window.isSecureContext && "PublicKeyCredential" in window;
      setSupported(canUsePasskeys);
      if (canUsePasskeys) void load();
      else setLoading(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const register = async () => {
    setBusy("register");
    setMessage(null);
    const { error } = await createSupabaseBrowserClient().auth.registerPasskey();
    if (error) {
      setMessage(passkeyErrorMessage(error, "register"));
      setBusy(null);
      return;
    }
    await load();
    setBusy(null);
    setMessage("Clau d’accés afegida. Ja la pots utilitzar per entrar sense correu.");
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setBusy("delete");
    setMessage(null);
    const { error } = await createSupabaseBrowserClient().auth.passkey.delete({
      passkeyId: deleteTarget.id,
    });
    if (error) {
      setMessage(passkeyErrorMessage(error, "delete"));
      setBusy(null);
      return;
    }
    setPasskeys((current) => current.filter((passkey) => passkey.id !== deleteTarget.id));
    setDeleteTarget(null);
    setBusy(null);
    setMessage("Clau d’accés eliminada.");
  };

  return (
    <section className="finding-account-card finding-stack">
      <div className="finding-account-section-heading">
        <span className="finding-account-section-icon" aria-hidden="true"><KeyRound size={21} /></span>
        <div>
          <h2>Claus d’accés <small>en proves</small></h2>
          <p>Entra amb l’empremta, la cara o el codi del dispositiu. El correu continua disponible com a recuperació.</p>
        </div>
      </div>

      {supported === false ? (
        <p className="finding-notice">Aquest navegador o aquesta connexió no admet claus d’accés.</p>
      ) : null}
      {loading ? <p className="finding-notice">Carregant les claus d’accés…</p> : null}

      {!loading && supported ? (
        <>
          {passkeys.length ? (
            <ul className="finding-passkey-list">
              {passkeys.map((passkey) => (
                <li key={passkey.id}>
                  <span className="finding-account-section-icon" aria-hidden="true"><KeyRound size={18} /></span>
                  <span>
                    <strong>{passkeyName(passkey)}</strong>
                    <small>
                      Afegida el {new Intl.DateTimeFormat("ca-ES", { dateStyle: "medium" }).format(new Date(passkey.created_at))}
                      {passkey.last_used_at
                        ? ` · darrer ús ${new Intl.DateTimeFormat("ca-ES", { dateStyle: "medium" }).format(new Date(passkey.last_used_at))}`
                        : ""}
                    </small>
                  </span>
                  <button
                    type="button"
                    className="finding-button-secondary finding-passkey-remove"
                    onClick={() => setDeleteTarget(passkey)}
                    disabled={busy !== null}
                    aria-label={`Eliminar ${passkeyName(passkey)}`}
                  >
                    <Trash2 size={17} aria-hidden="true" />
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="finding-notice">Encara no has afegit cap clau d’accés.</p>
          )}
          <button
            type="button"
            className="finding-button-secondary"
            onClick={() => void register()}
            disabled={busy !== null}
          >
            <Plus size={18} aria-hidden="true" />
            {busy === "register" ? "Afegint…" : "Afegir una clau d’accés"}
          </button>
        </>
      ) : null}

      {message ? <p className="finding-notice" aria-live="polite">{message}</p> : null}

      <FindingDeleteDialog
        busy={busy === "delete"}
        confirmLabel="Eliminar la clau"
        description="Ja no podràs utilitzar aquesta clau d’accés per entrar. El codi per correu i les altres claus continuaran funcionant."
        error={deleteTarget ? message : null}
        onCancel={() => {
          if (busy !== "delete") {
            setDeleteTarget(null);
            setMessage(null);
          }
        }}
        onConfirm={() => void remove()}
        open={Boolean(deleteTarget)}
        title="Eliminar aquesta clau d’accés?"
      />
    </section>
  );
}
