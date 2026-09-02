"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type FindingContext = { reported_species_id: string; observed_on: string; public_cell_id: string; visibility: string; publication_state: string };
type ModerationItem = {
  id: string;
  finding_id: string;
  source: "flag" | "signal";
  reason?: string;
  detail?: string | null;
  kind?: "near_duplicate" | "repeated_content";
  created_at: string;
  report_count?: number;
  user_findings: FindingContext | FindingContext[];
};

export function ModerationQueue() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const load = useCallback(async () => { const response = await fetch("/api/moderation", { cache: "no-store" }); const body = await response.json(); if (response.ok) setItems(body.items); else setMessage(body.error); }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  const act = async (item: ModerationItem, action: "hide" | "dismiss") => { const response = await fetch("/api/moderation", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, source: item.source, action }) }); if (response.ok) await load(); else setMessage((await response.json()).error); };
  return <div className="finding-stack">{message ? <p className="finding-notice" data-tone="danger">{message}</p> : null}{items.length ? items.map((item) => <article className="finding-account-card finding-stack" key={`${item.source}:${item.id}`}><h2>{item.source === "signal" ? item.kind === "near_duplicate" ? "Fotografia molt similar" : "Fotografia repetida" : item.reason}</h2>{(item.report_count ?? 0) >= 2 ? <strong className="finding-visibility-badge" data-visibility="public">Prioritat · {item.report_count} avisos independents</strong> : null}<p>{item.source === "signal" ? "Coincidència automàtica pendent de revisió humana" : item.detail || "Sense detall"} · {new Intl.DateTimeFormat("ca-ES", { dateStyle: "medium" }).format(new Date(item.created_at))}</p><div className="finding-inline-actions"><Link className="finding-button-secondary" href={`/troballes/${item.finding_id}`}>Revisar publicació</Link><button className="finding-button-danger" onClick={() => void act(item, "hide")}>Ocultar i resoldre</button><button className="finding-button-secondary" onClick={() => void act(item, "dismiss")}>{item.source === "signal" ? "Acceptar coincidència" : "Descartar avís"}</button></div></article>) : <p className="finding-notice">No hi ha avisos oberts.</p>}</div>;
}
