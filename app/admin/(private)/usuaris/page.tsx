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
        description="Comptes d’accés i activitat agregada. Els correus es mostren emmascarats i no s’exposa cap dada privada de camp."
        layout="split"
        tone="forest"
      />
      <div className={styles.overviewLine}>
        <strong>{numberFormatter.format(result.total)} usuaris</strong>
        <span>Mostrant {numberFormatter.format(first)}–{numberFormatter.format(last)}</span>
      </div>

      {result.items.length > 0 ? (
        <ol className={styles.detailList}>
          {result.items.map((user) => (
            <li className={styles.detailCard} key={user.id}>
              <div className={styles.identity}>
                <span>{user.alias ? "Àlies públic" : "Compte"}</span>
                <strong>{user.alias ?? user.maskedEmail}</strong>
                <small>{user.alias ? user.maskedEmail : `Identificador ${user.id.slice(0, 8)}`}</small>
                <div className={styles.badgeRow}>
                  {(user.providers.length > 0 ? user.providers : ["email"]).map((provider) => (
                    <span className={styles.badge} data-tone="blue" key={provider}>
                      {providerLabels[provider] ?? provider}
                    </span>
                  ))}
                  {user.draftFindings > 0 ? (
                    <span className={styles.badge} data-tone="amber">
                      {numberFormatter.format(user.draftFindings)} esborranys
                    </span>
                  ) : null}
                </div>
              </div>
              <dl className={styles.facts}>
                <div><dt>Alta</dt><dd>{formatDetailDate(user.createdAt)}</dd></div>
                <div><dt>Darrer accés</dt><dd>{formatDetailDateTime(user.lastSignInAt)}</dd></div>
                <div><dt>Troballes enviades</dt><dd>{numberFormatter.format(user.submittedFindings)}</dd></div>
                <div>
                  <dt>Visibilitat</dt>
                  <dd>{numberFormatter.format(user.publicFindings)} púb. · {numberFormatter.format(user.privateFindings)} priv.</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
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
