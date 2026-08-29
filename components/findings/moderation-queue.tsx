"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Flag = { id: string; finding_id: string; reason: string; detail: string | null; created_at: string; user_findings: { reported_species_id: string; observed_on: string; public_cell_id: string; visibility: string; publication_state: string } | Array<{ reported_species_id: string; observed_on: string; public_cell_id: string; visibility: string; publication_state: string }> };

export function ModerationQueue() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const load = useCallback(async () => { const response = await fetch("/api/moderation", { cache: "no-store" }); const body = await response.json(); if (response.ok) setFlags(body.flags); else setMessage(body.error); }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  const act = async (flagId: string, action: "hide" | "dismiss") => { const response = await fetch("/api/moderation", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ flagId, action }) }); if (response.ok) await load(); else setMessage((await response.json()).error); };
  return <div className="finding-stack">{message ? <p className="finding-notice" data-tone="danger">{message}</p> : null}{flags.length ? flags.map((flag) => <article className="finding-account-card finding-stack" key={flag.id}><h2>{flag.reason}</h2><p>{flag.detail || "Sense detall"} · {new Intl.DateTimeFormat("ca-ES", { dateStyle: "medium" }).format(new Date(flag.created_at))}</p><div className="finding-inline-actions"><Link className="finding-button-secondary" href={`/troballes/${flag.finding_id}`}>Revisar publicació</Link><button className="finding-button-danger" onClick={() => void act(flag.id, "hide")}>Ocultar i resoldre</button><button className="finding-button-secondary" onClick={() => void act(flag.id, "dismiss")}>Descartar avís</button></div></article>) : <p className="finding-notice">No hi ha avisos oberts.</p>}</div>;
}
