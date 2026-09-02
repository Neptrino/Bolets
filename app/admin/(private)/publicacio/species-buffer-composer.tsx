"use client";

import { ExternalLink, ListPlus } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormSelect, type FormSelectOption } from "@/components/ui/form-select";

import styles from "./instagram.module.css";

const BUFFER_PUBLISH_URL = "https://publish.buffer.com/";

function imagePathForSpecies(path: string, speciesId: string) {
  const url = new URL(path, "https://bolets.app");
  url.searchParams.set("speciesId", speciesId);
  return `${url.pathname}${url.search}`;
}

export function SpeciesBufferComposer({
  imagePaths,
  initialSpeciesId,
  speciesOptions,
}: {
  imagePaths: string[];
  initialSpeciesId: string;
  speciesOptions: FormSelectOption[];
}) {
  const [speciesId, setSpeciesId] = useState(initialSpeciesId);
  const [captionOverride, setCaptionOverride] = useState("");
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"error" | "success">("success");
  const selectedSpecies = speciesOptions.find((option) => option.value === speciesId);
  const selectedImages = useMemo(
    () => imagePaths.map((path) => imagePathForSpecies(path, speciesId)),
    [imagePaths, speciesId],
  );

  function changeSpecies(value: string) {
    setSpeciesId(value);
    setMessage(null);
  }

  async function addToBuffer() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/admin/publicacio/queue-species", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          captionOverride: captionOverride.trim() || null,
          speciesId,
        }),
      });
      const payload = await response.json().catch(() => ({})) as {
        error?: string;
        message?: string;
        status?: "already_queued" | "queued";
      };
      if (!response.ok) {
        throw new Error(payload.message ?? "No s’ha pogut afegir la publicació a Buffer.");
      }
      setMessageKind("success");
      setMessage(payload.status === "already_queued"
        ? "Aquesta espècie ja és a Buffer o ja s’ha publicat."
        : "Afegida a la cua de Buffer. Ara pots ordenar-la o canviar-ne la data a Buffer.");
      setConfirmationOpen(false);
    } catch (error) {
      setMessageKind("error");
      setMessage(error instanceof Error
        ? error.message
        : "No s’ha pogut afegir la publicació a Buffer.");
      setConfirmationOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return <section className={styles.bufferComposer} aria-labelledby="buffer-species-title">
    <header className={styles.bufferComposerHeader}>
      <div>
        <span>Catàleg · 62 espècies</span>
        <h3 id="buffer-species-title">Prepara la cua d’espècies</h3>
        <p>Afegeix-les en l’ordre que vulguis. Buffer les col·locarà al següent espai lliure del seu calendari.</p>
      </div>
      <a className={styles.bufferLink} href={BUFFER_PUBLISH_URL} target="_blank" rel="noreferrer">
        Obre Buffer <ExternalLink aria-hidden="true" />
      </a>
    </header>

    <div className={styles.bufferComposerForm}>
      <div className={styles.bufferSpeciesField}>
        <span>Espècie</span>
        <FormSelect
          aria-label="Espècie que s’afegirà a Buffer"
          disabled={busy}
          onValueChange={changeSpecies}
          options={speciesOptions}
          value={speciesId}
        />
        <small>Les cinc diapositives s’actualitzen abans d’afegir la peça.</small>
      </div>
      <label className={styles.bufferCaptionField} htmlFor="species-caption">
        <span>Text personalitzat <small>Opcional</small></span>
        <textarea
          disabled={busy}
          id="species-caption"
          maxLength={2100}
          onChange={(event) => {
            setCaptionOverride(event.target.value);
            setMessage(null);
          }}
          placeholder="Deixa-ho buit per utilitzar el text automàtic de la fitxa."
          value={captionOverride}
        />
        <small>{captionOverride.length}/2100 · La marca per evitar duplicats s’afegeix automàticament.</small>
      </label>
    </div>

    <div className={styles.carouselRail} aria-label={`Cinc diapositives sobre ${selectedSpecies?.label ?? "l’espècie seleccionada"}`}>
      {selectedImages.map((imagePath, index) => (
        <figure className={styles.carouselFrame} key={imagePath}>
          <Image
            alt={`Diapositiva ${index + 1} de ${selectedImages.length} sobre ${selectedSpecies?.label ?? "l’espècie seleccionada"}`}
            height={1350}
            src={imagePath}
            unoptimized
            width={1080}
          />
          <figcaption>{index + 1}/{selectedImages.length}</figcaption>
        </figure>
      ))}
    </div>

    <div className={styles.bufferComposerActions}>
      <button disabled={busy} onClick={() => setConfirmationOpen(true)} type="button">
        <ListPlus aria-hidden="true" /> Afegeix a Buffer
      </button>
      <p>Després, gestiona l’ordre, la data, el text o la cancel·lació directament a Buffer.</p>
    </div>
    {message ? <p className={styles.bufferComposerFeedback} data-kind={messageKind} role="status">{message}</p> : null}

    <ConfirmDialog
      busy={busy}
      busyLabel="Afegint…"
      confirmLabel="Afegeix a la cua"
      description={`${selectedSpecies?.label ?? "L’espècie seleccionada"} es crearà com un carrusel real de cinc imatges al següent espai lliure del calendari de Buffer.`}
      icon={<ListPlus aria-hidden="true" />}
      onCancel={() => setConfirmationOpen(false)}
      onConfirm={() => void addToBuffer()}
      open={confirmationOpen}
      title="Afegir aquesta espècie a Buffer?"
    />
  </section>;
}
