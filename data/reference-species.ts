import type { ReferenceSpeciesProfile } from "@/src/lib/types";
import { charcoalBurnerSources, commonPuffballSources, falseChanterelleSources, giantPuffballSources } from "@/data/field-guide-sources";
import { officialSafetySource } from "@/data/editorial";
import { speciesMedia } from "@/data/species-media";
import { referenceSpeciesAdditions } from "@/data/reference-species-additions";

// Describe only what the cited sources establish. These records never enter the
// weather model, habitat cache, map selector or quantified monthly calendar.
const originalReferenceSpeciesProfiles: ReferenceSpeciesProfile[] = [{
  speciesId: "hygrophoropsis-aurantiaca",
  scope: "reference-only",
  identity: {
    commonName: "Fals rossinyol",
    alternateNames: ["pixacà taronja"],
    scientificName: "Hygrophoropsis aurantiaca",
    family: "Hygrophoropsidaceae",
    genus: "Hygrophoropsis",
    edibility: "not_recommended",
    identificationDifficulty: "Cal contrastar diversos trets",
    typicalSize: "Barret de 4–8 cm",
    shortDescription: "Bolet taronja de làmines fines i bifurcades, habitual a la tardor. No es recomana consumir-lo; es pot confondre amb el rossinyol i el bolet d’olivera.",
  },
  morphology: {
    cap: "De 4–8 cm, inicialment convex i després enfonsat al centre, fins a prendre forma d’embut. El marge és cargolat cap endins i la superfície té un tacte finament vellutat.",
    hymenium: "Làmines taronja, primes i molt juntes, amb bifurcacions. Baixen pel peu: aquesta disposició s’anomena decurrent.",
    stem: "Prim, cilíndric o una mica més estret a baix, de color taronja; la base pot enfosquir-se. Aranzadi en descriu una llargada de 2–8 cm.",
    flesh: "Groga ataronjada i poc consistent.",
    colour: "Del groc ataronjat al taronja rogenc.",
    smell: "No es fa servir l’olor com a tret de confirmació en aquesta fitxa.",
    texture: "La carn és prima; el barret pot tenir una superfície finament vellutada.",
    typicalAppearance: "Petit bolet ataronjat amb el centre del barret deprimit, peu prim i làmines que baixen pel peu.",
    keyFeatures: ["Làmines fines i bifurcades", "Làmines decurrents", "Tons taronja", "Peu prim"],
    variation: "El barret es va obrint i enfonsant amb la maduració. El color o la forma, per si sols, no confirmen l’espècie.",
  },
  similarSpecies: [
    {
      scientificName: "Cantharellus cibarius", commonName: "Rossinyol",
      mainDifferences: "Té plecs a la cara inferior, no les làmines fines i atapeïdes del fals rossinyol. Cal observar el conjunt de l’exemplar, no només el color.",
      edibility: "excellent_edible", toxicity: "La comestibilitat del rossinyol no es pot atribuir a un exemplar que només s’hi assembli.", warning: true,
    },
    {
      scientificName: "Omphalotus olearius", commonName: "Bolet d’olivera",
      mainDifferences: "També és taronja i té làmines; la ICHN en destaca el peu excèntric i el creixement sobre fusta. És una espècie diferent i tòxica.",
      edibility: "toxic", toxicity: "No consumir: és tòxic.", warning: true,
    },
  ],
  ecology: {
    habitats: ["Pinedes i rouredes", "Boscos de coníferes"],
    season: "Tardor",
    description: "La ICHN el documenta a la tardor en pinedes i rouredes. Aranzadi també en situa l’aparició tardorenca en boscos de coníferes.",
    limitations: "El bosc i l’època ajuden a descriure la troballa, però no confirmen l’espècie. No disposem de dades suficients per oferir-ne un mapa d’hàbitat o unes condicions actuals fiables.",
  },
  safetyNotice: "No consumiu cap exemplar dubtós. Aquesta fitxa és educativa i les fotografies no substitueixen la identificació per una persona experta.",
  culinaryProfile: {
    kind: "safety", rating: 0, ratingLabel: "No recomanat",
    ratingRationale: "La ICHN el considera no comestible; Aranzadi el classifica com a sospitós i sense valor culinari.",
    summary: "No el considereu un bolet per al consum. La diferència entre les etiquetes de les fonts no significa que sigui segur menjar-ne.",
    cautions: ["No el tasteu per intentar identificar-lo.", "Una semblança amb un rossinyol no és una garantia de comestibilitat."],
    sources: [...falseChanterelleSources, officialSafetySource],
  },
  references: [...falseChanterelleSources, officialSafetySource],
  media: speciesMedia["hygrophoropsis-aurantiaca"] ?? [],
  confidence: "limited",
}, {
  speciesId: "lycoperdon-perlatum",
  scope: "reference-only",
  identity: {
    commonName: "Pet de llop perlat",
    alternateNames: ["pet de llop", "esclatabufa", "pet de bou"],
    scientificName: "Lycoperdon perlatum",
    family: "Agaricaceae", genus: "Lycoperdon",
    edibility: "edible_with_conditions",
    identificationDifficulty: "Cal examinar també l’interior",
    typicalSize: "Cos fructífer de 3–8 cm",
    shortDescription: "Pet de llop en forma de pera, amb petits agullons que deixen marques en caure. L’interior es torna pols d’espores en madurar.",
  },
  morphology: {
    cap: "No té barret separat: forma un cos blanc o crema, arrodonit a dalt i més estret a la base. La superfície porta agullons cònics.",
    hymenium: "No té làmines. Les espores es formen a l’interior, en una massa anomenada gleba, i surten per una obertura al capdamunt.",
    stem: "La base allargada continua el cos fructífer i recorda un peu curt.",
    flesh: "La gleba jove és blanca; després s’enfosqueix fins a esdevenir polsegosa.",
    colour: "Blanc d’ivori de jove, més grisenc o brunenc en madurar.",
    smell: "L’olor no es fa servir com a criteri de confirmació.",
    texture: "Els agullons es desprenen i deixen petites marques a la pell.",
    typicalAppearance: "Una petita pera invertida amb la superfície perlada.",
    keyFeatures: ["Cos en forma de pera", "Agullons que es desprenen", "Sense làmines", "Obertura apical en madurar"],
    variation: "Els exemplars vells perden els agullons. El nom pet de llop també s’aplica a altres espècies: el nom popular no confirma la identificació.",
  },
  similarSpecies: [
    {
      scientificName: "Calvatia gigantea", commonName: "Pet de llop gegant",
      mainDifferences: "Té una superfície llisa i un cos globós que pot assolir dimensions molt més grans, sense la base allargada del pet de llop perlat.",
      edibility: "edible_with_conditions", toxicity: "La comestibilitat es limita als exemplars joves correctament identificats.", warning: true,
    },
    {
      scientificName: "Lycoperdon utriforme", commonName: "Pet de llop gros",
      mainDifferences: "És més gran i ample, propi sobretot de prats, i la superfície es divideix en plaques piramidals romes que formen un mosaic.",
      edibility: "not_recommended", toxicity: "La fitxa adopta un criteri conservador perquè les fonts discrepen sobre l’interès culinari.", warning: true,
    },
    {
      scientificName: "Amanita phalloides", commonName: "Farinera borda",
      mainDifferences: "Una amanita encara tancada dins el vel pot semblar una bola blanca. Un tall longitudinal revela estructures de barret, làmines i peu en formació.",
      edibility: "dangerously_toxic", toxicity: "Pot causar una intoxicació mortal.", warning: true,
    },
  ],
  ecology: {
    habitats: ["Boscos i clarianes", "Prats"],
    season: "De primavera a tardor",
    description: "La ICHN el documenta en ambients de bosc i de prat. Aranzadi en descriu l’aparició de primavera a tardor sota planifolis i coníferes.",
    limitations: "Aquesta descripció no permet calcular unes condicions actuals ni delimitar un mapa d’hàbitat fiable per a l’espècie.",
  },
  safetyNotice: "Un interior blanc no basta per confirmar un pet de llop. No consumiu exemplars dubtosos ni inhaleu la pols d’espores dels exemplars madurs.",
  culinaryProfile: {
    kind: "culinary", rating: 1, ratingLabel: "Interès limitat",
    ratingRationale: "Irish Wildlife Trust el considera comestible de jove; Aranzadi li atribueix poc interès culinari.",
    summary: "Només es considera comestible quan és jove i la gleba és completament blanca, després d’una identificació segura i una cocció adequada.",
    flavour: "No es destaca cap aroma culinària en aquesta fitxa.", texture: "Interior compacte de jove, polsegós en madurar.",
    bestUses: ["Consum cuinat d’exemplars joves identificats amb certesa"],
    preparation: ["Examineu tot l’exemplar, inclòs un tall longitudinal de dalt a baix.", "Descarteu-lo si hi ha estructures internes de barret o peu, o si la gleba ja no és blanca.", "Cuineu-lo bé; la cocció no fa segur un bolet mal identificat."],
    preservation: ["No es proposa cap pauta de conservació específica en aquesta fitxa."],
    cautions: ["Es pot confondre amb amanites immadures, algunes de mortals.", "No mengeu exemplars amb l’interior groc, bru o polsegós."],
    sources: [...commonPuffballSources, officialSafetySource],
  },
  references: [...commonPuffballSources, giantPuffballSources[0], officialSafetySource],
  media: speciesMedia["lycoperdon-perlatum"] ?? [],
  confidence: "limited",
}, {
  speciesId: "calvatia-gigantea",
  scope: "reference-only",
  identity: {
    commonName: "Pet de llop gegant",
    alternateNames: ["esclatabufa gegant", "bufa del diable"],
    scientificName: "Calvatia gigantea",
    family: "Agaricaceae", genus: "Calvatia",
    edibility: "edible_with_conditions",
    identificationDifficulty: "Cal examinar també l’interior",
    typicalSize: "Pot arribar a 60 cm de diàmetre",
    shortDescription: "Bolet globós de grans dimensions, blanc i llis de jove. Creix en prats i pastures; la gleba es torna groguenca i polsegosa en madurar.",
  },
  morphology: {
    cap: "No té barret: tot el bolet forma una bola ampla, de superfície inicialment llisa i blanca.",
    hymenium: "No té làmines ni porus externs. Les espores maduren dins la gleba i s’alliberen quan la coberta es trenca.",
    stem: "No presenta un peu desenvolupat; queda unit al substrat per la base.",
    flesh: "Blanca i densa de jove, després més tova i groga verdosa, finalment bruna i polsegosa.",
    colour: "Blanc que evoluciona cap a ivori i tons brunencs.",
    smell: "L’olor no confirma la identificació ni l’aptitud per al consum.",
    texture: "La coberta es torna fràgil amb l’edat.",
    typicalAppearance: "Una gran bola blanca entre l’herba.",
    keyFeatures: ["Cos globós", "Superfície llisa", "Sense peu desenvolupat", "Gleba blanca només de jove"],
    variation: "La mida varia molt. Un exemplar petit no queda identificat pel sol fet de tenir forma de bola.",
  },
  similarSpecies: [
    {
      scientificName: "Lycoperdon perlatum", commonName: "Pet de llop perlat",
      mainDifferences: "És més petit, en forma de pera, amb una base allargada i agullons que deixen marques en desprendre’s.",
      edibility: "edible_with_conditions", toxicity: "Només es considera comestible de jove i amb identificació segura.", warning: true,
    },
    {
      scientificName: "Lycoperdon utriforme", commonName: "Pet de llop gros",
      mainDifferences: "És més petit que el gegant, té una base ampla i la superfície jove es clivella en plaques piramidals en mosaic en lloc de ser llisa.",
      edibility: "not_recommended", toxicity: "La fitxa adopta un criteri conservador perquè les fonts discrepen sobre l’interès culinari.", warning: true,
    },
    {
      scientificName: "Amanita phalloides", commonName: "Farinera borda",
      mainDifferences: "Els exemplars d’amanita encara tancats poden semblar petits pets de llop. El tall longitudinal mostra el barret, les làmines i el peu en formació.",
      edibility: "dangerously_toxic", toxicity: "Pot causar una intoxicació mortal.", warning: true,
    },
  ],
  ecology: {
    habitats: ["Prats i pastures"], season: "Estiu i tardor",
    description: "Aranzadi situa la fructificació a l’estiu i la tardor en prats i pastures. Aquesta fitxa descriu l’ambient general, no llocs de recol·lecció.",
    limitations: "No hi ha una configuració ecològica quantitativa validada per oferir-ne un mapa d’hàbitat o unes condicions actuals.",
  },
  safetyNotice: "No n’hi ha prou amb la mida o el color exterior. Cal una identificació segura; una bola blanca també pot ser un altre bolet encara immadur.",
  culinaryProfile: {
    kind: "culinary", rating: 1, ratingLabel: "Interès limitat",
    ratingRationale: "Aranzadi el considera comestible de jove, però poc apreciat. La valoració gastronòmica no és una garantia de seguretat.",
    summary: "El consum es limita als exemplars joves, ben identificats, amb tot l’interior blanc i homogeni. Cal descartar els que comencen a groguejar.",
    flavour: "La fitxa no atribueix una aroma específica a l’espècie.", texture: "Gleba densa de jove, progressivament tova.",
    bestUses: ["Llesques cuinades, un cop retirat el revestiment exterior"],
    preparation: ["Examineu un tall complet de dalt a baix: no hi ha d’haver estructures de barret, làmines o peu.", "Retireu la pell exterior i cuineu-lo bé."],
    preservation: ["No es proposa cap pauta de conservació específica en aquesta fitxa."],
    cautions: ["Un interior blanc és una condició necessària, però no confirma tot sol l’espècie.", "No consumiu exemplars madurs ni recollits en gespes tractades amb productes químics."],
    sources: [...giantPuffballSources, officialSafetySource],
  },
  references: [...giantPuffballSources, commonPuffballSources[0], officialSafetySource],
  media: speciesMedia["calvatia-gigantea"] ?? [],
  confidence: "limited",
}, {
  speciesId: "russula-cyanoxantha",
  scope: "reference-only",
  identity: {
    commonName: "Llora aspra",
    alternateNames: ["llora", "blavet", "puagra llora", "palomins", "cualbra"],
    scientificName: "Russula cyanoxantha",
    family: "Russulaceae", genus: "Russula",
    edibility: "excellent_edible",
    identificationDifficulty: "Cal contrastar diversos trets",
    typicalSize: "Barret de 6–15 cm",
    shortDescription: "Llora de colors variables, sovint violacis o verdosos, amb làmines blanques i flexibles. Cal distingir-la d’altres rússules i de la farinera borda.",
  },
  morphology: {
    cap: "Carnós, inicialment convex i després aplanat o deprimit al centre. La pell pot lluir i tornar-se viscosa amb la humitat.",
    hymenium: "Làmines blanques, atapeïdes, elàstiques i de tacte greixós: un tret útil dins el grup de les rússules.",
    stem: "Robust i cilíndric, blanc o amb matisos violacis, sense anell ni volva.",
    flesh: "Blanca, gruixuda i trencadissa; pot tenir un matís violaci sota la pell del barret.",
    colour: "Barret de tons verds, grisos o violacis, sovint barrejats.",
    smell: "Olor feble, sense un caràcter decisiu per identificar-la.",
    texture: "La carn és granulosa; les làmines són flexibles.",
    typicalAppearance: "Bolet robust, amb barret de color variable i peu clar.",
    keyFeatures: ["Làmines blanques flexibles", "Barret de color variable", "Carn trencadissa", "Sense anell ni volva"],
    variation: "Hi ha exemplars predominantment verds i d’altres violacis. El color no basta per separar-la d’altres bolets.",
  },
  similarSpecies: [
    {
      scientificName: "Russula virescens", commonName: "Llora verda",
      mainDifferences: "La llora verda sol mostrar la superfície del barret dividida en plaques verdoses. Cal valorar també la resta de trets.",
      edibility: "edible", toxicity: "La semblança amb una llora comestible no confirma la identificació.", warning: true,
    },
    {
      scientificName: "Amanita phalloides", commonName: "Farinera borda",
      mainDifferences: "Pot compartir tons verdosos, però presenta carn fibrosa, anell i una volva a la base. Cal examinar l’exemplar sencer: la volva pot quedar enterrada.",
      edibility: "dangerously_toxic", toxicity: "Pot causar una intoxicació mortal.", warning: true,
    },
  ],
  ecology: {
    habitats: ["Boscos de planifolis", "Boscos de coníferes"], season: "Estiu i tardor",
    description: "Aranzadi la descriu a l’estiu i la tardor, especialment sota faigs, roures i castanyers. La Sociedad Micológica Extremeña també la documenta en suredes i alzinars.",
    limitations: "Les fonts descriuen hàbitats i temporada, però no proporcionen una configuració numèrica validada per calcular-ne la predicció.",
  },
  safetyNotice: "No tasteu exemplars desconeguts per identificar-los. Davant d’un dubte, descarteu-ne el consum i consulteu una persona experta.",
  culinaryProfile: {
    kind: "culinary", rating: 3, ratingLabel: "Excel·lent",
    ratingRationale: "Aranzadi i la Sociedad Micológica Extremeña la destaquen per la seva qualitat culinària.",
    summary: "És una llora apreciada a la cuina quan la identificació és segura. Els tons verdosos obliguen a descartar la confusió amb la farinera borda.",
    flavour: "Sabor suau i olor feble descrits a les fonts; no són una prova d’identificació.", texture: "Carn ferma i granulosa.",
    bestUses: ["Preparacions cuinades amb exemplars sans i ben identificats"],
    preparation: ["Examineu l’exemplar complet, inclosa la base del peu.", "Netegeu-lo i cuineu-lo bé; la cocció no elimina la toxicitat d’una amanita confosa."],
    preservation: ["No es proposa cap pauta de conservació específica en aquesta fitxa."],
    cautions: ["El color del barret no és una garantia d’identificació.", "La farinera borda és una confusió potencialment mortal."],
    sources: [...charcoalBurnerSources, officialSafetySource],
  },
  references: [...charcoalBurnerSources, officialSafetySource],
  media: speciesMedia["russula-cyanoxantha"] ?? [],
  confidence: "limited",
}];

export const referenceSpeciesProfiles: ReferenceSpeciesProfile[] = [
  ...originalReferenceSpeciesProfiles,
  ...referenceSpeciesAdditions,
];

export function getReferenceSpecies(id: string) {
  return referenceSpeciesProfiles.find(species => species.speciesId === id);
}

export function getReferenceSpeciesByScientificName(name: string) {
  const normalized = name.trim().toLocaleLowerCase("la");
  return referenceSpeciesProfiles.find(species => species.identity.scientificName.toLocaleLowerCase("la") === normalized);
}
