"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PasskeySettings } from "@/components/findings/passkey-settings";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { deleteOutboxFinding, listOutboxFindings } from "@/src/lib/findings/outbox";

export function AccountSettings({ email }: { email: string }) {
  const router = useRouter();
  const [alias, setAlias] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void fetch("/api/me/profile", { cache: "no-store" }).then((response) => response.json()).then((profile) => setAlias(profile.alias ?? "")); }, []);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage(null);
    const response = await fetch("/api/me/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alias: alias.trim() || null }) });
    const body = await response.json(); setBusy(false); setMessage(response.ok ? "Àlies desat." : body.error);
  };
  const signOut = async () => { await createSupabaseBrowserClient().auth.signOut({ scope: "global" }); router.replace("/"); router.refresh(); };
  const deleteAccount = async () => {
    if (!window.confirm("Vols eliminar el compte? Les dades privades i les fotos s’eliminaran. Les troballes ja públiques conservaran només el dia, l’espècie i la casella de 10 × 10 km, sense cap vincle amb tu.")) return;
    setBusy(true);
    const response = await fetch("/api/me/account", { method: "DELETE" });
    if (response.ok) { const pending = await listOutboxFindings(); await Promise.all(pending.map((record) => deleteOutboxFinding(record.draft.clientReportId))); router.replace("/"); router.refresh(); }
    else { setMessage((await response.json()).error); setBusy(false); }
  };
  return <div className="finding-stack">
    <section className="finding-account-card finding-stack"><h2>Identitat pública</h2><p>Compte: <strong>{email}</strong>. El correu mai no es publica.</p><form className="finding-stack" onSubmit={save}><label className="finding-field">Àlies opcional<input minLength={3} maxLength={30} value={alias} onChange={(event) => setAlias(event.target.value)} placeholder="Per exemple, BoscEndins" /><small>Encara que tinguis àlies, decideixes troballa per troballa si es mostra.</small></label><button className="finding-button" disabled={busy}>Desar l’àlies</button></form>{message ? <p className="finding-notice">{message}</p> : null}</section>
    <PasskeySettings />
    <section className="finding-account-card finding-stack"><h2>Sessió</h2><button className="finding-button-secondary" onClick={() => void signOut()}>Tancar sessió a tots els dispositius</button></section>
    <section className="finding-account-card finding-stack"><h2>Eliminar el compte</h2><p>S’esborren el punt exacte, les notes, les fotos i les troballes privades. Les aportacions que ja eren públiques es conserven anonimitzades només a la quadrícula de 10 km.</p><button className="finding-button-danger" onClick={() => void deleteAccount()} disabled={busy}>Eliminar definitivament el compte</button></section>
  </div>;
}
