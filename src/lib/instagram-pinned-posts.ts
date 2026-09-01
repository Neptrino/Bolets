export const pinnedInstagramPosts = [
  {
    series: "pinned-start",
    number: "01",
    shortTitle: "Comença aquí",
    eyebrow: "Descobreix Bolets Atles",
    title: "Coneix els bolets. Entén el bosc.",
    body: "Catàleg, identificació, comparadors, temporades, guies territorials, condicions actuals i quadern de camp privat.",
    footer: "Tot l’atles en un sol lloc",
    tone: "clay",
    caption: `Això és Bolets Atles: una guia digital dels bolets de Catalunya.

Explora el catàleg d’espècies, aprèn a identificar-les, compara confusions habituals, consulta temporades i guies territorials, i entén les condicions actuals del bosc.

També pots crear el teu bosc i portar un quadern de camp privat. Les localitzacions exactes de les troballes no es publiquen ni alimenten la predicció.

Comença a explorar: https://bolets.app

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

export function pinnedInstagramMarker(series: PinnedInstagramSeries) {
  return `Bolets Atles · perfil fixat · ${pinnedInstagramPost(series).number}/03`;
}

export function pinnedInstagramCaption(series: PinnedInstagramSeries) {
  return `${pinnedInstagramPost(series).caption}\n\n${pinnedInstagramMarker(series)}`;
}
