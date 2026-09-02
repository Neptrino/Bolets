import { BrandMark } from "@/components/brand-mark";
import type { SpeciesFieldCardProfile } from "@/src/lib/species-field-card";

const dangerStatuses = new Set(["toxic", "dangerously_toxic"]);
const edibleStatuses = new Set(["excellent_edible", "edible", "edible_with_conditions"]);

function paletteFor(profile: SpeciesFieldCardProfile) {
  if (dangerStatuses.has(profile.edibility)) {
    return { accent: "#ffb099", deep: "#3a1717", soft: "#efd0c6", wash: "rgba(151,48,40,0.40)" };
  }
  if (edibleStatuses.has(profile.edibility)) {
    return { accent: "#f3b56f", deep: "#102a1b", soft: "#d9dfca", wash: "rgba(75,116,66,0.42)" };
  }
  return { accent: "#e9c879", deep: "#2c2719", soft: "#e4dcc3", wash: "rgba(144,116,55,0.42)" };
}

function Shell({
  children,
  position,
  profile,
  slide,
  total,
}: {
  children: React.ReactNode;
  position: number;
  profile: SpeciesFieldCardProfile;
  slide: number;
  total: number;
}) {
  const palette = paletteFor(profile);
  return (
    <div style={{ display: "flex", position: "relative", width: "100%", height: "100%", overflow: "hidden", flexDirection: "column", padding: "54px 58px 58px", color: "#fff8e9", background: `linear-gradient(148deg, ${palette.deep} 0%, #173526 58%, #4b3223 100%)`, fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", position: "absolute", width: 650, height: 650, right: -250, top: 85, borderRadius: 999, background: `radial-gradient(circle, ${palette.wash}, rgba(0,0,0,0))` }} />
      <div style={{ display: "flex", position: "absolute", inset: 23, border: "1px solid rgba(255,248,233,0.14)", borderRadius: 29 }} />
      <div style={{ display: "flex", position: "relative", alignItems: "center", justifyContent: "space-between", paddingBottom: 23, borderBottom: "1px solid rgba(255,248,233,0.18)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <BrandMark />
          <span style={{ fontSize: 23, fontWeight: 900, letterSpacing: "0.11em", textTransform: "uppercase" }}>Bolets Atles</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, color: palette.soft, fontSize: 20 }}>
          <span>Espècie {position}/{total}</span>
          <span style={{ color: palette.accent, fontWeight: 900 }}>{slide}/5</span>
        </div>
      </div>
      {children}
      <div style={{ display: "flex", position: "relative", alignItems: "center", justifyContent: "space-between", paddingTop: 22, borderTop: "1px solid rgba(255,248,233,0.18)", color: palette.soft, fontSize: 20 }}>
        <span>Guia educativa · identificació amb prudència</span>
        <span style={{ color: "#fff8e9", fontWeight: 900 }}>bolets.app</span>
      </div>
    </div>
  );
}

function SpeciesPhoto({ imageDataUrl, profile }: { imageDataUrl: string; profile: SpeciesFieldCardProfile }) {
  return (
    <div style={{ display: "flex", position: "relative", width: "100%", height: 650, overflow: "hidden", border: "1px solid rgba(255,248,233,0.24)", borderRadius: 31, background: "#18231b" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageDataUrl} alt="" width="930" height="650" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ display: "flex", position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(6,16,10,0.02) 45%, rgba(6,16,10,0.82) 100%)" }} />
      <span style={{ position: "absolute", left: 25, right: 25, bottom: 20, color: "rgba(255,248,233,0.84)", fontSize: 17, lineHeight: 1.3 }}>{profile.imageAlt}</span>
    </div>
  );
}

function Eyebrow({ children, profile }: { children: React.ReactNode; profile: SpeciesFieldCardProfile }) {
  return <span style={{ color: paletteFor(profile).accent, fontSize: 23, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>{children}</span>;
}

function FeatureRows({ profile }: { profile: SpeciesFieldCardProfile }) {
  const palette = paletteFor(profile);
  return (
    <div style={{ display: "flex", width: "100%", marginTop: 45, flexDirection: "column", gap: 16 }}>
      {profile.keyFeatures.map((feature, index) => (
        <div key={feature} style={{ display: "flex", alignItems: "center", minHeight: 102, padding: "20px 25px", border: "1px solid rgba(255,248,233,0.20)", borderRadius: 23, background: "rgba(255,248,233,0.07)" }}>
          <span style={{ display: "flex", width: 58, height: 58, flex: "0 0 auto", alignItems: "center", justifyContent: "center", borderRadius: 999, background: palette.accent, color: palette.deep, fontSize: 26, fontWeight: 900 }}>{index + 1}</span>
          <span style={{ marginLeft: 22, color: "#fff8e9", fontSize: 31, lineHeight: 1.2, fontWeight: 800 }}>{feature}</span>
        </div>
      ))}
    </div>
  );
}

export function InstagramSpeciesCard({
  imageDataUrl,
  position,
  profile,
  slide,
  total,
}: {
  imageDataUrl: string;
  position: number;
  profile: SpeciesFieldCardProfile;
  slide: number;
  total: number;
}) {
  const safeSlide = Math.min(Math.max(slide, 1), 5);
  const palette = paletteFor(profile);
  const shellProps = { position, profile, slide: safeSlide, total };

  if (safeSlide === 1) {
    return (
      <Shell {...shellProps}>
        <div style={{ display: "flex", position: "relative", flex: 1, flexDirection: "column", padding: "35px 0 30px" }}>
          <SpeciesPhoto imageDataUrl={imageDataUrl} profile={profile} />
          <div style={{ display: "flex", flexDirection: "column", marginTop: 28 }}>
            <Eyebrow profile={profile}>Coneix l’espècie</Eyebrow>
            <span style={{ marginTop: 10, color: "#fff8e9", fontSize: 68, lineHeight: 0.94, fontWeight: 900, letterSpacing: "-0.05em" }}>{profile.commonName}</span>
            <span style={{ marginTop: 11, color: palette.soft, fontSize: 29, fontStyle: "italic" }}>{profile.scientificName}</span>
          </div>
        </div>
      </Shell>
    );
  }

  if (safeSlide === 2) {
    return (
      <Shell {...shellProps}>
        <div style={{ display: "flex", position: "relative", flex: 1, flexDirection: "column", justifyContent: "center" }}>
          <Eyebrow profile={profile}>Com reconèixer-lo</Eyebrow>
          <span style={{ maxWidth: "90%", marginTop: 15, fontSize: 62, lineHeight: 0.98, fontWeight: 900, letterSpacing: "-0.045em" }}>Tres trets per començar a mirar</span>
          <FeatureRows profile={profile} />
          <span style={{ marginTop: 27, color: palette.soft, fontSize: 23, lineHeight: 1.35 }}>Cap tret aïllat confirma una identificació. Observa sempre l’exemplar complet.</span>
        </div>
      </Shell>
    );
  }

  if (safeSlide === 3) {
    return (
      <Shell {...shellProps}>
        <div style={{ display: "flex", position: "relative", flex: 1, flexDirection: "column", justifyContent: "center" }}>
          <Eyebrow profile={profile}>On i quan</Eyebrow>
          <span style={{ marginTop: 15, fontSize: 65, lineHeight: 0.98, fontWeight: 900, letterSpacing: "-0.048em" }}>El context també identifica</span>
          <div style={{ display: "flex", width: "100%", marginTop: 47, flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", flexDirection: "column", padding: "27px 30px", border: "1px solid rgba(255,248,233,0.22)", borderRadius: 25, background: "rgba(255,248,233,0.07)" }}>
              <span style={{ color: palette.accent, fontSize: 21, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.09em" }}>Hàbitat habitual</span>
              <span style={{ marginTop: 12, color: "#fff8e9", fontSize: 36, lineHeight: 1.25, fontWeight: 800 }}>{profile.habitatTypes.join(" · ")}</span>
            </div>
            <div style={{ display: "flex", gap: 18 }}>
              <div style={{ display: "flex", flex: 1, flexDirection: "column", padding: "27px 30px", border: "1px solid rgba(255,248,233,0.22)", borderRadius: 25, background: "rgba(255,248,233,0.07)" }}>
                <span style={{ color: palette.accent, fontSize: 21, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.09em" }}>Millor moment</span>
                <span style={{ marginTop: 12, color: "#fff8e9", fontSize: 38, lineHeight: 1.15, fontWeight: 900 }}>{profile.bestMonthsLabel}</span>
              </div>
              {profile.altitude ? <div style={{ display: "flex", flex: 1, flexDirection: "column", padding: "27px 30px", border: "1px solid rgba(255,248,233,0.22)", borderRadius: 25, background: "rgba(255,248,233,0.07)" }}>
                <span style={{ color: palette.accent, fontSize: 21, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.09em" }}>Altitud documentada</span>
                <span style={{ marginTop: 12, color: "#fff8e9", fontSize: 38, lineHeight: 1.15, fontWeight: 900 }}>{profile.altitude[0]}–{profile.altitude[1]} m</span>
              </div> : null}
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (safeSlide === 4) {
    return (
      <Shell {...shellProps}>
        <div style={{ display: "flex", position: "relative", flex: 1, flexDirection: "column", justifyContent: "center" }}>
          <Eyebrow profile={profile}>No el confonguis</Eyebrow>
          <span style={{ marginTop: 15, fontSize: 63, lineHeight: 0.98, fontWeight: 900, letterSpacing: "-0.047em" }}>{profile.lookalike ? `Compara’l amb ${profile.lookalike.commonName}` : "Confirma sempre més d’un tret"}</span>
          {profile.lookalike ? <div style={{ display: "flex", marginTop: 48, flexDirection: "column", padding: "34px 36px", border: `2px solid ${palette.accent}`, borderRadius: 29, background: "rgba(255,248,233,0.08)" }}>
            <span style={{ color: palette.soft, fontSize: 24, fontStyle: "italic" }}>{profile.lookalike.scientificName}</span>
            <span style={{ marginTop: 20, color: "#fff8e9", fontSize: 34, lineHeight: 1.33 }}>{profile.lookalike.mainDifferences}</span>
          </div> : null}
          <span style={{ marginTop: 31, color: palette.soft, fontSize: 25, lineHeight: 1.4 }}>Si hi ha dubte, no el consumeixis. Una fotografia o un nom popular no són suficients.</span>
        </div>
      </Shell>
    );
  }

  return (
    <Shell {...shellProps}>
      <div style={{ display: "flex", position: "relative", flex: 1, flexDirection: "column", justifyContent: "center" }}>
        <Eyebrow profile={profile}>Fitxa completa</Eyebrow>
        <span style={{ marginTop: 15, fontSize: 67, lineHeight: 0.98, fontWeight: 900, letterSpacing: "-0.05em" }}>Continua aprenent a bolets.app</span>
        <span style={{ maxWidth: "92%", marginTop: 32, color: palette.soft, fontSize: 31, lineHeight: 1.38 }}>{profile.shortDescription}</span>
        <div style={{ display: "flex", marginTop: 43, flexDirection: "column", padding: "29px 32px", borderLeft: `6px solid ${palette.accent}`, borderRadius: "0 24px 24px 0", background: "rgba(255,248,233,0.09)" }}>
          <span style={{ color: palette.accent, fontSize: 22, fontWeight: 900, letterSpacing: "0.09em", textTransform: "uppercase" }}>{profile.edibilityLabel}</span>
          <span style={{ marginTop: 12, color: "#fff8e9", fontSize: 29, lineHeight: 1.35 }}>La comestibilitat només és rellevant després d’una identificació segura. No consumeixis cap exemplar dubtós.</span>
        </div>
        <span style={{ marginTop: 40, color: "#fff8e9", fontSize: 34, fontWeight: 900 }}>Fitxa a l’enllaç del perfil → @bolets.app</span>
      </div>
    </Shell>
  );
}
