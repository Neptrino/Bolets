import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  readMediaCredits,
  readSpecies,
} from "./lib/mushroom-infographic-data.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const outputDirectory = path.join(projectRoot, "artifacts", "infographics");
const siteMediaDirectory = path.join(projectRoot, "public", "media", "editorial");
const siteDownloadDirectory = path.join(projectRoot, "public", "downloads", "infografies");
const mediaDirectory = path.join(
  projectRoot,
  "public",
  "media",
  "wikimedia",
);

const width = 3508;
const height = 4961;
const margin = 138;
const columns = 6;
const columnGap = 18;
const cardWidth = (width - margin * 2 - columnGap * (columns - 1)) / columns;
const cardHeight = 224;
const cardImageWidth = 190;
const rowGap = 18;
const sectionHeaderHeight = 58;
const sectionHeaderGap = 18;
const sectionGap = 32;

const groups = [
  {
    id: "excellent",
    title: "EXCEL·LENTS COMESTIBLES",
    statuses: ["excellent_edible"],
    colour: "#b9572c",
  },
  {
    id: "edible",
    title: "COMESTIBLES",
    statuses: ["edible"],
    colour: "#406b4a",
  },
  {
    id: "conditional",
    title: "COMESTIBLES AMB CONDICIONS",
    statuses: ["edible_with_conditions"],
    colour: "#a67522",
  },
  {
    id: "avoid",
    title: "NO RECOMANATS O NO COMESTIBLES",
    statuses: ["not_recommended", "inedible"],
    colour: "#77756d",
  },
  {
    id: "toxic",
    title: "TÒXICS",
    statuses: ["toxic"],
    colour: "#bd5038",
  },
  {
    id: "danger",
    title: "MOLT TÒXICS",
    statuses: ["dangerously_toxic"],
    colour: "#7d2730",
  },
];

const monthOrder = ["gen", "feb", "mar", "abr", "mai", "jun", "jul", "ago", "set", "oct", "nov", "des"];
const posterMonthLabels = {
  gen: "GEN",
  feb: "FEB",
  mar: "MAR",
  abr: "ABR",
  mai: "MAI",
  jun: "JUN",
  jul: "JUL",
  ago: "AGO",
  set: "SET",
  oct: "OCT",
  nov: "NOV",
  des: "DES",
};

function bestMonthsLabel(item) {
  if (!item.seasonality) return item.seasonLabel?.toLocaleUpperCase("ca") ?? "—";
  const peak = monthOrder.filter((month) => item.seasonality[month] === "peak");
  const best = peak.length > 0
    ? peak
    : monthOrder.filter((month) => item.seasonality[month] === "good");
  return best.length > 0 ? best.map((month) => posterMonthLabels[month]).join(" · ") : "—";
}

function compactLabel(value, maximumLength = 30) {
  if (value.length <= maximumLength) return value;
  const candidate = value.slice(0, maximumLength - 1);
  const breakAt = candidate.lastIndexOf(" ");
  return `${candidate.slice(0, breakAt > 18 ? breakAt : maximumLength - 1)}…`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function readImageDataUris(species) {
  const entries = await Promise.all(
    species.map(async ({ speciesId }) => {
      const imagePath = path.join(mediaDirectory, `${speciesId}.webp`);
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Missing poster image: ${imagePath}`);
      }
      // librsvg, used by Sharp for the final poster render, does not decode
      // embedded WebP reliably. JPEG keeps the SVG self-contained and portable.
      const jpeg = await sharp(imagePath).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
      return [speciesId, `data:image/jpeg;base64,${jpeg.toString("base64")}`];
    }),
  );
  return new Map(entries);
}

function mushroomMark(x, y, scale = 1) {
  return `
    <g transform="translate(${x} ${y}) scale(${scale})">
      <rect x="0" y="0" width="92" height="92" rx="29" fill="#3b3b3b"/>
      <path d="M16 44.7C18.6 28 29 18.6 46 18.6S73.4 28 76 44.7c.3 2-1.3 3.8-3.4 3.8H19.4c-2.1 0-3.7-1.8-3.4-3.8Z" fill="#f28a2e"/>
      <path d="M29.4 48.5h33.2l5.2 22.8c.5 2.4-1.2 4.6-3.7 4.6H27.9c-2.5 0-4.2-2.2-3.7-4.6l5.2-22.8Z" fill="#f2ebd5"/>
      <path d="M25.7 74c13-4.1 27.1-4.1 40.6 0" fill="none" stroke="#f2a766" stroke-width="3.7" stroke-linecap="round"/>
    </g>`;
}

function cardSvg(item, index, x, y, colour, images) {
  const clipId = `clip-${item.speciesId}`;
  const image = images.get(item.speciesId);
  if (!image) throw new Error(`Missing embedded image for ${item.speciesId}`);
  const radius = 28;
  const number = String(index + 1).padStart(2, "0");
  const habitatLabel = compactLabel(item.habitatTypes[0] ?? "Hàbitat divers");
  const altitudeLabel = item.altitude
    ? `${item.altitude[0]}–${item.altitude[1]} m`
    : "altitud —";
  const seasonLabel = bestMonthsLabel(item);

  return `
    <g aria-label="${escapeXml(`${item.commonName}, ${item.scientificName}`)}">
      <rect x="${x}" y="${y + 7}" width="${cardWidth}" height="${cardHeight}" rx="${radius}" fill="#6a5e4c" opacity="0.12"/>
      <rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="${radius}" fill="#fffaf0" stroke="#d9ceb6" stroke-width="2"/>
      <defs>
        <clipPath id="${clipId}">
          <path d="M${x + radius},${y} H${x + cardImageWidth} V${y + cardHeight} H${x + radius} Q${x},${y + cardHeight} ${x},${y + cardHeight - radius} V${y + radius} Q${x},${y} ${x + radius},${y} Z"/>
        </clipPath>
      </defs>
      <image href="${image}" x="${x}" y="${y}" width="${cardImageWidth}" height="${cardHeight}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>
      <rect x="${x + cardImageWidth}" y="${y}" width="9" height="${cardHeight}" fill="${colour}"/>
      <circle cx="${x + 42}" cy="${y + 41}" r="25" fill="#fffaf0" opacity="0.96"/>
      <text x="${x + 42}" y="${y + 49}" text-anchor="middle" class="number">${number}</text>
      <text x="${x + cardImageWidth + 34}" y="${y + 45}" class="card-meta">${escapeXml(`${seasonLabel}  ·  ${altitudeLabel}`)}</text>
      <text x="${x + cardImageWidth + 34}" y="${y + 101}" class="common-name">${escapeXml(item.commonName)}</text>
      <text x="${x + cardImageWidth + 34}" y="${y + 135}" class="scientific-name">${escapeXml(item.scientificName)}</text>
      <text x="${x + cardImageWidth + 34}" y="${y + 194}" class="card-habitat">${escapeXml(habitatLabel)}</text>
    </g>`;
}

function sectionSvg(group, items, startIndex, y, images) {
  const rows = Math.ceil(items.length / columns);
  const right = width - margin;
  let markup = `
    <g>
      <rect x="${margin}" y="${y + 11}" width="52" height="12" rx="6" fill="${group.colour}"/>
      <text x="${margin + 72}" y="${y + 35}" class="section-title">${escapeXml(group.title)}</text>
      <text x="${right}" y="${y + 35}" text-anchor="end" class="section-count">${items.length} ESPÈCIES</text>
      <line x1="${margin}" y1="${y + sectionHeaderHeight}" x2="${right}" y2="${y + sectionHeaderHeight}" stroke="#d1c5aa" stroke-width="2"/>
    </g>`;

  const gridY = y + sectionHeaderHeight + sectionHeaderGap;
  let itemIndex = 0;

  for (let row = 0; row < rows; row += 1) {
    const itemsInRow = Math.min(columns, items.length - itemIndex);
    const rowWidth = itemsInRow * cardWidth + (itemsInRow - 1) * columnGap;
    const rowX = itemsInRow === columns ? margin : margin + (width - margin * 2 - rowWidth) / 2;

    for (let column = 0; column < itemsInRow; column += 1) {
      const x = rowX + column * (cardWidth + columnGap);
      const cardY = gridY + row * (cardHeight + rowGap);
      markup += cardSvg(
        items[itemIndex],
        startIndex + itemIndex,
        x,
        cardY,
        group.colour,
        images,
      );
      itemIndex += 1;
    }
  }

  return {
    markup,
    height:
      sectionHeaderHeight +
      sectionHeaderGap +
      rows * cardHeight +
      (rows - 1) * rowGap +
      sectionGap,
  };
}

function buildSvg(species, images) {
  const collator = new Intl.Collator("ca", { sensitivity: "base" });
  const orderedGroups = groups.map((group) => ({
    ...group,
    items: species
      .filter((item) => group.statuses.includes(item.edibility))
      .sort((left, right) => collator.compare(left.commonName, right.commonName)),
  }));
  const accountedFor = orderedGroups.reduce((sum, group) => sum + group.items.length, 0);
  if (accountedFor !== species.length) {
    throw new Error(`Poster groups include ${accountedFor} of ${species.length} species`);
  }

  let sectionY = 610;
  let globalIndex = 0;
  let sections = "";

  for (const group of orderedGroups) {
    const section = sectionSvg(group, group.items, globalIndex, sectionY, images);
    sections += section.markup;
    sectionY += section.height;
    globalIndex += group.items.length;
  }

  if (sectionY > 4560) {
    throw new Error(`Poster content overflows into the footer at y=${sectionY}`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description">
  <title id="title">Bolets de Catalunya — catàleg visual de ${species.length} espècies</title>
  <desc id="description">Infografia de Bolets Atles amb fotografies, noms catalans i noms científics, agrupats per comestibilitat. No és una guia d’identificació.</desc>
  <style>
    text { fill: #3b3b3b; font-family: "Avenir Next", Avenir, Arial, sans-serif; }
    .eyebrow { font-size: 28px; font-weight: 800; letter-spacing: 7px; }
    .title { font-size: 142px; font-weight: 900; letter-spacing: -6px; }
    .subtitle { font-size: 34px; font-weight: 500; }
    .section-title { font-size: 34px; font-weight: 900; letter-spacing: 1.4px; }
    .section-count { fill: #706d66; font-size: 24px; font-weight: 800; letter-spacing: 2px; }
    .number { fill: #3b3b3b; font-size: 22px; font-weight: 900; letter-spacing: 1px; }
    .common-name { font-size: 27px; font-weight: 850; letter-spacing: -0.5px; }
    .scientific-name { fill: #706d66; font-family: Georgia, "Times New Roman", serif; font-size: 19px; font-style: italic; }
    .card-habitat { fill: #4e574d; font-size: 18px; font-weight: 750; }
    .card-meta { fill: #8a5d3f; font-size: 16px; font-weight: 850; letter-spacing: 0.4px; }
    .footer-kicker { fill: #f2a766; font-size: 25px; font-weight: 900; letter-spacing: 3px; }
    .footer-copy { fill: #fff7e8; font-size: 26px; font-weight: 650; }
    .footer-meta { fill: #c7d0ba; font-size: 21px; font-weight: 550; }
  </style>
  <rect width="${width}" height="${height}" fill="#f2ebd5"/>
  <g opacity="0.2" fill="none" stroke="#bd592a" stroke-width="3">
    <path d="M-80 230 C460 35 750 480 1270 255 S2100 32 2440 280 3180 490 3630 235"/>
    <path d="M-100 300 C430 105 820 540 1325 330 S2095 115 2510 348 3170 565 3620 330"/>
    <path d="M-120 370 C410 180 880 610 1380 405 S2110 195 2580 420 3190 640 3620 410"/>
  </g>
  <circle cx="3210" cy="260" r="390" fill="#f28a2e" opacity="0.1"/>
  <circle cx="3180" cy="235" r="270" fill="#bd592a" opacity="0.07"/>
  ${mushroomMark(margin, 108, 1.28)}
  <text x="${margin + 150}" y="150" class="eyebrow">BOLETS ATLES · CATALUNYA</text>
  <text x="${margin}" y="342" class="title">BOLETS DE CATALUNYA</text>
  <text x="${margin}" y="420" class="subtitle">${species.length} espècies · noms · millors mesos · hàbitat i altitud</text>
  <g transform="translate(${margin} 470)">
    <rect x="0" y="0" width="${width - margin * 2}" height="72" rx="24" fill="#fff9ed" stroke="#d1c5aa" stroke-width="2"/>
    <circle cx="39" cy="36" r="18" fill="#bd592a"/>
    <text x="39" y="45" text-anchor="middle" style="fill:#fff9ed;font-size:26px;font-weight:900">!</text>
    <text x="74" y="45" style="font-size:25px;font-weight:800;letter-spacing:0.5px">MAI IDENTIFIQUEU NI CONSUMIU UN BOLET NOMÉS A PARTIR D’UNA FOTOGRAFIA.</text>
  </g>
  ${sections}
  <g transform="translate(0 4582)">
    <rect width="${width}" height="379" fill="#3b3b3b"/>
    <rect width="${width}" height="12" fill="#f28a2e"/>
    ${mushroomMark(margin, 72, 0.92)}
    <text x="${margin + 116}" y="105" class="footer-kicker">SEGURETAT ABANS DE TOT</text>
    <text x="${margin + 116}" y="157" class="footer-copy">No consumiu cap bolet si no n’heu confirmat la identificació</text>
    <text x="${margin + 116}" y="199" class="footer-copy">amb una persona experta.</text>
    <text x="${width - margin}" y="108" text-anchor="end" class="footer-kicker">BOLETS.APP/BOLETS</text>
    <text x="${width - margin}" y="158" text-anchor="end" class="footer-meta">Fitxes, confusions, temporada i hàbitat</text>
    <text x="${width - margin}" y="199" text-anchor="end" class="footer-meta">Fotografies: Wikimedia Commons</text>
    <line x1="${margin}" y1="256" x2="${width - margin}" y2="256" stroke="#67645f" stroke-width="2"/>
    <text x="${margin}" y="307" class="footer-meta">Infografia generada a partir del catàleg versionat de Bolets Atles.</text>
    <text x="${width - margin}" y="307" text-anchor="end" class="footer-meta">Autoria i llicències completes al document de crèdits adjunt.</text>
  </g>
</svg>`;
}

function buildCredits(species, credits) {
  const collator = new Intl.Collator("ca", { sensitivity: "base" });
  const lines = [
    "BOLETS DE CATALUNYA — CRÈDITS FOTOGRÀFICS",
    "",
    "Infografia: Bolets Atles · https://bolets.app/bolets",
    "Les fotografies s'han retallat i redimensionat per a la composició del pòster.",
    "",
  ];

  for (const item of [...species].sort((a, b) => collator.compare(a.commonName, b.commonName))) {
    const credit = credits.get(item.speciesId);
    if (!credit) {
      throw new Error(`Missing media credit for ${item.speciesId}`);
    }
    lines.push(`${item.commonName} (${item.scientificName})`);
    lines.push(`  Fotografia: ${credit.attribution}`);
    lines.push(`  Llicència: ${credit.license}`);
    lines.push(`  Font: ${credit.sourceUrl}`);
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const species = readSpecies(projectRoot);
  const credits = readMediaCredits(projectRoot);
  const images = await readImageDataUris(species);
  const svg = buildSvg(species, images);

  fs.mkdirSync(outputDirectory, { recursive: true });
  const filePrefix = `bolets-catalunya-${species.length}-especies`;
  const svgPath = path.join(outputDirectory, `${filePrefix}.svg`);
  const pngPath = path.join(outputDirectory, `${filePrefix}.png`);
  const previewPath = path.join(outputDirectory, `${filePrefix}-preview.png`);
  const creditsPath = path.join(outputDirectory, `${filePrefix}-credits.txt`);
  const siteMediaPath = path.join(siteMediaDirectory, "bolets-catalunya-infografia.webp");
  const siteDownloadPath = path.join(siteDownloadDirectory, "bolets-catalunya-infografia.png");
  const siteCreditsPath = path.join(siteDownloadDirectory, "bolets-catalunya-infografia-credits.txt");
  const creditText = buildCredits(species, credits);

  fs.writeFileSync(svgPath, svg);
  fs.writeFileSync(creditsPath, creditText);
  const png = await sharp(Buffer.from(svg), { density: 72 })
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(pngPath, png);
  await sharp(png).resize({ width: 1400 }).png({ compressionLevel: 9 }).toFile(previewPath);

  fs.mkdirSync(siteMediaDirectory, { recursive: true });
  fs.mkdirSync(siteDownloadDirectory, { recursive: true });
  await sharp(png).webp({ quality: 88, effort: 5 }).toFile(siteMediaPath);
  fs.writeFileSync(siteDownloadPath, png);
  fs.writeFileSync(siteCreditsPath, creditText);

  process.stdout.write(
    `${JSON.stringify({ species: species.length, svgPath, pngPath, previewPath, creditsPath, siteMediaPath, siteDownloadPath, siteCreditsPath }, null, 2)}\n`,
  );
}

await main();
