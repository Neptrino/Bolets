// Field identification method for /bolets-i-confusions. Each step names the
// comparison pairs where that check is the decisive difference, so the method
// stays tied to the sourced comparison pages instead of free-standing advice.
export interface IdentificationStep {
  id: string;
  title: string;
  body: string;
  decisiveIn: string[];
}

export const identificationSteps: IdentificationStep[] = [
  {
    id: "sencer",
    title: "Cull-lo sencer, amb la base",
    body: "Desenterra el peu fins a la base, sense tallar-lo arran de terra. Sense la base no pots veure si hi ha volva, el sac que separa el camperol de la farinera borda. Tampoc un ou de reig tancat no es pot distingir de la farinera: deixa’l.",
    decisiveIn: ["camperol-vs-farinera-borda", "ou-de-reig-vs-farinera-borda"],
  },
  {
    id: "mida",
    title: "Mira la mida i la silueta",
    body: "Abans del detall, la forma general. Un para-sol de pocs centímetres no és un apagallums, un fredolic gros i massís no és un fredolic, i un barret com un cervell no és una múrgola.",
    decisiveIn: ["apagallums-vs-palometa-metzinosa", "fredolic-vs-fredolic-metzinos", "murgola-vs-bolet-greix"],
  },
  {
    id: "cara-inferior",
    title: "Gira’l: làmines, porus o plecs",
    body: "Mira què hi ha sota el barret i de quin color és: làmines fines, plecs gruixuts o porus. Aquí es resolen més confusions que enlloc: el color dels porus, si les làmines són grogues o blanques, denses o espaiades.",
    decisiveIn: [
      "rossinyol-vs-bolet-olivera",
      "cep-vs-matagent",
      "ou-de-reig-vs-reig-bord",
      "camasec-vs-candeleta-vorada",
      "moixero-vs-inocibe-patouillard",
    ],
  },
  {
    id: "peu-anell",
    title: "Revisa el peu i l’anell",
    body: "Color del peu, reticle o dibuix, i si hi ha anell, com és. Un anell doble que llisca pel peu, un anell groc o un reticle fosc sobre el peu són trets que separen parelles molt semblants de dalt.",
    decisiveIn: ["apagallums-vs-palometa-metzinosa", "ou-de-reig-vs-farinera-borda", "cep-vs-mataparent"],
  },
  {
    id: "tall",
    title: "Talla’l i observa",
    body: "Un tall mostra el que no es veu de fora: el color del làtex que regalima, la carn que blaveja o l’interior buit o compartimentat. Fixa’t en el primer moment, perquè alguns canvis són ràpids.",
    decisiveIn: ["rovello-vs-rovello-de-cabra", "cep-vs-matagent", "murgola-vs-bolet-greix"],
  },
  {
    id: "esporada",
    title: "Si encara dubtes, fes l’esporada",
    body: "Deixa el barret unes hores sobre un paper fosc, amb les làmines avall. El color de la pols que hi cau, l’esporada, pot tancar una discussió que les làmines no resolen: blanca al carlet, rosa al carner bord.",
    decisiveIn: ["carlet-vs-carner-bord"],
  },
  {
    id: "lloc",
    title: "El lloc orienta, però no decideix",
    body: "Bosc, arbre, sòl o fusta ajuden a sospitar, i créixer en feixos sobre soques és una alerta. Però molts dobles comparteixen bosc i temporada: el lloc no substitueix cap dels passos anteriors, i l’olor o el color sols tampoc.",
    decisiveIn: ["girgola-vs-bolet-olivera", "rossinyol-vs-bolet-olivera"],
  },
];
