export interface ComparisonPage {
  slug: string;
  leftSpeciesId: string;
  rightSpeciesId: string;
  title: string;
  shortTitle: string;
  metaDescription: string;
  searchTerms?: string[];
  introduction: string;
  decisiveDifference: string;
}

export const comparisonPages: ComparisonPage[] = [
  {
    slug: "rossinyol-vs-camagroc",
    leftSpeciesId: "cantharellus-cibarius",
    rightSpeciesId: "craterellus-lutescens",
    title: "Rossinyol vs. camagroc: diferències i identificació",
    shortTitle: "Rossinyol vs. camagroc",
    metaDescription: "Rossinyol o camagroc? Compareu forma, color, himeni, hàbitat i temporada per distingir aquests dos bolets comestibles.",
    introduction: "El rossinyol i el camagroc són dos bolets comestibles de la família de les cantarel·làcies, però tenen siluetes, colors i cares inferiors molt diferents. Comparar-los ajuda a entendre els plecs i els himenis sense làmines veritables.",
    decisiveDifference: "El rossinyol és massís, groc i amb plecs gruixuts; el camagroc és prim, buit, amb peu groc i barret gris o bru en forma d’embut.",
  },
  {
    slug: "ou-de-reig-vs-reig-bord",
    leftSpeciesId: "amanita-caesarea",
    rightSpeciesId: "amanita-muscaria",
    title: "Ou de reig vs. Amanita muscaria (reig bord)",
    shortTitle: "Ou de reig vs. reig bord",
    metaDescription: "Compareu l’ou de reig i el reig bord: làmines, peu, anell, volva, colors i riscos d’una identificació incompleta.",
    searchTerms: ["ou de reig vs amanita muscaria", "amanita caesarea vs amanita muscaria"],
    introduction: "L’ou de reig i el reig bord són amanites vistoses que poden perdre part dels colors o de les restes del vel amb la pluja. Una comparació segura ha de mirar làmines, peu, anell, volva i no només el barret.",
    decisiveDifference: "L’ou de reig té làmines, peu i anell grocs; el reig bord els té blancs i sol mostrar berrugues blanques sobre un barret vermell o ataronjat.",
  },
  {
    slug: "rossinyol-vs-bolet-olivera",
    leftSpeciesId: "cantharellus-cibarius",
    rightSpeciesId: "omphalotus-olearius",
    title: "Rossinyol vs. bolet d’olivera: evitar la confusió",
    shortTitle: "Rossinyol vs. bolet d’olivera",
    metaDescription: "Diferències entre el rossinyol comestible i el bolet d’olivera tòxic: plecs, làmines, creixement, hàbitat i seguretat.",
    introduction: "El color groc o taronja pot fer confondre el rossinyol comestible amb el bolet d’olivera tòxic. El tipus d’himeni i la manera de créixer aporten diferències molt més fiables que el color tot sol.",
    decisiveDifference: "El rossinyol té plecs gruixuts i creix des del sòl; el bolet d’olivera té làmines fines veritables i acostuma a formar feixos sobre fusta o arrels.",
  },
  {
    slug: "camagroc-vs-fals-camagroc",
    leftSpeciesId: "craterellus-lutescens",
    rightSpeciesId: "craterellus-tubaeformis",
    title: "Camagroc vs. fals camagroc: com distingir-los",
    shortTitle: "Camagroc vs. fals camagroc",
    metaDescription: "Camagroc o fals camagroc? Compareu el peu, la cara inferior, els colors, l’hàbitat i la temporada de totes dues espècies.",
    introduction: "El camagroc i el fals camagroc són dues espècies comestibles properes que comparteixen el peu buit i els boscos humits. La confusió és sobretot de nom i d’identificació, no una equivalència exacta.",
    decisiveDifference: "El camagroc sol tenir el peu groc més viu i la cara inferior gairebé llisa; el fals camagroc presenta plecs més marcats i tons més grisos o apagats.",
  },
  {
    slug: "cep-vs-cep-estiu",
    leftSpeciesId: "boletus-edulis",
    rightSpeciesId: "boletus-reticulatus",
    title: "Cep vs. cep d’estiu: diferències entre Boletus",
    shortTitle: "Cep vs. cep d’estiu",
    metaDescription: "Compareu el cep i el cep d’estiu per barret, reticle, temporada, arbres associats i hàbitat, amb fotografies de referència.",
    introduction: "El cep comú i el cep d’estiu són dos Boletus comestibles i molt apreciats que poden coincidir en boscos de planifolis. L’època, la textura del barret i l’extensió del reticle ajuden a separar-los.",
    decisiveDifference: "El cep d’estiu és més primerenc, té el barret sec i un reticle extens; el cep sol tenir el barret més untuós, marge clar i reticle concentrat a dalt.",
  },
  {
    slug: "cep-vs-cep-negre",
    leftSpeciesId: "boletus-edulis",
    rightSpeciesId: "boletus-aereus",
    title: "Cep vs. cep negre: hàbitat i identificació",
    shortTitle: "Cep vs. cep negre",
    metaDescription: "Diferències entre cep i cep negre: color del barret, clima, bosc, altitud i trets d’identificació més útils.",
    introduction: "El cep i el cep negre comparteixen porus clars de joves, carn blanca immutable i una gran qualitat culinària. El color, el clima i els arbres associats expliquen bona part de les diferències visibles.",
    decisiveDifference: "El cep negre té un barret molt fosc i prefereix alzinars i rouredes càlides; el cep és més clar i freqüent en boscos frescos de coníferes o planifolis.",
  },
  {
    slug: "cep-vs-cep-rogenc",
    leftSpeciesId: "boletus-edulis",
    rightSpeciesId: "boletus-pinophilus",
    title: "Cep vs. cep rogenc: diferències i boscos",
    shortTitle: "Cep vs. cep rogenc",
    metaDescription: "Cep o cep rogenc? Compareu color, pins associats, rang altitudinal, temporada i trets macroscòpics de les dues espècies.",
    introduction: "El cep i el cep rogenc formen part dels ceps nobles i comparteixen moltes característiques. El to del barret, l’associació amb pins i el rang altitudinal orienten la comparació sense substituir una identificació completa.",
    decisiveDifference: "El cep rogenc presenta un barret vinós o rogenc fosc i una vinculació marcada amb pins; el cep acostuma a ser bru i ocupa una varietat més àmplia de boscos.",
  },
  {
    slug: "cep-vs-matagent",
    leftSpeciesId: "boletus-edulis",
    rightSpeciesId: "rubroboletus-satanas",
    title: "Cep vs. matagent: diferències amb un bolet tòxic",
    shortTitle: "Cep vs. matagent",
    metaDescription: "Com distingir el cep del matagent tòxic: porus, peu, reticle, blaveig de la carn, hàbitat i advertiments de seguretat.",
    introduction: "El matagent és un bolet gros i tòxic que una observació superficial pot fer entrar dins el grup dels ceps. Els colors dels porus i del peu, juntament amb la reacció de la carn, els separen clarament.",
    decisiveDifference: "El matagent té porus vermells, peu groc i vermell i carn que blaveja; el cep té porus blancs a olivacis, reticle clar i carn blanca immutable.",
  },
  {
    slug: "cep-vs-mataparent",
    leftSpeciesId: "boletus-edulis",
    rightSpeciesId: "tylopilus-felleus",
    title: "Cep vs. mataparent: com distingir-los",
    shortTitle: "Cep vs. mataparent",
    metaDescription: "Com distingir el cep del mataparent amarg: porus, reticle, carn, hàbitat, temporada i fotografies de referència.",
    introduction: "El mataparent pot recordar un cep per la forma robusta, però no és comestible i pot arruïnar tot un plat pel gust extremadament amarg. Cal revisar sobretot porus i reticle del peu.",
    decisiveDifference: "El mataparent desenvolupa porus rosats i un reticle fosc; el cep té porus blancs que passen a groc olivaci i reticle clar.",
  },
  {
    slug: "camperol-vs-farinera-borda",
    leftSpeciesId: "agaricus-campestris",
    rightSpeciesId: "amanita-phalloides",
    title: "Camperol vs. farinera borda: diferències vitals",
    shortTitle: "Camperol vs. farinera borda",
    metaDescription: "Diferències vitals entre camperol i farinera borda: làmines, volva, base del peu, hàbitat i risc d’intoxicació mortal.",
    introduction: "Els exemplars pàl·lids poden generar una confusió extremadament perillosa entre el camperol i la farinera borda mortal. Cal desenterrar la base sencera i revisar el canvi de color de les làmines.",
    decisiveDifference: "El camperol no té volva i les làmines passen de rosades a xocolata; la farinera borda conserva les làmines blanques i presenta una volva en sac a la base.",
  },
  {
    slug: "girgola-vs-bolet-olivera",
    leftSpeciesId: "pleurotus-ostreatus",
    rightSpeciesId: "omphalotus-olearius",
    title: "Gírgola vs. bolet d’olivera: com distingir-los",
    shortTitle: "Gírgola vs. bolet d’olivera",
    metaDescription: "Compareu la gírgola comestible i el bolet d’olivera tòxic per color, peu, làmines, fusta associada i forma de creixement.",
    introduction: "La gírgola i el bolet d’olivera poden créixer en grups sobre fusta, però només la primera és comestible. El color de tot el carpòfor, la forma del peu i les làmines permeten orientar la separació.",
    decisiveDifference: "La gírgola és gris o crema, amb peu lateral curt i làmines blanques; el bolet d’olivera és taronja, més fibrós i forma feixos sobre arrels o soques.",
  },
  {
    slug: "rovello-vs-pinetell",
    leftSpeciesId: "lactarius-sanguifluus",
    rightSpeciesId: "lactarius-deliciosus",
    title: "Rovelló vs. pinetell: diferències i identificació",
    shortTitle: "Rovelló vs. pinetell",
    metaDescription: "Rovelló o pinetell? Compareu el color del làtex, el barret, l’hàbitat, la temporada i els trets que els diferencien.",
    introduction: "Tots dos són lactaris comestibles associats als pins i sovint comparteixen el nom popular de rovelló. El color del làtex és el tret macroscòpic més útil per començar a separar-los.",
    decisiveDifference: "El rovelló segrega làtex vermell vinós; el pinetell, làtex taronja o color pastanaga.",
  },
  {
    slug: "ou-de-reig-vs-farinera-borda",
    leftSpeciesId: "amanita-caesarea",
    rightSpeciesId: "amanita-phalloides",
    title: "Ou de reig vs. farinera borda: confusió mortal",
    shortTitle: "Ou de reig vs. farinera borda",
    metaDescription: "Compareu l’ou de reig i la farinera borda mortal: làmines, peu, anell, volva, colors i advertiments de seguretat.",
    introduction: "Dues amanites amb volva que mai s’han d’identificar només pel color del barret, especialment quan són joves o encara tancades. La farinera borda és mortal.",
    decisiveDifference: "L’ou de reig presenta làmines, peu i anell grocs; la farinera borda els té blancs i el barret pot variar del verd oliva al gairebé blanc.",
  },
  {
    slug: "fredolic-vs-fredolic-metzinos",
    leftSpeciesId: "tricholoma-terreum",
    rightSpeciesId: "tricholoma-pardinum",
    title: "Fredolic vs. fredolic metzinós: diferències clau",
    shortTitle: "Fredolic vs. fredolic metzinós",
    metaDescription: "Compareu el fredolic i el fredolic metzinós tòxic: mida, consistència, escates del barret, làmines, hàbitat i risc digestiu.",
    introduction: "El nom i els tons grisos fan que el fredolic comestible amb condicions es pugui confondre amb el fredolic metzinós. Cal valorar la mida, la robustesa i el dibuix del barret, no un sol tret aïllat.",
    decisiveDifference: "El fredolic és petit, fràgil i de carn prima, amb fibres o escates fines; el fredolic metzinós és més gros i massís, amb escates tigrades fosques i contrastades.",
  },
  {
    slug: "camasec-vs-candeleta-vorada",
    leftSpeciesId: "marasmius-oreades",
    rightSpeciesId: "clitocybe-rivulosa",
    title: "Camasec vs. candeleta de vorada: evitar la confusió",
    shortTitle: "Camasec vs. candeleta de vorada",
    metaDescription: "Diferències entre el camasec comestible i la candeleta de vorada molt tòxica: làmines, peu, barret i creixement als prats.",
    introduction: "Totes dues espècies poden sortir en prats, gespes i rotllanes, de manera que el lloc de creixement no resol la identificació. La candeleta de vorada conté muscarina i exigeix revisar cada exemplar.",
    decisiveDifference: "El camasec té làmines molt espaiades, barret ocre higròfan i un peu tenaç que es doblega; la candeleta és blanquinosa, amb làmines denses i decurrents i peu més fràgil.",
  },
  {
    slug: "moixero-vs-inocibe-patouillard",
    leftSpeciesId: "calocybe-gambosa",
    rightSpeciesId: "inocybe-erubescens",
    title: "Moixeró vs. inocibe de Patouillard: confusió greu",
    shortTitle: "Moixeró vs. inocibe de Patouillard",
    metaDescription: "Compareu el moixeró comestible i l’inocibe de Patouillard molt tòxic: barret, làmines, enrogiment, olor i temporada.",
    introduction: "El moixeró i l’inocibe de Patouillard poden coincidir a la primavera i mostrar tons blancs o crema quan són joves. L’enrogiment pot aparèixer tard, per això cal revisar també la textura del barret i les làmines.",
    decisiveDifference: "El moixeró és carnós, amb làmines blanques molt denses i barret llis; l’inocibe té el barret fibril·lós, s’enrogeix progressivament i les làmines s’enfosqueixen.",
  },
  {
    slug: "murgola-vs-bolet-greix",
    leftSpeciesId: "morchella-esculenta",
    rightSpeciesId: "gyromitra-esculenta",
    title: "Múrgola vs. bolet de greix: una confusió perillosa",
    shortTitle: "Múrgola vs. bolet de greix",
    metaDescription: "Diferències entre la múrgola i el bolet de greix molt tòxic: forma del barret, unió amb el peu, interior i seguretat de consum.",
    introduction: "La múrgola i el bolet de greix fructifiquen a la primavera i tenen barrets irregulars, però no comparteixen la mateixa estructura. El bolet de greix és tòxic i no s’ha de considerar una alternativa culinària.",
    decisiveDifference: "La múrgola té un barret alveolat com una bresca i és buida de dalt a baix; el bolet de greix té lòbuls cerebriformes i una estructura interna irregular o compartimentada.",
  },
  {
    slug: "carlet-vs-carner-bord",
    leftSpeciesId: "hygrophorus-russula",
    rightSpeciesId: "entoloma-sinuatum",
    title: "Carlet vs. carner bord: com distingir-los",
    shortTitle: "Carlet vs. carner bord",
    metaDescription: "Compareu el carlet comestible i el carner bord tòxic: coloració, làmines, esporada, carn, hàbitat i temporada de tardor.",
    introduction: "El carlet i el carner bord són bolets carnosos de planifolis que poden compartir temporada i tons pàl·lids. El color que prenen les làmines i la textura de l’himeni són dades molt més útils que la mida.",
    decisiveDifference: "El carlet presenta taques vinós-rosades, làmines ceroses decurrents i esporada blanca; el carner bord té làmines sinuades que passen de groc crema a rosa salmó.",
  },
];

export const comparisonPagesBySlug = Object.fromEntries(
  comparisonPages.map((page) => [page.slug, page]),
);

export function comparisonPagesForSpecies(speciesId: string) {
  return comparisonPages.filter((page) => (
    page.leftSpeciesId === speciesId || page.rightSpeciesId === speciesId
  ));
}
