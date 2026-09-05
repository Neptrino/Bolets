import { MushroomCapIcon, MushroomContextIcon, MushroomHymeniumIcon, MushroomMyceliumIcon, MushroomStemIcon } from "@/components/mushroom-anatomy-icons";
import { instagramPalette as p } from "@/src/lib/instagram-design";

function Surface({ kind, color }: { kind: string; color: string }) {
  return <svg width="190" height="150" viewBox="0 0 190 150" fill="none" aria-hidden="true">
    {kind === "Làmines" ? <path d="M10 35h170M20 35v90M45 35v90M70 35v90M95 35v90M120 35v90M145 35v90M170 35v90" stroke={color} strokeWidth="5" /> : null}
    {kind === "Plecs" ? <path d="M10 45h170M10 45c8 0 8 50 20 50s12-50 25-50 12 50 25 50 12-50 25-50 12 50 25 50 12-50 25-50 12 50 25 50" stroke={color} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" /> : null}
    {kind === "Porus" ? [0, 1, 2].map(row => [0, 1, 2, 3].map(col => <circle key={`${row}-${col}`} cx={30 + col * 43} cy={35 + row * 40} r="12" stroke={color} strokeWidth="5" />)) : null}
    {kind === "Agulles" ? <path d="M10 35h170M20 35l10 85 10-85M60 35l10 85 10-85M100 35l10 85 10-85M140 35l10 85 10-85" stroke={color} strokeWidth="5" strokeLinejoin="round" /> : null}
  </svg>;
}

/** Schematic structures and existing anatomy icons; never specimen evidence. */
export function InstagramFieldDiagram({ topicId, slide = 1, light = false }: { topicId: string; slide?: number; light?: boolean }) {
  const color = light ? p.cream : p.forest;
  const structures = topicId === "field-lookalike" || (topicId === "field-underside" && slide === 2)
    ? ["Làmines", "Plecs"] : topicId === "field-underside" && slide === 3 ? ["Porus", "Agulles"] : ["Làmines", "Plecs", "Porus", "Agulles"];
  const photos = [MushroomCapIcon, MushroomHymeniumIcon, MushroomStemIcon, MushroomContextIcon];
  const labels = ["Barret", "Per sota", "Peu", "Entorn"];
  return <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: 28, color }}>
    <div style={{ display: "flex", width: "100%", justifyContent: "space-around", gap: 16 }}>
      {topicId === "field-photos" ? photos.map((Icon, index) => <div key={labels[index]} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}><Icon size={180} /><span style={{ fontSize: 28, fontWeight: 900 }}>{labels[index]}</span></div>)
        : topicId === "field-wood" ? <><div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}><MushroomContextIcon size={220} /><span style={{ fontSize: 28, fontWeight: 900 }}>Mira el context</span></div><div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}><MushroomMyceliumIcon size={220} /><span style={{ fontSize: 28, fontWeight: 900 }}>Observa el substrat</span></div></>
          : structures.map(kind => <div key={kind} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}><Surface kind={kind} color={color} /><span style={{ fontSize: 30, fontWeight: 900 }}>{kind}</span></div>)}
    </div>
    <span style={{ fontSize: 20, textAlign: "center" }}>Esquemes d’observació · Sense escala · No són una clau d’identificació</span>
  </div>;
}
