import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { chromium } from "@playwright/test";
import { readSpecies } from "./lib/mushroom-infographic-data.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const outputDirectory = path.join(projectRoot, "artifacts", "infographics");
const siteMediaDirectory = path.join(projectRoot, "public", "media", "editorial");
const siteDownloadDirectory = path.join(projectRoot, "public", "downloads", "infografies");
const illustrationDirectory = path.join(projectRoot, "public", "media", "illustrations");

const width = 3508;
const height = 4961;
const margin = 138;
const columns = 8;
const columnGap = 18;
const cardWidth = (width - margin * 2 - columnGap * (columns - 1)) / columns;
const cardHeight = 336;
const cardArtHeight = 174;
const cardPadding = 20;
const rowGap = 18;
const sectionHeaderHeight = 64;
const sectionHeaderGap = 20;
const sectionGap = 34;
const sectionsTop = 672;
const footerTop = 4582;
/** Species drawn large in the masthead, back to front: [speciesId, x, y, size]. */
const mastheadCluster = [
  ["cantharellus-cibarius", 1965, 272, 270],
  ["amanita-phalloides", 3085, 250, 290],
  ["amanita-caesarea", 2170, 196, 320],
  ["amanita-muscaria", 2790, 186, 340],
  ["boletus-edulis", 2430, 118, 400],
];

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

const seasonMonths = {
  primavera: ["mar", "abr", "mai"],
  estiu: ["jun", "jul", "ago"],
  tardor: ["set", "oct", "nov"],
  hivern: ["des", "gen", "feb"],
};

/** Months covered by a described season such as "Estiu i tardor" or "De primavera a tardor". */
function monthsFromSeasonLabel(label) {
  const text = (label ?? "").toLocaleLowerCase("ca");
  const seasons = Object.keys(seasonMonths).filter((season) => text.includes(season));
  if (seasons.length === 0) return [];
  if (/^de\s/.test(text) && seasons.length >= 2) {
    const start = monthOrder.indexOf(seasonMonths[seasons[0]][0]);
    const end = monthOrder.indexOf(seasonMonths[seasons[seasons.length - 1]].at(-1));
    return monthOrder.filter((_, index) => (start <= end ? index >= start && index <= end : index >= start || index <= end));
  }
  return monthOrder.filter((month) => seasons.some((season) => seasonMonths[season].includes(month)));
}

function bestMonths(item) {
  if (!item.seasonality) return monthsFromSeasonLabel(item.seasonLabel);
  const peak = monthOrder.filter((month) => item.seasonality[month] === "peak");
  return peak.length > 0
    ? peak
    : monthOrder.filter((month) => item.seasonality[month] === "good");
}

function bestMonthsLabel(item) {
  const best = bestMonths(item);
  return best.length > 0 ? best.map((month) => posterMonthLabels[month]).join(" · ") : "—";
}

/** Month cells as on the species field cards: lettered squares, the season in warm tones. */
const monthActivityFill = {
  peak: "#c8462a",
  good: "#ec8a4a",
  moderate: "#f4c9a0",
};

function monthActivity(item) {
  if (item.seasonality) return item.seasonality;
  const described = monthsFromSeasonLabel(item.seasonLabel);
  return Object.fromEntries(monthOrder.map((month) => [month, described.includes(month) ? "good" : "inactive"]));
}

function monthCellsSvg(x, y, cellsWidth, activity, cellHeight = 26) {
  const gap = 3;
  const cell = (cellsWidth - gap * (monthOrder.length - 1)) / monthOrder.length;
  return monthOrder.map((month, index) => {
    const cx = x + index * (cell + gap);
    const fill = monthActivityFill[activity[month]] ?? "#e7e1d3";
    const textFill = activity[month] === "peak" || activity[month] === "good" ? "#fffaf0" : "#6f6a60";
    return `
      <rect x="${cx}" y="${y}" width="${cell}" height="${cellHeight}" rx="4" fill="${fill}"/>
      <text x="${cx + cell / 2}" y="${y + cellHeight / 2 + 5.5}" text-anchor="middle" class="month-initial" style="fill:${textFill}">${posterMonthLabels[month][0]}</text>`;
  }).join("");
}

function mountainIconSvg(x, y, colour) {
  return `<path d="M${x} ${y + 14} L${x + 6.5} ${y + 2} L${x + 10.5} ${y + 9} L${x + 12.5} ${y + 6} L${x + 18} ${y + 14} Z" fill="${colour}"/>`;
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
      const imagePath = path.join(illustrationDirectory, `${speciesId}.webp`);
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Missing poster illustration: ${imagePath}`);
      }
      // librsvg, used by Sharp for the final poster render, does not decode
      // embedded WebP reliably. PNG keeps the cut-out transparency.
      const png = await sharp(imagePath)
        .resize({ width: 400, withoutEnlargement: true })
        .png({ compressionLevel: 9, palette: true, quality: 90 })
        .toBuffer();
      return [speciesId, `data:image/png;base64,${png.toString("base64")}`];
    }),
  );
  return new Map(entries);
}

/** Heavy caps like the field-card titles; long names are condensed to fit, never cut. */
function fittedText(x, y, value, className, fontSize, maxWidth, widthFactor) {
  const estimated = value.length * fontSize * widthFactor;
  const fit = estimated > maxWidth ? ` textLength="${maxWidth}" lengthAdjust="spacingAndGlyphs"` : "";
  return `<text x="${x}" y="${y}" text-anchor="middle" class="${className}"${fit}>${escapeXml(value)}</text>`;
}

function forkIconSvg(x, y, colour) {
  return `
    <g fill="none" stroke="${colour}" stroke-width="3" stroke-linecap="round">
      <path d="M${x + 4} ${y} V${y + 9} M${x + 9} ${y} V${y + 9} M${x + 14} ${y} V${y + 9} M${x + 4} ${y + 9} Q${x + 9} ${y + 14} ${x + 14} ${y + 9} M${x + 9} ${y + 12} V${y + 26}"/>
      <path d="M${x + 24} ${y + 26} V${y} Q${x + 31} ${y + 6} ${x + 29} ${y + 15} H${x + 24}"/>
    </g>`;
}

function warningIconSvg(x, y, colour) {
  return `
    <path d="M${x + 14} ${y} L${x + 28} ${y + 25} H${x} Z" fill="${colour}"/>
    <rect x="${x + 12.5}" y="${y + 8}" width="3" height="9" rx="1.5" fill="#fffaf0"/>
    <circle cx="${x + 14}" cy="${y + 21}" r="1.8" fill="#fffaf0"/>`;
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
  const image = images.get(item.speciesId);
  if (!image) throw new Error(`Missing embedded illustration for ${item.speciesId}`);
  const radius = 22;
  const number = String(index + 1).padStart(2, "0");
  const centreX = x + cardWidth / 2;
  const innerWidth = cardWidth - cardPadding * 2;
  const altitudeLabel = item.altitude ? `${item.altitude[0]}–${item.altitude[1]} m` : "—";
  // The habitat shares the line with the altitude: give it whatever width is left.
  const habitatRoom = Math.floor((innerWidth - 26 - altitudeLabel.length * 10.5 - 18) / 9.4);
  const habitatLabel = compactLabel(item.habitatTypes[0] ?? "Hàbitat divers", Math.min(30, habitatRoom));
  const seasonLabel = bestMonthsLabel(item);
  const artSize = 160;

  return `
    <g aria-label="${escapeXml(`${item.commonName}, ${item.scientificName}`)}">
      <rect x="${x}" y="${y + 6}" width="${cardWidth}" height="${cardHeight}" rx="${radius}" fill="#6a5e4c" opacity="0.1"/>
      <rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="${radius}" fill="#fffaf0" stroke="#e3d8c2" stroke-width="2"/>
      <rect x="${x + 10}" y="${y + 10}" width="${cardWidth - 20}" height="${cardArtHeight}" rx="${radius - 8}" fill="${colour}" fill-opacity="0.1"/>
      <image href="${image}" x="${centreX - artSize / 2}" y="${y + 16}" width="${artSize}" height="${artSize}" preserveAspectRatio="xMidYMid meet"/>
      <circle cx="${x + 38}" cy="${y + 38}" r="20" fill="${colour}"/>
      <text x="${x + 38}" y="${y + 45}" text-anchor="middle" class="number">${number}</text>
      ${fittedText(centreX, y + cardArtHeight + 48, item.commonName.toLocaleUpperCase("ca"), "common-name", 29, innerWidth, 0.68)}
      ${fittedText(centreX, y + cardArtHeight + 76, item.scientificName, "scientific-name", 20, innerWidth, 0.5)}
      <g aria-label="${escapeXml(`Temporada: ${seasonLabel}`)}">${monthCellsSvg(x + cardPadding, y + cardArtHeight + 92, innerWidth, monthActivity(item))}</g>
      <g aria-label="${escapeXml(`Altitud ${altitudeLabel}`)}">${mountainIconSvg(x + cardPadding, y + cardArtHeight + 131, "#8a5d3f")}<text x="${x + cardPadding + 26}" y="${y + cardArtHeight + 145}" class="card-meta">${escapeXml(altitudeLabel)}</text></g>
      <text x="${x + cardWidth - cardPadding}" y="${y + cardArtHeight + 145}" text-anchor="end" class="card-habitat">${escapeXml(habitatLabel)}</text>
    </g>`;
}

function sectionHeight(items) {
  const rows = Math.ceil(items.length / columns);
  return sectionHeaderHeight + sectionHeaderGap + rows * cardHeight + (rows - 1) * rowGap + sectionGap;
}

/**
 * One edibility group on a full-width band: pale tints for the edible groups,
 * a solid band for the most toxic, so danger reads from across a room.
 */
function sectionSvg(group, items, startIndex, y, images, bandBottom) {
  const rows = Math.ceil(items.length / columns);
  const right = width - margin;
  const edible = ["excellent", "edible", "conditional"].includes(group.id);
  const solid = group.id === "danger";
  const badgeWidth = 104 + group.title.length * 23;
  const badgeFill = solid ? "#fffaf0" : group.colour;
  const badgeInk = solid ? group.colour : "#fffaf0";
  const bandTop = y - 26;
  let markup = `
    <g>
      <rect x="0" y="${bandTop}" width="${width}" height="${bandBottom - bandTop}" fill="${group.colour}"${solid ? "" : ` fill-opacity="0.09"`}/>
      <rect x="${margin}" y="${y}" width="${badgeWidth}" height="54" rx="14" fill="${badgeFill}"/>
      ${edible ? forkIconSvg(margin + 26, y + 14, badgeInk) : warningIconSvg(margin + 24, y + 14, badgeInk)}
      <text x="${margin + 76}" y="${y + 38}" class="section-title" style="fill:${badgeInk}">${escapeXml(group.title)}</text>
      <text x="${right}" y="${y + 38}" text-anchor="end" class="section-count"${solid ? ` style="fill:#fffaf0"` : ""}>${items.length} ESPÈCIES</text>
      <line x1="${margin + badgeWidth + 24}" y1="${y + 27}" x2="${right - 230}" y2="${y + 27}" stroke="${solid ? "#fffaf0" : group.colour}" stroke-opacity="0.3" stroke-width="2"/>
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

  return { markup, height: sectionHeight(items) };
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

  let sectionY = sectionsTop;
  let globalIndex = 0;
  let sections = "";

  for (const [groupIndex, group] of orderedGroups.entries()) {
    // Bands meet edge to edge; the last one runs down to the footer.
    const bandBottom = groupIndex === orderedGroups.length - 1
      ? footerTop
      : sectionY + sectionHeight(group.items) - 26;
    const section = sectionSvg(group, group.items, globalIndex, sectionY, images, bandBottom);
    sections += section.markup;
    sectionY += section.height;
    globalIndex += group.items.length;
  }

  if (sectionY > footerTop - 20) {
    throw new Error(`Poster content overflows into the footer at y=${sectionY}`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description">
  <title id="title">Bolets de Catalunya — catàleg visual de ${species.length} espècies</title>
  <desc id="description">Infografia de Bolets Atles amb il·lustracions, noms catalans i noms científics, agrupats per comestibilitat. No és una guia d’identificació.</desc>
  <style>
    text { fill: #3b3b3b; font-family: "Avenir Next", Avenir, Arial, sans-serif; }
    .eyebrow { fill: #f2a766; font-size: 28px; font-weight: 800; letter-spacing: 7px; }
    .title { fill: #fbf6ea; font-size: 150px; font-weight: 900; letter-spacing: -6px; }
    .subtitle { fill: #dfe5d6; font-size: 34px; font-weight: 500; }
    .section-title { fill: #fffaf0; font-size: 32px; font-weight: 900; letter-spacing: 1.4px; }
    .section-count { fill: #706d66; font-size: 24px; font-weight: 800; letter-spacing: 2px; }
    .number { fill: #fffaf0; font-size: 19px; font-weight: 900; letter-spacing: 0.5px; }
    .common-name { fill: #1f1f1f; font-size: 29px; font-weight: 900; letter-spacing: -0.5px; }
    .scientific-name { fill: #2f5f7a; font-size: 20px; font-weight: 700; font-style: italic; }
    .card-habitat { fill: #4e574d; font-size: 17px; font-weight: 750; }
    .card-meta { fill: #8a5d3f; font-size: 17px; font-weight: 850; letter-spacing: 0.3px; }
    .month-initial { font-size: 14px; font-weight: 800; }
    .legend { fill: #c7d0ba; font-size: 21px; font-weight: 650; }
    .footer-kicker { fill: #f2a766; font-size: 25px; font-weight: 900; letter-spacing: 3px; }
    .footer-copy { fill: #fff7e8; font-size: 26px; font-weight: 650; }
    .footer-meta { fill: #c7d0ba; font-size: 21px; font-weight: 550; }
  </style>
  <rect width="${width}" height="${height}" fill="#f2ebd5"/>
  <rect width="${width}" height="570" fill="#34483a"/>
  <ellipse cx="2640" cy="548" rx="760" ry="34" fill="#26352b"/>
  ${mastheadCluster.map(([speciesId, x, y, size]) => `<image href="${images.get(speciesId)}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>`).join("")}
  ${mushroomMark(margin, 108, 1.28)}
  <text x="${margin + 150}" y="150" class="eyebrow">BOLETS ATLES · CATALUNYA</text>
  <text x="${margin}" y="342" class="title">BOLETS DE CATALUNYA</text>
  <text x="${margin}" y="410" class="subtitle">${species.length} espècies · noms · temporada · hàbitat i altitud</text>
  <g aria-label="Llegenda de les targetes" transform="translate(${margin} 462)">
    ${monthCellsSvg(0, 0, 300, { gen: "inactive", feb: "inactive", mar: "inactive", abr: "inactive", mai: "inactive", jun: "inactive", jul: "inactive", ago: "moderate", set: "good", oct: "peak", nov: "peak", des: "moderate" })}
    <text x="316" y="20" class="legend">temporada (pic en vermell)</text>
    ${mountainIconSvg(640, 5, "#f2a766")}
    <text x="666" y="20" class="legend">altitud · hàbitat</text>
  </g>
  <g transform="translate(0 570)">
    <rect width="${width}" height="76" fill="#bd592a"/>
    <circle cx="${margin + 22}" cy="38" r="20" fill="#fffaf0"/>
    <text x="${margin + 22}" y="48" text-anchor="middle" style="fill:#bd592a;font-size:28px;font-weight:900">!</text>
    <text x="${margin + 62}" y="48" style="fill:#fffaf0;font-size:27px;font-weight:850;letter-spacing:1px">MAI IDENTIFIQUEU NI CONSUMIU UN BOLET NOMÉS A PARTIR D’UNA FOTOGRAFIA O D’UNA IL·LUSTRACIÓ.</text>
  </g>
  ${sections}
  <g transform="translate(0 ${footerTop})">
    <rect width="${width}" height="379" fill="#3b3b3b"/>
    <rect width="${width}" height="12" fill="#f28a2e"/>
    ${mushroomMark(margin, 72, 0.92)}
    <text x="${margin + 116}" y="105" class="footer-kicker">SEGURETAT ABANS DE TOT</text>
    <text x="${margin + 116}" y="157" class="footer-copy">No consumiu cap bolet si no n’heu confirmat la identificació</text>
    <text x="${margin + 116}" y="199" class="footer-copy">amb una persona experta.</text>
    <text x="${width - margin}" y="108" text-anchor="end" class="footer-kicker">BOLETS.APP/BOLETS</text>
    <text x="${width - margin}" y="158" text-anchor="end" class="footer-meta">Fitxes, confusions, temporada i hàbitat</text>
    <text x="${width - margin}" y="199" text-anchor="end" class="footer-meta">Il·lustracions: Bolets Atles, generades amb IA</text>
    <line x1="${margin}" y1="256" x2="${width - margin}" y2="256" stroke="#67645f" stroke-width="2"/>
    <text x="${margin}" y="307" class="footer-meta">Infografia generada a partir del catàleg versionat de Bolets Atles.</text>
    <text x="${width - margin}" y="307" text-anchor="end" class="footer-meta">Les il·lustracions no substitueixen la fitxa ni la comprovació experta.</text>
  </g>
</svg>`;
}

function buildCredits(species) {
  return [
    "BOLETS DE CATALUNYA — CRÈDITS DE LA INFOGRAFIA",
    "",
    "Infografia: Bolets Atles · https://bolets.app/bolets/infografia",
    `Espècies: ${species.length}, generades a partir del catàleg versionat de Bolets Atles.`,
    "",
    "Il·lustracions: família d'icones pròpia de Bolets Atles, generada amb IA (Magnific, setembre de 2026)",
    "a partir d'indicacions escrites per a cada espècie. Són esquemàtiques: no reprodueixen cap exemplar",
    "concret i no serveixen per identificar un bolet.",
    "",
    "Temporada, hàbitat i altitud: fitxes de cada espècie a https://bolets.app/bolets.",
    "",
  ].join("\n");
}

/**
 * Print-ready A3 PDF with vector text, rendered by Chromium from the same SVG.
 * The SVG is inlined into the document so Chromium embeds the fonts instead of
 * rasterising the sheet.
 */
async function renderPdf(svg, pdfPath) {
  const html = `<!doctype html>
<html lang="ca">
<head>
<meta charset="utf-8">
<title>Bolets de Catalunya · infografia de les espècies del catàleg</title>
<style>
  @page { size: ${width / 300 * 25.4}mm ${height / 300 * 25.4}mm; margin: 0; }
  html, body { margin: 0; padding: 0; }
  svg { display: block; width: ${width / 300 * 25.4}mm; height: ${height / 300 * 25.4}mm; }
</style>
</head>
<body>${svg}</body>
</html>`;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.pdf({
      path: pdfPath,
      preferCSSPageSize: true,
      printBackground: true,
      tagged: false,
    });
  } finally {
    await browser.close();
  }
}

async function main() {
  const species = readSpecies(projectRoot);
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
  const sitePdfPath = path.join(siteDownloadDirectory, "bolets-catalunya-infografia.pdf");
  const siteCreditsPath = path.join(siteDownloadDirectory, "bolets-catalunya-infografia-credits.txt");
  const creditText = buildCredits(species);

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
  await renderPdf(svg, sitePdfPath);

  process.stdout.write(
    `${JSON.stringify({ species: species.length, svgPath, pngPath, previewPath, creditsPath, siteMediaPath, siteDownloadPath, sitePdfPath, siteCreditsPath }, null, 2)}\n`,
  );
}

await main();
