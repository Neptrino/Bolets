import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import { readAdminUsersPage } from "@/src/lib/community-details-server";
import { requireOperationalSession } from "@/src/lib/operational-status-session";

import {
  formatDetailDate,
  formatDetailDateTime,
  numberFormatter,
  pageHref,
  positivePage,
} from "../detail-utils";
import styles from "../details.module.css";

export const metadata: Metadata = {
  title: "Usuaris registrats · Administració",
  description: "Detall privat dels comptes registrats a Bolets.",
  robots: { index: false, follow: false, nocache: true },
};

const providerLabels: Record<string, string> = {
  email: "Correu",
  google: "Google",
  phone: "Telèfon",
};

const accessLabels = {
  administrator: "Tot el detall",
  contributor: "1 km i 250 m",
  finding: "1 km",
  public: "Mapa públic",
} as const;

function contributionSummary(contributions: {
  pending: number;
  approved: number;
  rejected: number;
}) {
  const parts = [
    contributions.pending > 0 ? `${numberFormatter.format(contributions.pending)} pend.` : null,
    contributions.approved > 0 ? `${numberFormatter.format(contributions.approved)} aprov.` : null,
    contributions.rejected > 0 ? `${numberFormatter.format(contributions.rejected)} rebutj.` : null,
  ].filter((part): part is string => part !== null);
  return parts.join(" · ") || "—";
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  await requireOperationalSession();
  const query = await searchParams;
  const page = positivePage(query.page);
  const result = await readAdminUsersPage(page);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const first = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const last = Math.min(result.total, result.page * result.pageSize);

  return (
    <PageShell as="article" className={`admin-page ${styles.detailShell}`}>
      <PageHeader
        eyebrow="Administració · comunitat"
        title={<>Usuaris <PageTitleAccent>registrats</PageTitleAccent></>}
        description="Rols, accés al mapa, aportacions i activitat agregada. Els correus es mostren emmascarats i no s’exposa cap dada privada de camp."
        layout="split"
        tone="forest"
      />
      <div className={styles.overviewLine}>
        <strong>{numberFormatter.format(result.total)} usuaris</strong>
        <span>Mostrant {numberFormatter.format(first)}–{numberFormatter.format(last)}</span>
      </div>

      {result.items.length > 0 ? (
        <div className={styles.adminTableFrame} tabIndex={0} role="region" aria-label="Taula d’usuaris registrats">
          <table className={styles.adminTable}>
            <caption className="visually-hidden">Usuaris registrats, rol, accés al mapa, aportacions i activitat</caption>
            <thead>
              <tr>
                <th scope="col">Compte</th>
                <th scope="col">Rol</th>
                <th scope="col">Accés al mapa</th>
                <th scope="col">Caducitat</th>
                <th scope="col">Aportacions</th>
                <th scope="col">Troballes</th>
                <th scope="col">Darrer accés</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((user) => {
                const accessTone = user.mapAccess.revokedAt
                  ? "red"
                  : user.mapAccess.active ? "green" : "neutral";
                return (
                  <tr key={user.id}>
                    <th scope="row">
                      <strong>{user.alias ?? user.maskedEmail}</strong>
                      {user.alias ? <small>{user.maskedEmail}</small> : null}
                      <span className={styles.tableMeta}>
                        {(user.providers.length > 0 ? user.providers : ["email"])
                          .map((provider) => providerLabels[provider] ?? provider)
                          .join(" · ")}
                        {` · Alta ${formatDetailDate(user.createdAt)}`}
                      </span>
                    </th>
                    <td>
                      <span className={styles.badge} data-tone={user.role === "admin" ? "blue" : "neutral"}>
                        {user.role === "admin" ? "Administració" : "Usuari"}
                      </span>
                    </td>
                    <td>
                      <span className={styles.badge} data-tone={accessTone}>
                        {user.mapAccess.revokedAt ? "Revocat" : accessLabels[user.mapAccess.level]}
                      </span>
                      <small className={styles.tableMeta}>
                        {user.mapAccess.minimumResolutionM === 2500
                          ? "Sectors de 2,5 km"
                          : `Fins a ${numberFormatter.format(user.mapAccess.minimumResolutionM)} m`}
                      </small>
                    </td>
                    <td>
                      {user.mapAccess.level === "administrator" ? (
                        <strong>Sense caducitat</strong>
                      ) : user.mapAccess.expiresAt ? (
                        <time dateTime={user.mapAccess.expiresAt}>{formatDetailDateTime(user.mapAccess.expiresAt)}</time>
                      ) : (
                        <span className={styles.tableMuted}>—</span>
                      )}
                    </td>
                    <td>
                      <strong>{numberFormatter.format(user.contributions.total)}</strong>
                      <small className={styles.tableMeta}>{contributionSummary(user.contributions)}</small>
                    </td>
                    <td>
                      <strong>{numberFormatter.format(user.submittedFindings)}</strong>
                      <small className={styles.tableMeta}>
                        {numberFormatter.format(user.publicFindings)} púb. · {numberFormatter.format(user.privateFindings)} priv.
                        {user.draftFindings > 0 ? ` · ${numberFormatter.format(user.draftFindings)} esb.` : ""}
                      </small>
                    </td>
                    <td><time dateTime={user.lastSignInAt ?? undefined}>{formatDetailDateTime(user.lastSignInAt)}</time></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <strong>No hi ha usuaris en aquesta pàgina</strong>
          <p>Torna a la primera pàgina per veure els comptes disponibles.</p>
        </div>
      )}

      <nav className={styles.pager} aria-label="Paginació d’usuaris">
        {result.page > 1 ? <Link href={pageHref("/admin/usuaris", result.page - 1)}>← Anterior</Link> : <span />}
        <span>Pàgina {numberFormatter.format(result.page)} de {numberFormatter.format(totalPages)}</span>
        {result.page < totalPages ? <Link href={pageHref("/admin/usuaris", result.page + 1)}>Següent →</Link> : <span />}
      </nav>
    </PageShell>
  );
}
