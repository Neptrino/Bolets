import type { InstagramCoverBrief } from "@/src/lib/instagram-cover-brief";
import type { InstagramEducationTopicId } from "@/src/lib/instagram-education";
import type { PinnedInstagramSeries } from "@/src/lib/instagram-pinned-posts";

// Short covers introduce the existing sourced lessons. Explanations and safety
// limits remain in the curriculum/captions, not duplicated in these headlines.
export const educationCovers = {
  "field-photos": { layout: "question", eyebrow: "Quadern de camp", title: "Quines fotos falten?", subtitle: "Quatre enquadraments per documentar un bolet.", motif: "field", tone: "orange" },
  "field-underside": { layout: "question", eyebrow: "Aprèn a observar", title: "Mira sota el barret", subtitle: "Làmines, plecs, porus o agulles?", motif: "field", tone: "cream" },
  "field-lookalike": { layout: "question", eyebrow: "Rossinyol i fals rossinyol", title: "Taronja no és suficient", subtitle: "Una diferència que es veu per sota.", motif: "field", tone: "orange" },
  "field-wood": { layout: "question", eyebrow: "Ecologia de camp", title: "No retallis el tronc", subtitle: "La fusta també explica el bolet.", motif: "trees", tone: "forest" },
  reading: { layout: "question", eyebrow: "Llegeix el mapa", title: "Què vol dir aquest número?", subtitle: "Una lectura de condicions. Aprèn a interpretar-la.", motif: "scale", tone: "cream" },
  water: { layout: "question", eyebrow: "El bosc, explicat", title: "Ha plogut. I ara?", subtitle: "La pluja és només una part de la història.", motif: "water", tone: "orange" },
  habitat: { layout: "question", eyebrow: "El bosc, explicat", title: "Bon temps. Però quin bosc?", subtitle: "Cada espècie necessita un hàbitat compatible.", motif: "trees", tone: "cream" },
  extent: { layout: "question", eyebrow: "Llegeix el territori", title: "Un bon sector. I la resta?", subtitle: "Mira fins on s’estén el senyal.", motif: "extent", tone: "forest" },
  season: { layout: "question", eyebrow: "Cada espècie, el seu moment", title: "Ja és temporada?", subtitle: "El calendari orienta. El bosc posa les condicions.", motif: "calendar", tone: "cream" },
  limits: { layout: "question", eyebrow: "Surt amb criteri", title: "El mapa t’ho diu tot?", subtitle: "Què ens pot explicar una predicció i quins límits té.", motif: "field", tone: "orange" },
} as const satisfies Record<InstagramEducationTopicId, InstagramCoverBrief>;

export const pinnedCovers = {
  "pinned-start": { layout: "photo", speciesId: "boletus-edulis", eyebrow: "Comença aquí", title: "Abans de sortir.", subtitle: "Coneix els bolets. Consulta el mapa. Aprèn a mirar el bosc." },
  "pinned-method": { layout: "question", eyebrow: "Llegeix el mapa", title: "Un número. Més context.", subtitle: "Compara el millor sector amb l’extensió del senyal.", motif: "scale", tone: "cream" },
  "pinned-safety": { layout: "question", eyebrow: "Amb criteri", title: "El bosc es respecta.", subtitle: "Identificació, normativa i respecte. Abans de sortir.", motif: "field", tone: "orange" },
} as const satisfies Record<PinnedInstagramSeries, InstagramCoverBrief>;
