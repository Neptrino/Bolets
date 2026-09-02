"use client";

import { BookOpen, CalendarClock, Camera, CheckCircle2, Info, LocateFixed, LockKeyhole, MapPin, MapPinned, Plus, Save, ShieldCheck, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CatalogueSpecies } from "@/src/lib/types";
import type { FindingQuantityBand, LocalFindingPhoto } from "@/src/lib/findings/types";
import {
  extractPhotoDateTime,
  extractPhotoGps,
  isFindingDateTime,
  isFindingLocation,
  type PhotoDateTime,
  type PhotoGpsPosition,
} from "@/src/lib/findings/photo-exif";
import { prepareFindingPhoto } from "@/src/lib/findings/photo-client";
import { saveOutboxFinding } from "@/src/lib/findings/outbox";
import { syncFindingOutbox } from "@/src/lib/findings/sync-client";
import { queueUmamiEvent, UMAMI_EVENTS } from "@/src/lib/umami-goals";
import { FormSelect } from "@/components/ui/form-select";
import { FindingLocationPreview } from "./finding-location-preview";
import { TurnstileWidget } from "./turnstile-widget";

const FINDING_TURNSTILE_ACTION = "finding_publish";

type PreparedPhoto = LocalFindingPhoto & {
  dateTime: PhotoDateTime | null;
  gps: PhotoGpsPosition | null;
  preview: string;
};

const SHOW_ALIAS_PREFERENCE_KEY = "bolets:findings:show-alias:v1";
const SHOW_ALIAS_PREFERENCE_EVENT = "bolets:findings:show-alias-changed";
let transientShowAliasPreference: boolean | null = null;

function readShowAliasPreference() {
  try {
    const stored = window.localStorage.getItem(SHOW_ALIAS_PREFERENCE_KEY);
    if (stored === "true" || stored === "false") {
      transientShowAliasPreference = stored === "true";
    }
  } catch {
    // Fall back to memory when browser storage is unavailable.
  }
  return transientShowAliasPreference ?? false;
}

function rememberShowAliasPreference(value: boolean) {
  transientShowAliasPreference = value;
  try {
    window.localStorage.setItem(SHOW_ALIAS_PREFERENCE_KEY, String(value));
  } catch {
    // The form remains usable when browser storage is unavailable.
  }
  window.dispatchEvent(new Event(SHOW_ALIAS_PREFERENCE_EVENT));
}

function subscribeToShowAliasPreference(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(SHOW_ALIAS_PREFERENCE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(SHOW_ALIAS_PREFERENCE_EVENT, onStoreChange);
  };
}

const getServerShowAliasPreference = () => false;

function localDateTimeValue(date = new Date()) {
  date = new Date(date);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 19);
}

let initialClientDateTime: string | null = null;
const subscribeToInitialDateTime = () => () => {};
const getInitialServerDateTime = () => "";
function getInitialClientDateTime() {
  initialClientDateTime ??= localDateTimeValue();
  return initialClientDateTime;
}

export function FindingReportForm({ species }: { species: CatalogueSpecies[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const formStartTracked = useRef(false);
  const speciesSelectRef = useRef<HTMLButtonElement>(null);
  const initialDateTime = useSyncExternalStore(
    subscribeToInitialDateTime,
    getInitialClientDateTime,
    getInitialServerDateTime,
  );
  const [speciesId, setSpeciesId] = useState("");
  const [observedAt, setObservedAt] = useState<string | null>(null);
  const [latestObservedAt, setLatestObservedAt] = useState<string | null>(null);
  const observedAtValue = observedAt ?? initialDateTime;
  const latestObservedAtValue = latestObservedAt ?? initialDateTime;
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracyM, setAccuracyM] = useState<number | null>(null);
  const [locationSource, setLocationSource] = useState<"device" | "manual" | "map" | "photo" | null>(null);
  const [keepExact, setKeepExact] = useState(true);
  const [publish, setPublish] = useState(true);
  const showAlias = useSyncExternalStore(
    subscribeToShowAliasPreference,
    readShowAliasPreference,
    getServerShowAliasPreference,
  );
  const [quantityBand, setQuantityBand] = useState<FindingQuantityBand | "">("");
  const [privateNotes, setPrivateNotes] = useState("");
  const [photos, setPhotos] = useState<PreparedPhoto[]>([]);
  const [photoLocation, setPhotoLocation] = useState<PhotoGpsPosition | null>(null);
  const [photoLocationNotice, setPhotoLocationNotice] = useState<string | null>(null);
  const [photoDateTime, setPhotoDateTime] = useState<PhotoDateTime | null>(null);
  const [photoDateTimeNotice, setPhotoDateTimeNotice] = useState<string | null>(null);
  const [dateTimeSource, setDateTimeSource] = useState<"manual" | "photo">("manual");
  const [online, setOnline] = useState(true);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [turnstileRequired, setTurnstileRequired] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);
  const selected = useMemo(() => species.find((item) => item.speciesId === speciesId), [species, speciesId]);
  const hasDetectedData = Boolean(photoLocation || photoDateTime);

  useEffect(() => {
    const updateConnectivity = () => setOnline(navigator.onLine);
    updateConnectivity();
    window.addEventListener("online", updateConnectivity);
    window.addEventListener("offline", updateConnectivity);
    return () => {
      window.removeEventListener("online", updateConnectivity);
      window.removeEventListener("offline", updateConnectivity);
    };
  }, []);

  useEffect(() => {
    if (!online) return;
    let active = true;
    void fetch("/api/findings/verification", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((body) => { if (active && body) setTurnstileRequired(body.required === true); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [online]);

  const receiveTurnstileToken = useCallback((token: string | null) => setTurnstileToken(token), []);

  const locate = () => {
    setLocating(true);
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setAccuracyM(position.coords.accuracy);
        setLocationSource("device");
        setPhotoLocation(null);
        setPhotoLocationNotice(null);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setMessage({ text: "No hem pogut obtenir la posició. Activa la ubicació o introdueix-la manualment.", tone: "danger" });
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    setLatestObservedAt(localDateTimeValue());
    setBusy(true);
    setMessage(null);
    try {
      const available = Math.max(0, 4 - photos.length);
      const prepared = await Promise.all([...files].slice(0, available).map(async (file, index) => {
        const [blob, gps, dateTime] = await Promise.all([
          prepareFindingPhoto(file),
          extractPhotoGps(file),
          extractPhotoDateTime(file),
        ]);
        return {
          dateTime,
          gps,
          id: crypto.randomUUID(),
          blob,
          position: photos.length + index,
          preview: URL.createObjectURL(blob),
        } satisfies PreparedPhoto;
      }));
      setPhotos((current) => [...current, ...prepared]);
      const candidate = prepared.find((item) => item.gps && isFindingLocation(item.gps));
      if (candidate?.gps) {
        setPhotoLocation(candidate.gps);
        setLatitude(Number(candidate.gps.latitude.toFixed(6)));
        setLongitude(Number(candidate.gps.longitude.toFixed(6)));
        setAccuracyM(candidate.gps.accuracyM);
        setLocationSource("photo");
        setPhotoLocationNotice(null);
      } else if (prepared.some((item) => item.gps)) {
        setPhotoLocation(null);
        setPhotoLocationNotice("La foto conté una ubicació fora de Catalunya i no l’hem aplicada.");
      } else if (!photoLocation) {
        setPhotoLocationNotice("No hem trobat cap ubicació GPS incrustada en aquestes fotos.");
      }
      const dateCandidate = prepared.find((item) => item.dateTime && isFindingDateTime(item.dateTime.localDateTime));
      if (dateCandidate?.dateTime) {
        setPhotoDateTime(dateCandidate.dateTime);
        setObservedAt(dateCandidate.dateTime.localDateTime);
        setDateTimeSource("photo");
        setPhotoDateTimeNotice(null);
      } else if (prepared.some((item) => item.dateTime)) {
        setPhotoDateTime(null);
        setPhotoDateTimeNotice("La data de la foto és futura o té més de 20 anys i no l’hem aplicada.");
      } else if (!photoDateTime) {
        setPhotoDateTimeNotice("No hem trobat la data i hora originals en aquestes fotos.");
      }
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "No s’han pogut preparar les fotografies.", tone: "danger" });
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = (photoId: string) => {
    const removed = photos.find((photo) => photo.id === photoId);
    if (!removed) return;
    URL.revokeObjectURL(removed.preview);

    const remaining = photos
      .filter((photo) => photo.id !== photoId)
      .map((photo, position) => ({ ...photo, position }));
    setPhotos(remaining);

    const locationCandidate = remaining.find((photo) => photo.gps && isFindingLocation(photo.gps));
    const nextPhotoLocation = locationCandidate?.gps ?? null;
    setPhotoLocation(nextPhotoLocation);
    setPhotoLocationNotice(remaining.length && !nextPhotoLocation
      ? remaining.some((photo) => photo.gps)
        ? "La foto conté una ubicació fora de Catalunya i no l’hem aplicada."
        : "No hem trobat cap ubicació GPS incrustada en aquestes fotos."
      : null);
    if (locationSource === "photo") {
      if (nextPhotoLocation) {
        setLatitude(Number(nextPhotoLocation.latitude.toFixed(6)));
        setLongitude(Number(nextPhotoLocation.longitude.toFixed(6)));
        setAccuracyM(nextPhotoLocation.accuracyM);
      } else {
        setLatitude(null);
        setLongitude(null);
        setAccuracyM(null);
        setLocationSource(null);
      }
    }

    const dateCandidate = remaining.find((photo) => photo.dateTime && isFindingDateTime(photo.dateTime.localDateTime));
    const nextPhotoDateTime = dateCandidate?.dateTime ?? null;
    setPhotoDateTime(nextPhotoDateTime);
    setPhotoDateTimeNotice(remaining.length && !nextPhotoDateTime
      ? remaining.some((photo) => photo.dateTime)
        ? "La data de la foto és futura o té més de 20 anys i no l’hem aplicada."
        : "No hem trobat la data i hora originals en aquestes fotos."
      : null);
    if (dateTimeSource === "photo") {
      if (nextPhotoDateTime) {
        setObservedAt(nextPhotoDateTime.localDateTime);
      } else {
        const now = localDateTimeValue();
        setObservedAt(now);
        setLatestObservedAt(now);
        setDateTimeSource("manual");
      }
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!speciesId || latitude === null || longitude === null) {
      setMessage({ text: "Tria l’espècie i desa una ubicació abans de continuar.", tone: "danger" });
      if (!speciesId) speciesSelectRef.current?.focus();
      return;
    }
    if (publish && turnstileRequired && !turnstileToken) {
      setMessage({ text: "Completa la verificació anti-brossa abans de publicar.", tone: "danger" });
      return;
    }
    setBusy(true);
    setMessage(null);
    const clientReportId = crypto.randomUUID();
    try {
      if (navigator.storage?.persist) await navigator.storage.persist().catch(() => false);
      await saveOutboxFinding({
        draft: {
          clientReportId,
          speciesId,
          observedAt: new Date(observedAtValue).toISOString(),
          longitude,
          latitude,
          accuracyM,
          locationMode: keepExact ? "private_exact" : "coarse_only",
          quantityBand: quantityBand || null,
          privateNotes,
          visibility: publish ? "public" : "private",
          showAlias,
        },
        photos: photos.map((photo) => ({ id: photo.id, blob: photo.blob, position: photo.position })),
        state: "queued",
        serverFindingId: null,
        error: null,
        updatedAt: new Date().toISOString(),
      });
      queueUmamiEvent(UMAMI_EVENTS.findingDraftSaved);
      const result = await syncFindingOutbox(turnstileToken);
      setTurnstileToken(null);
      if (result.turnstileRequired) setTurnstileRequired(true);
      if (result.turnstileRequired) {
        setMessage({ text: "Completa la verificació anti-brossa per acabar de publicar la troballa.", tone: "danger" });
      } else if (result.pending === 0) {
        setMessage({
          text: result.oneKmAccessUntil
            ? "Troballa publicada. Has obert els sectors d’1 km durant 7 dies."
            : "Troballa sincronitzada. Ja la tens al teu quadern.",
          tone: "success",
        });
      } else if (result.needsLogin) {
        setMessage({ text: "Troballa desada al dispositiu. Inicia sessió quan tinguis cobertura per sincronitzar-la.", tone: "success" });
      } else {
        setMessage({ text: "Troballa desada al dispositiu. La sincronitzarem automàticament quan torni la cobertura.", tone: "success" });
      }
      setSpeciesId("");
      setPrivateNotes("");
      setQuantityBand("");
      photos.forEach((photo) => URL.revokeObjectURL(photo.preview));
      setPhotos([]);
      setLatitude(null);
      setLongitude(null);
      setAccuracyM(null);
      setLocationSource(null);
      setPhotoLocation(null);
      setPhotoLocationNotice(null);
      setPhotoDateTime(null);
      setPhotoDateTimeNotice(null);
      const now = localDateTimeValue();
      setObservedAt(now);
      setLatestObservedAt(now);
      setDateTimeSource("manual");
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "No s’ha pogut desar la troballa en aquest dispositiu.", tone: "danger" });
    } finally {
      setBusy(false);
    }
  };

  const startAnotherFinding = () => {
    setMessage(null);
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      speciesSelectRef.current?.focus({ preventScroll: true });
    });
  };

  const trackFormStart = () => {
    if (formStartTracked.current) return;
    formStartTracked.current = true;
    queueUmamiEvent(UMAMI_EVENTS.findingFormStarted);
  };

  return (
    <form
      ref={formRef}
      className="finding-report-layout"
      onFocusCapture={trackFormStart}
      onSubmit={submit}
    >
      <div className="finding-field-card">
        <section className="finding-step">
          <h2>1. Què has trobat?</h2>
          <div className="finding-field">
            <span>Espècie proposada</span>
            <FormSelect triggerRef={speciesSelectRef} required aria-label="Espècie proposada" value={speciesId} onValueChange={setSpeciesId} emptyLabel="Tria una espècie…" options={species.map((item) => ({ value: item.speciesId, label: `${item.identity.commonName} · ${item.identity.scientificName}` }))} />
            <small>És una proposta d’identificació, no una garantia que el bolet sigui comestible.</small>
          </div>
          {selected ? <p className="finding-location-readout">{selected.identity.scientificName}</p> : null}
        </section>

        <section className="finding-step">
          <h2>2. Fotografies i detecció automàtica</h2>
          <div className="finding-autodetect-card">
            <Sparkles size={22} aria-hidden="true" />
            <div>
              <strong>Fes les fotos al bosc. Completa la troballa a casa.</strong>
              <p>No cal que omplis el formulari al moment: les dades originals de la foto poden recordar on i quan la vas fer.</p>
              <ol className="finding-photo-workflow" aria-label="Com afegir una troballa després de la sortida">
                <li><span aria-hidden="true">1</span><div><strong>Al bosc</strong><small>Fes fotos amb el mòbil i tingues activada la ubicació de la càmera.</small></div></li>
                <li><span aria-hidden="true">2</span><div><strong>A casa</strong><small>Afegeix-les des del mòbil o l’ordinador quan tinguis temps.</small></div></li>
                <li><span aria-hidden="true">3</span><div><strong>Revisa</strong><small>Confirma la data i el GPS detectats, o corregeix el punt al mapa.</small></div></li>
              </ol>
              <small>Si les trobem, omplirem els camps automàticament perquè els puguis revisar. La lectura es fa en aquest dispositiu i les metadades no es guarden a la còpia preparada.</small>
            </div>
          </div>
          <label className="finding-button-secondary finding-detect-button">
            <Camera size={18} aria-hidden="true" /> Afegir fotos i detectar dades
            <input hidden type="file" accept="image/*" multiple onChange={(event) => { void addPhotos(event.currentTarget.files); event.currentTarget.value = ""; }} disabled={busy || photos.length >= 4} />
          </label>
          {photos.length ? <div className="finding-photo-grid">{photos.map((photo, index) => <div className="finding-photo-option" key={photo.id}>
            {/* A local object URL never leaves the device until sync. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.preview} alt={`Fotografia ${index + 1}`} />
            <span className="finding-photo-index">Foto {index + 1}</span>
            <button className="finding-photo-remove" type="button" aria-label={`Eliminar la fotografia ${index + 1}`} title="Eliminar fotografia" disabled={busy} onClick={() => removePhoto(photo.id)}><X size={18} aria-hidden="true" /></button>
          </div>)}</div> : <p className="finding-notice">Pots continuar sense fotos. Si publiques la troballa, es mostrarà sense cap imatge.</p>}
        </section>

        <section className="finding-step">
          <h2>3. Revisa on i quan</h2>
          <p className="finding-step-intro">Revisa les dades omplertes des de la foto, utilitza la posició del dispositiu o introdueix-les manualment.</p>
          {hasDetectedData ? <div className="finding-detected-data" aria-live="polite">
            <div className="finding-detected-heading"><Sparkles size={20} aria-hidden="true" /><div><strong>Dades omplertes des de la foto</strong><p>Ja les hem aplicat. Revisa-les i canvia-les si cal.</p></div></div>
            <ul>
              {photoLocation ? <li><MapPin size={18} aria-hidden="true" /><span><strong>Ubicació GPS aplicada</strong></span></li> : null}
              {photoDateTime ? <li><CalendarClock size={18} aria-hidden="true" /><span><strong>Data i hora aplicades</strong><small>{new Intl.DateTimeFormat("ca-ES", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(photoDateTime.localDateTime))}</small></span></li> : null}
            </ul>
            <small>En públic, la ubicació continuarà sent només una zona aproximada de 10 × 10 km.</small>
          </div> : null}
          {photoLocationNotice ? <p className="finding-notice">{photoLocationNotice}</p> : null}
          {photoDateTimeNotice ? <p className="finding-notice">{photoDateTimeNotice}</p> : null}
          {latitude !== null && longitude !== null ? <FindingLocationPreview latitude={latitude} longitude={longitude} onLocationChange={(nextLatitude, nextLongitude) => {
            setLatitude(nextLatitude);
            setLongitude(nextLongitude);
            setAccuracyM(null);
            setLocationSource("map");
            setPhotoLocation(null);
            setPhotoLocationNotice(null);
          }} /> : null}
          <button className="finding-button-secondary" type="button" onClick={locate} disabled={locating}>
            <LocateFixed size={18} aria-hidden="true" /> {locating ? "Buscant la posició…" : locationSource === "device" ? "Actualitzar la ubicació del dispositiu" : "Utilitzar la ubicació del dispositiu"}
          </button>
          {latitude !== null && longitude !== null ? <p className="finding-location-readout">{locationSource === "photo" ? "Ubicació extreta de la foto" : locationSource === "map" ? "Ubicació ajustada al mapa" : locationSource === "manual" ? "Ubicació introduïda manualment" : "Ubicació detectada pel dispositiu"}{accuracyM ? ` · precisió aproximada ${Math.round(accuracyM)} m` : ""}</p> : null}
          <details className="finding-coordinate-details">
            <summary>Introduir coordenades manualment</summary>
            <div className="finding-field-row">
              <label className="finding-field">Latitud<input type="number" inputMode="decimal" step="any" min="40.45" max="42.95" value={latitude ?? ""} onChange={(event) => { setLatitude(event.target.value ? Number(event.target.value) : null); setAccuracyM(null); setLocationSource("manual"); setPhotoLocation(null); setPhotoLocationNotice(null); }} /></label>
              <label className="finding-field">Longitud<input type="number" inputMode="decimal" step="any" min="0.05" max="3.35" value={longitude ?? ""} onChange={(event) => { setLongitude(event.target.value ? Number(event.target.value) : null); setAccuracyM(null); setLocationSource("manual"); setPhotoLocation(null); setPhotoLocationNotice(null); }} /></label>
            </div>
          </details>
          <label className="finding-field">Data i hora<input type="datetime-local" step="1" required value={observedAtValue} max={latestObservedAtValue || undefined} onFocus={() => setLatestObservedAt(localDateTimeValue())} onChange={(event) => { setObservedAt(event.target.value); setDateTimeSource("manual"); }} /><small>{dateTimeSource === "photo" ? "Extretes de la foto. Encara les pots canviar." : "Hi posem l’hora actual per defecte. Canvia-la si cal."}</small></label>
          <label className="finding-choice">
            <input type="checkbox" checked={keepExact} onChange={(event) => setKeepExact(event.target.checked)} />
            <span>Guardar la posició exacta només per a mi<small>Si ho desactives, ni tan sols nosaltres en conservarem les coordenades exactes. En públic sempre es mostra només una zona aproximada de 10 × 10 km.</small></span>
          </label>
        </section>

        <section className="finding-step">
          <h2>4. Notes privades</h2>
          <div className="finding-field"><span>Quantitat aproximada</span><FormSelect aria-label="Quantitat aproximada" value={quantityBand} onValueChange={(value) => setQuantityBand(value as FindingQuantityBand | "")} emptyLabel="No indicar" options={[{ value: "one", label: "1 exemplar" }, { value: "two-five", label: "2–5" }, { value: "six-twenty", label: "6–20" }, { value: "twenty-one-plus", label: "Més de 20" }]} /></div>
          <label className="finding-field">Notes<textarea maxLength={1000} value={privateNotes} onChange={(event) => setPrivateNotes(event.target.value)} placeholder="Hàbitat, estat del bolet, detalls per recordar…" /><small>Aquest text mai no es publica.</small></label>
        </section>

        <section className="finding-step">
          <h2>5. Publicació</h2>
          <label className="finding-choice"><input type="checkbox" checked={publish} onChange={(event) => setPublish(event.target.checked)} /><span>Compartir la troballa a l’atles públic<small>Es publiquen totes les fotos, el dia i una zona aproximada de 10 × 10 km, mai el punt exacte ni les notes. Aquesta versió generalitzada es pot utilitzar per avaluar i millorar futures versions del model.</small></span></label>
          <label className="finding-choice"><input type="checkbox" checked={showAlias} onChange={(event) => rememberShowAliasPreference(event.target.checked)} /><span>Mostrar el meu àlies públic<small>La publicació és anònima si no l’actives. Recordarem aquesta elecció en aquest dispositiu.</small></span></label>
          {publish && online && turnstileRequired ? <div className="finding-verification-card">
            <strong>Comprovació anti-brossa</strong>
            <small>La demanem a la primera publicació o quan detectem activitat poc habitual.</small>
            <TurnstileWidget action={FINDING_TURNSTILE_ACTION} onToken={receiveTurnstileToken} />
          </div> : null}
          {message?.tone === "success" ? <div className="finding-save-success">
            <CheckCircle2 size={24} aria-hidden="true" />
            <div className="finding-save-success-copy" role="status">
              <strong>{message.text}</strong>
              <p>Pots anotar una altra troballa ara mateix o revisar les que ja has desat.</p>
            </div>
            <div className="finding-save-success-actions">
              <button className="finding-button" type="button" onClick={startAnotherFinding}><Plus size={18} aria-hidden="true" /> Anotar-ne una altra</button>
              <Link className="finding-button-secondary" href="/les-meves-troballes"><BookOpen size={18} aria-hidden="true" /> Obrir el meu quadern</Link>
            </div>
          </div> : <>
            {message ? <p className="finding-notice" data-tone={message.tone}>{message.text}</p> : null}
            <button className="finding-button" type="submit" disabled={busy}><Save size={18} aria-hidden="true" /> {busy ? "Desant…" : online ? "Desar i sincronitzar" : "Desar sense cobertura"}</button>
          </>}
        </section>
      </div>

      <aside className="finding-privacy-summary">
        <div className="finding-privacy-heading">
          <span><ShieldCheck size={22} aria-hidden="true" /></span>
          <div><p>Tu tens el control</p><h2>Privadesa clara</h2></div>
        </div>
        <p className="finding-privacy-promise">El punt exacte <strong>no es publica mai.</strong></p>
        <ul>
          <li><MapPinned size={20} aria-hidden="true" /><span><strong>Al mapa públic</strong><small>Només es mostra el dia i una zona aproximada de 10 × 10 km.</small></span></li>
          <li><Camera size={20} aria-hidden="true" /><span><strong>Les fotos van amb la troballa</strong><small>Només es veuen si decideixes publicar-la.</small></span></li>
          <li><LockKeyhole size={20} aria-hidden="true" /><span><strong>La decisió sempre és teva</strong><small>Pots conservar-la privada o retirar-la de l’atles quan vulguis.</small></span></li>
        </ul>
        <p className="finding-privacy-note"><Info size={16} aria-hidden="true" /> No canvien el mapa immediatament. Les troballes publicades es poden utilitzar, de manera agregada i generalitzada, per avaluar i millorar futures versions del model.</p>
      </aside>
    </form>
  );
}
