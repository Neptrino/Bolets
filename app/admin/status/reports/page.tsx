import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import {
  readAdminReportsPage,
  type AdminReportListItem,
  type AdminReportStatus,
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
  title: "Avisos de moderació · Administració",
  description: "Detall privat dels avisos de moderació de Bolets.",
  robots: { index: false, follow: false, nocache: true },
};

type ReportSearchParams = {
  page?: string | string[];
  status?: string | string[];
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseStatus(value: string | string[] | undefined): AdminReportStatus | undefined {
  const candidate = firstValue(value);
  return candidate === "open" || candidate === "resolved" || candidate === "dismissed"
    ? candidate
    : undefined;
}

function reasonLabel(reason: AdminReportListItem["reason"]) {
  return ({
    spam: "Contingut brossa",
    privacy: "Privacitat",
    unsafe: "Contingut insegur",
    other: "Altres motius",
  } as const)[reason];
}

function statusLabel(status: AdminReportStatus) {
  return status === "open" ? "Obert" : status === "resolved" ? "Resolt" : "Desestimat";
}

function statusTone(status: AdminReportStatus) {
  return status === "open" ? "red" : status === "resolved" ? "green" : undefined;
}

function findingStateLabel(state: AdminReportListItem["findingPublicationState"]) {
  return state === "published" ? "Enviada" : state === "draft" ? "Esborrany" : "Oculta";
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<ReportSearchParams>;
}) {
  const query = await searchParams;
  const page = positivePage(query.page);
  const status = parseStatus(query.status);
  const result = await readAdminReportsPage(page, status);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const first = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const last = Math.min(result.total, result.page * result.pageSize);
  const presets: Array<{ label: string; href: string; status?: AdminReportStatus }> = [
    { label: "Tots", href: "/admin/status/reports" },
    { label: "Oberts", href: "/admin/status/reports?status=open", status: "open" },
    { label: "Resolts", href: "/admin/status/reports?status=resolved", status: "resolved" },
    { label: "Desestimats", href: "/admin/status/reports?status=dismissed", status: "dismissed" },
  ];

  return (
    <PageShell as="article" className={styles.detailShell}>
      <PageHeader
        eyebrow="Administració · moderació"
        title={<>Avisos de <PageTitleAccent>moderació</PageTitleAccent></>}
        description="Informes enviats per la comunitat sobre una troballa. La identitat del reporter es mostra de forma pseudònima i no es consulten dades privades de camp."
        layout="split"
        tone="forest"
      />
      <DetailNav current="reports" />

      <nav className={styles.filterBar} aria-label="Filtres d’avisos">
        {presets.map((preset) => (
          <Link href={preset.href} aria-current={status === preset.status ? "page" : undefined} key={preset.href}>
            {preset.label}
          </Link>
        ))}
      </nav>

      <div className={styles.overviewLine}>
        <strong>{numberFormatter.format(result.total)} avisos</strong>
        <span>Mostrant {numberFormatter.format(first)}–{numberFormatter.format(last)}</span>
      </div>

      {result.items.length > 0 ? (
        <ol className={styles.detailList}>
          {result.items.map((report) => (
            <li className={styles.detailCard} data-alert={report.status === "open"} key={report.id}>
              <div className={styles.identity}>
                <span>{reasonLabel(report.reason)}</span>
                <strong>
                  {report.findingVisibility === "public" && report.findingPublicationState === "published"
                    ? <Link className={styles.publicLink} href={`/troballes/${report.findingId}`}>{report.findingSpeciesName}</Link>
                    : report.findingSpeciesName}
                </strong>
                <small>Comunicada per {report.reporterLabel}</small>
                <div className={styles.badgeRow}>
                  <span className={styles.badge} data-tone={statusTone(report.status)}>{statusLabel(report.status)}</span>
                  <span className={styles.badge} data-tone={report.findingVisibility === "public" ? "blue" : undefined}>
                    Troballa {report.findingVisibility === "public" ? "pública" : "privada"}
                  </span>
                </div>
              </div>
              <div className={styles.reportBody}>
                <p>{report.detail ?? "El reporter no ha afegit cap detall."}</p>
                <dl className={styles.facts}>
                  <div><dt>Rebut</dt><dd>{formatDetailDateTime(report.createdAt)}</dd></div>
                  <div><dt>Troballa observada</dt><dd>{formatDetailDate(report.findingObservedOn)}</dd></div>
                  <div><dt>Resolució</dt><dd>{formatDetailDateTime(report.resolvedAt)}</dd></div>
                  <div><dt>Estat de la troballa</dt><dd>{findingStateLabel(report.findingPublicationState)}</dd></div>
                </dl>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className={styles.emptyState}>
          <strong>No hi ha avisos amb aquest filtre</strong>
          <p>Tria un altre estat per consultar l’historial de moderació.</p>
        </div>
      )}

      <nav className={styles.pager} aria-label="Paginació d’avisos">
        {result.page > 1 ? (
          <Link href={pageHref("/admin/status/reports", result.page - 1, { status })}>← Anterior</Link>
        ) : <span />}
        <span>Pàgina {numberFormatter.format(result.page)} de {numberFormatter.format(totalPages)}</span>
        {result.page < totalPages ? (
          <Link href={pageHref("/admin/status/reports", result.page + 1, { status })}>Següent →</Link>
        ) : <span />}
      </nav>
    </PageShell>
  );
}
