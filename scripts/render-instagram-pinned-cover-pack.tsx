// Clean exports for the existing three evergreen pinned Reels. Does not upload.
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { InstagramCover } from "@/components/instagram-cover";
import { instagramCardFonts } from "@/src/lib/instagram-card-fonts";
import { MapStudyCover } from "./instagram-profile-study-cards";

async function main() {
  const folder = resolve("artifacts/instagram/pinned-cover-update");
  await mkdir(folder, { recursive: true });
  const fonts = await instagramCardFonts();
  const photo = `data:image/jpeg;base64,${(await sharp("artifacts/instagram/current-profile-redesign/originals/14.webp").jpeg().toBuffer()).toString("base64")}`;
  const map = `data:image/jpeg;base64,${(await sharp("artifacts/instagram/weekend-redesign/avui-map.jpg").jpeg().toBuffer()).toString("base64")}`;
  const detail = `data:image/jpeg;base64,${(await sharp("video/assets/captures/mobile/m08-setcases-cep-prediction-start.png").extract({ left: 108, top: 492, width: 864, height: 820 }).jpeg().toBuffer()).toString("base64")}`;
  const cards = [
    <InstagramCover key="atlas" brief={{ layout: "photo", speciesId: "editorial-reference", eyebrow: "Descobreix l’atles", title: "Tot un món de bolets.", subtitle: "Espècies, guies, mapes i quadern de camp." }} photo={{ dataUrl: photo, credit: "bolets.app · fotografia del perfil" }} />,
    <MapStudyCover key="evolution" title="El bosc canvia cada dia." eyebrow="Segueix l’evolució" subtitle="Observa el canvi. Prepara la sortida." map={map} timeline proposal={false} />,
    <MapStudyCover key="detail" title="Mira el bosc de prop." eyebrow="Mapa detallat · Cep" subtitle="Tria l’espècie. Amplia. Compara sectors." map={detail} tone="orange" round proposal={false} />,
  ];
  const thumbs: Buffer[] = [];
  for (let i = 0; i < cards.length; i++) {
    const response = new ImageResponse(cards[i], { width: 1080, height: 1350, fonts });
    const bytes = Buffer.from(await response.arrayBuffer());
    const reel = await sharp(bytes).extend({ top: 285, bottom: 285, left: 0, right: 0, background: i === 1 ? "#f4ecd7" : i === 2 ? "#f28a32" : "#14271c" }).png().toBuffer();
    await writeFile(resolve(folder, `0${i + 1}-reel-cover.png`), reel);
    thumbs.push(await sharp(reel).resize(270, 480).toBuffer());
  }
  await sharp({ create: { width: 822, height: 480, channels: 3, background: "#ffffff" } }).composite(thumbs.map((input, i) => ({ input, left: i * 276, top: 0 }))).jpeg().toFile(resolve(folder, "preview.jpg"));
  await writeFile(resolve(folder, "README.md"), `# Pinned Reel cover update\n\nClean 1080 × 1920 PNGs, without ESBORRANY/PROPOSTA stamps. The approved 4:5 composition sits in the centre; check the profile crop when selecting a cover. These are covers for existing evergreen tutorials, not new live condition reports. Map reference and ICGC attribution remain visible.\n\n1. 01-reel-cover.png → https://www.instagram.com/bolets.app/reel/Dc2zlzpj2yN/\n2. 02-reel-cover.png → https://www.instagram.com/bolets.app/reel/Dc2zzm-Aubz/\n3. 03-reel-cover.png → https://www.instagram.com/bolets.app/reel/Dc2zry0DV07/\n\nThe desktop editor inspected on 5 September exposes captions, tags and labels but no cover replacement. If the mobile app exposes Edit cover, choose the corresponding PNG and check its profile preview before saving. None of these files has been uploaded yet.\n`);
  console.log(folder);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
