import type { Metadata } from "next";
import { Activity, ArrowUpRight, Flag, HandHeart } from "lucide-react";
import Link from "next/link";

import { PageHeader, PageShell, PageTitleAccent, SectionHeader } from "@/components/page-layout";
import { readCommunityStatus } from "@/src/lib/community-status-server";
import { readPendingContributionCount } from "@/src/lib/contributions/server";
import { summarizeOperationalStatus } from "@/src/lib/operational-status";
import { readOperationalStatus } from "@/src/lib/operational-status-server";
import { requireOperationalSession } from "@/src/lib/operational-status-session";

import { CommunityOverview } from "./community-overview";
import styles from "./dashboard.module.css";

export const metadata: Metadata = {
  title: "Administració",
  description: "Prioritats i visió general de l’administració de Bolets.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminDashboardPage() {
  await requireOperationalSession();
  const [communityResult, contributionResult, operationalResult] = await Promise.allSettled([
    readCommunityStatus(),
    readPendingContributionCount(),
    readOperationalStatus(),
  ]);
  const community = communityResult.status === "fulfilled" ? communityResult.value : null;
  const communityError = communityResult.status === "rejected"
    ? "No s’han pogut carregar les dades de comunitat."
    : null;
  const pendingContributions = contributionResult.status === "fulfilled" ? contributionResult.value : null;
  const operationalSummary = operationalResult.status === "fulfilled"
    ? summarizeOperationalStatus(operationalResult.value)
    : null;

  return (
    <PageShell as="article" className={`admin-page ${styles.dashboard}`}>
      <PageHeader
        eyebrow="Administració · visió general"
        title={<>Bolets <PageTitleAccent>al dia</PageTitleAccent></>}
        description="Prioritats de revisió, activitat de la comunitat i una lectura breu del sistema."
        layout="split"
        tone="forest"
      />

      <section className={styles.prioritySection} aria-labelledby="admin-priorities">
        <SectionHeader
          meta="Ara mateix"
          title="Què necessita atenció"
          titleId="admin-priorities"
          description="Entrades directes a les cues de treball i a l’estat tècnic."
        />
        <div className={styles.priorityGrid}>
          <Link href="/admin/aportacions" data-tone={pendingContributions !== null && pendingContributions > 0 ? "clay" : "forest"}>
            <HandHeart aria-hidden="true" />
            <span>Aportacions pendents</span>
            <strong>{pendingContributions ?? "—"}</strong>
            <small>{pendingContributions === 1 ? "Requereix revisió humana." : "Propostes esperant revisió."}</small>
            <ArrowUpRight aria-hidden="true" />
          </Link>
          <Link href="/admin/avisos?status=open" data-tone={community?.openModerationFlags ? "red" : "forest"}>
            <Flag aria-hidden="true" />
            <span>Avisos oberts</span>
            <strong>{community?.openModerationFlags ?? "—"}</strong>
            <small>{community?.openModerationFlags ? "Requereixen moderació." : "No hi ha avisos pendents."}</small>
            <ArrowUpRight aria-hidden="true" />
          </Link>
          <Link href="/admin/operacions" data-tone={operationalSummary?.state ?? "critical"}>
            <Activity aria-hidden="true" />
            <span>Estat del sistema</span>
            <strong>{operationalSummary?.label ?? "No disponible"}</strong>
            <small>{operationalSummary?.detail ?? "No s’ha pogut consultar la telemetria."}</small>
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      </section>

      <CommunityOverview status={community} error={communityError} />
    </PageShell>
  );
}
