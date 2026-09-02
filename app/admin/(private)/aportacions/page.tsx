import type { Metadata } from "next";
import { CONTRIBUTION_KIND_LABELS } from "@/src/lib/contributions";
import {
  readAdminContributionRequests,
  readAdminContributorAccessList,
} from "@/src/lib/contributions/server";
import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import { requireOperationalSession } from "@/src/lib/operational-status-session";
import { ContributionReviewDialog, RevokeAccessDialog } from "./contribution-management-dialogs";
import styles from "./contributions.module.css";

export const metadata: Metadata = {
  title: "Aportacions · Administració",
  robots: { index: false, follow: false, nocache: true },
};

const dateFormatter = new Intl.DateTimeFormat("ca-ES", {
  dateStyle: "medium",
  timeStyle: "short",
});

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminContributionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[]; updated?: string | string[] }>;
}) {
  await requireOperationalSession();
  const [requests, access, query] = await Promise.all([
    readAdminContributionRequests(),
    readAdminContributorAccessList(),
    searchParams,
  ]);
  const pending = requests.filter((request) => request.status === "pending");
  const active = access.filter((entry) => entry.active);
  const recent = requests.filter((request) => request.status !== "pending").slice(0, 20);
  const error = firstValue(query.error);
  const updated = firstValue(query.updated);

  return (
    <PageShell as="article" className="findings-page admin-page">
      <PageHeader
        eyebrow="Administració · comunitat"
        title={<>Aportacions i <PageTitleAccent>mapa detallat</PageTitleAccent></>}
        description="Revisa aportacions no financeres i controla l’accés temporal als sectors d’1 km i 250 m."
        layout="split"
        tone="forest"
      />
      {error ? <p className={styles.status} data-error="true">La revisió no s’ha pogut completar. Comprova que el motiu sigui prou clar.</p> : null}
      {updated ? <p className={styles.status}>Canvi desat correctament.</p> : null}

      <div className={styles.summary}>
        <div><strong>{pending.length}</strong><span>Pendents de revisió</span></div>
        <div><strong>{active.length}</strong><span>Accessos actius</span></div>
        <div><strong>{requests.filter((request) => request.status === "approved").length}</strong><span>Aportacions aprovades recents</span></div>
      </div>

      <section className={styles.section}>
        <h2>Cua de revisió</h2>
        {pending.length ? (
          <div className={styles.tableFrame} tabIndex={0} role="region" aria-label="Taula d’aportacions pendents">
            <table className={styles.table}>
              <caption className="visually-hidden">Aportacions pendents de revisió</caption>
              <thead><tr><th scope="col">Aportació</th><th scope="col">Compte</th><th scope="col">Enviada</th><th scope="col">Material</th><th scope="col"><span className="visually-hidden">Accions</span></th></tr></thead>
              <tbody>
            {pending.map((request) => (
              <tr key={request.id}>
                <th scope="row">{CONTRIBUTION_KIND_LABELS[request.kind]}</th>
                <td>{request.userEmail}</td>
                <td><time dateTime={request.createdAt}>{dateFormatter.format(new Date(request.createdAt))}</time></td>
                <td>{request.mediaCount > 0 ? `${request.mediaCount} foto${request.mediaCount === 1 ? "" : "s"}` : "—"}{request.evidenceUrl ? " · evidència" : ""}</td>
                <td><ContributionReviewDialog request={request} /></td>
              </tr>
            ))}
              </tbody>
            </table>
          </div>
        ) : <p className={styles.empty}>No hi ha cap aportació pendent.</p>}
      </section>

      <section className={styles.section}>
        <h2>Accessos actius</h2>
        {active.length ? (
          <div className={styles.tableFrame} tabIndex={0} role="region" aria-label="Taula d’accessos actius">
            <table className={styles.table}>
              <caption className="visually-hidden">Accessos temporals actius al mapa detallat</caption>
              <thead><tr><th scope="col">Compte</th><th scope="col">Accés</th><th scope="col">Caduca</th><th scope="col"><span className="visually-hidden">Accions</span></th></tr></thead>
              <tbody>
            {active.map((entry) => (
              <tr key={entry.userId}>
                <th scope="row">{entry.userEmail}</th>
                <td>{entry.level === "contributor" ? "1 km i 250 m" : "1 km"}</td>
                <td><time dateTime={entry.activeUntil}>{dateFormatter.format(new Date(entry.activeUntil))}</time></td>
                <td><RevokeAccessDialog userId={entry.userId} userEmail={entry.userEmail} /></td>
              </tr>
            ))}
              </tbody>
            </table>
          </div>
        ) : <p className={styles.empty}>No hi ha cap accés actiu.</p>}
      </section>

      <section className={styles.section}>
        <h2>Revisions recents</h2>
        {recent.length ? <div className={styles.tableFrame} tabIndex={0} role="region" aria-label="Taula de revisions recents">
          <table className={styles.table}>
            <caption className="visually-hidden">Aportacions revisades recentment</caption>
            <thead><tr><th scope="col">Aportació</th><th scope="col">Compte</th><th scope="col">Resultat</th><th scope="col">Revisada</th><th scope="col">Material</th></tr></thead>
            <tbody>
          {recent.map((request) => (
            <tr key={request.id}>
              <th scope="row">{CONTRIBUTION_KIND_LABELS[request.kind]}</th>
              <td>{request.userEmail}</td>
              <td><span className={styles.statusBadge} data-status={request.status}>{request.status === "approved" ? "Aprovada" : "No aprovada"}</span></td>
              <td>{request.reviewedAt ? <time dateTime={request.reviewedAt}>{dateFormatter.format(new Date(request.reviewedAt))}</time> : "—"}</td>
              <td>{request.mediaCount > 0 ? `${request.mediaCount} foto${request.mediaCount === 1 ? "" : "s"}` : "—"}</td>
            </tr>
          ))}
            </tbody>
          </table>
        </div> : <p className={styles.empty}>Encara no hi ha revisions recents.</p>}
      </section>
    </PageShell>
  );
}
