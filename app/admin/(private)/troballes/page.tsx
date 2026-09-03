import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import {
  readAdminFindingsPage,
  type AdminFindingFilters,
  type AdminFindingListItem,
} from "@/src/lib/community-details-server";
import { requireOperationalSession } from "@/src/lib/operational-status-session";

import {
  formatDetailDate,
  formatDetailDateTime,
  numberFormatter,
  pageHref,
  positivePage,
} from "../detail-utils";
import styles from "../details.module.css";
import { FindingAdminActions } from "./finding-admin-actions";

export const metadata: Metadata = {
  title: "Troballes comunicades · Administració",
  description: "Detall privat i generalitzat de les troballes comunicades a Bolets.",
  robots: { index: false, follow: false, nocache: true },
};

type FindingSearchParams = {
  error?: string | string[];
  flagged?: string | string[];
  page?: string | string[];
  state?: string | string[];
  updated?: string | string[];
  verification?: string | string[];
  visibility?: string | string[];
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseFilters(query: FindingSearchParams): AdminFindingFilters {
  const state = firstValue(query.state);
  const visibility = firstValue(query.visibility);
  const verification = firstValue(query.verification);
  return {
    flagged: firstValue(query.flagged) === "open" ? "open" : undefined,
    publicationState: state === "draft" || state === "published" || state === "hidden" ? state : undefined,
    verificationStatus: verification === "not_verifiable" || verification === "pending"
      || verification === "community_supported" || verification === "contested"
      ? verification
      : undefined,
    visibility: visibility === "private" || visibility === "public" ? visibility : undefined,
  };
}

function stateLabel(state: AdminFindingListItem["publicationState"]) {
  return state === "published" ? "Enviada" : state === "draft" ? "Esborrany" : "Oculta";
}

function verificationLabel(status: AdminFindingListItem["verificationStatus"]) {
  return ({
    not_verifiable: "Sense validació",
    pending: "Pendent de consens",
    community_supported: "Consens favorable",
    contested: "Identificació discutida",
  } as const)[status];
}

function filterValues(filters: AdminFindingFilters) {
  return {
    flagged: filters.flagged,
    state: filters.publicationState,
    verification: filters.verificationStatus,
    visibility: filters.visibility,
  };
}

function isPreset(filters: AdminFindingFilters, preset: AdminFindingFilters) {
  return JSON.stringify(filters) === JSON.stringify(preset);
}

export default async function AdminFindingsPage({
  searchParams,
}: {
  searchParams: Promise<FindingSearchParams>;
}) {
  await requireOperationalSession();
  const query = await searchParams;
  const page = positivePage(query.page);
  const filters = parseFilters(query);
  const error = firstValue(query.error);
  const updated = firstValue(query.updated);
  const result = await readAdminFindingsPage(page, filters);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const first = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const last = Math.min(result.total, result.page * result.pageSize);
  const paginationValues = filterValues(filters);
  const presets: Array<{ label: string; href: string; filters: AdminFindingFilters }> = [
    { label: "Totes", href: "/admin/troballes", filters: {} },
    { label: "Enviades", href: "/admin/troballes?state=published", filters: { publicationState: "published" } },
    { label: "Públiques", href: "/admin/troballes?state=published&visibility=public", filters: { publicationState: "published", visibility: "public" } },
    { label: "Privades", href: "/admin/troballes?state=published&visibility=private", filters: { publicationState: "published", visibility: "private" } },
    { label: "Esborranys", href: "/admin/troballes?state=draft", filters: { publicationState: "draft" } },
    { label: "Pendents de consens", href: "/admin/troballes?state=published&verification=pending", filters: { publicationState: "published", verificationStatus: "pending" } },
    { label: "Amb avisos", href: "/admin/troballes?flagged=open", filters: { flagged: "open" } },
  ];

  return (
    <PageShell as="article" className={`admin-page ${styles.detailShell}`}>
      <PageHeader
        eyebrow="Administració · comunitat"
        title={<>Troballes <PageTitleAccent>comunicades</PageTitleAccent></>}
        description="Lectura operativa de les troballes, la seva publicació i el consens comunitari. Les ubicacions exactes, notes i fotografies privades no es consulten."
        layout="split"
        tone="forest"
      />
      {error ? (
        <p className={styles.actionNotice} data-tone="error">
          No s’ha pogut retirar la troballa. Pot haver canviat o ja no ser pública.
        </p>
      ) : null}
      {updated === "hidden" ? (
        <p className={styles.actionNotice}>Troballa retirada del públic correctament.</p>
      ) : null}
      <nav className={styles.filterBar} aria-label="Filtres de troballes">
        {presets.map((preset) => (
          <Link href={preset.href} aria-current={isPreset(filters, preset.filters) ? "page" : undefined} key={preset.href}>
            {preset.label}
          </Link>
        ))}
      </nav>

      <div className={styles.overviewLine}>
        <strong>{numberFormatter.format(result.total)} troballes</strong>
        <span>Mostrant {numberFormatter.format(first)}–{numberFormatter.format(last)}</span>
      </div>

      {result.items.length > 0 ? (
        <div className={styles.adminTableFrame} tabIndex={0} role="region" aria-label="Taula de troballes comunicades">
          <table className={`${styles.adminTable} ${styles.findingsTable}`}>
            <caption className="visually-hidden">
              Troballes comunicades, publicació, visibilitat, data observada, validació comunitària i avisos
            </caption>
            <thead>
              <tr>
                <th scope="col">Troballa</th>
                <th scope="col">Publicació</th>
                <th scope="col">Visibilitat</th>
                <th scope="col">Observada</th>
                <th scope="col">Validació</th>
                <th scope="col">Vots</th>
                <th scope="col">Avisos</th>
                <th scope="col"><span className="visually-hidden">Accions</span></th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((finding) => (
                <tr
                  data-alert={finding.openFlagCount > 0}
                  data-state={finding.publicationState}
                  key={finding.id}
                >
                  <th scope="row">
                    <strong>
                      <Link className={styles.publicLink} href={`/admin/troballes/${finding.id}`}>
                        {finding.reportedSpeciesName}
                      </Link>
                    </strong>
                    <small>{finding.reporterLabel}</small>
                    <time className={styles.tableMeta} dateTime={finding.createdAt}>
                      Enviada {formatDetailDateTime(finding.createdAt)}
                    </time>
                  </th>
                  <td>
                    <span className={styles.badge} data-tone={finding.publicationState === "published" ? "green" : finding.publicationState === "draft" ? "amber" : "red"}>
                      {stateLabel(finding.publicationState)}
                    </span>
                  </td>
                  <td>
                    <span className={styles.badge} data-tone={finding.visibility === "public" ? "blue" : "neutral"}>
                      {finding.visibility === "public" ? "Pública" : "Privada"}
                    </span>
                  </td>
                  <td>
                    <time dateTime={finding.observedOn}>{formatDetailDate(finding.observedOn)}</time>
                  </td>
                  <td>
                    <span className={styles.badge} data-tone={finding.verificationStatus === "contested" ? "red" : finding.verificationStatus === "community_supported" ? "green" : "neutral"}>
                      {verificationLabel(finding.verificationStatus)}
                    </span>
                    {finding.consensusSpeciesName ? (
                      <small className={styles.tableMeta}>{finding.consensusSpeciesName}</small>
                    ) : null}
                  </td>
                  <td>
                    <strong>{numberFormatter.format(finding.voteCount)}</strong>
                    <small className={styles.tableMeta}>
                      {numberFormatter.format(finding.consensusVoteCount)} de consens
                    </small>
                  </td>
                  <td>
                    {finding.openFlagCount > 0 ? (
                      <span className={styles.badge} data-tone="red">
                        {numberFormatter.format(finding.openFlagCount)} oberts
                      </span>
                    ) : (
                      <span className={styles.tableMuted}>—</span>
                    )}
                  </td>
                  <td>
                    <FindingAdminActions
                      findingId={finding.id}
                      findingName={finding.reportedSpeciesName}
                      openFlagCount={finding.openFlagCount}
                      publicationState={finding.publicationState}
                      visibility={finding.visibility}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <strong>No hi ha troballes amb aquest filtre</strong>
          <p>Tria una altra vista per consultar l’activitat disponible.</p>
        </div>
      )}

      <nav className={styles.pager} aria-label="Paginació de troballes">
        {result.page > 1 ? (
          <Link href={pageHref("/admin/troballes", result.page - 1, paginationValues)}>← Anterior</Link>
        ) : <span />}
        <span>Pàgina {numberFormatter.format(result.page)} de {numberFormatter.format(totalPages)}</span>
        {result.page < totalPages ? (
          <Link href={pageHref("/admin/troballes", result.page + 1, paginationValues)}>Següent →</Link>
        ) : <span />}
      </nav>
    </PageShell>
  );
}
