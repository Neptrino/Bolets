import type { Metadata } from "next";
import Image from "next/image";

import { socialGrowthSlideCount } from "@/components/social-growth-card";
import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import { catalogueSpecies } from "@/data/catalogue";
import {
  instagramGrowthCaption,
} from "@/src/lib/buffer-instagram-growth-publisher";
import { dateInCatalonia } from "@/src/lib/buffer-client";
import { loadDailyShareCard } from "@/src/lib/daily-share-cards";
import { signedDailyShareImagePath } from "@/src/lib/daily-share-image-payload-server";
import { instagramEducationTopicForDate } from "@/src/lib/instagram-education";
import {
  INSTAGRAM_SPECIES_SLIDE_COUNT,
  instagramSpeciesPublicationForSpecies,
} from "@/src/lib/instagram-species-series";
import { readInstagramPerformanceReport } from "@/src/lib/instagram-performance-server";
import { requireOperationalSession } from "@/src/lib/operational-status-session";
import {
  signedSocialGrowthImagePath,
  signedSpeciesInstagramImagePath,
  signedWeekendReelPath,
} from "@/src/lib/social-growth-assets";
import { weekendReelDurationSeconds } from "@/src/lib/weekend-reel-render";

import { formatDetailDateTime, numberFormatter } from "../detail-utils";
import styles from "../details.module.css";
import plannerStyles from "./instagram.module.css";
import { InstagramPerformancePosts } from "./instagram-performance-posts";
import { ReelPreview } from "./reel-preview";
import { SpeciesBufferComposer } from "./species-buffer-composer";

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

function nextSchedule(targetWeekday: number | null, targetHour: number, now = new Date()) {
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
  return {
    date: civilDate.toISOString().slice(0, 10),
    label: `${scheduleDate.format(civilDate)} · ${String(targetHour).padStart(2, "0")}:00`,
  };
}

function nextScheduleLabel(targetWeekday: number | null, targetHour: number, now = new Date()) {
  return nextSchedule(targetWeekday, targetHour, now).label;
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
  const educationSchedule = nextSchedule(3, 19);
  const educationTopic = instagramEducationTopicForDate(educationSchedule.date);
  const educationImages = previewable
    ? Array.from(
        { length: socialGrowthSlideCount("education") },
        (_, index) => signedSocialGrowthImagePath(previewable, "education", index + 1, educationTopic.id),
      )
    : [];
  const speciesOptions = catalogueSpecies.map((species) => ({
    label: `${species.identity.commonName} · ${species.identity.scientificName}`,
    value: species.speciesId,
  }));
  const initialSpecies = catalogueSpecies[0]!;
  const initialSpeciesPublication = instagramSpeciesPublicationForSpecies(initialSpecies.speciesId);
  const initialSpeciesImages = previewable && publicationDate
    ? Array.from(
        { length: INSTAGRAM_SPECIES_SLIDE_COUNT },
        (_, index) => signedSpeciesInstagramImagePath(
          previewable,
          publicationDate,
          index + 1,
          initialSpeciesPublication.profile.speciesId,
        ),
      )
    : [];
  return (
    <PageShell as="article" className={`admin-page ${styles.detailShell}`}>
      <PageHeader
        eyebrow="Administració · taula de publicació"
        title={<>Pla visual d’<PageTitleAccent>Instagram</PageTitleAccent></>}
        description="Previsualitza les peces previstes, comprova les dades vigents i revisa després com han funcionat."
        layout="split"
        tone="forest"
      />
      <section className={plannerStyles.plannerSection} aria-labelledby="instagram-planner-title">
        <div className={plannerStyles.plannerHeading}>
          <div>
            <span>Pròximes peces</span>
            <h2 id="instagram-planner-title">Així es veuran</h2>
          </div>
          <p>La composició i el text són exactes. A les peces recurrents, les puntuacions poden canviar abans de publicar.</p>
        </div>

        <div className={plannerStyles.publicationPlan}>
          {previewable && publicationDate ? (
            <>
              <section className={plannerStyles.previewBlock}>
                <header className={plannerStyles.previewHeader}>
                  <div><span>Diari · Story</span><h3>Predicció del dia</h3></div>
                  <time>{nextScheduleLabel(null, 7)}</time>
                </header>
                <div className={plannerStyles.dailyStoryPreview}>
                  <figure className={plannerStyles.storyFrame}>
                    <Image
                      alt="Previsualització de la pròxima Story diària"
                      height={1920}
                      loading="eager"
                      src={signedDailyShareImagePath(previewable, "story")}
                      unoptimized
                      width={1080}
                    />
                    <figcaption>Story · 9:16</figcaption>
                  </figure>
                </div>
              </section>

              <SpeciesBufferComposer
                imagePaths={initialSpeciesImages}
                initialSpeciesId={initialSpeciesPublication.profile.speciesId}
                speciesOptions={speciesOptions}
              />

              <section className={plannerStyles.previewBlock}>
                <header className={plannerStyles.previewHeader}>
                  <div><span>Dimecres · Carrusel</span><h3>{educationTopic.title}</h3></div>
                  <time>{educationSchedule.label}</time>
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
                  <p>{instagramGrowthCaption("education", previewable, educationSchedule.date)}</p>
                </details>
              </section>

              <section className={plannerStyles.previewBlock}>
                <header className={plannerStyles.previewHeader}>
                  <div><span>Divendres · Reel</span><h3>Preparació del cap de setmana</h3></div>
                  <time>{nextScheduleLabel(5, 18)}</time>
                </header>
                <div className={plannerStyles.reelPreviewGrid}>
                  <ReelPreview
                    durationLabel={`${weekendReelDurationSeconds(socialGrowthSlideCount("weekend")).toLocaleString("ca-ES")} s`}
                    poster={signedSocialGrowthImagePath(previewable, "weekend", 1)}
                    src={signedWeekendReelPath(previewable)}
                  />
                  <div className={plannerStyles.reelNotes}>
                    <span>Publicació automàtica</span>
                    <strong>Sis pantalles verticals, transicions suaus, mapa generalitzat i context del bolet líder.</strong>
                    <p>Es comparteix també al feed. No incorpora música, adhesius ni localitzacions precises.</p>
                    <details className={plannerStyles.captionPreview}>
                      <summary>Veure el text del Reel</summary>
                      <p>{instagramGrowthCaption("weekend", previewable, publicationDate)}</p>
                    </details>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <div className={styles.emptyState}>
              <strong>No hi ha una lectura vigent per previsualitzar</strong>
              <p>Les peces recurrents apareixeran aquí quan la lectura de Catalunya superi els controls de publicació.</p>
            </div>
          )}
        </div>
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

            <div className={plannerStyles.performanceHeading}>
              <div>
                <span>Rànquing del període</span>
                <h3>Publicacions amb més abast</h3>
              </div>
              <p>Ordenades per les persones úniques que les han vist.</p>
            </div>
            {report.topPosts.length > 0 ? (
              <InstagramPerformancePosts posts={report.topPosts} />
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
