import type { Metadata } from "next";
import { Download } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CONTRIBUTION_KIND_LABELS } from "@/src/lib/contributions";
import {
  type AdminContributionRequest,
  readAdminContributionRequests,
  readAdminContributorAccessList,
} from "@/src/lib/contributions/server";
import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import { DetailNav } from "../detail-nav";
import { reviewContributionAction, revokeContributorAction } from "./actions";
import styles from "./contributions.module.css";

export const metadata: Metadata = {
  title: "Aportacions · Administració",
  robots: { index: false, follow: false, nocache: true },
};

const dateFormatter = new Intl.DateTimeFormat("ca-ES", {
  dateStyle: "medium",
  timeStyle: "short",
});

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function ContributionMediaReview({ request }: { request: AdminContributionRequest }) {
  if (!request.media.length) return null;
  return (
    <div className={styles.mediaReview}>
      <div>
        <strong>{request.media.length} {request.media.length === 1 ? "fotografia privada" : "fotografies privades"}</strong>
        <span>
          {request.mediaRightsConfirmedAt
            ? `Drets confirmats el ${dateFormatter.format(new Date(request.mediaRightsConfirmedAt))}`
            : "Drets no registrats"}
          {request.mediaCredit ? ` · Crèdit: ${request.mediaCredit}` : " · Sense crèdit públic"}
        </span>
      </div>
      <div className={styles.mediaGrid}>
        {request.media.map((media, index) => (
          <figure className={styles.mediaItem} key={media.id}>
            <Image
              src={media.url}
              alt={`Fotografia aportada ${index + 1}`}
              width={media.width}
              height={media.height}
              unoptimized
            />
            <a href={`${media.url}?download=1`} download>
              <Download size={16} aria-hidden="true" />
              Descarrega la foto {index + 1}
            </a>
          </figure>
        ))}
      </div>
    </div>
  );
}

export default async function AdminContributionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[]; updated?: string | string[] }>;
}) {
  const [requests, access, query] = await Promise.all([
    readAdminContributionRequests(),
    readAdminContributorAccessList(),
    searchParams,
  ]);
  const pending = requests.filter((request) => request.status === "pending");
  const active = access.filter((entry) => entry.active);
  const recent = requests.filter((request) => request.status !== "pending").slice(0, 20);
  const error = firstValue(query.error);
  const updated = firstValue(query.updated);

  return (
    <PageShell as="article" className="findings-page">
      <PageHeader
        eyebrow="Administració · comunitat"
        title={<>Aportacions i <PageTitleAccent>mapa detallat</PageTitleAccent></>}
        description="Revisa aportacions no financeres i controla l’accés temporal als sectors d’1 km i 250 m."
        layout="split"
        tone="forest"
      />
      <DetailNav current="contributions" />

      {error ? <p className={styles.status} data-error="true">La revisió no s’ha pogut completar. Comprova que el motiu sigui prou clar.</p> : null}
      {updated ? <p className={styles.status}>Canvi desat correctament.</p> : null}

      <div className={styles.summary}>
        <div><strong>{pending.length}</strong><span>Pendents de revisió</span></div>
        <div><strong>{active.length}</strong><span>Accessos actius</span></div>
        <div><strong>{requests.filter((request) => request.status === "approved").length}</strong><span>Aportacions aprovades recents</span></div>
      </div>

      <section className={styles.section}>
        <h2>Cua de revisió</h2>
        {pending.length ? (
          <ol className={styles.queue}>
            {pending.map((request) => (
              <li className={styles.card} data-status="pending" key={request.id}>
                <div className={styles.identity}>
                  <strong>{CONTRIBUTION_KIND_LABELS[request.kind]}</strong>
                  <span>{request.userEmail} · {dateFormatter.format(new Date(request.createdAt))}</span>
                </div>
                <p className={styles.description}>{request.description}</p>
                <ContributionMediaReview request={request} />
                {request.evidenceUrl ? <Link className={styles.evidence} href={request.evidenceUrl} target="_blank" rel="noreferrer">Obrir l’evidència ↗</Link> : null}
                <form action={reviewContributionAction} className={styles.reviewForm}>
                  <input type="hidden" name="requestId" value={request.id} />
                  <label>
                    Nota de revisió
                    <textarea name="reviewNote" maxLength={1000} placeholder="Obligatòria si es rebutja; opcional si s’aprova." />
                  </label>
                  <div className={styles.actions}>
                    <button type="submit" name="decision" value="approved">Aprovar i afegir 30 dies</button>
                    <button type="submit" name="decision" value="rejected">No aprovar</button>
                  </div>
                </form>
              </li>
            ))}
          </ol>
        ) : <p className={styles.empty}>No hi ha cap aportació pendent.</p>}
      </section>

      <section className={styles.section}>
        <h2>Accessos actius</h2>
        {active.length ? (
          <ol className={styles.queue}>
            {active.map((entry) => (
              <li className={styles.card} key={entry.userId}>
                <div className={styles.identity}>
                  <strong>{entry.userEmail}</strong>
                  <span>
                    {entry.level === "contributor" ? "1 km i 250 m" : "1 km"}
                    {" · Fins al "}{dateFormatter.format(new Date(entry.activeUntil))}
                  </span>
                </div>
                <form action={revokeContributorAction} className={styles.reviewForm}>
                  <input type="hidden" name="userId" value={entry.userId} />
                  <label>Motiu de revocació<input name="reason" minLength={3} maxLength={1000} required /></label>
                  <div className={styles.actions}><button type="submit" data-danger="true">Revocar l’accés</button></div>
                </form>
              </li>
            ))}
          </ol>
        ) : <p className={styles.empty}>No hi ha cap accés actiu.</p>}
      </section>

      <section className={styles.section}>
        <h2>Revisions recents</h2>
        <ol className={styles.queue}>
          {recent.map((request) => (
            <li className={styles.card} key={request.id}>
              <div className={styles.identity}>
                <strong>{CONTRIBUTION_KIND_LABELS[request.kind]}</strong>
                <span>{request.userEmail} · {request.status === "approved" ? "Aprovada" : "No aprovada"}</span>
              </div>
              {request.reviewNote ? <p className={styles.description}>{request.reviewNote}</p> : null}
              <ContributionMediaReview request={request} />
            </li>
          ))}
        </ol>
      </section>
    </PageShell>
  );
}
