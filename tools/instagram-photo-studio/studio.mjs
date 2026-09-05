import { drawPost } from "./drawing.mjs";
import { clamp, photoCrop } from "./geometry.mjs";
import { defaults, restoreSettings, hasOverlay } from "./settings.mjs";

const element = id => document.getElementById(id);
const canvas = element("preview");
const status = element("status");
let state = { ...defaults };
let photo = null;
let overlayPreview = false;
let photoName = "bolets";
let design, brand, ready = false, overflow = false, loadingId = 0;
const storageKey = "bolets-photo-studio-settings-v2";
const choices = ["format", "tone", "preset", "branding", "placement"];
const fields = { eyebrow: "eyebrow", title: "title", caption: "caption", credit: "credit", zoom: "zoom", panX: "pan-x", panY: "pan-y" };

function saveSettings() {
  try { const { zoom, panX, panY, ...saved } = state; void zoom; void panX; void panY; localStorage.setItem(storageKey, JSON.stringify(saved)); } catch { /* The editor works with storage disabled. */ }
}
function syncControls() {
  for (const [key, id] of Object.entries(fields)) {
    const input = element(id);
    if (input.type === "checkbox") input.checked = state[key]; else input.value = state[key];
  }
  for (const name of choices) document.querySelector(`input[name="${name}"][value="${state[name]}"]`).checked = true;
  element("zoom-value").value = `${Math.round(state.zoom * 100)}%`;
}
function render() {
  if (!ready) return;
  const result = drawPost(canvas, state, design, brand, photo);
  overflow = result.overflow;
  element("dimensions").textContent = `${result.width} × ${result.height}`;
  element("empty").hidden = !!photo || overlayPreview;
  element("export-photo").disabled = !photo || overflow;
  element("export-overlay").disabled = overflow || !hasOverlay(state);
  element("text-controls").hidden = state.preset === "photo";
  element("field-label").hidden = state.preset !== "field";
  element("field-observation").hidden = state.preset !== "field";
  element("preset-hint").textContent = {
    photo: "La foto porta el missatge. Escriu l’observació al peu de la publicació d’Instagram.",
    headline: "Una idea en 2–6 paraules. Reserva l’explicació per al carrusel o el peu d’Instagram.",
    field: "Per explicar un detall o completar un carrusel. Mantén el bolet visible.",
  }[state.preset];
  element("zoom-value").value = `${Math.round(state.zoom * 100)}%`;
  status.textContent = overflow ? "El text no hi cap sencer. Escurça el títol o l’observació abans de desar." : photo ? "A punt. Revisa el text i l’enquadrament abans de desar." : "Tria una foto o prepara les capes transparents per a Lightroom.";
}

for (const [key, id] of Object.entries(fields)) element(id).addEventListener("input", event => {
  const input = event.target;
  state[key] = input.type === "checkbox" ? input.checked : input.type === "range" ? Number(input.value) : input.value;
  saveSettings(); render();
});
for (const name of choices) document.querySelectorAll(`input[name="${name}"]`).forEach(input => input.addEventListener("change", () => {
  state[name] = input.value;
  if (name === "format") { state.zoom = 1; state.panX = 0; state.panY = 0; syncControls(); }
  saveSettings(); render();
}));
element("overlay-only").addEventListener("click", () => { overlayPreview = true; render(); });
element("reset-crop").addEventListener("click", () => { state.zoom = 1; state.panX = 0; state.panY = 0; syncControls(); render(); });
for (const id of ["choose-photo", "choose-empty"]) element(id).addEventListener("click", () => element("photo").click());

async function loadPhoto(file) {
  if (!file) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { status.textContent = "Exporta la foto de Lightroom com a JPG, PNG o WebP."; return; }
  if (file.size > 80 * 1024 * 1024) { status.textContent = "La foto supera 80 MB. Exporta una còpia JPG de Lightroom."; return; }
  const requestId = ++loadingId;
  status.textContent = "Obrint la foto…";
  let decoded;
  try {
    decoded = await createImageBitmap(file, { imageOrientation: "from-image" });
    if (requestId !== loadingId) { decoded.close(); return; }
    if (decoded.width * decoded.height > 120_000_000) { decoded.close(); throw new Error("Exporta una còpia de menys de 120 megapíxels."); }
    photo?.close(); photo = decoded; photoName = file.name.replace(/\.[^.]+$/, "");
    state.zoom = 1; state.panX = 0; state.panY = 0;
    element("file-name").textContent = file.name;
    element("crop-hint").textContent = "Arrossega la foto per ajustar l’enquadrament.";
    syncControls(); render();
    if (Math.min(photo.width, photo.height) < 1080) status.textContent = "Aquesta foto és petita: exportar-la pot reduir-ne la nitidesa.";
  } catch (error) {
    if (requestId === loadingId) status.textContent = `No s’ha pogut obrir la foto. ${error.message}`;
  }
}
element("photo").addEventListener("change", event => { loadPhoto(event.target.files[0]); event.target.value = ""; });
const dropZone = element("drop-zone");
for (const eventName of ["dragenter", "dragover"]) dropZone.addEventListener(eventName, event => { event.preventDefault(); dropZone.classList.add("dragging"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragging"));
dropZone.addEventListener("drop", event => { event.preventDefault(); dropZone.classList.remove("dragging"); loadPhoto(event.dataTransfer.files[0]); });
// Prevent a missed drop from navigating away and losing the current work.
window.addEventListener("dragover", event => event.preventDefault());
window.addEventListener("drop", event => event.preventDefault());
let drag;
canvas.addEventListener("pointerdown", event => {
  if (!photo) return;
  canvas.setPointerCapture(event.pointerId);
  drag = { x: event.clientX, y: event.clientY, panX: state.panX, panY: state.panY };
});
canvas.addEventListener("pointermove", event => {
  if (!drag || !photo) return;
  const rect = canvas.getBoundingClientRect();
  const crop = photoCrop(photo.width, photo.height, canvas.width, canvas.height, state.zoom);
  if (photo.width > crop.width) state.panX = clamp(drag.panX - 2 * (event.clientX - drag.x) * crop.width / rect.width / (photo.width - crop.width), -1, 1);
  if (photo.height > crop.height) state.panY = clamp(drag.panY - 2 * (event.clientY - drag.y) * crop.height / rect.height / (photo.height - crop.height), -1, 1);
  syncControls(); render();
});
for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) canvas.addEventListener(eventName, () => { drag = null; });

async function exportImage(overlayOnly) {
  if (!ready || overflow || (!overlayOnly && !photo) || (overlayOnly && !hasOverlay(state))) return;
  const output = document.createElement("canvas");
  drawPost(output, state, design, brand, photo, overlayOnly);
  const blob = await new Promise(resolve => output.toBlob(resolve, overlayOnly ? "image/png" : "image/jpeg", 0.93));
  if (!blob) { status.textContent = "No s’ha pogut generar el fitxer. Torna-ho a provar."; return; }
  const name = photoName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 70) || "foto";
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = `${overlayOnly ? "bolets-capes" : name + "-bolets"}-${state.format}.${overlayOnly ? "png" : "jpg"}`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  status.textContent = overlayOnly ? "Capes desades. A Lightroom Classic: Edita marques d’aigua → Gràfic → Ajusta, centre i marges 0." : "Foto desada. Ja la pots revisar i publicar a Instagram.";
}
element("export-photo").addEventListener("click", () => exportImage(false));
element("export-overlay").addEventListener("click", () => exportImage(true));

async function start() {
  try {
    const response = await fetch(new URL("./design.json", import.meta.url));
    if (!response.ok) throw new Error("No s’ha pogut carregar el disseny");
    design = await response.json();
    await Promise.all([400, 700, 800, 900].map(async weight => {
      const name = { 400: "Regular", 700: "Bold", 800: "ExtraBold", 900: "Black" }[weight];
      const face = new FontFace(design.font, `url(${new URL(`./fonts/${name}.ttf`, import.meta.url).href})`, { weight: String(weight) });
      document.fonts.add(await face.load());
    }));
    brand = new Image(); brand.src = new URL("./brand.svg", import.meta.url).href; await brand.decode();
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      const legacy = JSON.parse(localStorage.getItem("bolets-photo-studio-settings-v1") || "{}");
      state = restoreSettings(saved ?? {}, legacy ?? {});
    } catch { /* Ignore unavailable or invalid saved preferences. */ }
    ready = true; syncControls(); render();
  } catch (error) { status.textContent = `No s’ha pogut iniciar l’editor: ${error.message}. Recarrega la pàgina.`; }
}
start();

// Only layout height crosses the frame boundary; photos stay in this document.
if (document.body.hasAttribute("data-embedded") && window.parent !== window) {
  new ResizeObserver(() => {
    window.parent.postMessage({ type: "bolets-photo-studio-height", height: Math.ceil(document.body.getBoundingClientRect().height) }, window.location.origin);
  }).observe(document.body);
}
