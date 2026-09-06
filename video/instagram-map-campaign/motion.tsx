import { Easing, useCurrentFrame, interpolate, Audio, staticFile, AbsoluteFill, OffthreadVideo, Sequence } from "remotion";
import type { CSSProperties, ReactNode } from "react";
import { promoPalette as palette, promoFontFamily as fontFamily, InstagramPromoBrand } from "../InstagramPromoFrame";
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const easeOut = Easing.out(Easing.cubic);
export const fill: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" };
const shadowText = "0 8px 34px rgba(0, 0, 0, 0.6)";

export function Soundtrack({ duration, startFrom = 0 }: { duration: number; startFrom?: number }) {
  const frame = useCurrentFrame();
  const volume = interpolate(frame, [0, 12, duration - 28, duration - 1], [0, 0.72, 0.72, 0], clamp);
  return <Audio src={staticFile("audio/instagram-promo-theme.mp3")} startFrom={startFrom} volume={volume} />;
}

// --- Footage background --------------------------------------------------------

export type FootageClip = { src: string; from: number; duration: number; startFrom?: number; rate?: number };

function FootageLayer({ clip, fadeIn }: { clip: FootageClip; fadeIn: boolean }) {
  const frame = useCurrentFrame();
  const opacity = fadeIn ? interpolate(frame, [0, 14], [0, 1], clamp) : 1;
  const drift = interpolate(frame, [0, clip.duration], [1.02, 1.09], clamp);
  return (
    <AbsoluteFill style={{ opacity }}>
      <OffthreadVideo
        src={staticFile(clip.src)}
        muted
        playbackRate={clip.rate ?? 1}
        startFrom={clip.startFrom ?? 0}
        style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${drift})`, filter: "brightness(0.9) saturate(1.05)" }}
      />
    </AbsoluteFill>
  );
}

export function Footage({ clips }: { clips: FootageClip[] }) {
  return (
    <AbsoluteFill style={{ background: palette.forestDeep }}>
      {clips.map((clip, index) => (
        <Sequence key={`${clip.src}-${clip.from}`} from={clip.from} durationInFrames={clip.duration} layout="none">
          <FootageLayer clip={clip} fadeIn={index > 0} />
        </Sequence>
      ))}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(9,23,15,0.84) 0%, rgba(9,23,15,0.44) 26%, rgba(9,23,15,0.08) 48%, rgba(9,23,15,0.12) 78%, rgba(9,23,15,0.88) 100%)" }} />
    </AbsoluteFill>
  );
}

// --- Text over the image --------------------------------------------------------

export type Beat = { from: number; duration: number; text: string; eyebrow?: string; size?: number; place?: "top" | "bottom" };

function Headline({ text, eyebrow, size, duration, place = "top" }: { text: string; eyebrow?: string; size?: number; duration: number; place?: "top" | "bottom" }) {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [duration - 8, duration], [1, 0], clamp);
  const eyebrowOpacity = interpolate(frame, [0, 10], [0, 1], clamp);
  const fontSize = size ?? (text.length > 34 ? 76 : text.length > 22 ? 86 : 100);
  const words = text.split(" ");
  const anchor: CSSProperties = place === "top" ? { top: 168 } : { bottom: 420 };
  return (
    <div style={{ position: "absolute", ...anchor, left: 64, width: 952, opacity: fadeOut, fontFamily, color: palette.cream, textShadow: shadowText }}>
      {eyebrow ? <div style={{ marginBottom: 18, color: palette.orangeLight, fontSize: 26, fontWeight: 900, letterSpacing: "0.16em", opacity: eyebrowOpacity }}>{eyebrow}</div> : null}
      <div style={{ display: "flex", flexWrap: "wrap", columnGap: "0.24em", fontSize, fontWeight: 900, letterSpacing: "-0.055em", lineHeight: 0.96 }}>
        {words.map((word, index) => {
          const opacity = interpolate(frame, [index * 4, index * 4 + 10], [0, 1], clamp);
          const rise = interpolate(frame, [index * 4, index * 4 + 16], [26, 0], { ...clamp, easing: easeOut });
          return <span key={`${word}-${index}`} style={{ display: "inline-block", opacity, transform: `translateY(${rise}px)` }}>{word}</span>;
        })}
      </div>
    </div>
  );
}

export function Beats({ beats }: { beats: Beat[] }) {
  return (
    <>
      {beats.map((beat) => (
        <Sequence key={`${beat.from}-${beat.text}`} from={beat.from} durationInFrames={beat.duration} layout="none">
          <Headline text={beat.text} eyebrow={beat.eyebrow} size={beat.size} duration={beat.duration} place={beat.place} />
        </Sequence>
      ))}
    </>
  );
}

export function Chip({ label, top, left = 28, accent = false, animate = true, small = false }: { label: string; top: number; left?: number; accent?: boolean; animate?: boolean; small?: boolean }) {
  const frame = useCurrentFrame();
  const opacity = animate ? interpolate(frame, [0, 8], [0, 1], clamp) : 1;
  return (
    <div style={{
      position: "absolute",
      top,
      left,
      display: "inline-flex",
      alignItems: "center",
      gap: 12,
      padding: small ? "9px 16px" : "12px 20px",
      borderRadius: 999,
      background: accent ? palette.orange : "rgba(9, 23, 15, 0.86)",
      color: accent ? palette.forestDeep : palette.cream,
      fontFamily,
      fontSize: small ? 21 : 25,
      fontWeight: 900,
      letterSpacing: "0.08em",
      whiteSpace: "nowrap",
      boxShadow: "0 10px 26px rgba(0, 0, 0, 0.28)",
      opacity,
    }}>
      <span style={{ width: small ? 10 : 12, height: small ? 10 : 12, borderRadius: 999, background: accent ? palette.forestDeep : palette.orange }} />
      {label}
    </div>
  );
}

export function Steps({ steps, active }: { steps: string[]; active: number }) {
  return (
    <div style={{ position: "absolute", left: 40, right: 40, bottom: 40, display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily }}>
      <div style={{ display: "flex", gap: 10 }}>
        {steps.map((step, index) => (
          <span key={step} style={{
            padding: "10px 16px",
            borderRadius: 999,
            fontSize: 21,
            fontWeight: 900,
            letterSpacing: "0.1em",
            color: index === active ? palette.forestDeep : "rgba(244, 236, 215, 0.72)",
            background: index === active ? palette.orange : "rgba(9, 23, 15, 0.55)",
            transform: index === active ? "scale(1.06)" : "scale(1)",
          }}>
            {index + 1} · {step}
          </span>
        ))}
      </div>
      <span style={{ color: palette.cream, fontSize: 24, fontWeight: 900, textShadow: "0 4px 18px rgba(0,0,0,0.5)" }}>bolets.app</span>
    </div>
  );
}

export function Caption({ text, top = 1580 }: { text: string; top?: number }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", top, left: 64, width: 952, opacity, color: "rgba(244, 236, 215, 0.88)", fontFamily, fontSize: 30, fontWeight: 650, lineHeight: 1.3, textShadow: "0 4px 18px rgba(0,0,0,0.5)" }}>{text}</div>
  );
}

// --- Cinematic layer system -------------------------------------------------------
// The map is never a phone screenshot: it is a feathered layer that melts into
// the footage, framed by thin HUD ticks, revealed with a circular wipe, and
// read through glass panels built from the real values of the capture.

function Vignette() {
  return <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 42%, rgba(9,23,15,0) 40%, rgba(9,23,15,0.62) 100%)", pointerEvents: "none" }} />;
}

const grainSvg = encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='320' height='320' filter='url(#n)' opacity='0.9'/></svg>",
);

function Grain() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundImage: `url("data:image/svg+xml;utf8,${grainSvg}")`, backgroundPosition: `${(frame * 37) % 320}px ${(frame * 53) % 320}px`, opacity: 0.09, mixBlendMode: "soft-light", pointerEvents: "none" }} />
  );
}

export function LightLeak({ from, duration, fromX, toX, y = 38 }: { from: number; duration: number; fromX: number; toX: number; y?: number }) {
  const frame = useCurrentFrame();
  const t = (frame - from) / duration;
  if (t < 0 || t > 1) return null;
  const x = interpolate(t, [0, 1], [fromX, toX]);
  const opacity = Math.sin(t * Math.PI) * 0.62;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at ${x}% ${y}%, rgba(255, 214, 150, 0.95) 0%, rgba(242, 138, 50, 0.45) 16%, rgba(242, 138, 50, 0) 44%)`, opacity, mixBlendMode: "screen", pointerEvents: "none" }} />
  );
}

export function hash(index: number, salt: number) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function Dust({ count = 16, salt = 1 }: { count?: number; salt?: number }) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: count }, (_, index) => {
        const size = 4 + hash(index, salt) * 9;
        const speed = 0.6 + hash(index, salt + 1) * 1.4;
        const x0 = hash(index, salt + 2) * 1080;
        const y0 = hash(index, salt + 3) * 1920;
        const y = (((y0 - frame * speed) % 1980) + 1980) % 1980 - 30;
        const x = x0 + Math.sin(frame / (26 + hash(index, salt + 4) * 30) + index) * 26;
        return <div key={index} style={{ position: "absolute", left: x, top: y, width: size, height: size, borderRadius: 999, background: "rgba(255, 236, 200, 0.9)", filter: `blur(${size > 9 ? 3 : 1.2}px)`, opacity: 0.35 + hash(index, salt + 5) * 0.45 }} />;
      })}
    </AbsoluteFill>
  );
}

export function Glass({ x, y, width, height, radius = 30, delay = 0, padding = "26px 30px", children }: { x: number; y: number; width: number; height?: number; radius?: number; delay?: number; padding?: string; children: ReactNode }) {
  const frame = useCurrentFrame();
  const slide = interpolate(frame, [delay, delay + 22], [70, 0], { ...clamp, easing: easeOut });
  const opacity = interpolate(frame, [delay, delay + 12], [0, 1], clamp);
  return (
    <div style={{
      position: "absolute",
      left: x,
      top: y,
      width,
      height,
      padding,
      borderRadius: radius,
      background: "rgba(12, 28, 18, 0.5)",
      backdropFilter: "blur(22px) saturate(1.25)",
      WebkitBackdropFilter: "blur(22px) saturate(1.25)",
      border: "1px solid rgba(244, 236, 215, 0.28)",
      boxShadow: "0 30px 70px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
      color: palette.cream,
      fontFamily,
      opacity,
      transform: `translateY(${slide}px)`,
    }}>
      {children}
    </div>
  );
}

function HudCorners({ radius }: { radius: number }) {
  const offset = Math.min(18, radius / 3);
  const tick = (position: CSSProperties) => (
    <div style={{ position: "absolute", width: 34, height: 34, borderColor: palette.orange, borderStyle: "solid", borderWidth: 0, ...position }} />
  );
  return (
    <>
      {tick({ top: -offset, left: -offset, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 })}
      {tick({ top: -offset, right: -offset, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 })}
      {tick({ bottom: -offset, left: -offset, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 })}
      {tick({ bottom: -offset, right: -offset, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 })}
    </>
  );
}

function MapLayer({ x, y, width, height, radius = 60, reveal, revealAt = { x: 50, y: 50 }, corners = true, scale = 1, dim = 0, children }: { x: number; y: number; width: number; height: number; radius?: number; reveal: number; revealAt?: { x: number; y: number }; corners?: boolean; scale?: number; dim?: number; children: ReactNode }) {
  const frame = useCurrentFrame();
  const circle = interpolate(frame, [reveal, reveal + 28], [0, 150], { ...clamp, easing: easeOut });
  const driftX = Math.sin(frame / 37) * 6;
  const driftY = Math.cos(frame / 43) * 5;
  const breathe = 1 + Math.sin(frame / 52) * 0.008;
  return (
    <div style={{ position: "absolute", left: x, top: y, width, height, clipPath: `circle(${circle}% at ${revealAt.x}% ${revealAt.y}%)`, WebkitClipPath: `circle(${circle}% at ${revealAt.x}% ${revealAt.y}%)`, transform: `translate(${driftX}px, ${driftY}px) scale(${breathe * scale})` }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: radius, background: palette.creamSoft }}>
        {children}
        <div style={{ position: "absolute", inset: 0, borderRadius: radius, boxShadow: "inset 0 0 110px 34px rgba(9, 23, 15, 0.6)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: radius, background: palette.forestDeep, opacity: dim, pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: radius, border: "1px solid rgba(244, 236, 215, 0.34)", pointerEvents: "none" }} />
      </div>
      {corners ? <HudCorners radius={radius} /> : null}
    </div>
  );
}

export function Ripple({ at, x, y }: { at: number; x: number; y: number }) {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > 44) return null;
  const radius = interpolate(t, [0, 44], [14, 210], { ...clamp, easing: easeOut });
  const opacity = interpolate(t, [0, 44], [0.95, 0], clamp);
  const second = interpolate(t, [8, 44], [10, 150], { ...clamp, easing: easeOut });
  const dot = interpolate(t, [0, 6, 18], [0, 1, 0], clamp);
  return (
    <>
      <div style={{ position: "absolute", left: x - radius, top: y - radius, width: radius * 2, height: radius * 2, borderRadius: 999, border: `5px solid ${palette.orange}`, opacity }} />
      <div style={{ position: "absolute", left: x - second, top: y - second, width: second * 2, height: second * 2, borderRadius: 999, border: `3px solid rgba(255, 236, 200, 0.9)`, opacity: opacity * 0.7 }} />
      <div style={{ position: "absolute", left: x - 16, top: y - 16, width: 32, height: 32, borderRadius: 999, background: palette.orange, opacity: dot }} />
    </>
  );
}

export function Bar({ label, value, shown, unit = "/100" }: { label: string; value: number; shown: number; unit?: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, fontWeight: 800 }}>
        <span style={{ color: "rgba(244, 236, 215, 0.8)" }}>{label}</span>
        <span style={{ color: palette.orangeLight }}>{Math.round(shown)}{unit}</span>
      </div>
      <div style={{ position: "relative", height: 10, marginTop: 10, overflow: "hidden", borderRadius: 999, background: "rgba(244, 236, 215, 0.18)" }}>
        <div style={{ width: `${(shown / (unit === "%" ? 100 : 100)) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${palette.orange}, ${palette.orangeLight})` }} />
      </div>
      <span style={{ display: "none" }}>{value}</span>
    </div>
  );
}

export function Atmosphere({ salt = 1 }: { salt?: number }) {
  return (
    <>
      <Vignette />
      <Dust salt={salt} />
      <Grain />
    </>
  );
}

// --- Lens system --------------------------------------------------------------------
// Every Reel reads the map through circular lenses: a feathered circle with an
// orange ring, revealed with a circular wipe, floating over the footage, with
// glass chips and panels for the values read off the capture.

export function Lens({ x, y, size, reveal, revealAt = { x: 50, y: 50 }, scale = 1, dim = 0, children }: { x: number; y: number; size: number; reveal: number; revealAt?: { x: number; y: number }; scale?: number; dim?: number; children: ReactNode }) {
  return (
    <MapLayer x={x} y={y} width={size} height={size} radius={size / 2} reveal={reveal} revealAt={revealAt} corners={false} scale={scale} dim={dim}>
      {children}
      <div style={{ position: "absolute", inset: 10, borderRadius: 999, border: "2px solid rgba(242, 138, 50, 0.85)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: 999, border: "1px solid rgba(255, 236, 200, 0.35)", pointerEvents: "none" }} />
    </MapLayer>
  );
}

export function LensLabel({ label, x, y, size, delay }: { label: string; x: number; y: number; size: number; delay: number }) {
  return (
    <Sequence from={delay} layout="none">
      <div style={{ position: "absolute", top: y + size - 22, left: x, width: size, display: "flex", justifyContent: "center" }}>
        <Chip label={label} top={0} left={0} accent />
      </div>
    </Sequence>
  );
}

export function focusFor(frame: number, ranges: Array<[number, number, number]>) {
  // ranges: [from, to, target]; the focus eases towards the target over 14 frames.
  let value = 0;
  let previous = 0;
  for (const [from, , target] of ranges) {
    if (frame >= from) {
      value = interpolate(frame, [from, from + 14], [previous, target], clamp);
      previous = target;
    }
  }
  return value;
}

export function lensScale(focus: number) {
  return interpolate(focus, [-1, 0, 1], [0.94, 1, 1.07], clamp);
}

export function lensDim(focus: number) {
  return interpolate(focus, [-1, 0], [0.45, 0], clamp);
}

export function ClosingOverlay({ title, body, path, duration }: { title: string; body: string; path: string; duration: number }) {
  const frame = useCurrentFrame();
  const dim = interpolate(frame, [0, 14], [0, 0.78], clamp);
  const opacity = interpolate(frame, [4, 18], [0, 1], clamp);
  const rise = interpolate(frame, [4, 26], [40, 0], { ...clamp, easing: easeOut });
  const pulse = 1 + Math.sin(Math.max(0, frame - 24) / 9) * 0.02;
  return (
    <AbsoluteFill style={{ fontFamily, color: palette.cream }}>
      <AbsoluteFill style={{ background: palette.forestDeep, opacity: dim }} />
      <LightLeak from={0} duration={duration} fromX={20} toX={80} y={30} />
      <div style={{ position: "absolute", top: 560, left: 68, width: 944, opacity, transform: `translateY(${rise}px)` }}>
        <div style={{ color: palette.orangeLight, fontSize: 27, fontWeight: 900, letterSpacing: "0.15em" }}>BOLETS ATLES</div>
        <div style={{ marginTop: 26, fontSize: 116, fontWeight: 900, letterSpacing: "-0.062em", lineHeight: 0.9 }}>{title}</div>
        <div style={{ marginTop: 44, width: 860, color: "rgba(244, 236, 215, 0.88)", fontSize: 36, fontWeight: 680, lineHeight: 1.3 }}>{body}</div>
        <div style={{ display: "inline-flex", marginTop: 64, padding: "24px 36px", borderRadius: 999, color: palette.forestDeep, background: palette.orange, fontSize: 33, fontWeight: 900, transform: `scale(${pulse})`, transformOrigin: "0 50%" }}>{path}</div>
      </div>
      <div style={{ position: "absolute", left: 68, right: 68, bottom: 110, height: 10, background: palette.orange, opacity }} />
    </AbsoluteFill>
  );
}

export function ReelFrame({ children }: { children: ReactNode }) {
  return (
    <AbsoluteFill style={{ background: palette.forestDeep, fontFamily }}>
      {children}
      <div style={{ position: "absolute", top: 56, left: 60 }}><InstagramPromoBrand /></div>
    </AbsoluteFill>
  );
}
