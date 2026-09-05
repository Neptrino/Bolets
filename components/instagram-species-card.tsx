import { INSTAGRAM_FONT_FAMILY, instagramPalette } from "@/src/lib/instagram-design";
import { InstagramCover } from "@/components/instagram-cover";
import { BrandMark } from "@/components/brand-mark";
import { getEdibilityPresentation } from "@/src/lib/edibility-presentation";
import type { SpeciesFieldCardProfile } from "@/src/lib/species-field-card";
import type { EdibilityStatus, Month, SeasonalActivity } from "@/src/lib/types";

// Rendered through next/og (Satori): every element with several children needs
// display: flex, sizes are explicit pixels, and the fonts come from
// instagramCardFonts(). The look follows the map-campaign carousels: cream and
// forest panels, clay and orange accents, one photograph first.

export const INSTAGRAM_SPECIES_CARD_WIDTH = 1080;
export const INSTAGRAM_SPECIES_CARD_HEIGHT = 1350;

const fontFamily = INSTAGRAM_FONT_FAMILY;
const tone = instagramPalette;
const PAGE_PADDING_X = 58;
const CONTENT_WIDTH = INSTAGRAM_SPECIES_CARD_WIDTH - PAGE_PADDING_X * 2;

const dangerStatuses = new Set<EdibilityStatus>(["toxic", "dangerously_toxic"]);
const edibleStatuses = new Set<EdibilityStatus>(["excellent_edible", "edible", "edible_with_conditions"]);

const MONTHS: Month[] = ["gen", "feb", "mar", "abr", "mai", "jun", "jul", "ago", "set", "oct", "nov", "des"];
const MONTH_LABELS: Record<Month, string> = {
  gen: "GEN", feb: "FEB", mar: "MAR", abr: "ABR", mai: "MAI", jun: "JUN",
  jul: "JUL", ago: "AGO", set: "SET", oct: "OCT", nov: "NOV", des: "DES",
};

export interface InstagramSpeciesCardProps {
  imageDataUrl: string;
  lookalikeImageDataUrl?: string | null;
  lookalikeCredit?: { attribution: string | null; license: string | null } | null;
  mapUrl?: string;
  profile: SpeciesFieldCardProfile;
  slide: number;
  speciesUrl: string;
}

function edibilityTone(status: EdibilityStatus) {
  if (dangerStatuses.has(status)) return { background: tone.red, color: tone.cream, title: tone.rose };
  if (edibleStatuses.has(status)) return { background: tone.moss, color: tone.cream, title: tone.cream };
  return { background: tone.clay, color: tone.cream, title: tone.orangeLight };
}

function capitalise(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatAltitude([low, high]: [number, number]) {
  return `${low.toLocaleString("ca-ES")}–${high.toLocaleString("ca-ES")} m`;
}

function credit(attribution: string | null, license: string | null) {
  if (!attribution) return null;
  return license ? `${attribution} · ${license}` : attribution;
}

function Brand({ light }: { light?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <BrandMark size={44} />
      <span style={{ color: light ? tone.cream : tone.ink, fontSize: 24, fontWeight: 900, letterSpacing: "0.05em" }}>bolets.app</span>
    </div>
  );
}

function Frame({
  children,
  footerLeft,
  footerRight,
  light,
  slide,
}: {
  children: React.ReactNode;
  footerLeft: string;
  footerRight: string;
  light?: boolean;
  slide: number;
}) {
  const border = light ? "rgba(244,236,215,0.22)" : "rgba(52,52,49,0.16)";
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", flexDirection: "column", padding: `50px ${PAGE_PADDING_X}px 44px`, background: light ? tone.forest : tone.cream, color: light ? tone.cream : tone.ink, fontFamily }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 24, borderBottom: `1px solid ${border}` }}>
        <Brand light={light} />
        <span style={{ color: light ? tone.orangeLight : tone.clay, fontSize: 23, fontWeight: 900 }}>{slide}/5</span>
      </div>
      <div style={{ display: "flex", flex: 1, flexDirection: "column", paddingTop: 34 }}>{children}</div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 24, paddingTop: 22, borderTop: `1px solid ${border}` }}>
        <span style={{ maxWidth: 640, color: light ? "rgba(244,236,215,0.72)" : tone.muted, fontSize: 19, lineHeight: 1.3 }}>{footerLeft}</span>
        <span style={{ flexShrink: 0, color: light ? tone.cream : tone.ink, fontSize: 22, fontWeight: 900 }}>{footerRight}</span>
      </div>
    </div>
  );
}

function Eyebrow({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return <span style={{ color: light ? tone.orangeLight : tone.clay, fontSize: 22, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>{children}</span>;
}

function Title({ children, color, light, size = 68 }: { children: React.ReactNode; color?: string; light?: boolean; size?: number }) {
  return <span style={{ marginTop: 14, color: color ?? (light ? tone.cream : tone.ink), fontSize: size, fontWeight: 900, letterSpacing: "-0.045em", lineHeight: 0.98 }}>{children}</span>;
}

function CueRows({ features, light, size }: { features: string[]; light?: boolean; size: number }) {
  return (
    <div style={{ display: "flex", width: "100%", flexDirection: "column", gap: 16 }}>
      {features.map((feature, index) => (
        <div key={feature} style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ display: "flex", width: 50, height: 50, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: 999, background: light ? tone.orange : tone.clay, color: light ? tone.forestDeep : tone.cream, fontSize: 23, fontWeight: 900 }}>{index + 1}</span>
          <span style={{ color: light ? tone.cream : tone.ink, fontSize: size, fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1.16 }}>{feature}</span>
        </div>
      ))}
    </div>
  );
}

function Chip({ label, light, value }: { label: string; light?: boolean; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "12px 18px", borderRadius: 16, background: light ? "rgba(244,236,215,0.10)" : "rgba(122,69,47,0.10)" }}>
      <span style={{ color: light ? tone.orangeLight : tone.clay, fontSize: 18, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ color: light ? tone.cream : tone.ink, fontSize: 24, fontWeight: 800 }}>{value}</span>
    </div>
  );
}

function Panel({ children, flex, label, light }: { children: React.ReactNode; flex?: boolean; label: string; light?: boolean }) {
  // Satori parses every style key, so undefined values must not be present.
  return (
    <div style={{ display: "flex", ...(flex ? { flex: 1 } : { width: "100%" }), flexDirection: "column", padding: "28px 32px", borderRadius: 26, border: `1px solid ${light ? "rgba(244,236,215,0.18)" : "rgba(52,52,49,0.14)"}`, background: light ? "rgba(244,236,215,0.07)" : tone.creamSoft }}>
      <span style={{ color: light ? tone.orangeLight : tone.clay, fontSize: 19, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</span>
      {children}
    </div>
  );
}

function PhotoWindow({
  height,
  label,
  labelBackground,
  position,
  src,
  width,
  zoom = 1,
}: {
  height: number;
  label?: string;
  labelBackground?: string;
  position?: string;
  src: string;
  width: number;
  zoom?: number;
}) {
  const imageWidth = Math.round(width * zoom);
  const imageHeight = Math.round(height * zoom);
  return (
    <div style={{ display: "flex", position: "relative", width, height, overflow: "hidden", borderRadius: 28, border: `2px solid ${tone.creamSoft}`, background: tone.forestDeep, boxShadow: "0 18px 44px rgba(9,23,15,0.18)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={imageWidth} height={imageHeight} style={{ position: "absolute", left: -Math.round((imageWidth - width) / 2), top: -Math.round((imageHeight - height) * 0.45), width: imageWidth, height: imageHeight, objectFit: "cover", objectPosition: position ?? "center 45%" }} />
      {label ? <span style={{ position: "absolute", left: 18, bottom: 18, padding: "10px 16px", borderRadius: 999, background: labelBackground ?? tone.orange, color: labelBackground ? tone.cream : tone.forestDeep, fontSize: 22, fontWeight: 900 }}>{label}</span> : null}
    </div>
  );
}

function seasonFill(activity: SeasonalActivity) {
  switch (activity) {
    case "peak": return { background: tone.orange, border: "1px solid rgba(0,0,0,0)" };
    case "good": return { background: tone.orangeLight, border: "1px solid rgba(0,0,0,0)" };
    case "moderate": return { background: "rgba(242,138,50,0.42)", border: "1px solid rgba(0,0,0,0)" };
    case "possible": return { background: "rgba(244,236,215,0.16)", border: "1px solid rgba(0,0,0,0)" };
    default: return { background: "rgba(244,236,215,0.05)", border: "1px solid rgba(244,236,215,0.12)" };
  }
}

function MonthStrip({ seasonality }: { seasonality: Record<Month, SeasonalActivity> }) {
  return (
    <div style={{ display: "flex", width: "100%", gap: 6, marginTop: 20 }}>
      {MONTHS.map((month) => {
        const activity = seasonality[month];
        const fill = seasonFill(activity);
        const strong = activity === "peak" || activity === "good";
        return (
          <div key={month} style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", gap: 9 }}>
            <div style={{ display: "flex", width: "100%", height: 92, borderRadius: 10, background: fill.background, border: fill.border }} />
            <span style={{ color: activity === "inactive" ? "rgba(244,236,215,0.42)" : tone.cream, fontSize: 17, fontWeight: strong ? 900 : 700, letterSpacing: "0.04em" }}>{MONTH_LABELS[month]}</span>
          </div>
        );
      })}
    </div>
  );
}

function Legend() {
  const items = [[tone.orange, "pic"], [tone.orangeLight, "bona època"], ["rgba(242,138,50,0.42)", "moderada"]] as const;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      {items.map(([color, label]) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ display: "flex", width: 14, height: 14, borderRadius: 999, background: color }} />
          <span style={{ color: "rgba(244,236,215,0.78)", fontSize: 18, fontWeight: 700 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

function CoverSlide({ imageDataUrl, profile }: Pick<InstagramSpeciesCardProps, "imageDataUrl" | "profile">) {
  return <InstagramCover
    brief={{ layout: "photo", speciesId: profile.speciesId, eyebrow: "Coneix l’espècie", title: profile.commonName, subtitle: profile.scientificName }}
    photo={{ dataUrl: imageDataUrl, credit: credit(profile.imageAttribution, profile.imageLicense) ?? "Catàleg Bolets Atles" }}
    footer="Desplaça: trets, hàbitat i confusions. Una foto no basta per identificar."
  />;
}

function DetailSlide({ imageDataUrl, profile }: Pick<InstagramSpeciesCardProps, "imageDataUrl" | "profile">) {
  return (
    <Frame slide={2} footerLeft="Cap tret aïllat confirma una identificació. Observa l’exemplar sencer." footerRight="bolets.app">
      <Eyebrow>Mira-ho de prop</Eyebrow>
      <Title size={66}>Tres trets per mirar amb calma</Title>
      <div style={{ display: "flex", marginTop: 30 }}>
        <PhotoWindow src={imageDataUrl} width={CONTENT_WIDTH} height={560} zoom={1.5} label={profile.commonName} />
      </div>
      <div style={{ display: "flex", marginTop: 32 }}>
        <CueRows features={profile.keyFeatures} size={36} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 32 }}>
        <Chip label="Mida" value={profile.typicalSize} />
        <Chip label="Identificació" value={profile.identificationDifficulty} />
      </div>
    </Frame>
  );
}

function ContextSlide({ mapUrl, profile }: Pick<InstagramSpeciesCardProps, "mapUrl" | "profile">) {
  const habitat = profile.habitatTypes.length > 0 ? capitalise(profile.habitatTypes.join(" · ")) : "Hàbitat variable";
  return (
    <Frame light slide={3} footerLeft="Mesos orientatius: el mapa els ajusta a la pluja i la temperatura de cada setmana." footerRight="bolets.app">
      <Eyebrow light>On i quan</Eyebrow>
      <Title light size={66}>El context també identifica</Title>
      <div style={{ display: "flex", marginTop: 34 }}>
        <Panel light label="Hàbitat">
          <span style={{ marginTop: 12, color: tone.cream, fontSize: 40, fontWeight: 800, lineHeight: 1.2 }}>{habitat}</span>
        </Panel>
      </div>
      <div style={{ display: "flex", marginTop: 20 }}>
        <Panel light label="Temporada">
          {profile.seasonality ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -22 }}><Legend /></div>
              <MonthStrip seasonality={profile.seasonality} />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ marginTop: 12, color: tone.cream, fontSize: 44, fontWeight: 900, letterSpacing: "-0.02em" }}>{profile.bestMonthsLabel}</span>
              <span style={{ marginTop: 10, color: "rgba(244,236,215,0.72)", fontSize: 22, fontWeight: 700, lineHeight: 1.3 }}>Espècie sense calendari mensual al catàleg: el mapa diari mostra les condicions del bosc.</span>
            </div>
          )}
        </Panel>
      </div>
      {profile.seasonality ? (
        <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
          <Panel light flex label="Millor moment">
            <span style={{ marginTop: 12, color: tone.cream, fontSize: 40, fontWeight: 900, letterSpacing: "-0.01em" }}>{profile.bestMonthsLabel}</span>
          </Panel>
          {profile.altitude ? (
            <Panel light flex label="Altitud">
              <span style={{ marginTop: 12, color: tone.cream, fontSize: 40, fontWeight: 900, letterSpacing: "-0.01em" }}>{formatAltitude(profile.altitude)}</span>
            </Panel>
          ) : null}
        </div>
      ) : null}
      <div style={{ display: "flex", flexGrow: 1 }} />
      <div style={{ display: "flex", flexDirection: "column", marginTop: 24, padding: "28px 32px", borderRadius: 26, background: tone.cream }}>
        <span style={{ color: tone.clay, fontSize: 19, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>Avui al mapa</span>
        <span style={{ marginTop: 8, color: tone.ink, fontSize: 36, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.05 }}>La probabilitat de trobar-ne, sector per sector</span>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 16, marginTop: 20 }}>
          <span style={{ display: "flex", padding: "12px 20px", borderRadius: 999, background: tone.orange, color: tone.forestDeep, fontSize: 24, fontWeight: 900 }}>{mapUrl ?? "bolets.app/bolets-avui"}</span>
          <span style={{ color: tone.muted, fontSize: 21, fontWeight: 700 }}>S’actualitza cada dia amb la pluja i la temperatura</span>
        </div>
      </div>
    </Frame>
  );
}

function LookalikeSlide({ imageDataUrl, lookalikeCredit, lookalikeImageDataUrl, profile }: Pick<InstagramSpeciesCardProps, "imageDataUrl" | "lookalikeCredit" | "lookalikeImageDataUrl" | "profile">) {
  const lookalike = profile.lookalike;
  const windowWidth = Math.floor((CONTENT_WIDTH - 22) / 2);
  const credits = [
    credit(profile.imageAttribution, profile.imageLicense),
    lookalikeImageDataUrl ? credit(lookalikeCredit?.attribution ?? null, lookalikeCredit?.license ?? null) : null,
  ].filter(Boolean);
  if (!lookalike) {
    return (
      <Frame slide={4} footerLeft={credits.length > 0 ? `Foto: ${credits.join(" · ")}` : ""} footerRight="Si hi ha dubte, no en mengis.">
        <Eyebrow>Abans de decidir</Eyebrow>
        <Title size={66}>Confirma sempre més d’un tret</Title>
        <div style={{ display: "flex", marginTop: 30 }}>
          <PhotoWindow src={imageDataUrl} width={CONTENT_WIDTH} height={600} label={profile.commonName} />
        </div>
        <span style={{ marginTop: 30, color: tone.ink, fontSize: 30, fontWeight: 700, lineHeight: 1.32 }}>Una fotografia o un nom popular no són suficients: compara el barret, l’himeni, el peu, la carn i l’arbre on creix.</span>
      </Frame>
    );
  }

  const lookalikeStyle = edibilityTone(lookalike.edibility);
  const title = `${profile.commonName} o ${lookalike.commonName.toLowerCase()}?`;
  return (
    <Frame slide={4} footerLeft={credits.length > 0 ? `Fotos: ${credits.join(" · ")}` : ""} footerRight="Si hi ha dubte, no en mengis.">
      <Eyebrow>Confusió habitual</Eyebrow>
      <Title size={title.length > 30 ? 56 : 66}>{title}</Title>
      <div style={{ display: "flex", gap: 22, marginTop: 30 }}>
        <PhotoWindow src={imageDataUrl} width={windowWidth} height={540} label={profile.commonName} labelBackground={tone.forest} />
        {lookalikeImageDataUrl ? (
          <PhotoWindow src={lookalikeImageDataUrl} width={windowWidth} height={540} label={lookalike.commonName} labelBackground={lookalikeStyle.background} />
        ) : (
          <div style={{ display: "flex", position: "relative", width: windowWidth, height: 540, flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 28, border: `2px solid ${tone.creamSoft}`, background: tone.forest }}>
            <span style={{ color: tone.orangeLight, fontSize: 150, fontWeight: 900, lineHeight: 1 }}>?</span>
            <span style={{ marginTop: 10, color: "rgba(244,236,215,0.85)", fontSize: 26, fontStyle: "italic" }}>{lookalike.scientificName}</span>
            <span style={{ position: "absolute", left: 18, bottom: 18, padding: "10px 16px", borderRadius: 999, background: lookalikeStyle.background, color: tone.cream, fontSize: 22, fontWeight: 900 }}>{lookalike.commonName}</span>
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 30 }}>
        <span style={{ color: tone.clay, fontSize: 20, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>La diferència clau</span>
        <span style={{ marginTop: 10, color: tone.ink, fontSize: 30, fontWeight: 700, lineHeight: 1.32 }}>{lookalike.mainDifferences}</span>
      </div>
      <div style={{ display: "flex", marginTop: 22 }}>
        <span style={{ display: "flex", padding: "12px 20px", borderRadius: 999, background: lookalikeStyle.background, color: lookalikeStyle.color, fontSize: 23, fontWeight: 900 }}>{lookalike.commonName} · {getEdibilityPresentation(lookalike.edibility).label}</span>
      </div>
    </Frame>
  );
}

function ClosingSlide({ imageDataUrl, profile, speciesUrl }: Pick<InstagramSpeciesCardProps, "imageDataUrl" | "profile" | "speciesUrl">) {
  const style = edibilityTone(profile.edibility);
  return (
    <Frame light slide={5} footerLeft="Guia educativa · identificació amb prudència" footerRight="Desa aquest carrusel">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 30 }}>
        <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
          <Eyebrow light>Comestibilitat</Eyebrow>
          <Title light color={style.title} size={profile.edibilityLabel.length > 16 ? 60 : 78}>{profile.edibilityLabel}</Title>
        </div>
        <div style={{ display: "flex", width: 250, height: 250, flexShrink: 0, overflow: "hidden", borderRadius: 999, border: `4px solid ${tone.cream}`, background: tone.forestDeep }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageDataUrl} alt="" width={250} height={250} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 45%" }} />
        </div>
      </div>
      <span style={{ marginTop: 32, color: "rgba(244,236,215,0.92)", fontSize: 32, fontWeight: 700, lineHeight: 1.35 }}>{profile.shortDescription}</span>
      <div style={{ display: "flex", marginTop: 30, padding: "22px 28px", borderLeft: `6px solid ${tone.orange}`, borderRadius: "0 22px 22px 0", background: "rgba(244,236,215,0.08)", color: tone.cream, fontSize: 25, fontWeight: 700, lineHeight: 1.35 }}>La comestibilitat només compta després d’una identificació segura. Davant del dubte, no en mengis.</div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 30, padding: "30px 34px", borderRadius: 28, background: tone.cream }}>
        <span style={{ color: tone.clay, fontSize: 20, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>Fitxa completa</span>
        <span style={{ marginTop: 8, color: tone.ink, fontSize: 40, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.05 }}>Descripció, temporada, confusions i mapa de probabilitat</span>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 16, marginTop: 22 }}>
          <span style={{ display: "flex", padding: "12px 20px", borderRadius: 999, background: tone.orange, color: tone.forestDeep, fontSize: 24, fontWeight: 900 }}>{speciesUrl}</span>
          <span style={{ color: tone.muted, fontSize: 21, fontWeight: 700 }}>Enllaç al perfil · @bolets.app</span>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 }}>
        {["62 espècies al catàleg", "Mapa de probabilitat diari", "Guia en català"].map((item) => (
          <span key={item} style={{ display: "flex", padding: "12px 18px", borderRadius: 16, background: "rgba(244,236,215,0.10)", color: tone.cream, fontSize: 22, fontWeight: 800 }}>{item}</span>
        ))}
      </div>
    </Frame>
  );
}

export function InstagramSpeciesCard({
  imageDataUrl,
  lookalikeCredit,
  lookalikeImageDataUrl,
  mapUrl,
  profile,
  slide,
  speciesUrl,
}: InstagramSpeciesCardProps) {
  const safeSlide = Math.min(Math.max(slide, 1), 5);
  if (safeSlide === 1) return <CoverSlide imageDataUrl={imageDataUrl} profile={profile} />;
  if (safeSlide === 2) return <DetailSlide imageDataUrl={imageDataUrl} profile={profile} />;
  if (safeSlide === 3) return <ContextSlide mapUrl={mapUrl} profile={profile} />;
  if (safeSlide === 4) return <LookalikeSlide imageDataUrl={imageDataUrl} lookalikeCredit={lookalikeCredit} lookalikeImageDataUrl={lookalikeImageDataUrl} profile={profile} />;
  return <ClosingSlide imageDataUrl={imageDataUrl} profile={profile} speciesUrl={speciesUrl} />;
}
