import { suitabilityScale } from "@/src/lib/suitability-scale";
import type { InstagramMotif } from "@/src/lib/instagram-cover-brief";
import { instagramPalette as p } from "@/src/lib/instagram-design";

export function InstagramEditorialMotif({ motif, light = false }: { motif: InstagramMotif; light?: boolean }) {
  const ink = light ? p.cream : p.forest;
  const accent = light ? p.orange : p.clay;
  if (motif === "scale") return <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: 28 }}>
    <span style={{ fontSize: 188, fontWeight: 900, letterSpacing: "-0.06em", lineHeight: 1, color: ink }}>0—100</span>
    <div style={{ display: "flex", gap: 12 }}>{suitabilityScale.map(({ color }) => <div key={color} style={{ display: "flex", flex: 1, height: 34, background: color }} />)}</div>
    <span style={{ fontSize: 32, fontWeight: 800, color: ink }}>Una escala de condicions.</span>
  </div>;
  return <svg width="820" height="350" viewBox="0 0 820 350" fill="none" aria-hidden="true">
    {motif === "water" ? [120, 350, 580].map(x => <path key={x} d={`M${x + 55} 12C${x + 30} 78 ${x - 18} 131 ${x - 18} 194a73 73 0 0 0 146 0C${x + 128} 131 ${x + 80} 78 ${x + 55} 12Z`} fill={ink} />) : null}
    {motif === "trees" ? [80, 320, 560].map(x => <g key={x}><path d={`M${x + 90} 20 ${x} 150h40l-65 90h95v85h40v-85h95l-65-90h40Z`} fill={ink} /></g>) : null}
    {motif === "extent" ? [0, 1, 2].map(row => [0, 1, 2, 3, 4].map(col => <circle key={`${row}-${col}`} cx={100 + col * 150} cy={65 + row * 105} r={35} fill={col < 2 ? accent : ink} />)) : null}
    {motif === "calendar" ? <g stroke={ink} strokeWidth="16" strokeLinecap="round"><rect x="180" y="40" width="460" height="280" rx="24" /><path d="M180 125h460M285 15v65M535 15v65" />{[270, 410, 550].map(x => <path key={x} d={`M${x} 195h1M${x} 260h1`} strokeWidth="35" />)}</g> : null}
    {motif === "field" ? <g stroke={ink} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round"><path d="M235 235C90 55 420 5 420 5s130 180-10 245C350 280 300 275 235 235Z" /><path d="M175 325 420 70M310 195l-3-75M310 195l73 10" /><circle cx="620" cy="170" r="95" /><path d="m575 170 35 35 60-70" /></g> : null}
  </svg>;
}
