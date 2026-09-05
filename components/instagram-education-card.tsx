import { InstagramFieldDiagram } from "@/components/instagram-field-diagram";
import { BrandMark } from "@/components/brand-mark";
import { InstagramCover } from "@/components/instagram-cover";
import { InstagramEditorialMotif } from "@/components/instagram-editorial-motif";
import { educationCovers } from "@/src/lib/instagram-editorial-covers";
import { instagramEducationTopic, type InstagramEducationTopicId, type InstagramEducationSlide } from "@/src/lib/instagram-education";
import { INSTAGRAM_FONT_FAMILY, instagramPalette as p, instagramType as t } from "@/src/lib/instagram-design";
import type { DailyShareCard } from "@/src/lib/daily-share-cards";

const percent = (value: number) => `${Math.round(value * 100)}%`;
const dateFormat = new Intl.DateTimeFormat("ca-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Madrid" });

function ReadingExample({ card }: { card: DailyShareCard }) {
  const reading = card.readings[0];
  if (!reading) return null;
  return <div style={{ display: "flex", flexDirection: "column", width: "100%", padding: "34px 36px", background: p.forest, color: p.cream, gap: 18 }}>
    <span style={{ fontSize: t.label, color: p.orangeLight, fontWeight: 800 }}>EXEMPLE · {reading.regionName}</span>
    <span style={{ fontSize: 44, fontWeight: 900 }}>{reading.speciesName}</span>
    <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}><span style={{ fontSize: 128, lineHeight: 1, fontWeight: 900 }}>{reading.score}</span><span style={{ fontSize: 30 }}>millor sector /100</span></div>
    <span style={{ fontSize: t.body }}>{percent(reading.positiveCellShare)} de sectors amb senyal positiu.</span>
    <span style={{ fontSize: 28 }}>{percent(reading.score20CellShare)} arriben a 20/100 o més.</span>
  </div>;
}

export function InstagramEducationCard({ card, topicId, slide }: { card: DailyShareCard; topicId: InstagramEducationTopicId; slide: number }) {
  const topic = instagramEducationTopic(topicId);
  const current = Math.min(Math.max(slide, 1), topic.slides.length);
  const copy: InstagramEducationSlide = topic.slides[current - 1];
  const cover = educationCovers[topicId];
  if (current === 1) return <InstagramCover brief={cover} draft={card.isPreview} visual={topic.source ? <InstagramFieldDiagram topicId={topicId} light={cover.tone === "forest"} /> : undefined} footer="Guia · Desplaça per entendre-ho · 1/5" />;
  const light = current === 5;
  const foreground = light ? p.cream : p.forest;
  return <div style={{ display: "flex", flexDirection: "column", position: "relative", width: 1080, height: 1350, padding: "58px", background: light ? p.forest : p.cream, color: foreground, fontFamily: INSTAGRAM_FONT_FAMILY }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}><BrandMark size={44} /><span style={{ fontSize: t.label, fontWeight: 900 }}>bolets.app</span></div>
      <span style={{ fontSize: t.small }}>{card.isPreview ? "MOSTRA · " : ""}{current}/5</span>
    </div>
    <div style={{ display: "flex", flexDirection: "column", marginTop: 62 }}>
      <span style={{ fontSize: t.label, color: light ? p.orangeLight : p.clay, fontWeight: 800 }}>{copy.eyebrow}</span>
      <span style={{ fontSize: copy.title.length > 55 ? 62 : t.heading, fontWeight: 900, letterSpacing: "-0.045em", lineHeight: 1.03, marginTop: 20 }}>{copy.title}</span>
      <span style={{ fontSize: t.body, lineHeight: 1.35, marginTop: 30 }}>{copy.body}</span>
    </div>
    <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", minHeight: 380 }}>
      {copy.points ? <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: 18 }}>{topic.source && (current === 2 || (topicId === "field-underside" && current === 3)) ? <div style={{ display: "flex", marginBottom: 24 }}><InstagramFieldDiagram topicId={topicId} slide={current} light={light} /></div> : null}{copy.points.map((point, index) => <div key={point.label} style={{ display: "flex", gap: 26, padding: "32px", background: light ? p.moss : p.creamSoft, borderLeft: `10px solid ${p.orange}` }}><span style={{ fontSize: 42, fontWeight: 900, color: light ? p.orangeLight : p.clay }}>0{index + 1}</span><div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}><span style={{ fontSize: 38, fontWeight: 900 }}>{point.label}</span><span style={{ fontSize: 32, lineHeight: 1.25 }}>{point.detail}</span></div></div>)}</div> : copy.visual ? <ReadingExample card={card} /> : current === 5 ? <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <span style={{ fontSize: 104, fontWeight: 900, letterSpacing: "-0.06em", color: p.orangeLight }}>bolets.app</span>
        <span style={{ fontSize: t.body }}>La lectura completa, a l’enllaç del perfil.</span>
      </div> : <InstagramEditorialMotif motif={cover.motif} light={light} />}
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: `2px solid ${light ? p.moss : "#d3cfba"}`, paddingTop: 22 }}>
      {copy.visual && card.observedAt ? <span style={{ fontSize: t.small }}>Lectura del {dateFormat.format(new Date(card.observedAt))}</span> : null}
      {topic.source ? <span style={{ fontSize: 20 }}>Font: {topic.source.label} · Fonts completes al peu del post.</span> : null}
      <span style={{ fontSize: t.small }}>{topic.source ? "Pauta d’observació. No confirma identificació ni comestibilitat." : "Condicions, no presència. Una lectura no identifica bolets."}</span>
    </div>
  </div>;
}
