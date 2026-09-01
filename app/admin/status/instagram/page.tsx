import type { Metadata } from "next";

import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import { readInstagramPerformanceReport } from "@/src/lib/instagram-performance-server";

import { DetailNav } from "../detail-nav";
import { formatDetailDateTime, numberFormatter } from "../detail-utils";
import styles from "../details.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rendiment d’Instagram · Administració",
  description: "Informe privat del rendiment recent del canal d’Instagram de Bolets Atles.",
  robots: { index: false, follow: false, nocache: true },
};

const preferredMetrics = [
  "post_count",
  "reach",
  "impressions",
  "views",
  "shares",
  "saves",
  "comments",
  "reactions",
  "engagement_rate",
  "follows",
  "profile_visits",
];

const catalanMetricLabels: Record<string, string> = {
  comments: "Comentaris",
  engagement_rate: "Taxa d’interacció",
  follows: "Nous seguidors",
  impressions: "Impressions",
  post_count: "Publicacions",
  profile_visits: "Visites al perfil",
  reach: "Abast",
  reactions: "Reaccions",
  saves: "Desats",
  shares: "Comparticions",
  views: "Visualitzacions",
};

const formatLabels: Record<string, string> = {
  post: "Publicació",
  reel: "Reel",
  story: "Story",
};

function formatMetric(value: number, unit: string | null) {
  return unit === "percentage"
    ? `${numberFormatter.format(value)}%`
    : numberFormatter.format(value);
}

export default async function AdminInstagramPage() {
  let report: Awaited<ReturnType<typeof readInstagramPerformanceReport>> | null = null;
  let unavailable = false;
  try {
    report = await readInstagramPerformanceReport();
  } catch (error) {
    unavailable = true;
    console.error("Instagram performance report failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  const metrics = report?.metrics
    .filter((metric) => preferredMetrics.includes(metric.key))
    .sort((left, right) => preferredMetrics.indexOf(left.key) - preferredMetrics.indexOf(right.key)) ?? [];

  return (
    <PageShell as="article" className={styles.detailShell}>
      <PageHeader
        eyebrow="Administració · creixement"
        title={<>Rendiment a <PageTitleAccent>Instagram</PageTitleAccent></>}
        description="Resultats dels darrers 30 dies del canal @bolets.app. Les mètriques de Buffer poden actualitzar-se amb retard."
        layout="split"
        tone="forest"
      />
      <DetailNav current="instagram" />

      {unavailable || !report ? (
        <div className={styles.emptyState}>
          <strong>L’informe no està disponible ara mateix</strong>
          <p>Comprova la connexió de Buffer i torna-ho a provar.</p>
        </div>
      ) : (
        <>
          <div className={styles.overviewLine}>
            <strong>@{report.channelName} · darrers 30 dies</strong>
            <span>Dades actualitzades {formatDetailDateTime(report.metricsUpdatedAt)}</span>
          </div>

          <dl className={styles.metricGrid}>
            {metrics.map((metric) => (
              <div key={metric.key}>
                <dt>{catalanMetricLabels[metric.key] ?? metric.label}</dt>
                <dd>{formatMetric(metric.value, metric.unit)}</dd>
              </div>
            ))}
          </dl>

          <section className={styles.reportSection}>
            <h2>Publicacions amb més abast</h2>
            {report.topPosts.length > 0 ? (
              <ol className={styles.detailList}>
                {report.topPosts.map((post) => (
                  <li className={styles.socialPost} key={post.id}>
                    <div>
                      <span className={styles.badge} data-tone="green">{formatLabels[post.format] ?? post.format}</span>
                      <strong>{post.caption || "Publicació sense text"}</strong>
                      <small>{formatDetailDateTime(post.publishedAt)}</small>
                    </div>
                    <dl>
                      <div><dt>Abast</dt><dd>{numberFormatter.format(post.reach)}</dd></div>
                      <div><dt>Comparticions</dt><dd>{numberFormatter.format(post.shares)}</dd></div>
                      <div><dt>Desats</dt><dd>{numberFormatter.format(post.saves)}</dd></div>
                    </dl>
                  </li>
                ))}
              </ol>
            ) : (
              <div className={styles.emptyState}>
                <strong>Encara no hi ha mètriques per publicació</strong>
                <p>Buffer les incorporarà quan Instagram les hagi processat.</p>
              </div>
            )}
          </section>
        </>
      )}
    </PageShell>
  );
}
