"use client";

import { Camera, CheckCircle2, Clock3, ImagePlus, MapPinned, Send, ShieldCheck, Sprout, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CONTRIBUTION_DESCRIPTION_MIN_LENGTH,
  CONTRIBUTION_KIND_LABELS,
  CONTRIBUTION_KINDS,
  CONTRIBUTION_MEDIA_LIMIT,
  type ContributionFindingOption,
  type ContributionKind,
  type ContributionRequestSummary,
} from "@/src/lib/contributions";
import {
  removeStagedContributionMedia,
  type PreparedContributionMedia,
  uploadContributionMedia,
} from "@/src/lib/contributions/media-client";
import { prepareFindingPhoto } from "@/src/lib/findings/photo-client";
import { FormSelect } from "@/components/ui/form-select";

const dateFormatter = new Intl.DateTimeFormat("ca-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const statusLabel: Record<ContributionRequestSummary["status"], string> = {
  pending: "Pendent de revisió",
  approved: "Aprovada",
  rejected: "No aprovada",
  withdrawn: "Retirada",
};

function ContributionStatusIcon({ status }: { status: ContributionRequestSummary["status"] }) {
  if (status === "approved") return <CheckCircle2 size={19} aria-hidden="true" />;
  if (status === "rejected") return <X size={19} aria-hidden="true" />;
  return <Clock3 size={19} aria-hidden="true" />;
}

export function ContributionHistory({
  requests,
  activeUntil,
}: {
  requests: ContributionRequestSummary[];
  activeUntil: string | null;
}) {
  if (!requests.length) return null;
  const activeApprovedRequestId = activeUntil
    ? requests.find((request) => request.status === "approved")?.id
    : null;

  return (
    <div className="contribution-history">
      <ol>
        {requests.map((request) => {
          const statusDate = request.reviewedAt ?? request.createdAt;
          const datePrefix = request.reviewedAt ? "Revisada el" : "Enviada el";
          return (
            <li key={request.id} data-status={request.status}>
              <span className="contribution-history-mark" aria-hidden="true">
                <ContributionStatusIcon status={request.status} />
              </span>
              <div className="contribution-history-body">
                <div className="contribution-history-heading">
                  <strong>{CONTRIBUTION_KIND_LABELS[request.kind]}</strong>
                  <span className="contribution-history-status">
                    <ContributionStatusIcon status={request.status} />
                    {statusLabel[request.status]}
                  </span>
                </div>
                <span className="contribution-history-date">
                  {datePrefix} {dateFormatter.format(new Date(statusDate))}
                </span>
                {request.id === activeApprovedRequestId && activeUntil ? (
                  <small className="contribution-history-access">
                    <MapPinned size={16} aria-hidden="true" />
                    Mapa detallat obert fins al {dateFormatter.format(new Date(activeUntil))}
                  </small>
                ) : null}
                {request.mediaCount ? (
                  <small>{request.mediaCount} {request.mediaCount === 1 ? "fotografia adjunta" : "fotografies adjuntes"}</small>
                ) : null}
                {request.reviewNote ? <small>{request.reviewNote}</small> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function ContributionPanel({
  findingOptions = [],
  initialFindingId,
  initialPending = false,
}: {
  findingOptions?: ContributionFindingOption[];
  initialFindingId?: string;
  initialPending?: boolean;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<ContributionKind>("useful_finding");
  const [findingId, setFindingId] = useState(initialFindingId ?? "");
  const [description, setDescription] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [mediaCredit, setMediaCredit] = useState("");
  const [mediaRightsConfirmed, setMediaRightsConfirmed] = useState(false);
  const [media, setMedia] = useState<PreparedContributionMedia[]>([]);
  const mediaRef = useRef(media);
  const [busy, setBusy] = useState(false);
  const [submittedPending, setSubmittedPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const pending = initialPending || submittedPending;

  useEffect(() => {
    mediaRef.current = media;
  }, [media]);

  useEffect(() => () => {
    mediaRef.current.forEach((item) => URL.revokeObjectURL(item.preview));
  }, []);

  const addMedia = async (files: FileList | null) => {
    if (!files?.length) return;
    const available = Math.max(0, CONTRIBUTION_MEDIA_LIMIT - media.length);
    if (!available) {
      setMessage(`Pots adjuntar un màxim de ${CONTRIBUTION_MEDIA_LIMIT} fotografies.`);
      return;
    }
    setMessage(null);
    try {
      const next: PreparedContributionMedia[] = [];
      for (const file of Array.from(files).slice(0, available)) {
        const blob = await prepareFindingPhoto(file);
        next.push({
          id: crypto.randomUUID(),
          blob,
          preview: URL.createObjectURL(blob),
          position: media.length + next.length,
        });
      }
      setMedia((current) => [...current, ...next]);
      if (files.length > available) {
        setMessage(`Hem afegit les primeres ${available} fotografies. El màxim és ${CONTRIBUTION_MEDIA_LIMIT}.`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No s’ha pogut preparar la fotografia.");
    }
  };

  const removeMedia = (id: string) => {
    const removed = media.find((item) => item.id === id);
    if (removed) URL.revokeObjectURL(removed.preview);
    setMedia((current) => current
      .filter((item) => item.id !== id)
      .map((item, position) => ({ ...item, position })));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (kind === "useful_finding" && !findingId) {
      setMessage("Selecciona una troballa pública ja publicada.");
      return;
    }
    if (kind === "reusable_media" && !media.length) {
      setMessage("Afegeix almenys una fotografia per enviar aquest tipus d’aportació.");
      return;
    }
    if (kind === "reusable_media" && !mediaRightsConfirmed) {
      setMessage("Confirma que podem revisar i reutilitzar les fotografies.");
      return;
    }
    setBusy(true);
    setMessage(null);
    let stagedPaths: string[] = [];
    try {
      const uploadedMedia = kind === "reusable_media" ? await uploadContributionMedia(media) : [];
      stagedPaths = uploadedMedia.map((item) => item.stagingPath);
      const response = await fetch("/api/me/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          findingId: kind === "useful_finding" ? findingId : null,
          description,
          evidenceUrl,
          mediaCredit,
          mediaRightsConfirmed,
          media: uploadedMedia,
        }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "No s’ha pogut enviar l’aportació.");
      setDescription("");
      setFindingId("");
      setEvidenceUrl("");
      setMediaCredit("");
      setMediaRightsConfirmed(false);
      media.forEach((item) => URL.revokeObjectURL(item.preview));
      setMedia([]);
      setSubmittedPending(true);
      setMessage("Aportació enviada. La revisarem abans d’obrir el detall del mapa.");
      router.refresh();
    } catch (error) {
      await removeStagedContributionMedia(stagedPaths);
      setMessage(error instanceof Error ? error.message : "No s’ha pogut enviar l’aportació.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="contribution-panel" id="nova-aportacio" aria-labelledby="contribution-title">
      <div className="contribution-panel-heading">
        <span aria-hidden="true"><Sprout size={22} /></span>
        <div>
          <p>Nova aportació</p>
          <h2 id="contribution-title">Proposa una col·laboració</h2>
        </div>
      </div>

      <form className="contribution-form" onSubmit={submit}>
        <fieldset disabled={busy || pending}>
          <legend>Què vols aportar?</legend>
          <div className="contribution-kind-grid">
            {CONTRIBUTION_KINDS.map((value) => (
              <label key={value} data-selected={kind === value}>
                <input
                  type="radio"
                  name="contribution-kind"
                  value={value}
                  checked={kind === value}
                  onChange={() => setKind(value)}
                />
                <span className="contribution-kind-copy">
                  <strong>{CONTRIBUTION_KIND_LABELS[value]}</strong>
                  <small>Si s’aprova: +30 dies · sectors d’1 km i 250 m</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="contribution-finding-field" hidden={kind !== "useful_finding"}>
          <div className="contribution-media-heading">
            <MapPinned size={20} aria-hidden="true" />
            <div>
              <strong>Tria una troballa del teu quadern</strong>
              <span>Ha d’estar publicada i tenir almenys una fotografia pública.</span>
            </div>
          </div>
          {findingOptions.length ? (
            <FormSelect
              aria-label="Troballa pública que vols proposar"
              value={findingId}
              onValueChange={setFindingId}
              options={findingOptions.map((finding) => ({
                value: finding.id,
                label: `${finding.reportedSpeciesName} · ${dateFormatter.format(new Date(`${finding.observedOn}T12:00:00`))}`,
              }))}
              emptyLabel="Selecciona una troballa"
              required={kind === "useful_finding"}
              disabled={busy || pending || kind !== "useful_finding"}
            />
          ) : (
            <div className="contribution-finding-empty">
              <p>Encara no tens cap troballa pública amb foto que puguis proposar.</p>
              <Link href="/troballes/nova">Anotar i publicar una troballa</Link>
            </div>
          )}
        </div>
        <div className="contribution-media-field" hidden={kind !== "reusable_media"}>
            <div className="contribution-media-heading">
              <Camera size={20} aria-hidden="true" />
              <div>
                <strong>Adjunta les fotografies</strong>
                <span>D’1 a {CONTRIBUTION_MEDIA_LIMIT}. Queden privades mentre les revisem.</span>
              </div>
            </div>
            <label className="contribution-media-picker">
              <ImagePlus size={19} aria-hidden="true" />
              <span>{media.length ? "Afegir-ne més" : "Triar fotografies"}</span>
              <input
                hidden
                type="file"
                accept="image/*"
                multiple
                disabled={busy || pending || kind !== "reusable_media" || media.length >= CONTRIBUTION_MEDIA_LIMIT}
                onChange={(event) => {
                  void addMedia(event.currentTarget.files);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            {media.length ? (
              <div className="contribution-media-grid">
                {media.map((item, index) => (
                  <div className="contribution-media-preview" key={item.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- local object URL before upload */}
                    <img src={item.preview} alt={`Fotografia ${index + 1} seleccionada`} />
                    <span>Foto {index + 1}</span>
                    <button
                      type="button"
                      aria-label={`Eliminar la fotografia ${index + 1}`}
                      disabled={busy || pending}
                      onClick={() => removeMedia(item.id)}
                    >
                      <X size={17} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <label className="finding-field">
              Crèdit públic <span>(opcional)</span>
              <input
                type="text"
                minLength={2}
                maxLength={80}
                value={mediaCredit}
                onChange={(event) => setMediaCredit(event.target.value)}
                placeholder="Nom o àlies que vols que mostrem"
                disabled={busy || pending || kind !== "reusable_media"}
              />
              <small>Si s’aproven i es publiquen, no mostrarem el correu del compte.</small>
            </label>
            <label className="contribution-media-rights">
              <input
                type="checkbox"
                checked={mediaRightsConfirmed}
                required={kind === "reusable_media"}
                disabled={busy || pending || kind !== "reusable_media"}
                onChange={(event) => setMediaRightsConfirmed(event.target.checked)}
              />
              <ShieldCheck size={20} aria-hidden="true" />
              <span>
                Confirmo que les fotografies són meves o que tinc permís per compartir-les,
                i autoritzo Bolets a editar-les i publicar-les amb el crèdit indicat.
              </span>
            </label>
            <p className="contribution-media-privacy">
              Abans de desar-les les tornem a processar per eliminar metadades com la ubicació.
              L’enviament no les publica automàticament.
            </p>
        </div>
        <label className="finding-field">
          Explica l’aportació
          <textarea
            minLength={20}
            maxLength={1000}
            required
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={kind === "useful_finding"
              ? "Explica per què aquesta troballa i les seves fotos poden ser útils per al projecte."
              : "Descriu què has preparat, corregit o fet i com ho podem revisar."}
            disabled={busy || pending}
          />
          <small>
            Mínim {CONTRIBUTION_DESCRIPTION_MIN_LENGTH} caràcters. La revisió comprova que sigui
            concreta, útil i verificable. La validació d’identificacions no compta per ara.
          </small>
        </label>
        <label className="finding-field">
          Enllaç d’evidència <span>(opcional)</span>
          <input
            type="url"
            inputMode="url"
            maxLength={500}
            value={evidenceUrl}
            onChange={(event) => setEvidenceUrl(event.target.value)}
            placeholder="https://…"
            disabled={busy || pending}
          />
          <small>{kind === "useful_finding"
            ? "La troballa ja queda vinculada; aquí pots afegir una font o una prova complementària."
            : "Pot ser una fotografia, una font o una prova de l’acció."}</small>
        </label>
        <button className="finding-button" disabled={busy || pending}>
          <Send size={17} aria-hidden="true" />
          {busy ? "Enviant…" : pending ? "Ja tens una aportació pendent" : "Enviar per revisar"}
        </button>
      </form>

      {message ? <p className="finding-notice" role="status">{message}</p> : null}
    </section>
  );
}
