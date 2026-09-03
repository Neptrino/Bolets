import type { Metadata } from "next";
import { AlertTriangle, ExternalLink, Link2, PauseCircle, RefreshCw, Search, Send, ShieldCheck } from "lucide-react";

import { PageHeader, PageShell, PageTitleAccent, SectionHeader } from "@/components/page-layout";
import { readBacklinkDashboard } from "@/src/lib/backlinks/admin.server";
import { requireOperationalSession } from "@/src/lib/operational-status-session";

import { runBacklinkAutomationAction, updateBacklinkSettingsAction } from "./actions";
import styles from "./backlinks.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Enllaços editorials · Administració",
  description: "Descobriment, contacte i verificació privada d’enllaços editorials.",
  robots: { index: false, follow: false, nocache: true },
};

const dateFormatter = new Intl.DateTimeFormat("ca-ES", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Madrid",
});

const statusLabels: Record<string, string> = {
  discovered: "Descoberta", ready: "Preparada", sent: "Enviada", linked: "Enllaçada",
  lost: "Perduda", suppressed: "Exclosa", failed: "Fallida",
};

function formatDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "—";
}

function databaseErrorDetails(error: unknown) {
  if (!error || typeof error !== "object") return { schemaMissing: false, message: "Error desconegut" };
  const record = error as Record<string, unknown>;
  return {
    schemaMissing: record.code === "PGRST205",
    message: typeof record.message === "string" ? record.message : "No s’ha pogut consultar la base de dades.",
  };
}

export default async function AdminBacklinksPage() {
  await requireOperationalSession();
  let dashboard: Awaited<ReturnType<typeof readBacklinkDashboard>>;
  try {
    dashboard = await readBacklinkDashboard();
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
  const total = Object.values(dashboard.counts).reduce((sum, count) => sum + count, 0);
  return (
    <PageShell as="article" className={`admin-page ${styles.shell}`}>
      <PageHeader
        eyebrow="Administració · creixement editorial"
        title={<>Enllaços que cal <PageTitleAccent>merèixer</PageTitleAccent></>}
        description="Descobreix recursos afins, limita el contacte a bústies institucionals i comprova els enllaços obtinguts sense intercanvis ni compra de mencions."
        layout="split"
        tone="forest"
      />

      <section className={styles.statusBand} data-enabled={dashboard.settings.enabled} aria-live="polite">
        {dashboard.settings.enabled ? <ShieldCheck aria-hidden="true" /> : <PauseCircle aria-hidden="true" />}
        <div>
          <span>Automatització</span>
          <strong>{dashboard.settings.enabled ? "Activa amb límits" : "En pausa"}</strong>
          <small>
            {configured
              ? `Última execució: ${formatDate(dashboard.settings.lastRunAt)}`
              : "Falten credencials privades; no es pot cercar ni enviar."}
          </small>
        </div>
        <form action={runBacklinkAutomationAction}>
          <button type="submit" disabled={!configured || !dashboard.settings.enabled}>
            <RefreshCw aria-hidden="true" /> Executa ara
          </button>
        </form>
      </section>

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
          <article><ShieldCheck aria-hidden="true" /><span>Exclusions</span><strong>{dashboard.counts.suppressed ?? 0}</strong><small>Bústies que no es tornaran a contactar</small></article>
        </div>
      </section>

      <section className={styles.settingsSection} aria-labelledby="automation-controls">
        <SectionHeader
          meta="Límits i control"
          title="Política automàtica"
          titleId="automation-controls"
          description="Els canvis s’apliquen al següent cicle. Una puntuació alta no pot saltar-se les exclusions, el refredament per domini ni el límit diari."
        />
        <form action={updateBacklinkSettingsAction} className={styles.settingsForm}>
          <label className={styles.checkControl}>
            <input type="checkbox" name="enabled" defaultChecked={dashboard.settings.enabled} />
            <span><strong>Automatització activa</strong><small>Permet descobrir, verificar i preparar contactes.</small></span>
          </label>
          <label className={styles.checkControl}>
            <input type="checkbox" name="autoSend" defaultChecked={dashboard.settings.autoSend} />
            <span><strong>Enviament automàtic</strong><small>Només per a bústies de funció que superin tota la política.</small></span>
          </label>
          <label className={styles.fieldControl}>
            <span>Límit per 24 hores</span>
            <input type="number" name="dailySendLimit" min="1" max="25" defaultValue={dashboard.settings.dailySendLimit} />
          </label>
          <label className={styles.fieldControl}>
            <span>Puntuació mínima</span>
            <input type="number" name="minimumScore" min="60" max="100" defaultValue={dashboard.settings.minimumScore} />
          </label>
          <button type="submit" className={styles.saveButton}>Desa la política</button>
        </form>
        <div className={styles.configuration}>
          <span data-ready={dashboard.configured.search}>Cerca web</span>
          <span data-ready={dashboard.configured.delivery}>Enviament</span>
          <span data-ready={dashboard.configured.unsubscribe}>Baixa segura</span>
        </div>
      </section>

      <section className={styles.prospectSection} aria-labelledby="backlink-prospects">
        <SectionHeader
          meta="Registre auditable"
          title="Oportunitats recents"
          titleId="backlink-prospects"
          description="Cada fila conserva l’origen, el destinatari, la decisió de política i l’última verificació."
        />
        {dashboard.prospects.length ? (
          <div className={styles.tableFrame} tabIndex={0} role="region" aria-label="Taula d’oportunitats d’enllaç">
            <table>
              <thead><tr><th>Recurs extern</th><th>Estat</th><th>Puntuació</th><th>Contacte</th><th>Destinació</th><th>Activitat</th></tr></thead>
              <tbody>
                {dashboard.prospects.map((prospect) => (
                  <tr key={prospect.id}>
                    <th scope="row">
                      <a href={prospect.pageUrl} target="_blank" rel="noreferrer">{prospect.pageTitle}<ExternalLink aria-hidden="true" /></a>
                      <small>{prospect.domain} · {prospect.organization}</small>
                    </th>
                    <td><span className={styles.badge} data-status={prospect.status}>{statusLabels[prospect.status]}</span><small>{prospect.statusReason}</small></td>
                    <td><strong>{prospect.score}/100</strong></td>
                    <td>{prospect.contactEmail ?? "—"}<small>{prospect.sendCount ? `${prospect.sendCount} enviament${prospect.sendCount > 1 ? "s" : ""}` : "Sense contactar"}</small></td>
                    <td><a href={prospect.targetUrl} target="_blank" rel="noreferrer">{prospect.targetTitle}<ExternalLink aria-hidden="true" /></a></td>
                    <td><small>Comprovat {formatDate(prospect.lastCheckedAt)}</small><small>Enviat {formatDate(prospect.lastSentAt)}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className={styles.emptyState}>Encara no hi ha oportunitats. Configura les credencials, activa el sistema i executa el primer cicle.</div>}
      </section>

      {dashboard.recentRun ? (
        <aside className={styles.runNote}>
          <strong>Darrera execució: {dashboard.recentRun.status}</strong>
          <span>{dashboard.recentRun.inspectedCount} inspeccionades · {dashboard.recentRun.sentCount} enviades · {dashboard.recentRun.linkedCount} enllaços nous · {dashboard.recentRun.failedCount} errors</span>
          {dashboard.recentRun.detail ? <small>{dashboard.recentRun.detail}</small> : null}
        </aside>
      ) : null}
    </PageShell>
  );
}
