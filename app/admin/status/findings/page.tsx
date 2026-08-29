import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import {
  readAdminFindingsPage,
  type AdminFindingFilters,
  type AdminFindingListItem,
} from "@/src/lib/community-details-server";

import { DetailNav } from "../detail-nav";
import {
  formatDetailDate,
  formatDetailDateTime,
  numberFormatter,
  pageHref,
  positivePage,
} from "../detail-utils";
import styles from "../details.module.css";

export const metadata: Metadata = {
  title: "Troballes comunicades · Administració",
  description: "Detall privat i generalitzat de les troballes comunicades a Bolets.",
  robots: { index: false, follow: false, nocache: true },
};

type FindingSearchParams = {
  flagged?: string | string[];
  page?: string | string[];
  state?: string | string[];
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
  const query = await searchParams;
  const page = positivePage(query.page);
  const filters = parseFilters(query);
  const result = await readAdminFindingsPage(page, filters);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const first = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const last = Math.min(result.total, result.page * result.pageSize);
  const paginationValues = filterValues(filters);
  const presets: Array<{ label: string; href: string; filters: AdminFindingFilters }> = [
    { label: "Totes", href: "/admin/status/findings", filters: {} },
    { label: "Enviades", href: "/admin/status/findings?state=published", filters: { publicationState: "published" } },
    { label: "Públiques", href: "/admin/status/findings?state=published&visibility=public", filters: { publicationState: "published", visibility: "public" } },
    { label: "Privades", href: "/admin/status/findings?state=published&visibility=private", filters: { publicationState: "published", visibility: "private" } },
    { label: "Esborranys", href: "/admin/status/findings?state=draft", filters: { publicationState: "draft" } },
    { label: "Pendents de consens", href: "/admin/status/findings?state=published&verification=pending", filters: { publicationState: "published", verificationStatus: "pending" } },
    { label: "Amb avisos", href: "/admin/status/findings?flagged=open", filters: { flagged: "open" } },
  ];

  return (
    <PageShell as="article" className={styles.detailShell}>
      <PageHeader
        eyebrow="Administració · comunitat"
        title={<>Troballes <PageTitleAccent>comunicades</PageTitleAccent></>}
        description="Lectura operativa de les troballes, la seva publicació i el consens comunitari. Les ubicacions exactes, notes i fotografies privades no es consulten."
        layout="split"
        tone="forest"
      />
      <DetailNav current="findings" />

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
        <ol className={styles.detailList}>
          {result.items.map((finding) => (
            <li
              className={styles.detailCard}
              data-alert={finding.openFlagCount > 0}
              data-state={finding.publicationState}
              key={finding.id}
            >
              <div className={styles.identity}>
                <span>Espècie comunicada</span>
                <strong>
                  {finding.visibility === "public" && finding.publicationState === "published"
                    ? <Link className={styles.publicLink} href={`/troballes/${finding.id}`}>{finding.reportedSpeciesName}</Link>
                    : finding.reportedSpeciesName}
                </strong>
                <small>{finding.reporterLabel} · enviada {formatDetailDateTime(finding.createdAt)}</small>
                <div className={styles.badgeRow}>
                  <span className={styles.badge} data-tone={finding.publicationState === "published" ? "green" : finding.publicationState === "draft" ? "amber" : "red"}>
                    {stateLabel(finding.publicationState)}
                  </span>
                  <span className={styles.badge} data-tone={finding.visibility === "public" ? "blue" : undefined}>
                    {finding.visibility === "public" ? "Pública" : "Privada"}
                  </span>
                  <span className={styles.badge} data-tone={finding.verificationStatus === "contested" ? "red" : finding.verificationStatus === "community_supported" ? "green" : undefined}>
                    {verificationLabel(finding.verificationStatus)}
                  </span>
                  {finding.openFlagCount > 0 ? (
                    <span className={styles.badge} data-tone="red">
                      {numberFormatter.format(finding.openFlagCount)} avisos oberts
                    </span>
                  ) : null}
                </div>
              </div>
              <dl className={styles.facts}>
                <div><dt>Observada</dt><dd>{formatDetailDate(finding.observedOn)}</dd></div>
                <div><dt>Vots</dt><dd>{numberFormatter.format(finding.voteCount)}</dd></div>
                <div><dt>Vots de consens</dt><dd>{numberFormatter.format(finding.consensusVoteCount)}</dd></div>
                <div><dt>Identificació consensuada</dt><dd>{finding.consensusSpeciesName ?? "—"}</dd></div>
              </dl>
            </li>
          ))}
        </ol>
      ) : (
        <div className={styles.emptyState}>
          <strong>No hi ha troballes amb aquest filtre</strong>
          <p>Tria una altra vista per consultar l’activitat disponible.</p>
        </div>
      )}

      <nav className={styles.pager} aria-label="Paginació de troballes">
        {result.page > 1 ? (
          <Link href={pageHref("/admin/status/findings", result.page - 1, paginationValues)}>← Anterior</Link>
        ) : <span />}
        <span>Pàgina {numberFormatter.format(result.page)} de {numberFormatter.format(totalPages)}</span>
        {result.page < totalPages ? (
          <Link href={pageHref("/admin/status/findings", result.page + 1, paginationValues)}>Següent →</Link>
        ) : <span />}
      </nav>
    </PageShell>
  );
}
