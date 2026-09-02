"use client";

import { Download, ExternalLink, FileCheck2, ShieldX, X } from "lucide-react";
import Image from "next/image";
import { useId, useRef } from "react";

import { CONTRIBUTION_KIND_LABELS } from "@/src/lib/contributions";
import type { AdminContributionRequest } from "@/src/lib/contributions/server";

import { reviewContributionAction, revokeContributorAction } from "./actions";
import styles from "./contributions.module.css";

const dateFormatter = new Intl.DateTimeFormat("ca-ES", {
  dateStyle: "medium",
  timeStyle: "short",
});

function ContributionEvidence({ request }: { request: AdminContributionRequest }) {
  return (
    <>
      <p className={styles.dialogDescription}>{request.description}</p>
      <div className={styles.reviewLinks}>
        {request.findingId ? <a href={`/troballes/${request.findingId}`} target="_blank" rel="noreferrer"><ExternalLink size={15} aria-hidden="true" /> Obrir la troballa vinculada</a> : null}
        {request.evidenceUrl ? <a href={request.evidenceUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} aria-hidden="true" /> Obrir l’evidència</a> : null}
      </div>
      {request.media.length ? (
        <section className={styles.mediaReview} aria-label="Fotografies privades aportades">
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
        </section>
      ) : null}
    </>
  );
}

export function ContributionReviewDialog({ request }: { request: AdminContributionRequest }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <>
      <button className={styles.tableAction} type="button" onClick={() => dialog.current?.showModal()}>
        Revisar
      </button>
      <dialog
        ref={dialog}
        className={styles.reviewDialog}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <form action={reviewContributionAction} className={styles.reviewDialogCard}>
          <input type="hidden" name="requestId" value={request.id} />
          <button type="button" className={styles.dialogClose} onClick={() => dialog.current?.close()} aria-label="Tancar">
            <X size={20} aria-hidden="true" />
          </button>
          <header className={styles.dialogHeader}>
            <span aria-hidden="true"><FileCheck2 size={23} /></span>
            <div>
              <p>Aportació pendent</p>
              <h2 id={titleId}>{CONTRIBUTION_KIND_LABELS[request.kind]}</h2>
              <small id={descriptionId}>{request.userEmail} · {dateFormatter.format(new Date(request.createdAt))}</small>
            </div>
          </header>
          <ContributionEvidence request={request} />
          <label className={styles.reviewNote}>
            Nota de revisió
            <textarea name="reviewNote" maxLength={1000} placeholder="Obligatòria si es rebutja; opcional si s’aprova." />
          </label>
          <div className={styles.dialogActions}>
            <button type="button" onClick={() => dialog.current?.close()}>Cancel·lar</button>
            <button type="submit" name="decision" value="rejected">No aprovar</button>
            <button type="submit" name="decision" value="approved">Aprovar · +30 dies</button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function ContributionDetailsDialog({ request }: { request: AdminContributionRequest }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const approved = request.status === "approved";

  return (
    <>
      <button className={styles.tableAction} type="button" data-tone="neutral" onClick={() => dialog.current?.showModal()}>
        Veure
      </button>
      <dialog
        ref={dialog}
        className={styles.reviewDialog}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className={styles.reviewDialogCard}>
          <button type="button" className={styles.dialogClose} onClick={() => dialog.current?.close()} aria-label="Tancar">
            <X size={20} aria-hidden="true" />
          </button>
          <header className={styles.dialogHeader}>
            <span aria-hidden="true"><FileCheck2 size={23} /></span>
            <div>
              <p>{approved ? "Aportació aprovada" : "Aportació no aprovada"}</p>
              <h2 id={titleId}>{CONTRIBUTION_KIND_LABELS[request.kind]}</h2>
              <small>{request.userEmail} · {request.reviewedAt ? dateFormatter.format(new Date(request.reviewedAt)) : "Sense data de revisió"}</small>
            </div>
          </header>
          <ContributionEvidence request={request} />
          <section className={styles.reviewOutcome} aria-label="Resultat de la revisió">
            <strong>{approved ? "Aprovada" : "No aprovada"}</strong>
            <span>{request.reviewNote || "Sense nota de revisió."}</span>
          </section>
          <div className={styles.dialogActions}>
            <button type="button" onClick={() => dialog.current?.close()}>Tancar</button>
          </div>
        </div>
      </dialog>
    </>
  );
}

export function RevokeAccessDialog({ userId, userEmail }: { userId: string; userEmail: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <button className={styles.tableAction} type="button" data-tone="danger" onClick={() => dialog.current?.showModal()}>
        Revocar
      </button>
      <dialog
        ref={dialog}
        className={styles.reviewDialog}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <form action={revokeContributorAction} className={styles.reviewDialogCard}>
          <input type="hidden" name="userId" value={userId} />
          <button type="button" className={styles.dialogClose} onClick={() => dialog.current?.close()} aria-label="Tancar">
            <X size={20} aria-hidden="true" />
          </button>
          <header className={styles.dialogHeader} data-tone="danger">
            <span aria-hidden="true"><ShieldX size={23} /></span>
            <div>
              <p>Accés temporal</p>
              <h2 id={titleId}>Revocar l’accés de {userEmail}</h2>
            </div>
          </header>
          <label className={styles.reviewNote}>
            Motiu de revocació
            <input name="reason" minLength={3} maxLength={1000} required />
          </label>
          <div className={styles.dialogActions}>
            <button type="button" onClick={() => dialog.current?.close()}>Cancel·lar</button>
            <button type="submit" data-tone="danger">Revocar l’accés</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
