import { InstagramPromoBrand, promoPalette as palette, promoFontFamily as fontFamily } from "../InstagramPromoFrame";
import type { ReactNode, CSSProperties } from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { guide, stock, captures } from "./assets";
// --- Single posts (1080 × 1350 stills) ------------------------------------------
// Conversation-first formats drawn from the competitor review: a quiz, the
// cut-or-pull debate, the three-names series, the community intake, the Friday
// map, the species of the week and the season diary.

function PostBrand({ dark = false, index }: { dark?: boolean; index?: string }) {
  return (
    <div style={{ position: "absolute", top: 58, left: 58, right: 58, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <InstagramPromoBrand dark={dark} />
      {index ? <span style={{ color: dark ? palette.clay : palette.orangeLight, fontSize: 23, fontWeight: 900, letterSpacing: "0.12em" }}>{index}</span> : null}
    </div>
  );
}

function PhotoPost({ photo, position = "center", eyebrow, title, subline, titleSize = 96, children }: { photo: string; position?: string; eyebrow: string; title: string; subline?: string; titleSize?: number; children?: ReactNode }) {
  return (
    <AbsoluteFill style={{ background: palette.forestDeep, color: palette.cream, fontFamily }}>
      <Img src={staticFile(photo)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: position }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(9,23,15,0.4) 0%, rgba(9,23,15,0.05) 32%, rgba(9,23,15,0.2) 60%, rgba(9,23,15,0.92) 100%)" }} />
      {children}
      <PostBrand />
      <div style={{ position: "absolute", left: 58, right: 58, bottom: 74 }}>
        <div style={{ color: palette.orangeLight, fontSize: 24, fontWeight: 900, letterSpacing: "0.15em" }}>{eyebrow}</div>
        <div style={{ marginTop: 18, fontSize: titleSize, fontWeight: 900, letterSpacing: "-0.055em", lineHeight: 0.94, textShadow: "0 6px 30px rgba(0,0,0,0.4)" }}>{title}</div>
        {subline ? <div style={{ marginTop: 26, maxWidth: 900, color: "rgba(244, 236, 215, 0.88)", fontSize: 32, fontWeight: 650, lineHeight: 1.3 }}>{subline}</div> : null}
      </div>
    </AbsoluteFill>
  );
}

export function InstagramSingleQuiz() {
  return (
    <PhotoPost photo={guide.cep} position="center 40%" eyebrow="QUIN BOLET ÉS?" title="Reconeixes aquest bolet?" subline="Pista: porus, no làmines. Resposta demà al primer comentari.">
      <div style={{ position: "absolute", left: 0, right: 0, top: 300, height: 330, background: palette.orange, opacity: 0.96, display: "flex", alignItems: "center", justifyContent: "center", color: palette.forestDeep, fontFamily, fontSize: 250, fontWeight: 900, letterSpacing: "-0.06em" }}>?</div>
    </PhotoPost>
  );
}

export function InstagramSingleDebate() {
  return (
    <PhotoPost photo={stock.coverFloor} position="center 60%" eyebrow="EL DEBAT DE CADA TEMPORADA" title="Tallar o arrencar?" titleSize={124} subline="Què diu l’evidència després de tres dècades de seguiment? La resposta, al peu." />
  );
}

export function InstagramSingleNames() {
  return (
    <AbsoluteFill style={{ background: palette.forestDeep, color: palette.cream, fontFamily }}>
      <Img src={staticFile(guide.rovello)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 55%" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(9,23,15,0.45) 0%, rgba(9,23,15,0.15) 30%, rgba(9,23,15,0.94) 100%)" }} />
      <PostBrand />
      <div style={{ position: "absolute", left: 58, right: 58, bottom: 74 }}>
        <div style={{ color: palette.orangeLight, fontSize: 24, fontWeight: 900, letterSpacing: "0.15em" }}>TRES NOMS, UN BOLET</div>
        <div style={{ marginTop: 16, fontSize: 150, fontWeight: 900, letterSpacing: "-0.06em", lineHeight: 0.9 }}>Rovelló</div>
        <div style={{ marginTop: 14, color: palette.orangeLight, fontSize: 96, fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 0.95 }}>Níscalo</div>
        <div style={{ marginTop: 18, fontSize: 44, fontWeight: 650, fontStyle: "italic", color: "rgba(244, 236, 215, 0.9)" }}>Lactarius sanguifluus</div>
        <div style={{ marginTop: 30, maxWidth: 900, color: "rgba(244, 236, 215, 0.8)", fontSize: 28, fontWeight: 650, lineHeight: 1.3 }}>El pinetell és una altra espècie, Lactarius deliciosus. Tots els noms, en català i castellà, a la guia.</div>
      </div>
    </AbsoluteFill>
  );
}

function CardPost({ tone, eyebrow, title, body, footer, index, children }: { tone: "cream" | "forest" | "clay"; eyebrow: string; title: string; body?: string; footer?: string; index?: string; children?: ReactNode }) {
  const dark = tone === "cream";
  const background = tone === "cream" ? palette.cream : tone === "clay" ? palette.clay : palette.forest;
  const foreground = dark ? palette.ink : palette.cream;
  const secondary = dark ? "#63645d" : "rgba(244, 236, 215, 0.84)";
  const accent = dark ? palette.clay : palette.orangeLight;
  return (
    <AbsoluteFill style={{ background, color: foreground, padding: "58px 58px 62px", fontFamily }}>
      <div style={{ position: "absolute", inset: 24, border: `1px solid ${dark ? "rgba(20, 39, 28, 0.20)" : "rgba(244, 236, 215, 0.24)"}`, borderRadius: 28 }} />
      <PostBrand dark={dark} index={index} />
      <div style={{ position: "relative", paddingTop: 90 }}>
        <div style={{ color: accent, fontSize: 23, fontWeight: 900, letterSpacing: "0.14em" }}>{eyebrow}</div>
        <div style={{ maxWidth: 940, marginTop: 18, fontSize: title.length > 40 ? 66 : 78, fontWeight: 900, letterSpacing: "-0.052em", lineHeight: 0.96 }}>{title}</div>
        {body ? <div style={{ maxWidth: 900, marginTop: 22, color: secondary, fontSize: 28, fontWeight: 620, lineHeight: 1.34 }}>{body}</div> : null}
        <div style={{ marginTop: 36 }}>{children}</div>
      </div>
      {footer ? <div style={{ position: "absolute", left: 58, right: 58, bottom: 58, display: "flex", justifyContent: "space-between", alignItems: "center", color: secondary, fontSize: 22 }}><span>{footer}</span><span style={{ color: foreground, fontWeight: 900 }}>bolets.app</span></div> : null}
    </AbsoluteFill>
  );
}

const cardWindow: CSSProperties = { position: "relative", overflow: "hidden", borderRadius: 28, border: `2px solid ${palette.cream}`, background: palette.creamSoft, boxShadow: "0 24px 60px rgba(0, 0, 0, 0.28)" };

export function InstagramSingleReality() {
  return (
    <CardPost tone="forest" eyebrow="ENVIA’NS LA TEVA TROBALLA" title="Realitat vs mapa." body="Comarca, data i foto, mai el punt exacte. Publiquem la teva troballa al costat de la lectura que feia el mapa aquell dia." footer="Envia-la per missatge directe">
      <div style={{ display: "flex", gap: 22 }}>
        <div style={{ ...cardWindow, flex: 1, height: 620 }}>
          <Img src={staticFile(captures.windowRipolles)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 100%" }} />
          <div style={{ position: "absolute", left: 18, top: 18, padding: "10px 16px", borderRadius: 999, background: palette.orange, color: palette.forestDeep, fontSize: 22, fontWeight: 900 }}>EL MAPA · 4 SET · 46/100</div>
        </div>
        <div style={{ flex: 1, height: 620, borderRadius: 28, border: "3px dashed rgba(244, 236, 215, 0.55)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, color: "rgba(244, 236, 215, 0.9)", textAlign: "center", padding: 30 }}>
          <div style={{ width: 96, height: 96, borderRadius: 999, background: palette.orange }} />
          <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: "-0.03em" }}>La teva foto</div>
          <div style={{ fontSize: 26, fontWeight: 650, lineHeight: 1.3 }}>Comarca i data.<br />Sense coordenades.</div>
        </div>
      </div>
    </CardPost>
  );
}

function MapCallout({ x, y, label, value }: { x: number; y: number; label: string; value: string }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", gap: 10, transform: "translate(-12px, -50%)" }}>
      <div style={{ width: 24, height: 24, borderRadius: 999, background: palette.orange, border: "4px solid rgba(255,255,255,0.9)", boxShadow: "0 4px 14px rgba(0,0,0,0.4)" }} />
      <div style={{ padding: "8px 14px", borderRadius: 999, background: "rgba(12, 28, 18, 0.86)", color: palette.cream, fontSize: 22, fontWeight: 900, whiteSpace: "nowrap", boxShadow: "0 8px 20px rgba(0,0,0,0.35)" }}>{label} <span style={{ color: palette.orangeLight }}>{value}</span></div>
    </div>
  );
}

export function InstagramSingleWeekend() {
  return (
    <CardPost tone="cream" eyebrow="DIVENDRES 4 DE SETEMBRE · CEP" title="Aquest cap de setmana, on val la pena mirar?" footer="Lectura del 4 de setembre · bolets.app/map">
      <div style={{ ...cardWindow, height: 820 }}>
        <Img src={staticFile(captures.cataloniaStart)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 42%" }} />
        <MapCallout x={200} y={92} label="Val d’Aran" value="mosaic verd" />
        <MapCallout x={505} y={212} label="Cerdanya" value="9/100" />
        <MapCallout x={660} y={236} label="Ripollès" value="46/100" />
      </div>
    </CardPost>
  );
}

export function InstagramSingleSpecies() {
  const cues = [["Barret", "Convex de jove, després ample; bru castany amb marge més clar."], ["Himeni", "Porus blancs, grocs i finalment olivacis; mai làmines."], ["Peu", "Gruixut, clar, sovint amb reticle blanc a la part superior."]];
  return (
    <AbsoluteFill style={{ background: palette.cream, color: palette.ink, fontFamily }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 630, overflow: "hidden" }}>
        <Img src={staticFile(guide.cep)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 45%" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(9,23,15,0.45) 0%, rgba(9,23,15,0) 40%)" }} />
      </div>
      <PostBrand />
      <div style={{ position: "absolute", top: 664, left: 58, right: 58 }}>
        <div style={{ color: palette.clay, fontSize: 23, fontWeight: 900, letterSpacing: "0.14em" }}>ESPÈCIE DE LA SETMANA</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 8 }}>
          <span style={{ fontSize: 96, fontWeight: 900, letterSpacing: "-0.055em", lineHeight: 1 }}>Cep</span>
          <span style={{ fontSize: 34, fontStyle: "italic", color: "#63645d" }}>Boletus edulis</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 26 }}>
          {cues.map(([name, text]) => (
            <div key={name} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <span style={{ flex: "0 0 150px", color: palette.clay, fontSize: 24, fontWeight: 900, letterSpacing: "0.08em", paddingTop: 4 }}>{name.toUpperCase()}</span>
              <span style={{ fontSize: 27, fontWeight: 650, lineHeight: 1.3, color: "#3a3a36" }}>{text}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 26, padding: "16px 20px", borderRadius: 18, background: "rgba(122, 69, 47, 0.10)", color: palette.clay, fontSize: 24, fontWeight: 800 }}>Confusions: mataparent (amarg), cep d’estiu i matagent (tòxic). Compara-les a la fitxa.</div>
      </div>
      <div style={{ position: "absolute", left: 58, right: 58, bottom: 40, display: "flex", justifyContent: "space-between", color: "#63645d", fontSize: 22 }}><span>Fitxa completa a la guia</span><span style={{ color: palette.ink, fontWeight: 900 }}>bolets.app/bolets</span></div>
    </AbsoluteFill>
  );
}

export function InstagramSingleSeason() {
  return (
    <CardPost tone="forest" eyebrow="DIARI DE TEMPORADA · 4 DE SETEMBRE" title="La temporada 2026 comença així." body="Sec a gairebé tot el país: sectors taronja, olives al Ripollès i un mosaic verd a la Val d’Aran. Cada mes, una foto del mapa del cep." footer="bolets.app/bolets-avui" index="1">
      <div style={{ ...cardWindow, height: 560 }}>
        <Img src={staticFile(captures.cepPirineus)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 62%" }} />
        <div style={{ position: "absolute", left: 18, bottom: 18, padding: "10px 16px", borderRadius: 999, background: palette.orange, color: palette.forestDeep, fontSize: 22, fontWeight: 900 }}>PIRINEU · CEP · 4 SET</div>
      </div>
    </CardPost>
  );
}

// --- Stories (1080 × 1920 stills; keep key text inside the 250 px safe zones) ----

function StoryCallout({ text, top }: { text: string; top: number }) {
  return (
    <div style={{ position: "absolute", top, left: 36, maxWidth: 820, padding: "22px 30px", borderRadius: 26, background: "rgba(255, 249, 236, 0.94)", color: palette.forest, fontFamily, fontSize: text.length > 30 ? 56 : 64, fontWeight: 900, letterSpacing: "-0.045em", lineHeight: 1.02, boxShadow: "0 14px 40px rgba(0, 0, 0, 0.18)" }}>
      {text}
    </div>
  );
}

function StoryFrame({ children, background = palette.forestDeep }: { children: ReactNode; background?: string }) {
  return (
    <AbsoluteFill style={{ background, fontFamily, color: palette.cream }}>
      <div style={{ position: "absolute", top: 268, left: 60 }}><InstagramPromoBrand /></div>
      {children}
      <div style={{ position: "absolute", left: 60, right: 60, bottom: 250, display: "flex", justifyContent: "space-between", color: "rgba(244, 236, 215, 0.72)", fontSize: 24 }}>
        <span>Bolets Atles · Catalunya</span><span style={{ color: palette.cream, fontWeight: 900 }}>@bolets.app</span>
      </div>
    </AbsoluteFill>
  );
}

function StoryScreen({ src, question, cta, hint }: { src: string; question: string; cta: string; hint?: string }) {
  return (
    <StoryFrame>
      <div style={{ position: "absolute", top: 350, left: 90, width: 900, height: 1120, overflow: "hidden", borderRadius: 40, border: "2px solid rgba(244, 236, 215, 0.35)", background: palette.creamSoft, boxShadow: "0 30px 80px rgba(0, 0, 0, 0.45)" }}>
        <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
        <StoryCallout text={question} top={150} />
      </div>
      <div style={{ position: "absolute", top: 1510, left: 90, right: 90, display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ padding: "18px 30px", borderRadius: 999, background: palette.orange, color: palette.forestDeep, fontSize: 30, fontWeight: 900 }}>{cta}</div>
        {hint ? <span style={{ color: "rgba(244, 236, 215, 0.82)", fontSize: 26, fontWeight: 650 }}>{hint}</span> : null}
      </div>
    </StoryFrame>
  );
}

export function InstagramMapStoryWhere() {
  return <StoryScreen src={captures.cataloniaStart} question="On miraries avui?" cta="Obre el mapa ↑" hint="enllaç a l’adhesiu" />;
}

export function InstagramMapStoryEvolution() {
  return <StoryScreen src={captures.evolutionEnd} question="Avui no és ahir." cta="Bolets avui ↑" hint="evolució −3 → +5 dies" />;
}

export function InstagramMapStoryChecklist() {
  const items = ["L’espècie: cada bolet respon diferent.", "La intensitat: compara el mateix dia.", "L’extensió: un senyal ampli pesa més."];
  return (
    <StoryFrame background={palette.forest}>
      <div style={{ position: "absolute", top: 380, left: 90, width: 900 }}>
        <div style={{ color: palette.orangeLight, fontSize: 27, fontWeight: 900, letterSpacing: "0.15em" }}>ABANS D’ANAR AL BOSC</div>
        <div style={{ marginTop: 22, fontSize: 96, fontWeight: 900, letterSpacing: "-0.06em", lineHeight: 0.92 }}>Mira aquestes<br />3 coses.</div>
        <div style={{ marginTop: 56, display: "flex", flexDirection: "column", gap: 26 }}>
          {items.map((item, index) => (
            <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 22, padding: "26px 30px", borderRadius: 26, background: "rgba(244, 236, 215, 0.10)", fontSize: 36, fontWeight: 750, lineHeight: 1.18 }}>
              <span style={{ flex: "0 0 auto", width: 54, height: 54, borderRadius: 999, background: palette.orange, color: palette.forestDeep, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 900 }}>{index + 1}</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", top: 1240, left: 90, width: 900, height: 250, overflow: "hidden", borderRadius: 30, border: "2px solid rgba(244, 236, 215, 0.35)" }}>
        <Img src={staticFile(captures.pirineus)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 60%" }} />
      </div>
      <div style={{ position: "absolute", top: 1520, left: 90, padding: "18px 30px", borderRadius: 999, background: palette.orange, color: palette.forestDeep, fontSize: 30, fontWeight: 900 }}>Desa-ho per dissabte</div>
    </StoryFrame>
  );
}

export function InstagramMapStoryTeaser() {
  return (
    <AbsoluteFill style={{ background: palette.forestDeep, fontFamily, color: palette.cream }}>
      <Img src={staticFile(stock.photoBasket)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 45%" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(9,23,15,0.55) 0%, rgba(9,23,15,0.10) 35%, rgba(9,23,15,0.90) 100%)" }} />
      <div style={{ position: "absolute", top: 268, left: 60 }}><InstagramPromoBrand /></div>
      <div style={{ position: "absolute", left: 90, right: 90, bottom: 360 }}>
        <div style={{ color: palette.orangeLight, fontSize: 27, fontWeight: 900, letterSpacing: "0.15em" }}>NOU REEL AL PERFIL</div>
        <div style={{ marginTop: 22, fontSize: 108, fontWeight: 900, letterSpacing: "-0.06em", lineHeight: 0.9, textShadow: "0 6px 30px rgba(0,0,0,0.4)" }}>On miraries<br />avui?</div>
        <div style={{ marginTop: 40, color: "rgba(244, 236, 215, 0.88)", fontSize: 34, fontWeight: 650, lineHeight: 1.3 }}>Dos boscos poden semblar iguals. Les condicions d’avui, no. Mira com es compara el senyal al mapa.</div>
        <div style={{ display: "inline-flex", marginTop: 46, padding: "18px 30px", borderRadius: 999, background: palette.orange, color: palette.forestDeep, fontSize: 30, fontWeight: 900 }}>Mira’l al perfil → @bolets.app</div>
      </div>
    </AbsoluteFill>
  );
}
