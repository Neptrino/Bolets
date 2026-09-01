import type { Metadata } from "next";
import Image from "next/image";

import { socialGrowthSlideCount } from "@/components/social-growth-card";
import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import {
  dailyInstagramCaption,
} from "@/src/lib/buffer-instagram-publisher";
import {
  instagramGrowthCaption,
} from "@/src/lib/buffer-instagram-growth-publisher";
import { dateInCatalonia } from "@/src/lib/buffer-client";
import { loadDailyShareCard } from "@/src/lib/daily-share-cards";
import { signedDailyShareImagePath } from "@/src/lib/daily-share-image-payload-server";
import { readInstagramPerformanceReport } from "@/src/lib/instagram-performance-server";
import { requireOperationalSession } from "@/src/lib/operational-status-session";
import {
  signedSocialGrowthImagePath,
  signedWeekendReelPath,
} from "@/src/lib/social-growth-assets";

import { DetailNav } from "../detail-nav";
import { formatDetailDateTime, numberFormatter } from "../detail-utils";
import styles from "../details.module.css";
import plannerStyles from "./instagram.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pla i rendiment d’Instagram · Administració",
  description: "Previsualització privada i rendiment recent del canal d’Instagram de Bolets Atles.",
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

const weekdayNumber = new Intl.DateTimeFormat("en", {
  timeZone: "Europe/Madrid",
  weekday: "short",
});

const localClock = new Intl.DateTimeFormat("en", {
  day: "numeric",
  hour: "numeric",
  hourCycle: "h23",
  month: "numeric",
  timeZone: "Europe/Madrid",
  year: "numeric",
});

const scheduleDate = new Intl.DateTimeFormat("ca-ES", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  weekday: "long",
});

function nextScheduleLabel(targetWeekday: number | null, targetHour: number, now = new Date()) {
  const parts = Object.fromEntries(
    localClock.formatToParts(now).map((part) => [part.type, part.value]),
  );
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const hour = Number(parts.hour);
  const currentWeekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    .indexOf(weekdayNumber.format(now));
  let daysAhead = targetWeekday === null ? 0 : (targetWeekday - currentWeekday + 7) % 7;
  if (daysAhead === 0 && hour >= targetHour) daysAhead = targetWeekday === null ? 1 : 7;
  const civilDate = new Date(Date.UTC(year, month - 1, day + daysAhead));
  return `${scheduleDate.format(civilDate)} · ${String(targetHour).padStart(2, "0")}:00`;
}

function formatMetric(value: number, unit: string | null) {
  return unit === "percentage"
    ? `${numberFormatter.format(value)}%`
    : numberFormatter.format(value);
}

export default async function AdminInstagramPage() {
  await requireOperationalSession();
  const [cardResult, reportResult] = await Promise.allSettled([
    loadDailyShareCard("catalunya"),
    readInstagramPerformanceReport(),
  ]);
  const card = cardResult.status === "fulfilled" ? cardResult.value : null;
  const report = reportResult.status === "fulfilled" ? reportResult.value : null;
  if (cardResult.status === "rejected") {
    console.error("Instagram planning preview failed", {
      message: cardResult.reason instanceof Error ? cardResult.reason.message : "Unknown error",
    });
  }
  if (reportResult.status === "rejected") {
    console.error("Instagram performance report failed", {
      message: reportResult.reason instanceof Error ? reportResult.reason.message : "Unknown error",
    });
  }

  const metrics = report?.metrics
    .filter((metric) => preferredMetrics.includes(metric.key))
    .sort((left, right) => preferredMetrics.indexOf(left.key) - preferredMetrics.indexOf(right.key)) ?? [];
  const previewable = card?.available && card.observedAt && !card.isPreview ? card : null;
  const publicationDate = previewable ? dateInCatalonia(new Date(previewable.observedAt!)) : null;
  const educationImages = previewable
    ? Array.from(
        { length: socialGrowthSlideCount("education") },
        (_, index) => signedSocialGrowthImagePath(previewable, "education", index + 1),
      )
    : [];

  return (
    <PageShell as="article" className={styles.detailShell}>
      <PageHeader
        eyebrow="Administració · taula de publicació"
        title={<>Pla visual d’<PageTitleAccent>Instagram</PageTitleAccent></>}
        description="Previsualitza exactament les peces automatitzades amb les dades vigents i revisa després com han funcionat."
        layout="split"
        tone="forest"
      />
      <DetailNav current="instagram" />

      <section className={plannerStyles.plannerSection} aria-labelledby="instagram-planner-title">
        <div className={plannerStyles.plannerHeading}>
          <div>
            <span>Pròximes peces</span>
            <h2 id="instagram-planner-title">Així es veuran</h2>
          </div>
          <p>La composició i el text són exactes. Les puntuacions canviaran si entren dades noves abans de publicar.</p>
        </div>

        {previewable && publicationDate ? (
          <div className={plannerStyles.publicationPlan}>
            <section className={plannerStyles.previewBlock}>
              <header className={plannerStyles.previewHeader}>
                <div><span>Diari · Feed + Story</span><h3>Predicció del dia</h3></div>
                <time>{nextScheduleLabel(null, 7)}</time>
              </header>
              <div className={plannerStyles.dailyPreviewGrid}>
                <figure className={plannerStyles.feedFrame}>
                  <Image
                    alt="Previsualització de la pròxima publicació diària al feed"
                    height={1350}
                    loading="eager"
                    src={signedDailyShareImagePath(previewable, "feed")}
                    unoptimized
                    width={1080}
                  />
                  <figcaption>Feed · 4:5</figcaption>
                </figure>
                <figure className={plannerStyles.storyFrame}>
                  <Image
                    alt="Previsualització de la pròxima Story diària"
                    height={1920}
                    src={signedDailyShareImagePath(previewable, "story")}
                    unoptimized
                    width={1080}
                  />
                  <figcaption>Story · 9:16</figcaption>
                </figure>
                <details className={plannerStyles.captionPreview}>
                  <summary>Veure el text del feed</summary>
                  <p>{dailyInstagramCaption(previewable, publicationDate)}</p>
                </details>
              </div>
            </section>

            <section className={plannerStyles.previewBlock}>
              <header className={plannerStyles.previewHeader}>
                <div><span>Dimecres · Carrusel</span><h3>Com llegir la predicció</h3></div>
                <time>{nextScheduleLabel(3, 19)}</time>
              </header>
              <div className={plannerStyles.carouselRail} aria-label="Cinc diapositives del carrusel educatiu">
                {educationImages.map((imagePath, index) => (
                  <figure className={plannerStyles.carouselFrame} key={imagePath}>
                    <Image
                      alt={`Diapositiva ${index + 1} de ${educationImages.length} del carrusel educatiu`}
                      height={1350}
                      src={imagePath}
                      unoptimized
                      width={1080}
                    />
                    <figcaption>{index + 1}/{educationImages.length}</figcaption>
                  </figure>
                ))}
              </div>
              <details className={plannerStyles.captionPreview}>
                <summary>Veure el text del carrusel</summary>
                <p>{instagramGrowthCaption("education", previewable, publicationDate)}</p>
              </details>
            </section>

            <section className={plannerStyles.previewBlock}>
              <header className={plannerStyles.previewHeader}>
                <div><span>Divendres · Reel</span><h3>Preparació del cap de setmana</h3></div>
                <time>{nextScheduleLabel(5, 18)}</time>
              </header>
              <div className={plannerStyles.reelPreviewGrid}>
                <figure className={plannerStyles.reelFrame}>
                  <video
                    controls
                    playsInline
                    poster={signedSocialGrowthImagePath(previewable, "weekend", 1)}
                    preload="metadata"
                    src={signedWeekendReelPath(previewable)}
                  >
                    El navegador no pot reproduir aquesta previsualització de vídeo.
                  </video>
                  <figcaption>Reel · 7,2 s · 9:16</figcaption>
                </figure>
                <div className={plannerStyles.reelNotes}>
                  <span>Publicació automàtica</span>
                  <strong>Quatre pantalles verticals amb la lectura verificada del divendres.</strong>
                  <p>Es comparteix també al feed. No incorpora música, adhesius ni localitzacions.</p>
                  <details className={plannerStyles.captionPreview}>
                    <summary>Veure el text del Reel</summary>
                    <p>{instagramGrowthCaption("weekend", previewable, publicationDate)}</p>
                  </details>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <strong>No hi ha una lectura vigent per previsualitzar</strong>
            <p>Les peces apareixeran aquí quan la lectura de Catalunya superi els controls de publicació.</p>
          </div>
        )}
      </section>

      <section className={styles.reportSection} aria-labelledby="instagram-report-title">
        <div className={plannerStyles.plannerHeading}>
          <div><span>Darrers 30 dies</span><h2 id="instagram-report-title">Rendiment</h2></div>
          {report ? <p>Dades actualitzades {formatDetailDateTime(report.metricsUpdatedAt)}</p> : null}
        </div>
        {!report ? (
          <div className={styles.emptyState}>
            <strong>L’informe no està disponible ara mateix</strong>
            <p>Comprova la connexió de Buffer i torna-ho a provar.</p>
          </div>
        ) : (
          <>
            <dl className={styles.metricGrid}>
              {metrics.map((metric) => (
                <div key={metric.key}>
                  <dt>{catalanMetricLabels[metric.key] ?? metric.label}</dt>
                  <dd>{formatMetric(metric.value, metric.unit)}</dd>
                </div>
              ))}
            </dl>

            <h3 className={plannerStyles.reportSubheading}>Publicacions amb més abast</h3>
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
          </>
        )}
      </section>
    </PageShell>
  );
}
