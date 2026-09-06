// Explicitly authorized 2026-09-05 profile refresh. Renders only; never publishes.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import type { ReactElement } from "react";
import { InstagramCover } from "@/components/instagram-cover";
import { instagramCardFonts } from "@/src/lib/instagram-card-fonts";
import { renderInstagramCover } from "@/src/lib/instagram-editorial-render";
import { renderInstagramSpeciesSlide } from "@/src/lib/instagram-species-card-render";
import { instagramSpeciesPublicationForSpecies } from "@/src/lib/instagram-species-series";
import { educationCovers, pinnedCovers } from "@/src/lib/instagram-editorial-covers";
import { instagramEducationTopic } from "@/src/lib/instagram-education";
import type { InstagramCoverBrief, InstagramMotif } from "@/src/lib/instagram-cover-brief";
import { FieldStudyCover } from "./instagram-profile-study-cards";

const folder = resolve("artifacts/instagram/publication-2026-09-05");
const planning = [
  { eyebrow: "01 · Compara el territori", title: "Comença pel mapa Avui.", subtitle: "Consulta la lectura territorial i mira quina espècie destaca a cada zona.", motif: "extent", tone: "cream" },
  { eyebrow: "02 · Mira més enllà del màxim", title: "Un bon sector. I la resta?", subtitle: "Comprova si el senyal és ampli o aïllat. L’extensió dona context a la puntuació.", motif: "extent", tone: "forest" },
  { eyebrow: "03 · Entén l’espècie", title: "Cada bolet té el seu bosc.", subtitle: "Hàbitat, altitud i temporada també compten. Consulta la fitxa abans de decidir.", motif: "trees", tone: "cream" },
  { eyebrow: "04 · Abans de sortir", title: "Torna a mirar el mapa.", subtitle: "Revisa les dades vigents. La lectura orienta: no confirma presència ni assenyala punts de recol·lecció.", motif: "field", tone: "orange" },
] as const;

async function main() {
  const posts: { position: number; url: string; caption: string; sourcePath: string }[] = JSON.parse(await readFile("artifacts/instagram/current-profile-redesign/source-posts.json", "utf8"));
  await mkdir(folder, { recursive: true });
  const fonts = await instagramCardFonts();
  const image = async (position: number) => `data:image/jpeg;base64,${(await sharp(posts[position - 1].sourcePath).rotate().jpeg({ quality: 95 }).toBuffer()).toString("base64")}`;
  const render = (element: ReactElement) => new ImageResponse(element, { width: 1080, height: 1350, fonts });
  const photo = async (position: number, title: string, eyebrow: string, subtitle: string, footer?: string) => render(<InstagramCover brief={{ layout: "photo", speciesId: "editorial-reference", title, eyebrow, subtitle }} photo={{ dataUrl: await image(position), credit: "bolets.app · fotografia del perfil" }} footer={footer} />);
  const question = (brief: InstagramCoverBrief, footer = "Explora l’atles · Enllaç al perfil") => renderInstagramCover({ brief, draft: false, footer });
  const manifest = [];
  const thumbs: Buffer[] = [];
  for (let position = 17; position >= 7; position--) {
    const source = posts[position - 1];
    const responses: Response[] = [];
    let caption = source.caption.replace(/^\d+\/62 · /, "").replace(/\s*Bolets Atles · perfil fixat · \d+\/03\s*$/, "");
    if (position >= 14) {
      responses.push(render(<FieldStudyCover photo={await image(position)} />));
      caption = position === 14 ? "Petits tresors del bosc 🍄\n\nUna fotografia del nostre arxiu de camp.\n\n#BoletsAtles #BoletsCatalunya #Bosc" : position === 15 ? "A peu de bosc 🍄\n\nUna imatge del nostre arxiu de camp. Cada sortida és una oportunitat per observar i aprendre.\n\n#BoletsAtles #BoletsCatalunya #Boletaires" : "A peu de bosc.\n\nUna fotografia del nostre arxiu: aturar-se, observar i respectar.\n\n#BoletsAtles #BoletsCatalunya #Bosc";
    } else if (position === 13) responses.push(await question(pinnedCovers["pinned-safety"]));
    else if (position === 12) responses.push(await question({ ...pinnedCovers["pinned-method"], title: "Condicions. No localitzacions.", subtitle: "La puntuació compara. No revela punts de recol·lecció.", tone: "forest" }));
    else if (position === 11) responses.push(await photo(16, "Coneix els bolets. Entén el bosc.", "Tot l’atles en un sol lloc", "Catàleg, guies, temporades i quadern de camp."));
    else if (position === 10) {
      responses.push(await question(educationCovers.reading, "1/5 · Desplaça per entendre el mapa →"));
      const motifs: InstagramMotif[] = ["scale", "extent", "field", "trees"];
      const tones = ["cream", "forest", "orange", "cream"] as const;
      const titles = ["Condicions de 0 a 100.", "Un màxim no ho explica tot.", "Sectors. No punts de recol·lecció.", "Compara abans de sortir."];
      for (const [i, slide] of instagramEducationTopic("reading").slides.slice(1).entries()) {
        responses.push(await question({ layout: "question", eyebrow: slide.eyebrow, title: titles[i], subtitle: slide.body, motif: motifs[i], tone: tones[i] }, `${i + 2}/5 · ${i === 3 ? "Consulta el mapa · Enllaç al perfil" : "Desplaça per continuar →"}`));
      }
      caption = "Què vol dir la puntuació de Bolets Atles?\n\nL’escala de 0 a 100 resumeix condicions ambientals i hàbitat compatible. No és un recompte de bolets ni una confirmació de presència.\n\nCompara el millor sector amb l’extensió del senyal, l’espècie i l’evolució. Una puntuació alta en un sector no descriu tot el territori.\n\nDesplaça per aprendre a llegir el mapa. Consulta les dades actualitzades a l’enllaç del perfil → @bolets.app\n\n#BoletsAtles #Micologia #BoletsCatalunya #MapaDeBolets";
    } else if (position === 8 || position === 9) {
      const profile = instagramSpeciesPublicationForSpecies(position === 8 ? "boletus-edulis" : "macrolepiota-procera").profile;
      for (let slide = 1; slide <= 5; slide++) responses.push(await renderInstagramSpeciesSlide({ profile, slide }));
    } else if (position === 7) {
      responses.push(await photo(15, "Tria el bosc amb criteri.", "Abans de sortir", "Compara espècies, territoris i condicions.", "1/5 · Desplaça per preparar la sortida →"));
      for (const [i, brief] of planning.entries()) responses.push(await question({ layout: "question", ...brief }, `${i + 2}/5 · ${i === 3 ? "Mapa Avui · Enllaç al perfil" : "Desplaça per continuar →"}`));
      caption = "Aquest cap de setmana, tria el bosc amb criteri.\n\n1. Comença pel mapa Avui i compara territoris.\n2. Mira si el senyal és ampli o queda concentrat en pocs sectors.\n3. Consulta l’hàbitat i la temporada de cada espècie.\n4. Revisa les dades abans de sortir.\n\nLa lectura estima condicions favorables; no confirma presència ni revela punts de recol·lecció. Respecta el bosc i la normativa local.\n\nDesa aquesta guia per preparar la propera sortida. Mapa actualitzat a l’enllaç del perfil → @bolets.app\n\n#BoletsAtles #BoletsCatalunya #CapDeSetmana #Boletaires";
    }
    const files = [];
    for (const [index, response] of responses.entries()) {
      const bytes = Buffer.from(await response.arrayBuffer());
      const file = resolve(folder, `${String(position).padStart(2, "0")}-${index + 1}.jpg`);
      await sharp(bytes).jpeg({ quality: 96, chromaSubsampling: "4:4:4" }).toFile(file);
      thumbs.push(await sharp(bytes).resize(216, 270).toBuffer());
      files.push(file);
    }
    if (!files.length || caption.length > 2200 || /ESBORRANY|PROPOSTA|73\/100|2026-09-02/.test(caption)) throw new Error(`Invalid post ${position}`);
    manifest.push({ position, sourceUrl: source.url, files, caption, status: "ready" });
  }
  await writeFile(resolve(folder, "manifest.json"), JSON.stringify(manifest, null, 2));
  await sharp({ create: { width: 1100, height: Math.ceil(thumbs.length / 5) * 280, channels: 3, background: "#f4ecd7" } }).composite(thumbs.map((input, i) => ({ input, left: i % 5 * 220, top: Math.floor(i / 5) * 280 }))).jpeg({ quality: 93 }).toFile(resolve(folder, "contact-sheet.jpg"));
  console.log(JSON.stringify({ folder, posts: manifest.length, images: thumbs.length }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
