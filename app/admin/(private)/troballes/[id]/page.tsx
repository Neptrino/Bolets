import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import { readAdminFindingDetail } from "@/src/lib/admin-finding-detail-server";

import { formatDetailDate, formatDetailDateTime, numberFormatter } from "../../detail-utils";
import sharedStyles from "../../details.module.css";
import { FindingAdminActions } from "../finding-admin-actions";
import styles from "./finding-detail.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Detall de la troballa · Administració",
  robots: { index: false, follow: false, nocache: true },
};

const publicationLabels = {
  draft: "Esborrany",
  hidden: "Oculta",
  published: "Enviada",
} as const;

const verificationLabels = {
  community_supported: "Consens favorable",
  contested: "Identificació discutida",
  not_verifiable: "Sense validació",
  pending: "Pendent de consens",
} as const;

export default async function AdminFindingDetailPage({ params }: PageProps<"/admin/troballes/[id]">) {
  const { id } = await params;
  const finding = await readAdminFindingDetail(id);
  if (!finding) notFound();

  const isPublic = finding.visibility === "public" && finding.publicationState === "published";
  const stateTone = finding.publicationState === "published" ? "green" : finding.publicationState === "draft" ? "amber" : "red";
  const verificationTone = finding.verificationStatus === "community_supported"
    ? "green"
    : finding.verificationStatus === "contested" ? "red" : "neutral";

  return (
    <PageShell as="article" className={`admin-page ${sharedStyles.detailShell}`}>
      <Link className={styles.backLink} href="/admin/troballes">← Tornar a les troballes</Link>
      <PageHeader
        eyebrow="Administració · detall de la troballa"
        title={<>Troballa de <PageTitleAccent>{finding.reportedSpeciesName}</PageTitleAccent></>}
        description="Fitxa operativa amb la informació generalitzada disponible per a administració."
        actions={isPublic ? (
          <div className={styles.headerActions}>
            <Link href={`/troballes/${finding.id}`}>Veure la publicació ↗</Link>
          </div>
        ) : undefined}
        layout="split"
        tone="forest"
      />

      <section className={styles.record} aria-labelledby="record-title">
        <header className={styles.recordHeader}>
          <h2 id="record-title">Registre de la troballa</h2>
          <code>{finding.id}</code>
        </header>
        <div className={styles.statusRow} aria-label="Estat de la troballa">
          <span className={sharedStyles.badge} data-tone={stateTone}>{publicationLabels[finding.publicationState]}</span>
          <span className={sharedStyles.badge} data-tone={finding.visibility === "public" ? "blue" : "neutral"}>
            {finding.visibility === "public" ? "Pública" : "Privada"}
          </span>
          <span className={sharedStyles.badge} data-tone={verificationTone}>{verificationLabels[finding.verificationStatus]}</span>
          {finding.openFlagCount > 0 ? (
            <span className={sharedStyles.badge} data-tone="red">{numberFormatter.format(finding.openFlagCount)} avisos oberts</span>
          ) : null}
        </div>
        <dl className={styles.facts}>
          <div><dt>Identificació comunicada</dt><dd>{finding.reportedSpeciesName}</dd></div>
          <div><dt>Compte</dt><dd>{finding.reporterLabel}<small>{finding.showAlias ? "Àlies visible a la publicació" : "Àlies no publicat"}</small></dd></div>
          <div><dt>Observada</dt><dd><time dateTime={finding.observedOn}>{formatDetailDate(finding.observedOn)}</time></dd></div>
          <div><dt>Sector generalitzat</dt><dd>{finding.publicCellId}<small>Àrea pública de 10 × 10 km</small></dd></div>
          <div><dt>Consens</dt><dd>{finding.consensusSpeciesName ?? "Encara no establert"}<small>{numberFormatter.format(finding.consensusVoteCount)} de {numberFormatter.format(finding.voteCount)} vots</small></dd></div>
          <div><dt>Fotografies públiques</dt><dd>{numberFormatter.format(finding.publicPhotoCount)}</dd></div>
          <div><dt>Enviada</dt><dd><time dateTime={finding.createdAt}>{formatDetailDateTime(finding.createdAt)}</time></dd></div>
          <div><dt>Darrera actualització</dt><dd><time dateTime={finding.updatedAt}>{formatDetailDateTime(finding.updatedAt)}</time></dd></div>
          <div><dt>Versió</dt><dd>{numberFormatter.format(finding.revision)}<small>{numberFormatter.format(finding.resolvedFlagCount)} avisos tancats</small></dd></div>
        </dl>
      </section>

      <p className={styles.privacyNote}>
        <strong>Límit de privadesa:</strong> aquesta fitxa no consulta les coordenades exactes, les notes privades ni les fotografies que no siguin públiques.
      </p>

      {isPublic || finding.openFlagCount > 0 ? (
        <div className={styles.management}>
          <p>Les accions de moderació mantenen les dades privades del compte intactes.</p>
          <FindingAdminActions
            findingId={finding.id}
            findingName={finding.reportedSpeciesName}
            openFlagCount={finding.openFlagCount}
            publicationState={finding.publicationState}
            showDetailLink={false}
            visibility={finding.visibility}
          />
        </div>
      ) : null}
    </PageShell>
  );
}
