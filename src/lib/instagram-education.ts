import { instagramFieldLessons } from "@/src/lib/instagram-field-lessons";

export type InstagramEducationVisual = "readings" | "score" | "extent";

export type InstagramEducationSlide = {
  eyebrow: string;
  title: string;
  body: string;
  visual?: InstagramEducationVisual;
  points?: readonly { label: string; detail: string }[];
};

export type InstagramEducationTopic = {
  id: string;
  title: string;
  captionIntro: string;
  captionBody: string;
  slides: readonly InstagramEducationSlide[];
  source?: { label: string; url: string };
  guidePath?: string;
};

const legacyEducationTopics = [
  {
    id: "reading",
    title: "Com llegir el número d’avui",
    captionIntro: "Què vol dir realment el número d’avui?",
    captionBody: "La puntuació resumeix condicions ambientals i hàbitat compatible. No compta bolets, no confirma que n’hi hagi i no assenyala punts de recol·lecció.",
    slides: [
      { eyebrow: "Com llegir la predicció", title: "Què vol dir el número d’avui?", body: "És una lectura de condicions per a la fructificació. No és un recompte de bolets ni una promesa de trobar-ne.", visual: "readings" },
      { eyebrow: "Pas 1 · la intensitat", title: "0–100 mesura condicions, no presència", body: "Com més alt és el valor, més favorables són les condicions ambientals i l’hàbitat compatible del sector.", visual: "score" },
      { eyebrow: "Pas 2 · el context", title: "Un màxim no explica tot el territori", body: "Compara el millor sector amb l’extensió del senyal per distingir un pic aïllat d’una situació més compartida." },
      { eyebrow: "Pas 3 · els límits", title: "Una lectura territorial no localitza bolets", body: "Mostrem sectors amplis. No publiquem punts de recol·lecció ni convertim una predicció en una observació." },
      { eyebrow: "Explora amb criteri", title: "Compara espècies i zones al mapa", body: "Consulta les dades vigents, revisa la cobertura territorial i planifica sempre una sortida responsable." },
    ],
  },
  {
    id: "water",
    title: "La pluja no treballa sola",
    captionIntro: "Ha plogut. Vol dir que ja hi haurà bolets?",
    captionBody: "No necessàriament. La lectura té en compte la pluja acumulada, la humitat que conserva el sòl, l’evaporació i els dies secs. L’aigua útil és una memòria, no una foto d’un sol ruixat.",
    slides: [
      { eyebrow: "Aigua disponible", title: "La pluja no treballa sola", body: "Un ruixat ajuda, però no explica per si sol si el bosc manté prou aigua perquè fructifiquin els bolets." },
      { eyebrow: "El sòl té memòria", title: "Importa l’aigua que queda", body: "El terreny pot conservar part de la pluja dels dies anteriors o assecar-se ràpidament segons el sòl i el temps." },
      { eyebrow: "L’atmosfera també resta", title: "Calor, vent i aire sec acceleren la pèrdua", body: "L’evaporació i la demanda de l’aire poden reduir l’aigua disponible encara que hagi plogut fa poc." },
      { eyebrow: "La seqüència compta", title: "Una pluja regular no és igual que un xàfec", body: "La durada dels períodes humits i secs ajuda a entendre si l’aigua ha tingut temps d’entrar i mantenir-se al sistema." },
      { eyebrow: "Lectura conjunta", title: "Mira l’evolució, no només la pluja", body: "Bolets Atles combina la memòria d’aigua amb temperatura i hàbitat compatible per construir la lectura d’avui." },
    ],
  },
  {
    id: "habitat",
    title: "Per què l’hàbitat canvia la lectura",
    captionIntro: "Bon temps per a bolets… però per a quina espècie?",
    captionBody: "Cada espècie necessita un context ecològic compatible. El tipus de bosc, el sòl i l’altitud modulen la lectura: unes bones condicions meteorològiques no converteixen qualsevol lloc en hàbitat adequat.",
    slides: [
      { eyebrow: "Més que meteorologia", title: "El bosc també forma part de la predicció", body: "La humitat i la temperatura poden ser favorables, però cada espècie necessita un hàbitat compatible." },
      { eyebrow: "Arbres i coberta", title: "No totes les masses forestals són equivalents", body: "La relació amb determinats arbres i tipus de coberta ajuda a delimitar on té sentit calcular una oportunitat." },
      { eyebrow: "Sòl", title: "L’acidesa i el terreny poden obrir o tancar opcions", body: "La compatibilitat del sòl es valora per espècie; no s’atribueix la mateixa resposta a tot Catalunya." },
      { eyebrow: "Altitud", title: "El rang favorable té vores graduals", body: "La compatibilitat disminueix prop dels límits ecològics: el canvi no és una frontera brusca dibuixada al mapa." },
      { eyebrow: "Resultat", title: "Bon temps no vol dir bon hàbitat", body: "La lectura final només és positiva on coincideixen condicions favorables, temporada i context ecològic compatible." },
    ],
  },
  {
    id: "extent",
    title: "Màxim i extensió no són el mateix",
    captionIntro: "Un 80 aïllat és igual que molts sectors a 60?",
    captionBody: "No. El màxim mostra el millor sector; l’extensió explica fins a quin punt el senyal es repeteix. Cal llegir totes dues coses abans de considerar representativa una situació territorial.",
    slides: [
      { eyebrow: "Llegir el territori", title: "Un màxim no explica tota la zona", body: "La puntuació més alta pot correspondre a un sol sector. Per això la lectura territorial necessita context." },
      { eyebrow: "Dues preguntes", title: "Quin és el millor sector i quant s’estén?", body: "El màxim descriu intensitat. La proporció de sectors favorables descriu extensió.", visual: "extent" },
      { eyebrow: "Senyal aïllat", title: "Un pic alt pot ser poc representatiu", body: "Si gairebé cap altre sector acompanya el màxim, convé interpretar-lo com una excepció dins del territori." },
      { eyebrow: "Senyal compartit", title: "Molts sectors positius donen més context", body: "Una cobertura àmplia indica que la situació favorable no depèn només d’una única cel·la del mapa." },
      { eyebrow: "Abans de decidir", title: "Compara intensitat i cobertura", body: "Al mapa Avui pots revisar el valor, l’espècie líder i l’extensió del senyal sense revelar localitzacions precises." },
    ],
  },
  {
    id: "season",
    title: "Cada espècie té el seu moment",
    captionIntro: "Per què dues espècies responen diferent al mateix temps?",
    captionBody: "La temporada biològica no és igual per a totes. Bolets Atles combina el moment de l’any amb les necessitats de temperatura, aigua i hàbitat de cada espècie.",
    slides: [
      { eyebrow: "Ritmes diferents", title: "Cada espècie té el seu moment", body: "Compartir bosc o pluja no significa fructificar alhora. El calendari ecològic modifica la lectura." },
      { eyebrow: "Temporada", title: "El mes orienta, però no decideix tot sol", body: "La temporada marca una finestra probable; les condicions recents determinen com d’activa pot ser dins d’aquella finestra." },
      { eyebrow: "Temperatura", title: "No totes busquen el mateix ambient", body: "Cada perfil té un interval tèrmic propi i respon de manera gradual quan s’allunya de les condicions més favorables." },
      { eyebrow: "Aigua i hàbitat", title: "La coincidència és específica", body: "La mateixa setmana pot afavorir una espècie i deixar-ne una altra fora de temporada o sense hàbitat compatible." },
      { eyebrow: "Compara", title: "Canvia d’espècie abans de canviar de zona", body: "El mapa permet veure com una mateixa situació ambiental produeix lectures diferents segons l’ecologia seleccionada." },
    ],
  },
  {
    id: "limits",
    title: "Què pot dir una predicció — i què no",
    captionIntro: "Predicció no és observació.",
    captionBody: "Bolets Atles estima condicions favorables a escala territorial. No confirma presència, no revela localitzacions precises i no substitueix la identificació segura, la normativa ni el criteri al bosc.",
    slides: [
      { eyebrow: "Límit essencial", title: "Predicció no és observació", body: "El mapa estima on coincideixen condicions i hàbitat. No comprova que un bolet hagi fructificat ni que continuï al lloc." },
      { eyebrow: "Escala territorial", title: "Mostrem sectors, no punts", body: "La lectura és generalitzada per protegir localitzacions sensibles i evitar una falsa precisió." },
      { eyebrow: "Identificació", title: "Una puntuació no identifica cap exemplar", body: "No consumeixis cap bolet sense una identificació fiable. Una predicció ambiental no és una garantia de seguretat." },
      { eyebrow: "Canvi constant", title: "El bosc evoluciona després de publicar", body: "Temperatura, vent, humitat i activitat humana poden alterar la situació. Revisa sempre la lectura més recent." },
      { eyebrow: "Sortida responsable", title: "Dades, normativa i criteri van junts", body: "Consulta els límits locals, respecta el bosc i pren la predicció com una orientació, no com una instrucció." },
    ],
  },
] as const satisfies readonly InstagramEducationTopic[];

export const instagramEducationTopics = [...legacyEducationTopics, ...instagramFieldLessons] as const;

export type InstagramEducationTopicId = typeof instagramEducationTopics[number]["id"];

const topicById = new Map<InstagramEducationTopicId, InstagramEducationTopic>(
  instagramEducationTopics.map((topic) => [topic.id, topic]),
);

const EDUCATION_EPOCH = Date.UTC(2026, 8, 2);
const WEEK_MS = 7 * 24 * 60 * 60 * 1_000;
// The former fixed lesson was "reading". Start the rotation with a visibly new
// lesson on the first deployment Wednesday, then return to reading in week six.
const EDUCATION_EPOCH_OFFSET = 1;

export function isInstagramEducationTopicId(value: string | null): value is InstagramEducationTopicId {
  return value !== null && topicById.has(value as InstagramEducationTopicId);
}

export function instagramEducationTopic(id: InstagramEducationTopicId) {
  return topicById.get(id)!;
}

export function instagramEducationTopicForDate(publicationDate: string): InstagramEducationTopic & { id: InstagramEducationTopicId } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publicationDate)) {
    throw new Error(`Invalid Instagram education publication date: ${publicationDate}`);
  }
  const date = Date.parse(`${publicationDate}T00:00:00.000Z`);
  if (!Number.isFinite(date) || new Date(date).toISOString().slice(0, 10) !== publicationDate) {
    throw new Error(`Invalid Instagram education publication date: ${publicationDate}`);
  }
  // Preserve historic signed topics; new Wednesdays teach practical field skills.
  const fieldEpoch = Date.UTC(2026, 8, 9);
  if (date >= fieldEpoch) {
    return instagramFieldLessons[Math.floor((date - fieldEpoch) / WEEK_MS) % instagramFieldLessons.length];
  }
  const week = Math.floor((date - EDUCATION_EPOCH) / WEEK_MS);
  const index = ((week + EDUCATION_EPOCH_OFFSET) % legacyEducationTopics.length
    + legacyEducationTopics.length) % legacyEducationTopics.length;
  return legacyEducationTopics[index];
}
