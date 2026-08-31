"use client";

import Image from "next/image";
import Link from "next/link";
import { Ellipsis, LockKeyhole, MapPinned, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type {
  FindingOutboxRecord,
  FindingVisibility,
  OwnerFinding,
  OwnerFindingMapItem,
} from "@/src/lib/findings/types";
import { deleteOutboxFinding, listOutboxFindings } from "@/src/lib/findings/outbox";
import { syncFindingOutbox } from "@/src/lib/findings/sync-client";
import { FindingDeleteDialog } from "@/components/findings/finding-delete-dialog";
import { PersonalFindingsMap } from "@/components/findings/personal-findings-map";
import { FormSelect } from "@/components/ui/form-select";

type DeleteTarget =
  | { kind: "pending"; record: FindingOutboxRecord }
  | { kind: "synced"; finding: OwnerFinding };

type FindingsPageResponse = {
  findings: OwnerFinding[];
  hasMore: boolean;
  page: number;
  pageSize: number;
  total: number;
};

type VisibilityFilter = "all" | FindingVisibility;

function FindingActionsMenu({ children, label }: { children: ReactNode; label: string }) {
  const details = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!details.current?.contains(event.target as Node)) details.current?.removeAttribute("open");
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !details.current?.open) return;
      details.current.removeAttribute("open");
      details.current.querySelector("summary")?.focus();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return <details ref={details} className="finding-personal-menu">
    <summary aria-label={label} title="Accions"><Ellipsis size={20} aria-hidden="true" /></summary>
    <div className="finding-personal-menu-panel" onClick={() => details.current?.removeAttribute("open")}>
      {children}
    </div>
  </details>;
}

export function PersonalFindings() {
  const [findings, setFindings] = useState<OwnerFinding[]>([]);
  const [mapFindings, setMapFindings] = useState<OwnerFindingMapItem[]>([]);
  const [outbox, setOutbox] = useState<FindingOutboxRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const readPage = useCallback(async (
    requestedPage: number,
    append: boolean,
    signal?: AbortSignal,
  ) => {
    const params = new URLSearchParams({ page: String(requestedPage) });
    if (query.trim()) params.set("q", query.trim());
    if (visibility !== "all") params.set("visibility", visibility);
    const response = await fetch(`/api/me/findings?${params}`, { cache: "no-store", signal });
    const payload = await response.json() as FindingsPageResponse & { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "No s’han pogut carregar les troballes.");
    setFindings((current) => append ? [...current, ...payload.findings] : payload.findings);
    setTotal(payload.total);
    setPage(payload.page);
    setHasMore(payload.hasMore);
  }, [query, visibility]);

  const readMap = useCallback(async () => {
    setMapLoading(true);
    try {
      const response = await fetch("/api/me/findings/map", { cache: "no-store" });
      const payload = await response.json() as { findings?: OwnerFindingMapItem[]; error?: string };
      if (!response.ok || !payload.findings) throw new Error(payload.error ?? "No s’ha pogut carregar el mapa privat.");
      setMapFindings(payload.findings);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No s’ha pogut carregar el mapa privat.");
    } finally {
      setMapLoading(false);
    }
  }, []);

  const readOutbox = useCallback(async () => {
    setOutbox(await listOutboxFindings());
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void Promise.all([readMap(), readOutbox()]), 0);
    return () => window.clearTimeout(timer);
  }, [readMap, readOutbox]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      readPage(1, false, controller.signal)
        .catch((error: unknown) => {
          if (!controller.signal.aborted)
            setMessage(error instanceof Error ? error.message : "No s’han pogut carregar les troballes.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [readPage]);

  const refresh = async () => {
    await Promise.all([readPage(1, false), readMap(), readOutbox()]);
  };

  const changePrivacy = async (finding: OwnerFinding) => {
    const response = await fetch(`/api/findings/${finding.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visibility: finding.visibility === "public" ? "private" : "public" }) });
    if (response.ok) await refresh();
    else setMessage((await response.json()).error);
  };

  const changeAliasVisibility = async (finding: OwnerFinding) => {
    const response = await fetch(`/api/findings/${finding.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ showAlias: !finding.showAlias }) });
    if (response.ok) await readPage(1, false);
    else setMessage((await response.json()).error);
  };

  const sync = async () => {
    setMessage("Sincronitzant les troballes pendents…");
    const result = await syncFindingOutbox();
    setMessage(result.pending ? "Encara hi ha troballes pendents. Comprova la cobertura i torna-ho a provar." : "Tot està sincronitzat.");
    await refresh();
  };

  const confirmRemoval = async () => {
    if (!deleteTarget || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      if (deleteTarget.kind === "pending") {
        await deleteOutboxFinding(deleteTarget.record.draft.clientReportId);
        setOutbox((current) => current.filter((record) =>
          record.draft.clientReportId !== deleteTarget.record.draft.clientReportId));
      } else {
        const response = await fetch(`/api/findings/${deleteTarget.finding.id}`, { method: "DELETE" });
        const payload = await response.json().catch(() => null) as { error?: string; warning?: string } | null;
        if (!response.ok) throw new Error(payload?.error ?? "No s’ha pogut eliminar la troballa.");
        if (payload?.warning) setMessage(payload.warning);
        await refresh();
      }
      setDeleteTarget(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "No s’ha pogut eliminar la troballa.");
    } finally {
      setDeleteBusy(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      await readPage(page + 1, true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No s’han pogut carregar més troballes.");
    } finally {
      setLoadingMore(false);
    }
  };

  const deleteDialog = deleteTarget?.kind === "pending"
    ? {
        title: "Eliminar aquesta troballa pendent?",
        description: "S’eliminaran les dades i les fotos desades en aquest dispositiu. Aquesta acció no es pot desfer.",
        confirmLabel: "Eliminar del dispositiu",
      }
    : deleteTarget?.finding.visibility === "public"
      ? {
          title: "Retirar aquesta troballa?",
          description: "Desapareixerà del mapa públic i del teu quadern. També eliminarem la ubicació exacta, les notes privades i les fotos.",
          confirmLabel: "Retirar-la",
        }
      : {
          title: "Eliminar aquesta troballa?",
          description: "S’eliminaran definitivament la troballa privada i les fotos. Aquesta acció no es pot desfer.",
          confirmLabel: "Eliminar-la",
        };

  const filtersActive = Boolean(query.trim()) || visibility !== "all";

  return <div className="finding-stack">
    {outbox.length ? <div className="finding-account-card finding-stack"><h2>{outbox.length} {outbox.length === 1 ? "troballa pendent" : "troballes pendents"} al dispositiu</h2>{outbox.map((record) => <div className="finding-inline-actions" key={record.draft.clientReportId}><span>{record.draft.speciesId} · {new Intl.DateTimeFormat("ca-ES", { dateStyle: "medium" }).format(new Date(record.draft.observedAt))}</span><button className="finding-button-secondary" onClick={() => { setDeleteError(null); setDeleteTarget({ kind: "pending", record }); }}>Eliminar del dispositiu</button></div>)}<button className="finding-button" onClick={() => void sync()}>Sincronitzar ara</button></div> : null}
    {message ? <p className="finding-notice">{message}</p> : null}
    {mapLoading ? <p className="finding-notice">Preparant el mapa privat…</p> : mapFindings.length ? <PersonalFindingsMap findings={mapFindings} /> : null}

    <section className="finding-library" aria-labelledby="finding-library-title">
      <div className="finding-library-heading">
        <div><p>Arxiu del quadern</p><h2 id="finding-library-title">Troballes desades</h2></div>
        <strong>{total} {total === 1 ? "resultat" : "resultats"}</strong>
      </div>
      <div className="finding-library-toolbar" role="search">
        <label className="finding-search-field">
          <span>Cercar per espècie</span>
          <span className="finding-search-control"><Search size={18} aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cep, rossinyol, Boletus…" />{query ? <button type="button" aria-label="Esborrar la cerca" onClick={() => setQuery("")}><X size={17} aria-hidden="true" /></button> : null}</span>
        </label>
        <div className="finding-filter-field"><span>Visibilitat</span><FormSelect aria-label="Visibilitat" value={visibility} onValueChange={(value) => setVisibility(value as VisibilityFilter)} options={[{ value: "all", label: "Totes" }, { value: "public", label: "Publicades" }, { value: "private", label: "Privades" }]} /></div>
      </div>
      {loading ? <p className="finding-notice" aria-live="polite">Buscant al quadern…</p> : findings.length ? <>
        <div className="finding-personal-list" aria-busy={loadingMore}>{findings.map((finding) => {
          const photo = finding.photos[0];
          const viewHref = finding.visibility === "public" && finding.publicationState === "published" ? `/troballes/${finding.id}` : null;
          const summary = <>
            {photo ? <Image src={photo.url} alt="" width={photo.width} height={photo.height} unoptimized /> : <div className="finding-personal-thumb" />}
            <div className="finding-personal-copy"><h3>{finding.reportedSpeciesName}</h3><p>{new Intl.DateTimeFormat("ca-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(finding.observedAt))} · {finding.exactLocation ? "punt exacte guardat" : "només zona aproximada de 10 × 10 km"}</p>{finding.privateNotes ? <p className="finding-personal-notes">{finding.privateNotes}</p> : null}</div>
          </>;
          return <article className="finding-personal-row" key={finding.id}>
            {viewHref ? <Link className="finding-personal-entry" href={viewHref} aria-label={`Obrir la troballa de ${finding.reportedSpeciesName}`}>{summary}</Link> : <div className="finding-personal-entry">{summary}</div>}
            <span className="finding-visibility-badge" data-visibility={finding.visibility}>{finding.visibility === "public" ? <MapPinned size={17} aria-hidden="true" /> : <LockKeyhole size={17} aria-hidden="true" />}{finding.visibility === "public" ? "Publicada" : "Privada"}</span>
            <FindingActionsMenu label={`Accions per a ${finding.reportedSpeciesName}`}>
              {finding.visibility === "public" ? <button type="button" onClick={() => void changeAliasVisibility(finding)}>{finding.showAlias ? "Amagar el meu àlies" : "Mostrar el meu àlies"}</button> : null}
              <button type="button" onClick={() => void changePrivacy(finding)}>{finding.visibility === "public" ? "Retirar de l’atles" : "Publicar a l’atles"}</button>
              <button type="button" data-tone="danger" onClick={() => { setDeleteError(null); setDeleteTarget({ kind: "synced", finding }); }}>Eliminar</button>
            </FindingActionsMenu>
          </article>;
        })}</div>
        <div className="finding-pagination">
          <p>Mostrant {findings.length} de {total}</p>
          {hasMore ? <button className="finding-button-secondary" type="button" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? "Carregant…" : "Carregar-ne 20 més"}</button> : null}
        </div>
      </> : filtersActive ? <div className="finding-account-card finding-stack"><h2>Cap resultat</h2><p>Prova una altra espècie o mostra totes les visibilitats.</p><button className="finding-button-secondary" type="button" onClick={() => { setQuery(""); setVisibility("all"); }}>Netejar els filtres</button></div> : <div className="finding-account-card finding-stack"><h2>El quadern és buit</h2><p>Les troballes que desis al camp apareixeran aquí, incloses les privades.</p><Link className="finding-button" href="/troballes/nova">Anotar una troballa</Link></div>}
      <p className="finding-library-privacy">La comunitat veu totes les fotos, el dia i una zona aproximada de 10 × 10 km de les troballes publicades. El punt exacte i les notes continuen sent només teus.</p>
    </section>

    <FindingDeleteDialog
      busy={deleteBusy}
      confirmLabel={deleteDialog.confirmLabel}
      description={deleteDialog.description}
      error={deleteError}
      onCancel={() => { setDeleteError(null); setDeleteTarget(null); }}
      onConfirm={() => void confirmRemoval()}
      open={Boolean(deleteTarget)}
      title={deleteDialog.title}
    />
  </div>;
}
