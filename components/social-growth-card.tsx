import { BrandMark } from "@/components/brand-mark";
import type { DailyShareCard } from "@/src/lib/daily-share-cards";
import {
  pinnedInstagramPost,
  type PinnedInstagramSeries,
} from "@/src/lib/instagram-pinned-posts";
import { getSuitabilityBand } from "@/src/lib/suitability-scale";

export type SocialGrowthSeries = "education" | "weekend";

const slideCopy = {
  education: [
    {
      eyebrow: "Com llegir la predicció",
      title: "Què vol dir el número d’avui?",
      body: "És una lectura de condicions per a la fructificació. No és un recompte de bolets ni una promesa de trobar-ne.",
    },
    {
      eyebrow: "Pas 1 · la intensitat",
      title: "0–100 mesura condicions, no presència",
      body: "Com més alt és el valor, més favorables són les condicions ambientals i l’hàbitat compatible del sector.",
    },
    {
      eyebrow: "Pas 2 · el context",
      title: "La pluja sola no és suficient",
      body: "La lectura combina disponibilitat d’aigua, temperatura, exposició i compatibilitat ecològica de cada espècie.",
    },
    {
      eyebrow: "Pas 3 · els límits",
      title: "Una lectura territorial no localitza bolets",
      body: "Mostrem sectors amplis. No publiquem punts de recol·lecció ni convertim una predicció en una observació.",
    },
    {
      eyebrow: "Explora amb criteri",
      title: "Compara espècies i zones al mapa",
      body: "Consulta les dades vigents, revisa la cobertura territorial i planifica sempre una sortida responsable.",
    },
  ],
  weekend: [
    {
      eyebrow: "Preparació del cap de setmana",
      title: "Com arriben les condicions?",
      body: "Una lectura breu amb les dades verificades d’avui a Catalunya.",
    },
    {
      eyebrow: "On destaca la lectura",
      title: "Les zones amb millor senyal d’avui",
      body: "Són comparadors territorials amplis: orienten la consulta, però no revelen punts ni confirmen presència.",
    },
    {
      eyebrow: "Mapa general de Catalunya",
      title: "On destaca el senyal d’avui?",
      body: "La mateixa lectura combinada del mapa Avui, sobre el relleu de Catalunya i sense punts de recol·lecció.",
    },
    {
      eyebrow: "Lectura líder d’avui",
      title: "El primer lloc, amb context",
      body: "El màxim és només una part: l’extensió del senyal indica si és aïllat o compartit pel territori.",
    },
    {
      eyebrow: "Abans de sortir",
      title: "Mira extensió, espècie i evolució",
      body: "No et quedis només amb el màxim: comprova quants sectors són favorables i torna a revisar el mapa.",
    },
    {
      eyebrow: "Consulta actualitzada",
      title: "La lectura completa és a bolets.app",
      body: "Respecta el bosc, la normativa local i els límits de recol·lecció.",
    },
  ],
} satisfies Record<SocialGrowthSeries, Array<{ eyebrow: string; title: string; body: string }>>;

export function socialGrowthSlideCount(series: SocialGrowthSeries) {
  return slideCopy[series].length;
}

export function isSocialGrowthSeries(value: string | null): value is SocialGrowthSeries {
  return value === "education" || value === "weekend";
}

export function PinnedInstagramCard({ series }: { series: PinnedInstagramSeries }) {
  const post = pinnedInstagramPost(series);
  const palettes = {
    clay: {
      background: "linear-gradient(145deg, #8f4e2d 0%, #5e3625 54%, #173021 100%)",
      glow: "rgba(255,205,143,0.28)",
      accent: "#ffd09c",
      body: "#f7e4cb",
    },
    forest: {
      background: "linear-gradient(145deg, #0e2619 0%, #173b27 56%, #38513b 100%)",
      glow: "rgba(242,167,102,0.25)",
      accent: "#f2a766",
      body: "#d7dec7",
    },
    sand: {
      background: "linear-gradient(145deg, #e7d6b9 0%, #c6ad83 55%, #896143 100%)",
      glow: "rgba(255,247,232,0.48)",
      accent: "#6b3f25",
      body: "#3f382f",
    },
  } as const;
  const palette = palettes[post.tone];
  const foreground = post.tone === "sand" ? "#173021" : "#fff7e8";
  const rule = post.tone === "sand" ? "rgba(23,48,33,0.20)" : "rgba(255,247,232,0.18)";

  return (
    <div style={{ display: "flex", position: "relative", width: "100%", height: "100%", overflow: "hidden", flexDirection: "column", padding: "58px 58px 66px", color: foreground, background: palette.background, fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", position: "absolute", width: 690, height: 690, right: -285, top: 225, borderRadius: 999, background: `radial-gradient(circle, ${palette.glow}, rgba(255,255,255,0))` }} />
      <div style={{ display: "flex", position: "absolute", right: 48, bottom: 58, color: post.tone === "sand" ? "rgba(23,48,33,0.10)" : "rgba(255,247,232,0.08)", fontSize: 350, lineHeight: 0.8, fontWeight: 900, letterSpacing: "-0.12em" }}>{post.number}</div>
      <div style={{ display: "flex", position: "absolute", inset: 24, border: `1px solid ${rule}`, borderRadius: 28 }} />

      <div style={{ display: "flex", position: "relative", alignItems: "center", justifyContent: "space-between", paddingBottom: 25, borderBottom: `1px solid ${rule}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <BrandMark />
          <span style={{ fontSize: 24, fontWeight: 900, letterSpacing: "0.11em", textTransform: "uppercase" }}>Bolets Atles</span>
        </div>
        <span style={{ color: palette.accent, fontSize: 22, fontWeight: 900 }}>{post.number}/03</span>
      </div>

      <div style={{ display: "flex", position: "relative", flex: 1, flexDirection: "column", justifyContent: "center", paddingBottom: 25 }}>
        <span style={{ color: palette.accent, fontSize: 24, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>{post.eyebrow}</span>
        <span style={{ maxWidth: "94%", marginTop: 20, color: foreground, fontSize: 72, lineHeight: 0.98, fontWeight: 900, letterSpacing: "-0.052em" }}>{post.title}</span>
        <span style={{ maxWidth: "91%", marginTop: 31, color: palette.body, fontSize: 29, lineHeight: 1.34 }}>{post.body}</span>
      </div>

      <div style={{ display: "flex", position: "relative", alignItems: "center", justifyContent: "space-between", paddingTop: 24, borderTop: `1px solid ${rule}`, color: palette.body, fontSize: 21 }}>
        <span>{post.footer}</span>
        <span style={{ color: foreground, fontWeight: 900 }}>bolets.app</span>
      </div>
    </div>
  );
}

function CataloniaOverviewPanel({ mapImageUrl }: { mapImageUrl: string }) {
  return (
    <div style={{ display: "flex", position: "relative", width: "100%", height: 880, marginTop: 36, overflow: "hidden", border: "1px solid rgba(255,247,232,0.28)", borderRadius: 32, background: "#eee9dc", boxShadow: "0 24px 48px rgba(8,24,15,0.24)" }}>
      {/* ImageResponse requires the generated map as a raw data URI. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mapImageUrl} alt="" width="940" height="820" style={{ position: "absolute", inset: 0, width: "100%", height: 820, objectFit: "cover" }} />
      <div style={{ display: "flex", position: "absolute", left: 20, top: 20, padding: "10px 14px", borderRadius: 999, background: "rgba(255,250,240,0.92)", color: "#273c2d", fontSize: 19, fontWeight: 900 }}>El mapa Avui · 2,5 km</div>
      <div style={{ display: "flex", position: "absolute", right: 20, top: 20, padding: "8px 12px", borderRadius: 999, background: "rgba(255,250,240,0.88)", color: "#545a53", fontSize: 17 }}>© ICGC</div>
      <div style={{ display: "flex", position: "absolute", left: 0, right: 0, bottom: 0, height: 94, flexDirection: "column", justifyContent: "center", padding: "13px 22px", borderTop: "1px solid rgba(47,65,42,0.22)", background: "rgba(255,250,240,0.96)" }}>
        <div style={{ display: "flex", width: "100%", height: 13, borderRadius: 999, background: "linear-gradient(90deg, #c95e35 0%, #dd873c 25%, #c5a34a 50%, #88a84f 75%, #4f8a5b 100%)" }} />
        <div style={{ display: "flex", width: "100%", justifyContent: "space-between", marginTop: 8, color: "#626a62", fontSize: 18 }}>
          <span>1 · Molt baixa</span><span>50 · Mitjana</span><span>100 · Molt alta</span>
        </div>
      </div>
    </div>
  );
}

function percentLabel(value: number) {
  return `${Math.round(value * 100)}%`;
}

function TopSpeciesPanel({ card }: { card: DailyShareCard }) {
  const reading = card.readings[0];
  if (!reading) return null;
  const band = getSuitabilityBand(reading.score);
  return (
    <div style={{ display: "flex", width: "100%", marginTop: 48, flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", alignItems: "stretch", gap: 20 }}>
        <div style={{ display: "flex", flex: 1, minHeight: 270, flexDirection: "column", justifyContent: "center", padding: "34px 38px", border: "1px solid rgba(255,247,232,0.22)", borderRadius: 30, background: "rgba(255,247,232,0.08)" }}>
          <span style={{ color: "#f2a766", fontSize: 23, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>Espècie que lidera</span>
          <span style={{ marginTop: 13, color: "#fff7e8", fontSize: 63, lineHeight: 1, fontWeight: 900, letterSpacing: "-0.045em" }}>{reading.speciesName}</span>
          <span style={{ marginTop: 17, color: "#d7dec7", fontSize: 28 }}>{reading.regionName}</span>
        </div>
        <div style={{ display: "flex", width: 260, minHeight: 270, alignItems: "center", justifyContent: "center", flexDirection: "column", border: `2px solid ${band.color}`, borderRadius: 30, background: "rgba(255,247,232,0.08)" }}>
          <span style={{ color: band.color, fontSize: 112, lineHeight: 0.9, fontWeight: 900, letterSpacing: "-0.07em" }}>{reading.score}</span>
          <span style={{ marginTop: 15, color: "#d7dec7", fontSize: 22 }}>millor sector /100</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ display: "flex", flex: 1, flexDirection: "column", padding: "28px 32px", border: "1px solid rgba(255,247,232,0.20)", borderRadius: 26, background: "rgba(255,247,232,0.06)" }}>
          <span style={{ color: "#fff7e8", fontSize: 58, fontWeight: 900 }}>{percentLabel(reading.positiveCellShare)}</span>
          <span style={{ marginTop: 8, color: "#d7dec7", fontSize: 24 }}>sectors amb senyal positiu</span>
        </div>
        <div style={{ display: "flex", flex: 1, flexDirection: "column", padding: "28px 32px", border: "1px solid rgba(255,247,232,0.20)", borderRadius: 26, background: "rgba(255,247,232,0.06)" }}>
          <span style={{ color: "#fff7e8", fontSize: 58, fontWeight: 900 }}>{percentLabel(reading.score20CellShare)}</span>
          <span style={{ marginTop: 8, color: "#d7dec7", fontSize: 24 }}>sectors que arriben a 20+</span>
        </div>
      </div>
      <span style={{ color: "#d7dec7", fontSize: 23 }}>La lectura compara condicions i hàbitat compatible; no confirma presència.</span>
    </div>
  );
}

function ReadingPanel({ card, vertical }: { card: DailyShareCard; vertical: boolean }) {
  const readings = card.readings.slice(0, 3);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: vertical ? 22 : 15, width: "100%" }}>
      {readings.map((reading, index) => {
        const band = getSuitabilityBand(reading.score);
        return (
          <div key={`${reading.regionName}-${reading.speciesName}`} style={{ display: "flex", alignItems: "center", width: "100%", padding: vertical ? "25px 28px" : "18px 22px", border: "1px solid rgba(255,247,232,0.24)", borderRadius: vertical ? 24 : 18, background: "rgba(255,247,232,0.09)" }}>
            <span style={{ display: "flex", width: vertical ? 55 : 42, color: "#f2a766", fontSize: vertical ? 27 : 22, fontWeight: 900 }}>{index + 1}</span>
            <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
              <span style={{ color: "#fff7e8", fontSize: vertical ? 34 : 27, fontWeight: 850 }}>{reading.speciesName}</span>
              <span style={{ color: "#d7dec7", fontSize: vertical ? 25 : 20, marginTop: 5 }}>{reading.regionName}</span>
            </div>
            <span style={{ color: band.color, fontSize: vertical ? 56 : 44, fontWeight: 900 }}>{reading.score}</span>
            <span style={{ color: "#d7dec7", fontSize: vertical ? 23 : 18, marginLeft: 5 }}>/100</span>
          </div>
        );
      })}
    </div>
  );
}

export function SocialGrowthCard({
  card,
  mapImageUrl,
  series,
  slide,
}: {
  card: DailyShareCard;
  mapImageUrl?: string;
  series: SocialGrowthSeries;
  slide: number;
}) {
  const safeSlide = Math.min(Math.max(slide, 1), slideCopy[series].length);
  const copy = slideCopy[series][safeSlide - 1];
  const vertical = series === "weekend";
  const reading = card.readings[0];
  const band = reading ? getSuitabilityBand(reading.score) : null;
  const showReadings = (series === "weekend" && safeSlide === 2)
    || (series === "education" && safeSlide === 1);
  const showOverviewMap = series === "weekend" && safeSlide === 3;
  const showTopSpecies = series === "weekend" && safeSlide === 4;

  return (
    <div style={{ display: "flex", position: "relative", width: "100%", height: "100%", overflow: "hidden", flexDirection: "column", padding: vertical ? "82px 70px 96px" : "58px 58px 66px", color: "#fff7e8", background: "linear-gradient(145deg, #102a1b 0%, #173b27 58%, #4d3927 100%)", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", position: "absolute", width: vertical ? 760 : 620, height: vertical ? 760 : 620, right: vertical ? -310 : -260, top: vertical ? 180 : 110, borderRadius: 999, background: "radial-gradient(circle, rgba(242,167,102,0.25), rgba(242,167,102,0))" }} />
      <div style={{ display: "flex", position: "absolute", inset: vertical ? 30 : 24, border: "1px solid rgba(255,247,232,0.13)", borderRadius: vertical ? 35 : 28 }} />

      <div style={{ display: "flex", position: "relative", alignItems: "center", justifyContent: "space-between", paddingBottom: vertical ? 34 : 25, borderBottom: "1px solid rgba(255,247,232,0.18)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <BrandMark />
          <span style={{ fontSize: vertical ? 28 : 24, fontWeight: 900, letterSpacing: "0.11em", textTransform: "uppercase" }}>Bolets Atles</span>
        </div>
        <span style={{ color: "#d7dec7", fontSize: vertical ? 24 : 20 }}>{safeSlide}/{slideCopy[series].length}</span>
      </div>

      <div style={{ display: "flex", position: "relative", flex: 1, flexDirection: "column", justifyContent: showReadings || showOverviewMap || showTopSpecies ? "flex-start" : "center", paddingTop: showOverviewMap || showTopSpecies ? 62 : vertical ? 115 : 76 }}>
        <span style={{ color: "#f2a766", fontSize: vertical ? 29 : 24, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>{copy.eyebrow}</span>
        <span style={{ maxWidth: "94%", marginTop: vertical ? 25 : 18, color: "#fff7e8", fontSize: showOverviewMap || showTopSpecies ? 70 : vertical ? 82 : 66, lineHeight: 0.98, fontWeight: 900, letterSpacing: "-0.05em" }}>{copy.title}</span>
        <span style={{ maxWidth: "92%", marginTop: showOverviewMap || showTopSpecies ? 25 : vertical ? 35 : 27, color: "#d7dec7", fontSize: showOverviewMap || showTopSpecies ? 29 : vertical ? 35 : 28, lineHeight: 1.32 }}>{copy.body}</span>

        {showReadings ? (
          <div style={{ display: "flex", width: "100%", marginTop: vertical ? 65 : 47 }}>
            <ReadingPanel card={card} vertical={vertical} />
          </div>
        ) : showOverviewMap && mapImageUrl ? (
          <CataloniaOverviewPanel mapImageUrl={mapImageUrl} />
        ) : showTopSpecies ? (
          <TopSpeciesPanel card={card} />
        ) : safeSlide === 2 && series === "education" && reading ? (
          <div style={{ display: "flex", alignItems: "flex-end", marginTop: 60 }}>
            <span style={{ color: band?.color, fontSize: 180, lineHeight: 0.8, fontWeight: 900, letterSpacing: "-0.08em" }}>{reading.score}</span>
            <span style={{ color: "#d7dec7", fontSize: 34, marginLeft: 10 }}>/100 avui</span>
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", position: "relative", alignItems: "center", justifyContent: "space-between", paddingTop: vertical ? 32 : 24, borderTop: "1px solid rgba(255,247,232,0.18)", color: "#d7dec7", fontSize: vertical ? 25 : 21 }}>
        <span>Dades verificades d’avui</span>
        <span style={{ color: "#fff7e8", fontWeight: 900 }}>bolets.app</span>
      </div>
    </div>
  );
}
