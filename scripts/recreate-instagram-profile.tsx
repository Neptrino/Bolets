// Recreate the verified 17-post profile as a local cover study. No publishing.
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ImageResponse } from "next/og";
import type { ReactElement } from "react";
import sharp from "sharp";
import { InstagramCover } from "@/components/instagram-cover";
import { instagramCardFonts } from "@/src/lib/instagram-card-fonts";
import { renderInstagramCover } from "@/src/lib/instagram-editorial-render";
import { renderInstagramSpeciesSlide } from "@/src/lib/instagram-species-card-render";
import { instagramSpeciesPublicationForSpecies } from "@/src/lib/instagram-species-series";
import { educationCovers, pinnedCovers } from "@/src/lib/instagram-editorial-covers";
import { MapStudyCover, FieldStudyCover } from "./instagram-profile-study-cards";

interface SourcePost { position: number; url: string; pinned: boolean; caption: string; sourcePath: string }
const output = resolve("artifacts/instagram/current-profile-redesign");
const number = (i: number) => String(i).padStart(2, "0");
const escape = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const titles = ["Tot un món de bolets.", "El bosc canvia cada dia.", "Mira el bosc de prop.", "Dos boscos. Dues lectures.", "On val la pena buscar bolets avui?", "On miraries aquest cap de setmana?", "Tria el bosc amb criteri.", "Cep", "Apagallums", "Què vol dir aquest número?", "Coneix els bolets. Entén el bosc.", "Condicions. No localitzacions.", "El bosc es respecta.", "Petits tresors del bosc", "El bosc comença a produir", "Fotografia de camp · sense peu original", "Fotografia de camp · sense peu original"];
const notes = [
  "Pinned introduction: original atlas topic, with the account’s existing field photograph as the hero.",
  "Pinned evolution: combined Avui map reference and an observed/current/forecast timeline. This still image does not recreate the animation.",
  "Pinned detail: existing cep map capture enlarged inside a lens; no collection point is added.",
  "Neighbouring-sector Reel: retain the comparison subject, with a clearer headline. Source scores remain in the archived caption; the cover makes no new numerical claim.",
  "Active ad retained as the style reference. Its source file and live campaign are unchanged.",
  "Weekend Reel: combined Avui map becomes the hero. Reference capture is not the historical 4 September forecast or new live evidence.",
  "Weekend preparation carousel: same planning message with the account’s original field photograph.",
  "Cep carousel: new photographic catalogue cover, existing content retained.",
  "Apagallums carousel: new photographic catalogue cover, existing content retained; current credited catalogue photo differs from the old cover.",
  "Prediction education: short question and scale. The archived 73/100 example is not promoted as a current reading.",
  "Atlas introduction: existing topic with a field photograph. The image does not assert a species identification.",
  "Method post: same conditions-versus-location distinction in a shorter headline.",
  "Responsible field use: same identification, local-rules and respect topic.",
  "Original field photo retained with discreet branding. Existing caption preserved.",
  "Original field photo retained with discreet branding. Existing caption preserved.",
  "Original uncaptioned photograph retained; no species, date or location is invented.",
  "Original uncaptioned photograph retained; no species, date or location is invented.",
];

async function main() {
  const posts: SourcePost[] = JSON.parse(await readFile(resolve(output, "source-posts.json"), "utf8"));
  if (posts.length !== 17 || posts.some((post, i) => post.position !== i + 1)) throw new Error("Expected the verified 17-post profile in its original order");
  await mkdir(resolve(output, "covers"), { recursive: true });
  const fonts = await instagramCardFonts();
  const image = async (path: string) => `data:image/jpeg;base64,${(await sharp(path).rotate().jpeg({ quality: 92 }).toBuffer()).toString("base64")}`;
  const original = (i: number) => posts[i - 1].sourcePath;
  const map = await image("artifacts/instagram/weekend-redesign/avui-map.jpg");
  const detail = `data:image/jpeg;base64,${(await sharp("video/assets/captures/mobile/m08-setcases-cep-prediction-start.png").extract({ left: 108, top: 492, width: 864, height: 820 }).jpeg().toBuffer()).toString("base64")}`;
  const field14 = await image(original(14));
  const render = (element: ReactElement) => new ImageResponse(element, { width: 1080, height: 1350, fonts });
  const photo = async (i: number, eyebrow: string, title: string, subtitle: string) => render(<InstagramCover brief={{ layout: "photo", speciesId: "editorial-reference", eyebrow, title, subtitle }} photo={{ dataUrl: await image(original(i)), credit: "bolets.app · fotografia del perfil" }} draft />);
  const after: string[] = [];
  for (const post of posts) {
    const i = post.position;
    const path = resolve(output, "covers", `${number(i)}.png`);
    let response: Response;
    if (i === 1) response = await photo(14, "Descobreix l’atles", titles[0], "Espècies, guies, mapes i quadern de camp.");
    else if (i === 2) response = render(<MapStudyCover title={titles[1]} eyebrow="Segueix l’evolució" subtitle="Observa el canvi. Prepara la sortida." map={map} timeline />);
    else if (i === 3) response = render(<MapStudyCover title={titles[2]} eyebrow="Mapa detallat · Cep" subtitle="Tria l’espècie. Amplia. Compara sectors." map={detail} tone="orange" round />);
    else if (i === 4) response = render(<MapStudyCover title={titles[3]} eyebrow="El terreny també compta" subtitle="Les condicions canvien d’un sector a l’altre." map={detail} tone="forest" round backgroundPhoto={field14} />);
    else if (i === 5) { await copyFile("artifacts/instagram/2026-09-map-campaign/singles/22-mapa-bolets-app.png", path); after.push(path); continue; }
    else if (i === 6) response = render(<MapStudyCover title={titles[5]} eyebrow="Prepara el cap de setmana" subtitle="Comença pel mapa Avui de Catalunya." map={map} />);
    else if (i === 7) response = await photo(15, "Abans de sortir", titles[6], "Compara espècies, territoris i condicions.");
    else if (i === 8 || i === 9) response = await renderInstagramSpeciesSlide({ profile: instagramSpeciesPublicationForSpecies(i === 8 ? "boletus-edulis" : "macrolepiota-procera").profile, slide: 1 });
    else if (i === 10) response = await renderInstagramCover({ brief: educationCovers.reading });
    else if (i === 11) response = await photo(16, "Tot l’atles en un sol lloc", titles[10], "Catàleg, guies, temporades i quadern de camp.");
    else if (i === 12) response = await renderInstagramCover({ brief: { ...pinnedCovers["pinned-method"], title: titles[11], subtitle: "La puntuació compara. No revela punts de recol·lecció.", tone: "forest" } });
    else if (i === 13) response = await renderInstagramCover({ brief: pinnedCovers["pinned-safety"] });
    else response = render(<FieldStudyCover photo={await image(original(i))} />);
    await writeFile(path, Buffer.from(await response.arrayBuffer()));
    after.push(path);
  }
  // Show the same three-column order on both sides. 3:4 crop is a preview,
  // independent of the desktop site's responsive column count.
  async function grid(paths: string[], file: string, limit = 17) {
    const width = 1088; const height = Math.ceil(limit / 3) * 484 - 4;
    const thumbs = await Promise.all(paths.slice(0, limit).map(path => sharp(path).resize(360, 480, { fit: "cover" }).toBuffer()));
    await sharp({ create: { width, height, channels: 3, background: "#f4ecd7" } }).composite(thumbs.map((input, i) => ({ input, left: i % 3 * 364, top: Math.floor(i / 3) * 484 }))).jpeg({ quality: 93 }).toFile(resolve(output, file));
  }
  await grid(posts.map(p => p.sourcePath), "before.jpg");
  await grid(after, "after.jpg");
  await grid(posts.map(p => p.sourcePath), "before-top-nine.jpg", 9);
  await grid(after, "after-top-nine.jpg", 9);
  const header = Buffer.from(`<svg width="2224" height="170"><rect width="2224" height="170" fill="#f4ecd7"/><text x="24" y="61" font-family="Arial" font-size="36" font-weight="bold" fill="#14271c">ACTUAL</text><text x="1160" y="61" font-family="Arial" font-size="36" font-weight="bold" fill="#14271c">NOU ESTIL</text><text x="24" y="116" font-family="Arial" font-size="23" fill="#3d513f">@bolets.app · Mateixes publicacions, mateix ordre · Estudi de portades</text></svg>`);
  for (const [name, before, next, height] of [["comparison.jpg", "before.jpg", "after.jpg", 2900], ["comparison-top-nine.jpg", "before-top-nine.jpg", "after-top-nine.jpg", 1448]] as const) {
    await sharp({ create: { width: 2224, height: height + 170, channels: 3, background: "#f4ecd7" } }).composite([{ input: header, top: 0, left: 0 }, { input: resolve(output, before), top: 170, left: 0 }, { input: resolve(output, next), top: 170, left: 1136 }]).jpeg({ quality: 93 }).toFile(resolve(output, name));
  }
  const manifest = posts.map((post, i) => ({ ...post, title: titles[i], cover: `covers/${number(i + 1)}.png`, note: notes[i] }));
  await writeFile(resolve(output, "redesign-manifest.json"), JSON.stringify(manifest, null, 2));
  await writeFile(resolve(output, "index.html"), html(manifest));
  await writeFile(resolve(output, "README.md"), `# Current profile recreated · 5 September 2026\n\n17 existing public posts inspected on Instagram, in their displayed order including the three pins. This is a cover redesign study; video timelines, carousel interiors and live posts have not been replaced. The current ad at position 5 is retained as the reference. Four original field photographs retain their subjects and captions. Source photos are Instagram exports for this local review, not new catalogue-licence grants. Map captures are reference imagery; they do not reconstruct the historical readings or assert current conditions.\n\nOpen index.html for every before/after pair, source link and content mapping. Grid previews use a three-column 3:4 crop, with the same crop rule applied to both sides.\n\nRegenerate: npx tsx scripts/recreate-instagram-profile.tsx\n\n${manifest.map(p => `${p.position}. [${p.title}](${p.url}) — ${p.note}`).join("\n")}\n`);
  console.log(resolve(output, "index.html"));
}

function html(posts: (SourcePost & { title: string; cover: string; note: string })[]) {
  return `<!doctype html><html lang="ca"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>bolets.app — Perfil, nou estil</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f4ecd7;color:#14271c;font-family:'Avenir Next',sans-serif}header,main{max-width:1440px;margin:auto;padding:32px}header{padding-top:48px}h1{font-size:clamp(32px,5vw,68px);letter-spacing:-.055em;line-height:1.02;margin:16px 0}p{max-width:880px;line-height:1.6}.tag{letter-spacing:.12em;font-size:12px;font-weight:800;text-transform:uppercase}nav{display:flex;gap:12px;flex-wrap:wrap}a{color:inherit}nav a{padding:12px 20px;background:#14271c;color:#f4ecd7;text-decoration:none;border-radius:3px}nav a:focus-visible,summary:focus-visible{outline:3px solid #f28a32;outline-offset:4px}.comparison{width:100%;height:auto;display:block}details{border-top:1px solid #b7bdab;padding:18px 0}summary{cursor:pointer;font-weight:800;font-size:19px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:960px;margin-top:24px}.pair img{width:100%;height:auto;max-height:660px;object-fit:contain;background:#14271c}figure{margin:0}figcaption{padding:8px 0;font-size:13px}blockquote{white-space:pre-wrap;max-width:900px;border-left:3px solid #f28a32;margin:24px 0;padding:0 20px;font-size:14px}footer{padding:32px 0;font-size:13px}h2{margin-top:52px} @media(max-width:640px){header,main{padding:20px}.pair{gap:6px}summary{font-size:16px}}
  </style><header><span class="tag">Direcció visual · 05.09.2026</span><h1>El teu perfil.<br>Amb el nou estil.</h1><p>Les 17 publicacions de <strong>@bolets.app</strong>, amb els mateixos temes i el mateix ordre. Estudi de portades: les animacions i l’interior dels carrusels continuen sent els originals.</p><nav><a href="#grid">Comparar el perfil</a><a href="#posts">Veure cada publicació</a><a href="after.jpg">Descarregar la graella</a></nav></header><main><section id="grid"><img class="comparison" src="comparison.jpg" alt="Les 17 publicacions actuals a l’esquerra i les portades proposades a la dreta, en el mateix ordre"><p>Retall de mostra 3:4 en tres columnes. Els mapes són captures de referència, no lectures actuals ni reconstruccions de les dades històriques. L’anunci actiu, a la posició 5, es conserva com a referència.</p></section><h2 id="posts">Publicació per publicació</h2>${posts.map(post => `<details><summary>${number(post.position)}${post.pinned ? ' · FIXADA' : ''} — ${escape(post.title)}</summary><div class="pair"><figure><img loading="lazy" src="originals/${post.sourcePath.split('/').pop()}" alt="Portada original ${post.position}"><figcaption>Actual</figcaption></figure><figure><a href="${post.cover}"><img loading="lazy" src="${post.cover}" alt="Portada proposada ${post.position}"></a><figcaption>Proposta · Obre el PNG complet</figcaption></figure></div><p>${escape(post.note)}</p><a href="${post.url}" target="_blank" rel="noreferrer">Veure la publicació original ↗</a><blockquote>${escape(post.caption || 'Sense peu de foto a la graella original.')}</blockquote></details>`).join('')}<footer>Estudi local. Cap publicació, anunci, pin o programació s’ha modificat.</footer></main></html>`;
}

main().catch(error => { console.error(error); process.exitCode = 1; });
