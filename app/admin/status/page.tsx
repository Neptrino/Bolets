import type { Metadata } from "next";
import {
  Activity,
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  CircleGauge,
  CloudCog,
  CloudSun,
  Droplets,
  History,
  Layers3,
  LogOut,
  RefreshCw,
  Route,
  ServerCog,
  ShieldCheck,
} from "lucide-react";

import { PageHeader, PageShell, PageTitleAccent, SectionHeader } from "@/components/page-layout";
import {
  sourceAffectsPublishedData,
  summarizeOperationalStatus,
  type AtmosphereJobStatus,
  type IngestionRunStatus,
  type OperationalState,
} from "@/src/lib/operational-status";
import {
  readOperationalStatus,
} from "@/src/lib/operational-status-server";
import { requireOperationalSession } from "@/src/lib/operational-status-session";
import { readCommunityStatus } from "@/src/lib/community-status-server";

import styles from "./status.module.css";
import { CommunityStatus } from "./community-status";
import { ResyncControls } from "./resync-controls";

export const metadata: Metadata = {
  title: "Estat operatiu",
  description: "Tauler privat de l'estat de les dades de Bolets.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

const dateTimeFormatter = new Intl.DateTimeFormat("ca-ES", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Madrid",
});

const numberFormatter = new Intl.NumberFormat("ca-ES");

const stateIcons: Record<OperationalState, typeof CheckCircle2> = {
  healthy: CheckCircle2,
  running: RefreshCw,
  attention: AlertTriangle,
  critical: AlertTriangle,
};

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

function formatDuration(start: string, end: string | null, now: string) {
  const milliseconds = Date.parse(end ?? now) - Date.parse(start);
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "—";
  const minutes = Math.floor(milliseconds / 60_000);
  if (minutes < 1) return `${Math.floor(milliseconds / 1_000)} s`;
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

function jobProgress(jobs: AtmosphereJobStatus[], kind: AtmosphereJobStatus["jobKind"]) {
  const matching = jobs.filter((job) => job.jobKind === kind);
  const total = matching.reduce((sum, job) => sum + job.shards, 0);
  const completed = matching
    .filter((job) => job.status === "succeeded")
    .reduce((sum, job) => sum + job.shards, 0);
  return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
}

function egressLaneLabel(lane: "direct" | "cloudflare" | "aws") {
  if (lane === "direct") return "VPS";
  return lane === "cloudflare" ? "Cloudflare" : "AWS Lambda";
}

function runDescription(run: IngestionRunStatus) {
  if (run.reason === "superseded-retry") return "Omesa perquè un reintent posterior ha completat el mateix fragment.";
  if (run.errorMessage) return run.errorMessage;
  if (run.reason === "provider-budget") return "Ajornada pel pressupost compartit d’Open-Meteo; no s’ha fet cap petició nova.";
  if (run.reason === "egress-rate-limit") return "La sortida ha rebut un 429 i ha quedat pausada; les altres sortides poden continuar.";
  return `${numberFormatter.format(run.rowsWritten)} files escrites sense error registrat.`;
}

function shardLabel(run: IngestionRunStatus) {
  if (run.shardNumber === null || run.shardTotal === null) return null;
  return `Fragment ${numberFormatter.format(run.shardNumber)}/${numberFormatter.format(run.shardTotal)}`;
}

function statusLabel(status: string) {
  return ({
    active: "Activa",
    degraded: "Degradada",
    blocked: "Bloquejada",
    disabled: "Desactivada",
    running: "En curs",
    succeeded: "Correcta",
    partial: "Parcial",
    failed: "Fallida",
    skipped: "Omesa",
    pending: "Pendent",
  } as Record<string, string>)[status] ?? status;
}

export default async function OperationalStatusPage() {
  await requireOperationalSession();

  const [statusResult, communityResult] = await Promise.allSettled([
    readOperationalStatus(),
    readCommunityStatus(),
  ]);
  const community = communityResult.status === "fulfilled" ? communityResult.value : null;
  const communityError = communityResult.status === "rejected"
    ? communityResult.reason instanceof Error
      ? communityResult.reason.message
      : "No s'han pogut consultar les dades de comunitat."
    : null;

  if (statusResult.status === "rejected") {
    const error = statusResult.reason;
    const message = error instanceof Error ? error.message : "No s'ha pogut consultar l'estat operatiu.";
    return (
      <PageShell as="article" className={styles.shell}>
        <PageHeader
          eyebrow="Sala de màquines · accés privat"
          title={<>Estat <PageTitleAccent>operatiu</PageTitleAccent></>}
          description="Lectura directa de la base de dades, les cues d'ingestió i el pressupost de proveïdor."
          layout="split"
          tone="forest"
        />
        <section className={`${styles.statePanel} ${styles.critical}`} aria-labelledby="status-unavailable">
          <AlertTriangle aria-hidden="true" />
          <div>
            <p>La telemetria no respon</p>
            <h2 id="status-unavailable">No es pot construir el tauler</h2>
            <span>{message}</span>
          </div>
        </section>
        <CommunityStatus status={community} error={communityError} />
        <section className={styles.section} aria-labelledby="manual-commands">
          <SectionHeader
            meta="Comandes manuals"
            title="Resincronització selectiva"
            titleId="manual-commands"
            description="La telemetria no està disponible, però encara pots demanar al servidor que reprengui o refaci una ingestió."
          />
          <ResyncControls />
        </section>
      </PageShell>
    );
  }

  const status = statusResult.value;

  const summary = summarizeOperationalStatus(status);
  const StateIcon = stateIcons[summary.state];
  const todayJobs = status.jobs.filter((job) => job.snapshotDate === status.currentDate);
  const precipitationProgress = jobProgress(todayJobs, "precipitation-fallback");
  const atmosphereProgress = jobProgress(todayJobs, "atmosphere");
  const dayUsage = status.budgets.find(
    (budget) => budget.windowKind === "day" && budget.consumer === "*",
  );
  const enabledSources = status.sources.filter((source) => source.enabled);
  const recentRuns = status.recentRuns.slice(0, 14);
  const atmospherePublication = status.observedPublications.find(
    (publication) => publication.stream === "atmosphere",
  );
  const soilPublication = status.observedPublications.find(
    (publication) => publication.stream === "soil",
  );
  const observedCursorTimes = ["spatial-atmosphere", "spatial-soil"].flatMap((pipeline) => {
    const cursor = status.cursors.find((candidate) =>
      candidate.pipeline === pipeline
      && candidate.snapshotDate === status.currentDate
      && candidate.lastCellId === "__complete__"
    );
    return cursor ? [Date.parse(cursor.updatedAt)] : [];
  });
  const observedGenerationAt = observedCursorTimes.length === 2
    ? Math.max(...observedCursorTimes)
    : Number.NaN;
  const conditionCacheCursors = ["spatial-condition-coarse", "spatial-condition-territorial"]
    .map((pipeline) => status.cursors.find((cursor) => cursor.pipeline === pipeline));
  const conditionCachesComplete = Number.isFinite(observedGenerationAt)
    && conditionCacheCursors.every((cursor) =>
      cursor?.snapshotDate === status.currentDate
      && cursor.lastCellId === "__complete__"
      && Date.parse(cursor.updatedAt) >= observedGenerationAt
    );
  const conditionCachesCompletedAt = conditionCachesComplete
    ? new Date(Math.max(...conditionCacheCursors.map((cursor) => Date.parse(cursor!.updatedAt)))).toISOString()
    : null;
  const forecastAvailable = status.forecastPublication?.complete === true
    && status.forecastPublication.validThrough !== null
    && Date.parse(status.forecastPublication.validThrough) > Date.parse(status.generatedAt);

  return (
    <PageShell as="article" className={styles.shell}>
      <PageHeader
        eyebrow="Sala de màquines · accés privat"
        title={<>Estat <PageTitleAccent>operatiu</PageTitleAccent></>}
        description="Una lectura en viu de la comunitat, l'atmosfera publicada, les ingestes en curs, l'ús del proveïdor i les incidències recents."
        layout="split"
        tone="forest"
      />

      <section className={`${styles.statePanel} ${styles[summary.state]}`} aria-labelledby="overall-status" aria-live="polite">
        <StateIcon aria-hidden="true" />
        <div className={styles.stateCopy}>
          <p>Lectura general</p>
          <h2 id="overall-status">{summary.label}</h2>
          <span>{summary.detail}</span>
        </div>
        <div className={styles.stateTimestamp}>
          <span>Comprovat</span>
          <time dateTime={status.generatedAt}>{formatDateTime(status.generatedAt)}</time>
          <div className={styles.stateActions}>
            <a href="/admin/status"><RefreshCw aria-hidden="true" /> Actualitza</a>
            <form action="/admin/session/logout" method="post">
              <button type="submit"><LogOut aria-hidden="true" /> Surt</button>
            </form>
          </div>
        </div>
      </section>

      <CommunityStatus status={community} error={communityError} />

      <section className={styles.section} aria-labelledby="manual-commands">
        <SectionHeader
          meta="Comandes manuals"
          title="Resincronització selectiva"
          titleId="manual-commands"
          description="Posa una ingestió a la cua o reinicia només una generació ja completada. Les credencials operatives es queden al servidor."
        />
        <ResyncControls />
      </section>

      <section className={styles.section} aria-labelledby="published-data">
        <SectionHeader
          meta="Què veu la web"
          title="Dades publicades ara"
          titleId="published-data"
          description="Cada bloc és un producte que la web pot utilitzar. «Publicada» vol dir que han arribat tots els punts esperats i que la generació ja és segura per als visitants."
        />
        <div className={styles.publicationGrid}>
          <article className={styles.publicationCard} data-complete={atmospherePublication?.complete === true}>
            <div className={styles.publicationCardTop}>
              <CloudSun aria-hidden="true" />
              <span>{atmospherePublication?.complete ? "Publicada" : "Incompleta"}</span>
            </div>
            <div className={styles.publicationCopy}>
              <span>Atmosfera observada</span>
              <strong>
                {numberFormatter.format(atmospherePublication?.pointCount ?? 0)} / {numberFormatter.format(atmospherePublication?.expectedPointCount ?? 0)} punts
              </strong>
              <small>Temperatura, humitat i vent AROME que alimenten la lectura actual.</small>
            </div>
            <p>
              {atmospherePublication?.observedAt
                ? `Dades fins ${formatDateTime(atmospherePublication.observedAt)}`
                : "Encara no hi ha una observació atmosfèrica completa."}
              {atmospherePublication?.completedAt
                ? ` · publicada ${formatDateTime(atmospherePublication.completedAt)}`
                : ""}
            </p>
          </article>

          <article className={styles.publicationCard} data-complete={soilPublication?.complete === true}>
            <div className={styles.publicationCardTop}>
              <Droplets aria-hidden="true" />
              <span>{soilPublication?.complete ? "Publicada" : "Incompleta"}</span>
            </div>
            <div className={styles.publicationCopy}>
              <span>Humitat del sòl observada</span>
              <strong>
                {numberFormatter.format(soilPublication?.pointCount ?? 0)} / {numberFormatter.format(soilPublication?.expectedPointCount ?? 0)} punts
              </strong>
              <small>Graella de sòl que completa el balanç d’aigua de la lectura actual.</small>
            </div>
            <p>
              {soilPublication?.observedAt
                ? `Dades fins ${formatDateTime(soilPublication.observedAt)}`
                : "Encara no hi ha una observació de sòl completa."}
              {soilPublication?.completedAt
                ? ` · publicada ${formatDateTime(soilPublication.completedAt)}`
                : ""}
            </p>
          </article>

          <article className={styles.publicationCard} data-complete={forecastAvailable}>
            <div className={styles.publicationCardTop}>
              <CalendarRange aria-hidden="true" />
              <span>{forecastAvailable ? "Publicada" : "No disponible"}</span>
            </div>
            <div className={styles.publicationCopy}>
              <span>Previsió de cinc dies</span>
              <strong>
                {status.forecastPublication
                  ? `${numberFormatter.format(status.forecastPublication.pointCount)} / ${numberFormatter.format(status.forecastPublication.expectedPointCount)} punts · ${numberFormatter.format(status.forecastPublication.futureHorizonCount)} / 5 dies`
                  : "Sense previsió completa"}
              </strong>
              <small>Projecció diària de les condicions, ancorada a l’observació publicada.</small>
            </div>
            <p>
              {forecastAvailable && status.forecastPublication?.validThrough
                ? `Vigent fins ${formatDateTime(status.forecastPublication.validThrough)}`
                : "Es mostrarà quan tots els punts i horitzons estiguin complets."}
              {status.forecastPublication?.completedAt
                ? ` · publicada ${formatDateTime(status.forecastPublication.completedAt)}`
                : ""}
            </p>
          </article>

          <article className={styles.publicationCard} data-complete={conditionCachesComplete}>
            <div className={styles.publicationCardTop}>
              <Layers3 aria-hidden="true" />
              <span>{conditionCachesComplete ? "Publicades" : "Actualitzant"}</span>
            </div>
            <div className={styles.publicationCopy}>
              <span>Mapes de puntuació</span>
              <strong>1 · 2,5 · 5 · 10 km</strong>
              <small>Capes generals i lectures territorials calculades amb les observacions completes.</small>
            </div>
            <p>
              {conditionCachesCompletedAt
                ? `Última publicació ${formatDateTime(conditionCachesCompletedAt)}`
                : "La web manté l'última generació completa mentre calcula la nova."}
            </p>
          </article>
        </div>

        <details className={styles.memoryDisclosure}>
          <summary>
            <Activity aria-hidden="true" />
            <span><strong>Memòria tècnica de les fonts</strong> · no és un producte publicat</span>
          </summary>
          <div className={styles.memoryBody}>
            <p>Aquests historials permeten que la sincronització següent només descarregui les hores noves i reconstrueixi les finestres de fins a 30 dies.</p>
            <div>
              {status.rollingStates.map((rolling) => (
                <article key={rolling.stream}>
                  <History aria-hidden="true" />
                  <span>{rolling.stream === "arome-atmosphere" ? "Historial AROME" : "Historial de pluja"}</span>
                  <strong>{numberFormatter.format(rolling.stateCount)} punts</strong>
                  <small>Tots arriben com a mínim fins {formatDateTime(rolling.oldestLastHour)}</small>
                </article>
              ))}
            </div>
          </div>
        </details>
      </section>

      <section className={styles.section} aria-labelledby="ingestion-progress">
        <SectionHeader
          meta="Generació d'avui"
          title="Ingestió paral·lela"
          titleId="ingestion-progress"
          description="Els fragments comparteixen un únic pressupost, encara que surtin pel VPS, Cloudflare o AWS."
        />
        <div className={styles.progressGrid}>
          <article className={styles.progressCard}>
            <CloudCog aria-hidden="true" />
            <div>
              <span>Pluja de reserva</span>
              <strong>{precipitationProgress.completed} / {precipitationProgress.total} fragments</strong>
            </div>
            <progress max="100" value={precipitationProgress.percent}>{precipitationProgress.percent}%</progress>
            <small>{precipitationProgress.percent}% completat</small>
          </article>
          <article className={styles.progressCard}>
            <ServerCog aria-hidden="true" />
            <div>
              <span>Atmosfera AROME</span>
              <strong>{atmosphereProgress.completed} / {atmosphereProgress.total} fragments</strong>
            </div>
            <progress max="100" value={atmosphereProgress.percent}>{atmosphereProgress.percent}%</progress>
            <small>{atmosphereProgress.percent}% completat</small>
          </article>
        </div>
        <div className={styles.laneStrip}>
          {(["direct", "cloudflare", "aws"] as const).map((lane) => {
            const laneJobs = todayJobs.filter((job) => job.egressLane === lane);
            const shards = laneJobs.reduce((sum, job) => sum + job.shards, 0);
            const laneState = status.egressLanes.find((candidate) => candidate.lane === lane);
            const blocked = laneState?.blockedUntil
              ? Date.parse(laneState.blockedUntil) > Date.parse(status.generatedAt)
              : false;
            return (
              <div key={lane}>
                <Route aria-hidden="true" />
                <span>{egressLaneLabel(lane)} · {numberFormatter.format(shards)} fragments</span>
                <strong>{blocked ? `Pausada fins ${formatDateTime(laneState?.blockedUntil ?? null)}` : "Disponible"}</strong>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="provider-usage">
        <SectionHeader
          meta="Comptabilitat"
          title="Ús Open-Meteo"
          titleId="provider-usage"
          description="Estimació conservadora per entendre el consum. No s'aplica cap límit local: cada sortida continua fins que el proveïdor respon amb 429."
        />
        <div className={styles.budgetPanel}>
          <CircleGauge aria-hidden="true" />
          <div className={styles.budgetReading}>
            <span>Ús estimat avui</span>
            <strong>{numberFormatter.format(dayUsage?.estimatedUnits ?? 0)} <small>unitats comptabilitzades</small></strong>
          </div>
        </div>
        <div className={styles.budgetConsumers}>
          {status.budgets
            .filter((budget) => budget.windowKind === "day" && budget.consumer !== "*")
            .map((budget) => (
              <div key={`${budget.consumer}-${budget.windowStart}`}>
                <span>{budget.consumer}</span>
                <strong>{numberFormatter.format(budget.estimatedUnits)}</strong>
              </div>
            ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="source-health">
        <SectionHeader
          meta="Proveïdors i evidència"
          title="Salut de les fonts"
          titleId="source-health"
          description={`${enabledSources.length} fonts habilitades; les fonts desactivades continuen visibles per conservar el context operatiu.`}
        />
        <div className={styles.sourceList}>
          {status.sources.map((source) => (
            <article key={source.sourceId} data-status={source.status} data-enabled={source.enabled} data-publishing={sourceAffectsPublishedData(source)}>
              <div className={styles.sourceIdentity}>
                <ShieldCheck aria-hidden="true" />
                <div>
                  <strong>{source.title}</strong>
                  <span>{source.sourceKind} · {source.refreshCadence}</span>
                </div>
              </div>
              <span className={styles.statusBadge}>{sourceAffectsPublishedData(source) ? statusLabel(source.status) : `Ombra · ${statusLabel(source.status)}`}</span>
              <p>{source.statusDetail ?? "Sense detall operatiu."}</p>
              <time dateTime={source.checkedAt}>{formatDateTime(source.checkedAt)}</time>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="pipeline-cursors">
        <SectionHeader
          meta="Marcadors de generació"
          title="Cursors de pipeline"
          titleId="pipeline-cursors"
          description="Un cursor complet marca la generació que poden consumir les memòries cau espacials."
        />
        <div className={styles.tableFrame}>
          <table>
            <thead><tr><th>Pipeline</th><th>Snapshot</th><th>Posició</th><th>Actualitzat</th></tr></thead>
            <tbody>
              {status.cursors.map((cursor) => (
                <tr key={cursor.pipeline}>
                  <th scope="row">{cursor.pipeline}</th>
                  <td>{cursor.snapshotDate}</td>
                  <td>{cursor.lastCellId === "__complete__" ? "Complet" : cursor.lastCellId ?? "En espera"}</td>
                  <td><time dateTime={cursor.updatedAt}>{formatDateTime(cursor.updatedAt)}</time></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="recent-runs">
        <SectionHeader
          meta="Registre d'activitat"
          title="Execucions recents"
          titleId="recent-runs"
          description="Errors sanejats i resultats de les últimes ingestes auditades; els secrets i la metadata interna no arriben a aquesta pàgina."
        />
        <ol className={styles.runList}>
          {recentRuns.map((run) => (
            <li key={run.id} data-status={run.status}>
              <span className={styles.runMarker} aria-hidden="true" />
              <div className={styles.runMain}>
                <div>
                  <strong>{run.pipeline}</strong>
                  <span className={styles.statusBadge}>{statusLabel(run.status)}</span>
                  {run.egressLane ? <span className={styles.statusBadge}>{egressLaneLabel(run.egressLane)}</span> : null}
                  {shardLabel(run) ? <span className={styles.statusBadge}>{shardLabel(run)}</span> : null}
                </div>
                <p>{runDescription(run)}</p>
              </div>
              <div className={styles.runMeta}>
                <time dateTime={run.startedAt}>{formatDateTime(run.startedAt)}</time>
                <span>{formatDuration(run.startedAt, run.completedAt, status.generatedAt)}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </PageShell>
  );
}
