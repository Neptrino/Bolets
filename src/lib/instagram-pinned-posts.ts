export const pinnedInstagramPosts = [
  {
    series: "pinned-start",
    number: "01",
    shortTitle: "Comença aquí",
    eyebrow: "Comença aquí · Bolets Atles",
    title: "El bosc canvia. La lectura també.",
    body: "Una lectura diària de les condicions de fructificació a Catalunya, espècie per espècie i territori per territori.",
    footer: "Predicció actualitzada cada dia",
    tone: "clay",
    caption: `Això és Bolets Atles.

Cada dia convertim dades ambientals verificades en una lectura clara de les condicions de fructificació a Catalunya.

Hi trobaràs prediccions per espècie, comparadors territorials i context per entendre què està canviant al bosc. No publiquem punts de recol·lecció ni prometem que hi trobaràs bolets.

Comença per la lectura d’avui: https://bolets.app/bolets-avui

#BoletsAtles #BoletsCatalunya #Micologia #Bosc`,
  },
  {
    series: "pinned-method",
    number: "02",
    shortTitle: "Com funciona",
    eyebrow: "Com llegir la predicció",
    title: "Una predicció no és una localització.",
    body: "El valor 0–100 compara aigua disponible, temperatura, exposició i hàbitat compatible. Mesura condicions, no presència.",
    footer: "Entén el número i els límits",
    tone: "forest",
    caption: `Una puntuació alta no vol dir que hi hagi bolets en un punt concret.

La lectura 0–100 de Bolets Atles combina disponibilitat d’aigua, temperatura, exposició i compatibilitat ecològica per descriure com són les condicions de fructificació.

Mira també l’extensió territorial, l’espècie i l’evolució. La pluja sola no explica el bosc.

Descobreix el mètode: https://bolets.app/metode

#BoletsAtles #PrediccióBolets #Micologia #BoletsCatalunya`,
  },
  {
    series: "pinned-safety",
    number: "03",
    shortTitle: "Amb criteri",
    eyebrow: "Abans de sortir",
    title: "Consulta. Contrasta. Respecta.",
    body: "Identifica cada espècie amb fonts fiables, comprova la normativa local i deixa el bosc millor de com l’has trobat.",
    footer: "Seguretat i normativa",
    tone: "sand",
    caption: `Cap mapa substitueix una identificació segura ni la normativa del lloc.

Abans de sortir:
— revisa els límits i permisos locals;
— no consumeixis mai un bolet si no n’has confirmat la identificació;
— evita malmetre el sòl i emporta’t tots els residus;
— comparteix el bosc amb respecte i sense revelar localitzacions sensibles.

Consulta les recomanacions: https://bolets.app/normativa-bolets

#BoletsAmbCriteri #BoletsCatalunya #Micologia #RespectemElBosc`,
  },
] as const;

export type PinnedInstagramSeries = (typeof pinnedInstagramPosts)[number]["series"];

export function isPinnedInstagramSeries(value: string | null): value is PinnedInstagramSeries {
  return pinnedInstagramPosts.some((post) => post.series === value);
}

export function pinnedInstagramPost(series: PinnedInstagramSeries) {
  return pinnedInstagramPosts.find((post) => post.series === series)!;
}
