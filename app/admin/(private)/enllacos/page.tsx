import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowDown, ArrowUp, CalendarClock, ChevronLeft, ChevronRight, ExternalLink, History, Link2, PauseCircle, RefreshCw, Search, Send, ShieldCheck, X } from "lucide-react";

import { PageHeader, PageShell, PageTitleAccent, SectionHeader } from "@/components/page-layout";
import { readBacklinkDashboard, readBacklinkProspectDetail } from "@/src/lib/backlinks/admin.server";
import {
  BACKLINK_STATUSES,
  backlinkDetailId,
  backlinkDetailHref,
  backlinkTableHref,
  nextBacklinkSortDirection,
  parseBacklinkTableQuery,
  type BacklinkTableQuery,
  type BacklinkTableSearchParams,
} from "@/src/lib/backlinks/admin-table";
import type { BacklinkProspectSort, BacklinkSearchContext, BacklinkStatus } from "@/src/lib/backlinks/types";
import { nextBacklinkRunWindow } from "@/src/lib/backlinks/schedule";
import { requireOperationalSession } from "@/src/lib/operational-status-session";

import { runBacklinkAutomationAction } from "./actions";
import { BacklinkDetailContent } from "./backlink-detail-content";
import { BacklinkSettingsForm } from "./backlink-settings-form";
import styles from "./backlinks.module.css";
import { BacklinkSidePanel } from "./side-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Enllaços editorials · Administració",
  description: "Descobriment, contacte i verificació privada d’enllaços editorials.",
  robots: { index: false, follow: false, nocache: true },
};

const dateFormatter = new Intl.DateTimeFormat("ca-ES", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Madrid",
});

const statusLabels: Record<BacklinkStatus, string> = {
  discovered: "Descoberta", ready: "Preparada", sent: "Enviada", linked: "Enllaçada",
  lost: "Perduda", suppressed: "Exclosa", failed: "Fallida",
};

function formatDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "—";
}

function braveBatchLabel(searches: BacklinkSearchContext[], planned = false) {
  const completedPages = searches.reduce((total, search) => total + search.pageCount, 0);
  const pages = completedPages === 1 ? "pàgina Brave" : "pàgines Brave";
  const state = planned ? (completedPages === 1 ? "prevista" : "previstes") : (completedPages === 1 ? "completada" : "completades");
  return `${searches.length} ${searches.length === 1 ? "consulta" : "consultes"} · ${completedPages} ${pages} ${state}`;
}

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function databaseErrorDetails(error: unknown) {
  if (!error || typeof error !== "object") return { schemaMissing: false, message: "Error desconegut" };
  const record = error as Record<string, unknown>;
  return {
    schemaMissing: record.code === "PGRST205",
    message: typeof record.message === "string" ? record.message : "No s’ha pogut consultar la base de dades.",
  };
}

function SortHeader({
  children,
  query,
  sort,
}: {
  children: React.ReactNode;
  query: BacklinkTableQuery;
  sort: BacklinkProspectSort;
}) {
  const active = query.sort === sort;
  const direction = nextBacklinkSortDirection(query, sort);
  return (
    <th aria-sort={active ? (query.direction === "asc" ? "ascending" : "descending") : "none"}>
      <Link href={backlinkTableHref(query, { sort, direction, page: 1 })} className={styles.sortLink}>
        {children}
        {active ? query.direction === "asc" ? <ArrowUp aria-hidden="true" /> : <ArrowDown aria-hidden="true" /> : null}
      </Link>
    </th>
  );
}

export default async function AdminBacklinksPage({
  searchParams,
}: {
  searchParams: Promise<BacklinkTableSearchParams>;
}) {
  await requireOperationalSession();
  const rawSearchParams = await searchParams;
  const tableQuery = parseBacklinkTableQuery(rawSearchParams);
  const selectedProspectId = backlinkDetailId(rawSearchParams);
  let dashboard: Awaited<ReturnType<typeof readBacklinkDashboard>>;
  let selectedProspect: Awaited<ReturnType<typeof readBacklinkProspectDetail>> = null;
  try {
    [dashboard, selectedProspect] = await Promise.all([
      readBacklinkDashboard(tableQuery),
      selectedProspectId ? readBacklinkProspectDetail(selectedProspectId) : Promise.resolve(null),
    ]);
  } catch (error) {
    const detail = databaseErrorDetails(error);
    console.error("Backlink dashboard read failed", detail);
    return (
      <PageShell as="article" className={`admin-page ${styles.shell}`}>
        <PageHeader
          eyebrow="Administració · creixement editorial"
          title={<>Enllaços que cal <PageTitleAccent>merèixer</PageTitleAccent></>}
          description="Descobriment, contacte responsable i verificació d’enllaços editorials."
          layout="split"
          tone="forest"
        />
        <section className={styles.unavailable} role="alert">
          <AlertTriangle aria-hidden="true" />
          <div>
            <strong>{detail.schemaMissing ? "Falta aplicar la migració d’enllaços" : "El tauler no està disponible"}</strong>
            <p>{detail.schemaMissing
              ? "Aplica les migracions pendents a Supabase i recarrega la memòria cau de l’esquema abans de tornar-ho a provar."
              : "La base de dades no ha respost. Revisa el servei i torna a carregar la pàgina."}</p>
          </div>
        </section>
      </PageShell>
    );
  }
  const configured = Object.values(dashboard.configured).every(Boolean);
  const automationHeading = !configured
    ? "Configuració incompleta"
    : !dashboard.settings.enabled
      ? "Automatització en pausa"
      : dashboard.settings.autoSend
        ? "Descobriment i enviament automàtic actius"
        : "Descobriment actiu · enviament manual";
  const automationDescription = !configured
    ? "Falten credencials privades; no es pot cercar ni enviar."
    : !dashboard.settings.enabled
      ? "No cercarà, verificarà ni enviarà fins que la tornis a activar."
      : dashboard.settings.autoSend
        ? "Cerca, revalida i envia només les oportunitats que superen tota la política."
        : "Cerca i revalida oportunitats, però no envia cap correu automàticament.";
  const nextRun = nextBacklinkRunWindow();
  const total = Object.values(dashboard.counts).reduce((sum, count) => sum + count, 0);
  const page = dashboard.prospectPage;
  const totalPages = Math.max(1, Math.ceil(page.total / page.pageSize));
  const firstResult = page.total === 0 ? 0 : (page.page - 1) * page.pageSize + 1;
  const lastResult = Math.min(page.total, page.page * page.pageSize);
  const filtersActive = Boolean(tableQuery.search || tableQuery.status);
  const detailReturnTo = selectedProspect
    ? backlinkDetailHref(selectedProspect.id, { ...tableQuery, page: page.page })
    : backlinkTableHref(tableQuery, { page: page.page });
  return (
    <>
      <PageShell as="article" className={`admin-page ${styles.shell}`}>
      <PageHeader
        eyebrow="Administració · creixement editorial"
        title={<>Enllaços que cal <PageTitleAccent>merèixer</PageTitleAccent></>}
        description="Descobreix recursos afins, limita el contacte a bústies institucionals i comprova els enllaços obtinguts sense intercanvis ni compra de mencions."
        layout="split"
        tone="forest"
      />

      <div className={styles.automationOverview}>
        <section className={styles.statusBand} data-enabled={dashboard.settings.enabled} aria-live="polite">
          {dashboard.settings.enabled ? <ShieldCheck aria-hidden="true" /> : <PauseCircle aria-hidden="true" />}
          <div>
            <span>Automatització</span>
            <strong>{automationHeading}</strong>
            <small>{automationDescription}</small>
          </div>
          <form action={runBacklinkAutomationAction}>
            <button type="submit" disabled={!configured || !dashboard.settings.enabled}>
              <RefreshCw aria-hidden="true" /> Executa un cicle ara
            </button>
          </form>
        </section>
        <section className={styles.searchSchedule} aria-label="Darrera cerca i cerca programada">
          <article>
            <History aria-hidden="true" />
            <div><span>Darrera cerca</span><strong title={dashboard.recentRun?.searches.map((search) => search.query).join(" · ")}>{dashboard.recentRun?.searches.length ? dashboard.recentRun.searches.map((search) => search.label).join(" · ") : "Encara no registrada"}</strong><small>{dashboard.recentRun?.searches.length ? `${braveBatchLabel(dashboard.recentRun.searches)} · ${dashboard.recentRun.addedCount} ${dashboard.recentRun.addedCount === 1 ? "oportunitat afegida" : "oportunitats afegides"} · ${formatDate(dashboard.recentRun.startedAt)}${dashboard.recentRun.searchInferred ? " · inferida del cicle anterior" : ""}` : "La propera execució guardarà les consultes exactes."}</small></div>
          </article>
          <article>
            <CalendarClock aria-hidden="true" />
            <div><span>Propera cerca</span><strong title={dashboard.nextSearches.map((search) => search.query).join(" · ")}>{dashboard.nextSearches.map((search) => search.label).join(" · ")}</strong><small>{braveBatchLabel(dashboard.nextSearches, true)} · {configured && dashboard.settings.enabled ? `${process.env.NODE_ENV === "production" ? "Programada" : "Cicle de producció"}: ${nextRun}` : "Sense cap cicle programat"}</small></div>
          </article>
        </section>
      </div>

      <section className={styles.summarySection} aria-labelledby="backlink-summary">
        <SectionHeader
          meta="Visió general"
          title="Estat del canal"
          titleId="backlink-summary"
          description="Les xifres separen oportunitats, contactes i resultats verificats."
        />
        <div className={styles.summaryGrid}>
          <article><Search aria-hidden="true" /><span>Oportunitats</span><strong>{total}</strong><small>{dashboard.counts.ready ?? 0} preparades</small></article>
          <article><Send aria-hidden="true" /><span>Contactades</span><strong>{dashboard.counts.sent ?? 0}</strong><small>Màxim {dashboard.settings.dailySendLimit} cada 24 h</small></article>
          <article><Link2 aria-hidden="true" /><span>Enllaços actius</span><strong>{dashboard.counts.linked ?? 0}</strong><small>{dashboard.counts.lost ?? 0} retirats després</small></article>
          <article><ShieldCheck aria-hidden="true" /><span>Exclusions</span><strong>{dashboard.counts.suppressed ?? 0}</strong><small>Dominis o bústies que no es contactaran</small></article>
        </div>
      </section>

      <section className={styles.settingsSection} aria-labelledby="automation-controls">
        <SectionHeader
          meta="Límits i control"
          title="Política d’automatització"
          titleId="automation-controls"
          description="Decideix què pot fer cada cicle i quines oportunitats poden avançar."
          size="compact"
        />
        <BacklinkSettingsForm
          settings={{
            enabled: dashboard.settings.enabled,
            autoSend: dashboard.settings.autoSend,
            dailySendLimit: dashboard.settings.dailySendLimit,
            minimumScore: dashboard.settings.minimumScore,
          }}
          configured={dashboard.configured}
        />
      </section>

      <section className={styles.prospectSection} aria-labelledby="backlink-prospects">
        <SectionHeader
          meta="Registre auditable"
          title="Registre d’oportunitats"
          titleId="backlink-prospects"
          description="Cerca, ordena i filtra el registre; obre cada oportunitat per consultar el correu i l’auditoria completa."
        />
        <div className={styles.collectionTools}>
          <form className={styles.searchForm} role="search" method="get">
            <label htmlFor="backlink-search">Cerca al registre</label>
            <div>
              <Search aria-hidden="true" />
              <input id="backlink-search" name="q" type="search" defaultValue={tableQuery.search} placeholder="Títol, domini, organització o correu" />
              {tableQuery.status ? <input type="hidden" name="status" value={tableQuery.status} /> : null}
              {tableQuery.sort !== "updated" ? <input type="hidden" name="sort" value={tableQuery.sort} /> : null}
              {tableQuery.direction !== "desc" ? <input type="hidden" name="dir" value={tableQuery.direction} /> : null}
              <button type="submit">Cerca</button>
            </div>
          </form>
          <nav className={styles.statusFilters} aria-label="Filtra oportunitats per estat">
            <Link href={backlinkTableHref(tableQuery, { status: null, page: 1 })} aria-current={!tableQuery.status ? "page" : undefined}>Actives</Link>
            {BACKLINK_STATUSES.map((status) => (
              <Link
                href={backlinkTableHref(tableQuery, { status, page: 1 })}
                aria-current={tableQuery.status === status ? "page" : undefined}
                key={status}
              >
                {statusLabels[status]} <span>{dashboard.counts[status] ?? 0}</span>
              </Link>
            ))}
            {filtersActive ? <Link href="/admin/enllacos" className={styles.clearFilters}><X aria-hidden="true" /> Neteja</Link> : null}
          </nav>
        </div>
        <div className={styles.collectionSummary} aria-live="polite">
          <strong>{page.total} {page.total === 1 ? "resultat" : "resultats"}</strong>
          <span>Mostrant {firstResult}–{lastResult}</span>
        </div>
        {page.items.length ? (
          <div className={styles.tableFrame} role="region" aria-label="Taula d’oportunitats d’enllaç">
            <table>
              <thead>
                <tr>
                  <SortHeader query={tableQuery} sort="title">Recurs extern</SortHeader>
                  <SortHeader query={tableQuery} sort="status">Estat</SortHeader>
                  <SortHeader query={tableQuery} sort="score">Puntuació</SortHeader>
                  <th>Contacte</th>
                  <th>Destinació</th>
                  <SortHeader query={tableQuery} sort="updated">Actualitzat</SortHeader>
                </tr>
              </thead>
              <tbody>
                {page.items.map((prospect) => (
                  <tr key={prospect.id}>
                    <th scope="row">
                      <Link
                        className={styles.rowDetailLink}
                        href={backlinkDetailHref(prospect.id, { ...tableQuery, page: page.page })}
                        scroll={false}
                        aria-label={`Obre el detall de ${prospect.pageTitle}`}
                      />
                      <a className={styles.externalResourceLink} href={prospect.pageUrl} target="_blank" rel="noreferrer">{prospect.pageTitle}<ExternalLink aria-hidden="true" /></a>
                      <small>{prospect.domain} · {prospect.organization}</small>
                    </th>
                    <td>
                      <span className={styles.badge} data-status={prospect.status}>{statusLabels[prospect.status]}</span>
                      {prospect.manualDecision ? <span className={styles.manualMarker} data-decision={prospect.manualDecision}>{prospect.manualDecision === "approved" ? "Manual · aprovada" : "Manual · no enviar"}</span> : null}
                      <small>{prospect.statusReason}</small>
                    </td>
                    <td><strong>{prospect.score}/100</strong></td>
                    <td>{prospect.contactEmail ?? "—"}<small>{prospect.sendCount ? `${prospect.sendCount} enviament${prospect.sendCount > 1 ? "s" : ""}` : "Sense contactar"}</small></td>
                    <td><span className={styles.targetTitle}>{prospect.targetTitle}</span></td>
                    <td><time dateTime={prospect.updatedAt}>{formatDate(prospect.updatedAt)}</time><small>Comprovat {formatDate(prospect.lastCheckedAt)}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className={styles.emptyState}><strong>Cap oportunitat coincideix</strong><span>{filtersActive ? "Canvia o neteja els filtres per ampliar el registre." : "Executa un cicle per descobrir les primeres oportunitats."}</span></div>}
        <nav className={styles.pager} aria-label="Paginació d’oportunitats">
          {page.page > 1 ? <Link href={backlinkTableHref(tableQuery, { page: page.page - 1 })}><ChevronLeft aria-hidden="true" /> Anterior</Link> : <span />}
          <span>Pàgina {page.page} de {totalPages}</span>
          {page.page < totalPages ? <Link href={backlinkTableHref(tableQuery, { page: page.page + 1 })}>Següent <ChevronRight aria-hidden="true" /></Link> : <span />}
        </nav>
      </section>

      {dashboard.recentRun ? (
        <aside className={styles.runNote}>
          <strong>Darrera execució: {dashboard.recentRun.status}</strong>
          <span>{dashboard.recentRun.inspectedCount} inspeccionades · {dashboard.recentRun.sentCount} enviades · {dashboard.recentRun.linkedCount} enllaços nous · {dashboard.recentRun.failedCount} errors</span>
          {dashboard.recentRun.detail ? <small>{dashboard.recentRun.detail}</small> : null}
        </aside>
      ) : null}
      </PageShell>
      {selectedProspect ? (
        <BacklinkSidePanel
          closeHref={backlinkTableHref(tableQuery, { page: page.page })}
          subtitle={selectedProspect.organization}
          title={selectedProspect.pageTitle}
        >
          <BacklinkDetailContent
            error={firstSearchParam(rawSearchParams.error)}
            minimumScore={dashboard.settings.minimumScore}
            prospect={selectedProspect}
            returnTo={detailReturnTo}
            updated={firstSearchParam(rawSearchParams.updated)}
          />
        </BacklinkSidePanel>
      ) : null}
    </>
  );
}
