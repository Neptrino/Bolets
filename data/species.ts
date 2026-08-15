import type { Month, SeasonalActivity, SpeciesProfile } from "@/src/lib/types";
import { culinaryProfiles } from "@/data/culinary-profiles";
import { modelConfigForSpecies, TUBER_SHORT_TERM_CAVEAT } from "@/data/model-priors";
import { speciesGalleryMedia } from "@/data/species-gallery-media";
import { speciesMedia } from "@/data/species-media";

const safetyNotice =
  "Aquesta fitxa és educativa i no pot ser l’únic mètode d’identificació. No consumiu cap bolet si no n’heu confirmat la identificació amb una persona experta.";

const references = [
  { id: "fungacat", title: "FungaCAT — Banc de dades dels fongs de Catalunya", publisher: "Universitat de Barcelona / GBIF España", url: "https://ipt.gbif.es/resource?r=fungacat", confidence: "moderate" as const },
  { id: "gbif", title: "GBIF — Occurrence search", publisher: "Global Biodiversity Information Facility", url: "https://www.gbif.org/occurrence/search", confidence: "moderate" as const },
  { id: "gencat-edible", title: "Bolets: varietats i consum", publisher: "Canal Aliments — Generalitat de Catalunya", url: "https://canalaliments.gencat.cat/ca/coneix-aliments/bolets-tofona/bolets/", confidence: "moderate" as const },
  { id: "gencat-toxic", title: "Bolets: consells de seguretat alimentària", publisher: "Agència Catalana de Seguretat Alimentària", url: "https://acsa.gencat.cat/ca/detall/article/Bolets", confidence: "moderate" as const },
  { id: "scm-toxic", title: "Bolets tòxics de Catalunya", publisher: "Societat Catalana de Micologia", url: "https://www.micocat.org/UNCINULA09/micologia09/Toxicologia/BoletsToxics_v07.pdf", confidence: "moderate" as const },
  { id: "species-fungorum", title: "Species Fungorum — Names and synonymy", publisher: "Royal Botanic Gardens, Kew", url: "https://www.speciesfungorum.org/names/names.asp", confidence: "moderate" as const }
];

const months: Month[] = ["gen", "feb", "mar", "abr", "mai", "jun", "jul", "ago", "set", "oct", "nov", "des"];
export const speciesProfiles: SpeciesProfile[] = [];

// High-priority toxic species are full profiles so they are discoverable in
// the catalogue, not only mentioned as lookalikes on edible species pages.
speciesProfiles.push(
  safetyProfile({
    speciesId: "rubroboletus-satanas",
    identity: { commonName: "Matagent", alternateNames: ["mataparent"], scientificName: "Rubroboletus satanas", family: "Boletaceae", genus: "Rubroboletus", edibility: "dangerously_toxic", identificationDifficulty: "Alta", typicalSize: "Barret de 6–30 cm", shortDescription: "Bolet gros de porus vermells i peu inflat de colors vius, tòxic i fàcil de confondre amb ceps." },
    morphology: { cap: "Hemisfèric a convex, blanquinós, gris pàl·lid o ocraci, sovint mat.", hymenium: "Porus grocs de jove que passen a taronja i vermell.", stem: "Curt, molt robust i inflat, groc a la part alta i vermellós cap a la base, amb reticle.", flesh: "Blanca o groguenca, blaveja ràpidament al tall.", colour: "Barret pàl·lid, porus vermells i peu groc-vermell.", smell: "Feble o desagradable en madurar.", texture: "Molt carnosa i compacta.", typicalAppearance: "Bolet massís de barret pàl·lid, porus vermells i cama acolorida.", keyFeatures: ["Porus vermells", "Peu inflat amb tons vermells", "Blaveig al tall", "Associació freqüent a sòls calcaris"], variation: "Els tons i la intensitat del blaveig varien amb l’edat i la humitat; cap prova casolana confirma la comestibilitat." },
    similarSpecies: [{ scientificName: "Boletus edulis", commonName: "Cep", mainDifferences: "El cep té porus blancs a olivacis, reticle clar i carn que no blaveja.", edibility: "excellent_edible", toxicity: "Sense toxicitat coneguda.", warning: true }, { scientificName: "Boletus aereus", commonName: "Cep negre", mainDifferences: "Té porus sense tons vermells i barret bru molt fosc.", edibility: "excellent_edible", toxicity: "Sense toxicitat coneguda.", warning: true }],
    ecologicalConfig: { habitat: { forestTypes: ["Alzinars", "rouredes i boscos caducifolis"], treeAssociations: ["Quercus ilex", "Quercus pubescens", "Quercus faginea"], hosts: ["Quercus"], soilPreference: "Neutre a calcari", substrate: "Calcari", moisture: "Fresca després de pluja", altitude: [100, 1200], slope: "Variable", aspect: "Variable", shade: "Mitjana", landscapePosition: "Boscos caducifolis i clarianes sobre substrat calcari" }, soil: { texture: "Franca a argilosa", reaction: "Neutra a alcalina", phRange: [6.5, 8.5], substrate: "Calcari", organicMatter: "Moderada", drainage: "Bo", waterRetention: "Mitjana", depth: "Mitjana", humus: "Mull de planifolis", evidence: "limited" }, climate: { temperatureRange: [14, 25], nightPreference: "Suau", relativeHumidity: "Moderada", soilMoisture: "Mitjana", rainfall: "Pluges d’estiu o tardor", drought: "Desfavorable", heat: "La calor seca és desfavorable", frost: "Atura la fructificació", wind: "Vent sec desfavorable", snow: "No rellevant" }, rainfall: { preferredAccumulation: "Pluja efectiva amb sòl rehidratat", fruitingDelay: "Dies a setmanes", priorMoisture: "Important", temperatureAfterRain: "Temperada", interruption: "Sequera o calor persistent", uncertainty: "La fructificació és local i irregular." }, seasonality: season({ ago: "possible", set: "good", oct: "peak", nov: "moderate" }), regions: ["prepirineus", "catalunya-central", "serralades-prelitorals", "montseny", "muntanyes-interiors", "ports"] },
    idealConditions: ["Boscos de planifolis sobre sòl calcari", "Porus vermells i peu acolorit: no consumir", "El blaveig no és una prova de toxicitat, però reforça la necessitat de descartar-lo"]
  }),
  safetyProfile({
    speciesId: "tylopilus-felleus",
    identity: { commonName: "Mataparent", alternateNames: ["fals cep", "bolet amarg"], scientificName: "Tylopilus felleus", family: "Boletaceae", genus: "Tylopilus", edibility: "inedible", identificationDifficulty: "Mitjana", typicalSize: "Barret de 5–15 cm", shortDescription: "Bolet semblant a un cep, de porus rosats i gust intensament amarg; és una confusió culinària molt important, encara que no sigui considerat tòxic." },
    morphology: { cap: "Convex, bru o ocraci, sovint amb superfície seca i una mica vellutada.", hymenium: "Porus blancs que es tornen rosats o de color carn amb l’edat.", stem: "Robust, pàl·lid, amb reticle bru fosc molt marcat.", flesh: "Blanca, generalment immutable al tall.", colour: "Bruns, crema i rosat als porus.", smell: "Suau, poc distintiu.", texture: "Ferm i carnós.", typicalAppearance: "Aspecte de cep amb porus rosats i xarxa fosca al peu.", keyFeatures: ["Porus rosats", "Reticle bru fosc", "Gust extremadament amarg"], variation: "El color dels porus depèn de la maduresa; no s’ha de tastar un exemplar dubtós per identificar-lo." },
    similarSpecies: [{ scientificName: "Boletus edulis", commonName: "Cep", mainDifferences: "El cep té porus blancs a olivacis i reticle clar; el mataparent té porus rosats i xarxa fosca.", edibility: "excellent_edible", toxicity: "Sense toxicitat coneguda.", warning: true }, { scientificName: "Boletus reticulatus", commonName: "Cep d’estiu", mainDifferences: "El cep d’estiu té porus clars i reticle més pàl·lid.", edibility: "excellent_edible", toxicity: "Sense toxicitat coneguda.", warning: true }],
    ecologicalConfig: { habitat: { forestTypes: ["Pinedes", "rouredes i fagedes"], treeAssociations: ["Pinus", "Quercus", "Fagus"], hosts: ["Pinus", "Quercus", "Fagus"], soilPreference: "Àcid a neutre", substrate: "Silícic o descarbonatat", moisture: "Fresca", altitude: [200, 1800], slope: "Variable", aspect: "Vessants frescos", shade: "Mitjana", landscapePosition: "Bosc madur i vores protegides" }, soil: { texture: "Franca a francoarenosa", reaction: "Àcida a neutra", phRange: [4.5, 7], substrate: "Silícic o descarbonatat", organicMatter: "Moderada", drainage: "Bo", waterRetention: "Mitjana", depth: "Mitjana", humus: "Mull", evidence: "limited" }, climate: { temperatureRange: [8, 20], nightPreference: "Fresca", relativeHumidity: "Moderada a alta", soilMoisture: "Mitjana", rainfall: "Pluges regulars", drought: "Desfavorable", heat: "Desfavorable", frost: "Atura la fructificació", wind: "Dessecant", snow: "No rellevant" }, rainfall: { preferredAccumulation: "Humitat sostinguda del sòl", fruitingDelay: "Dies a setmanes", priorMoisture: "Important", temperatureAfterRain: "Fresca", interruption: "Sequera", uncertainty: "La fructificació depèn del bosc i de l’any." }, seasonality: season({ jun: "possible", jul: "moderate", ago: "good", set: "peak", oct: "good", nov: "possible" }), regions: ["pirineus", "prepirineus", "catalunya-central", "montseny", "muntanyes-interiors"] },
    idealConditions: ["Boscos amb pins, roures o faigs", "No és comestible pel gust amarg", "No feu proves de tast quan hi hagi dubte d’identificació"]
  }),
  safetyProfile({
    speciesId: "amanita-muscaria",
    identity: { commonName: "Reig bord", alternateNames: ["matamosques"], scientificName: "Amanita muscaria", family: "Amanitaceae", genus: "Amanita", edibility: "toxic", identificationDifficulty: "Baixa a mitjana", typicalSize: "Barret de 8–20 cm", shortDescription: "Amanita vermella amb berrugues blanques, tòxica i responsable de síndromes neurològiques." },
    morphology: { cap: "Vermell viu a ataronjat, convex i després estès, amb berrugues blanques que es poden perdre amb la pluja.", hymenium: "Làmines lliures i blanques.", stem: "Blanc, robust, amb anell i base bulbosa amb restes de volva.", flesh: "Blanca, sota la cutícula groguenca o vermellosa.", colour: "Vermell, blanc i groc pàl·lid.", smell: "Feble.", texture: "Carnosa i fràgil amb l’edat.", typicalAppearance: "Bolet vermell molt visible amb punts blancs i peu blanc.", keyFeatures: ["Barret vermell amb berrugues blanques", "Làmines blanques", "Anell i base bulbosa"], variation: "La pluja pot eliminar les berrugues i aclarir el barret; això no el converteix en comestible." },
    similarSpecies: [{ scientificName: "Amanita caesarea", commonName: "Ou de reig", mainDifferences: "L’ou de reig té làmines, peu i anell grocs i una volva blanca ampla.", edibility: "excellent_edible", toxicity: "Sense toxicitat coneguda quan s’identifica amb certesa.", warning: true }, { scientificName: "Amanita pantherina", commonName: "Pixacà", mainDifferences: "Més bruna o grisenca, amb toxicitat neurològica important.", edibility: "dangerously_toxic", toxicity: "Pot provocar intoxicació neurològica greu.", warning: true }],
    ecologicalConfig: { habitat: { forestTypes: ["Pinedes", "fagedes i boscos mixtos"], treeAssociations: ["Pinus", "Picea", "Betula", "Fagus"], hosts: ["Pinus", "Fagus", "Betula"], soilPreference: "Àcid a lleugerament àcid", substrate: "Silícic", moisture: "Fresca", altitude: [400, 2100], slope: "Variable", aspect: "Obagues i clarianes", shade: "Mitjana", landscapePosition: "Marges i clarianes de boscos de coníferes i planifolis" }, soil: { texture: "Franca a arenosa", reaction: "Àcida", phRange: [4, 6.5], substrate: "Silícic", organicMatter: "Moderada", drainage: "Bo", waterRetention: "Mitjana", depth: "Mitjana", humus: "Mull", evidence: "limited" }, climate: { temperatureRange: [7, 18], nightPreference: "Fresca", relativeHumidity: "Alta", soilMoisture: "Mitjana a alta", rainfall: "Pluges d’estiu i tardor", drought: "Desfavorable", heat: "Desfavorable", frost: "Atura la fructificació", wind: "Dessecant", snow: "Fora de temporada" }, rainfall: { preferredAccumulation: "Humitat sostinguda", fruitingDelay: "Dies a setmanes", priorMoisture: "Important", temperatureAfterRain: "Fresca", interruption: "Sequera", uncertainty: "Associacions i calendari varien amb l’altitud." }, seasonality: season({ ago: "possible", set: "good", oct: "peak", nov: "good" }), regions: ["pirineus", "prepirineus", "montseny", "muntanyes-interiors"] },
    idealConditions: ["Pinedes i boscos mixtos frescos", "No consumir: és tòxic encara que es pugui reconèixer visualment", "La cocció no converteix una identificació dubtosa en segura"]
  }),
  safetyProfile({
    speciesId: "cortinarius-rubellus",
    identity: { commonName: "Cortinari mortal", alternateNames: ["cortinari rogenc"], scientificName: "Cortinarius rubellus", family: "Cortinariaceae", genus: "Cortinarius", edibility: "dangerously_toxic", identificationDifficulty: "Molt alta", typicalSize: "Barret de 3–8 cm", shortDescription: "Cortinari rogenc que pot contenir orellanina i causar una intoxicació renal greu, sovint tardana." },
    morphology: { cap: "Cònic a convex, bru rogenc o ataronjat, fibril·lós i sovint amb mamelló.", hymenium: "Làmines primer groguenques i després rovellades per l’esporada.", stem: "Esvelt, fibril·lós, groc rogenc, amb restes de cortina.", flesh: "Groguenca o rogenca, sense blaveig destacat.", colour: "Rogenc, bru i rovell.", smell: "Terrosa o lleugerament de rave.", texture: "Fibrosa i seca.", typicalAppearance: "Cortinari petit de colors rovellats amb làmines que s’enfosqueixen.", keyFeatures: ["Esporada rovellada", "Restes de cortina", "Barret rogenc", "Risc renal tardà"], variation: "Els exemplars joves poden semblar petits bolets comestibles de làmines; cal revisar sempre els grups barrejats." },
    similarSpecies: [{ scientificName: "Craterellus tubaeformis", commonName: "Fals camagroc", mainDifferences: "El camagroc té plecs, no làmines veritables, i un peu buit; els cortinaris tenen esporada rovellada.", edibility: "edible", toxicity: "Sense toxicitat coneguda.", warning: true }, { scientificName: "Lepista nuda", commonName: "Pimpinella morada", mainDifferences: "És més robusta i violàcia, amb làmines clares i sense cortina rovellada.", edibility: "edible", toxicity: "Sense toxicitat coneguda un cop ben cuinada.", warning: true }],
    ecologicalConfig: { habitat: { forestTypes: ["Pinedes i boscos de coníferes"], treeAssociations: ["Pinus sylvestris", "Picea abies", "Betula pendula"], hosts: ["Pinus", "Picea", "Betula"], soilPreference: "Àcid", substrate: "Silícic", moisture: "Humida", altitude: [700, 2200], slope: "Variable", aspect: "Obaga", shade: "Alta", landscapePosition: "Molsa i sòls àcids de muntanya" }, soil: { texture: "Franca a arenosa", reaction: "Àcida", phRange: [4, 6], substrate: "Silícic", organicMatter: "Alta", drainage: "Bo", waterRetention: "Alta", depth: "Mitjana", humus: "Mull àcid", evidence: "limited" }, climate: { temperatureRange: [5, 16], nightPreference: "Freda", relativeHumidity: "Alta", soilMoisture: "Alta", rainfall: "Regular", drought: "Desfavorable", heat: "Desfavorable", frost: "Limita la fructificació", wind: "Dessecant", snow: "Habitual fora de temporada" }, rainfall: { preferredAccumulation: "Humitat persistent", fruitingDelay: "Dies a setmanes", priorMoisture: "Important", temperatureAfterRain: "Fresca", interruption: "Sequera", uncertainty: "La distribució és irregular i l’espècie és difícil de separar d’altres cortinaris." }, seasonality: season({ ago: "possible", set: "good", oct: "peak", nov: "good" }), regions: ["pirineus", "prepirineus", "muntanyes-interiors"] },
    idealConditions: ["Boscos àcids de muntanya", "No consumir cap cortinari rogenc o de làmines rovellades", "Els símptomes poden aparèixer tard i incloure lesió renal"]
  }),
  safetyProfile({
    speciesId: "omphalotus-olearius",
    identity: { commonName: "Bolet d’olivera", alternateNames: ["gírgola d’olivera", "fals rossinyol d’olivera"], scientificName: "Omphalotus olearius", family: "Omphalotaceae", genus: "Omphalotus", edibility: "toxic", identificationDifficulty: "Mitjana", typicalSize: "Barret de 5–15 cm", shortDescription: "Bolet taronja que creix en feixos sobre fusta o arrels, tòxic gastrointestinal i confusió del rossinyol." },
    morphology: { cap: "Convex i després deprimit, taronja viu a bru ataronjat, sovint en feixos.", hymenium: "Làmines taronja, nombroses i decurrents.", stem: "Curt, lateral o excèntric, taronja i fibrós.", flesh: "Taronja pàl·lida, fibrosa.", colour: "Taronja intens a ocre.", smell: "Fúngica, de vegades desagradable.", texture: "Fibrosa i més dura que un rossinyol.", typicalAppearance: "Feix de bolets taronja sobre soca, arrel o fusta enterrada.", keyFeatures: ["Creix sobre fusta", "Làmines veritables", "Color taronja uniforme", "Pot ser bioluminescent"], variation: "El color s’apaga amb l’edat i la bioluminescència no sempre és visible; no són criteris suficients per consumir-lo." },
    similarSpecies: [{ scientificName: "Cantharellus cibarius", commonName: "Rossinyol", mainDifferences: "El rossinyol té plecs gruixuts i irregulars, no làmines fines, i creix al sòl.", edibility: "excellent_edible", toxicity: "Sense toxicitat coneguda.", warning: true }, { scientificName: "Lactarius deliciosus", commonName: "Pinetell", mainDifferences: "El pinetell té làtex taronja i barret amb cercles concèntrics, no creix en feixos sobre fusta.", edibility: "excellent_edible", toxicity: "Sense toxicitat coneguda.", warning: true }],
    ecologicalConfig: { habitat: { forestTypes: ["Alzinars, suredes i boscos mediterranis"], treeAssociations: ["Olea europaea", "Quercus ilex", "Quercus suber"], hosts: ["Olea", "Quercus"], soilPreference: "Neutre a bàsic", substrate: "Fusta enterrada o soca", moisture: "Moderada", altitude: [0, 900], slope: "Variable", aspect: "Solell i fondalades", shade: "Mitjana", landscapePosition: "Arrels, soques i fusta enterrada" }, soil: { texture: "Variable", reaction: "Neutra a alcalina", phRange: [6, 8.5], substrate: "Lignícola", organicMatter: "Alta localment", drainage: "Variable", waterRetention: "Mitjana", depth: "Superficial", humus: "Restes llenyoses", evidence: "limited" }, climate: { temperatureRange: [14, 25], nightPreference: "Suau", relativeHumidity: "Moderada", soilMoisture: "Mitjana", rainfall: "Pluges de tardor", drought: "Desfavorable", heat: "Desfavorable si asseca la fusta", frost: "Atura la fructificació", wind: "Dessecant", snow: "No rellevant" }, rainfall: { preferredAccumulation: "Humitat de tardor", fruitingDelay: "Dies a setmanes", priorMoisture: "Important", temperatureAfterRain: "Suau", interruption: "Sequera", uncertainty: "La fructificació depèn de la fusta hoste." }, seasonality: season({ set: "possible", oct: "good", nov: "peak", des: "moderate" }), regions: ["serralades-costeres", "serralades-prelitorals", "emporda", "ports", "muntanyes-interiors"] },
    idealConditions: ["Feixos taronja sobre soques o arrels d’olivera i planifolis", "Làmines fines i separables: no confondre amb plecs de rossinyol", "Pot causar vòmits i diarrea intensos"]
  })
);

// Seasonal and commercially relevant gaps follow the safety-first catalogue.
speciesProfiles.push(
  profile({
    speciesId: "hygrophorus-marzuolus",
    identity: {
      commonName: "Marçot",
      alternateNames: ["bolet de neu", "llenega de primavera"],
      scientificName: "Hygrophorus marzuolus",
      family: "Hygrophoraceae",
      genus: "Hygrophorus",
      edibility: "edible",
      identificationDifficulty: "Alta",
      typicalSize: "Barret de 4–12 cm",
      shortDescription: "Higròfor robust de finals d’hivern, sovint mig enterrat sota pins, avets, faigs o roures de muntanya."
    },
    morphology: {
      cap: "Convex i després estès o irregular, blanquinós de jove i progressivament gris pissarra, llis i una mica viscós amb humitat.",
      hymenium: "Làmines blanques, gruixudes, espaiades, ceroses i d’adnates a decurrents.",
      stem: "Curt, gruixut, blanc a grisenc, ple i sense anell ni volva.",
      flesh: "Blanca, compacta i immutable.",
      colour: "Blanc, gris perla i gris pissarra.",
      smell: "Feble i agradable.",
      texture: "Carnosa, ferma i cerosa a les làmines.",
      typicalAppearance: "Bolet robust grisenc que emergeix entre la fullaraca o prop de clapes de neu en boscos frescos.",
      keyFeatures: ["Fructificació hivernal o primaveral", "Làmines ceroses espaiades", "Barret gris pissarra", "Absència d’anell i volva"],
      variation: "Pot restar gairebé enterrat i els exemplars joves són molt pàl·lids; cal veure la base sencera abans de descartar una amanita."
    },
    similarSpecies: [
      { scientificName: "Hygrophorus agathosmus", commonName: "Llenega olorosa", mainDifferences: "Fa una olor marcada d’ametlla amarga i fructifica sobretot a la tardor sota coníferes.", edibility: "edible", toxicity: "Sense toxicitat coneguda quan la identificació és segura." },
      { scientificName: "Entoloma hirtipes", commonName: "Entoloma de peu fibrós", mainDifferences: "És més esvelt, amb làmines que es tornen rosades i esporada rosa; no té làmines ceroses.", edibility: "toxic", toxicity: "Pot causar una intoxicació gastrointestinal.", warning: true }
    ],
    ecologicalConfig: {
      habitat: { forestTypes: ["Boscos de coníferes", "Pinedes", "Fagedes"], treeAssociations: ["Pinus sylvestris", "Pinus uncinata", "Abies alba", "Fagus sylvatica", "Quercus"], hosts: ["Pinus", "Abies", "Fagus", "Quercus"], soilPreference: "Àcid a alcalí", substrate: "Silícic o calcari", moisture: "Fresca a humida", altitude: [500, 2200], slope: "Variable", aspect: "Obaga", shade: "Mitjana a alta", landscapePosition: "Boscos montans i subalpins, sovint sota fullaraca o neu recent" },
      soil: { texture: "Franca a pedregosa", reaction: "Àcida a alcalina", phRange: [4.5, 8], substrate: "Silícic o calcari", organicMatter: "Moderada a alta", drainage: "Bo", waterRetention: "Mitjana a alta", depth: "Mitjana", humus: "Mull forestal", evidence: "limited" },
      climate: { temperatureRange: [2, 12], nightPreference: "Freda", relativeHumidity: "Alta", soilMoisture: "Alta", rainfall: "Humitat hivernal i desglaç", drought: "Molt desfavorable", heat: "Molt desfavorable", frost: "Tolera fred moderat, però no sòl glaçat persistent", wind: "Dessecant", snow: "El desglaç pot precedir la fructificació" },
      rainfall: { preferredAccumulation: "Sòl humit per pluges hivernals o desglaç", fruitingDelay: "Variable, lligat a l’escalfament progressiu del sòl", priorMoisture: "Molt important", temperatureAfterRain: "Freda a fresca", interruption: "Sòl glaçat, sequera o escalfament ràpid", uncertainty: "Espècie local i difícil de detectar perquè sovint resta enterrada." },
      seasonality: season({ gen: "possible", feb: "good", mar: "peak", abr: "good", mai: "moderate", jun: "possible" }),
      regions: ["pirineus", "prepirineus", "montseny", "muntanyes-interiors"]
    },
    idealConditions: ["Boscos frescos de muntanya", "2–12 °C amb sòl humit", "Final d’hivern i primavera segons l’altitud", "Extreure la base sencera per identificar-lo"]
  }),
  profile({
    speciesId: "tricholoma-portentosum",
    identity: {
      commonName: "Fredolic gros",
      alternateNames: ["fredolic llenegat", "caputxina"],
      scientificName: "Tricholoma portentosum",
      family: "Tricholomataceae",
      genus: "Tricholoma",
      edibility: "edible",
      identificationDifficulty: "Alta",
      typicalSize: "Barret de 5–12 cm",
      shortDescription: "Tricoloma gris de pinedes fredes, amb barret fibril·lós i tons grocs al peu i a les làmines."
    },
    morphology: {
      cap: "Convex i després estès, gris plom a gris bru, viscós amb humitat i recorregut per fibres radials fosques.",
      hymenium: "Làmines escotades, blanques i sovint amb reflexos grocs en madurar.",
      stem: "Cilíndric, blanc amb tons grocs, sobretot cap a la base, ple i sense anell.",
      flesh: "Blanca, groguenca sota la cutícula i immutable.",
      colour: "Gris, blanc i groc pàl·lid.",
      smell: "Farinosa i suau.",
      texture: "Carnosa, llisa i una mica viscosa al barret humit.",
      typicalAppearance: "Fredolic robust de barret gris ratllat radialment i zones groguenques sota pins.",
      keyFeatures: ["Fibres radials fosques", "Tons grocs al peu", "Làmines escotades", "Barret viscós amb humitat"],
      variation: "Els tons grocs poden ser febles i el barret s’aclareix quan s’asseca; els Tricholoma grisos exigeixen una comparació completa."
    },
    similarSpecies: [
      { scientificName: "Tricholoma pardinum", commonName: "Fredolic metzinós", mainDifferences: "És més massís i presenta escates tigrades, no simples fibres radials, normalment sense els tons grocs característics.", edibility: "toxic", toxicity: "Provoca una intoxicació gastrointestinal intensa.", warning: true },
      { scientificName: "Tricholoma virgatum", commonName: "Tricoloma virgós", mainDifferences: "Té un umbó punxegut, gust molt acre i manca dels tons grocs del fredolic gros.", edibility: "inedible", toxicity: "No és comestible pel gust acre i pot causar molèsties." }
    ],
    ecologicalConfig: {
      habitat: { forestTypes: ["Pinedes", "Boscos de coníferes", "Fagedes", "Rouredes"], treeAssociations: ["Pinus sylvestris", "Pinus uncinata", "Abies alba"], hosts: ["Pinus", "Abies"], soilPreference: "Àcid a neutre", substrate: "Silícic o descarbonatat", moisture: "Fresca", altitude: [500, 2200], slope: "Variable", aspect: "Fresca a obaga", shade: "Mitjana", landscapePosition: "Pinedes montanes i subalpines, sovint entre molsa i virosta" },
      soil: { texture: "Franca a francoarenosa", reaction: "Àcida a neutra", phRange: [4.5, 7], substrate: "Silícic o descarbonatat", organicMatter: "Moderada", drainage: "Bo", waterRetention: "Mitjana", depth: "Variable", humus: "Mull de coníferes", evidence: "limited" },
      climate: { temperatureRange: [3, 14], nightPreference: "Freda", relativeHumidity: "Alta", soilMoisture: "Mitjana a alta", rainfall: "Pluges de tardor i inici d’hivern", drought: "Molt desfavorable", heat: "Molt desfavorable", frost: "Pot persistir fins a les primeres gelades", wind: "Dessecant", snow: "Tanca la temporada" },
      rainfall: { preferredAccumulation: "Humitat regular al sòl de pineda", fruitingDelay: "Dies a setmanes després de pluges", priorMoisture: "Important", temperatureAfterRain: "Freda a fresca", interruption: "Sequera, calor o neu persistent", uncertainty: "Els Tricholoma grisos poden requerir revisió microscòpica i la producció varia molt entre anys." },
      seasonality: season({ set: "possible", oct: "good", nov: "peak", des: "good", gen: "possible" }),
      regions: ["pirineus", "prepirineus", "montseny", "muntanyes-interiors"]
    },
    idealConditions: ["Pinedes fredes de muntanya", "3–14 °C amb sòl humit", "Tardor avançada fins a les primeres nevades", "Descartar exemplars escatosos o sense tons grocs"]
  }),
  profile({
    speciesId: "russula-virescens",
    identity: {
      commonName: "Llora verda",
      alternateNames: ["cualbra verda", "puagra verda"],
      scientificName: "Russula virescens",
      family: "Russulaceae",
      genus: "Russula",
      edibility: "excellent_edible",
      identificationDifficulty: "Alta",
      typicalSize: "Barret de 5–15 cm",
      shortDescription: "Russula robusta de barret verd esquerdat en mosaic, apreciada però perillosa de collir sense descartar amanites verdes."
    },
    morphology: {
      cap: "Hemisfèric i després aplanat o deprimit, verd grisenc, amb la cutícula esquerdada en plaques o mosaic.",
      hymenium: "Làmines blanques o de color crema pàl·lid, denses i fràgils; esporada blanquinosa.",
      stem: "Blanc, cilíndric, compacte de jove, sense anell ni volva.",
      flesh: "Blanca, gruixuda i trencadissa com el guix.",
      colour: "Verd grisenc, blanc i crema.",
      smell: "Suau i poc distintiva.",
      texture: "Granulosa i molt fràgil al trencament.",
      typicalAppearance: "Russula robusta amb un mosaic verd característic sobre el barret i totes les parts inferiors blanques.",
      keyFeatures: ["Barret verd en mosaic", "Carn trencadissa", "Absència d’anell", "Absència de volva"],
      variation: "El mosaic pot ser poc visible en exemplars molt joves o molls; la base sempre s’ha de desenterrar sencera."
    },
    similarSpecies: [
      { scientificName: "Amanita phalloides", commonName: "Farinera borda", mainDifferences: "Té carn fibrosa, anell i una volva basal en sac; pot compartir colors verdosos.", edibility: "dangerously_toxic", toxicity: "Mortal per amatoxines.", warning: true },
      { scientificName: "Russula heterophylla", commonName: "Llora de làmines forcades", mainDifferences: "El barret és verd llis o només finament clivellat i les làmines solen ser més forcades.", edibility: "edible", toxicity: "Sense toxicitat coneguda quan la identificació és segura." }
    ],
    ecologicalConfig: {
      habitat: { forestTypes: ["Rouredes", "fagedes", "castanyedes i alzinars frescos"], treeAssociations: ["Quercus pubescens", "Quercus ilex", "Fagus sylvatica", "Castanea sativa"], hosts: ["Quercus", "Fagus", "Castanea"], soilPreference: "Àcid a neutre", substrate: "Silícic o descarbonatat", moisture: "Fresca", altitude: [100, 1500], slope: "Variable", aspect: "Temperada a fresca", shade: "Mitjana", landscapePosition: "Boscos madurs de planifolis i clarianes protegides" },
      soil: { texture: "Franca a francoarenosa", reaction: "Àcida a neutra", phRange: [4.5, 7], substrate: "Silícic o descarbonatat", organicMatter: "Moderada", drainage: "Bo", waterRetention: "Mitjana", depth: "Mitjana", humus: "Mull de planifolis", evidence: "limited" },
      climate: { temperatureRange: [13, 23], nightPreference: "Suau a fresca", relativeHumidity: "Moderada a alta", soilMoisture: "Mitjana", rainfall: "Tempestes d’estiu i pluges de principi de tardor", drought: "Desfavorable", heat: "Tolera calidesa amb sòl humit", frost: "Atura la fructificació", wind: "Dessecant", snow: "No rellevant" },
      rainfall: { preferredAccumulation: "Pluja efectiva amb sòl forestal rehidratat", fruitingDelay: "Dies a setmanes", priorMoisture: "Important", temperatureAfterRain: "Temperada", interruption: "Sequera, vent sec o fred", uncertainty: "La producció estival depèn de tempestes locals i el mosaic del barret no sempre és visible." },
      seasonality: season({ jun: "possible", jul: "moderate", ago: "good", set: "peak", oct: "moderate" }),
      regions: ["prepirineus", "catalunya-central", "serralades-prelitorals", "emporda", "montseny", "ports", "muntanyes-interiors"]
    },
    idealConditions: ["Planifolis sobre sòls àcids a neutres", "13–23 °C després de pluges", "Barret verd esquerdat i carn trencadissa", "Comprovar sempre que no hi ha anell ni volva"]
  }),
  profile({
    speciesId: "cyclocybe-cylindracea",
    identity: {
      commonName: "Pollancró",
      alternateNames: ["bolet de pollancre", "gírgola de pollancre"],
      scientificName: "Cyclocybe cylindracea",
      family: "Hemipholiotaceae",
      genus: "Cyclocybe",
      edibility: "excellent_edible",
      identificationDifficulty: "Alta",
      typicalSize: "Barret de 4–15 cm",
      shortDescription: "Bolet lignícola que forma flotes denses sobre pollancres, salzes i altres planifolis, també conegut com a Agrocybe aegerita."
    },
    morphology: {
      cap: "Hemisfèric de jove, després convex i finalment estès; bru fosc al principi, aclarint-se a crema des del marge i sovint clivellat.",
      hymenium: "Làmines adnates, primer pàl·lides i després tabac o brunes per l’esporada.",
      stem: "Blanc a ocraci, fibrós, sovint corbat i amb un anell membranós persistent.",
      flesh: "Blanca, gruixuda al barret i fibrosa al peu.",
      colour: "Bru castany, crema, blanc i tabac.",
      smell: "Fúngica, agradable i una mica vinosa.",
      texture: "Carnosa al barret i fibrosa al peu.",
      typicalAppearance: "Flotes compactes de barrets bruns i crema amb anell sobre troncs o arrels de planifolis.",
      keyFeatures: ["Creixement en flotes", "Anell membranós", "Esporada bruna", "Fusta de pollancre o salze"],
      variation: "El barret s’aclareix molt amb l’edat i la fusta hoste pot ser enterrada, de manera que pot semblar que creix al sòl."
    },
    similarSpecies: [
      { scientificName: "Galerina marginata", commonName: "Galerina metzinosa", mainDifferences: "Sol ser més petita i rovellada, amb peu fibril·lós i olor farinosa; pot créixer sobre la mateixa fusta.", edibility: "dangerously_toxic", toxicity: "Mortal per amatoxines.", warning: true },
      { scientificName: "Hypholoma fasciculare", commonName: "Bolet de pi bord", mainDifferences: "Té tons groc sofre, làmines verdoses i gust molt amarg, generalment sense un anell membranós.", edibility: "toxic", toxicity: "Pot provocar una intoxicació gastrointestinal.", warning: true }
    ],
    ecologicalConfig: {
      habitat: { forestTypes: ["Bosc de ribera", "Boscos humits", "Boscos de planifolis"], treeAssociations: ["Populus", "Salix", "Ulmus", "Acer", "Sambucus"], hosts: ["Populus", "Salix", "Ulmus", "Acer", "Sambucus"], soilPreference: "No determinant; depèn de la fusta hoste", substrate: "Fusta viva, morta o arrels enterrades de planifolis", moisture: "Fresca", altitude: [0, 1400], slope: "Pla a suau", aspect: "Variable", shade: "Baixa a mitjana", landscapePosition: "Troncs, soques i arrels de boscos de ribera, plantacions i parcs" },
      soil: { texture: "Variable", reaction: "Àcida a alcalina", phRange: [5, 8.5], substrate: "Lignícola", organicMatter: "Alta localment", drainage: "Variable", waterRetention: "Mitjana", depth: "No determinant", humus: "Restes llenyoses", evidence: "limited" },
      climate: { temperatureRange: [10, 23], nightPreference: "Fresca a suau", relativeHumidity: "Moderada a alta", soilMoisture: "Mitjana", rainfall: "Pluges de primavera i tardor o humitat de ribera", drought: "Desfavorable", heat: "Tolera calidesa si la fusta reté humitat", frost: "Atura la fructificació", wind: "Dessecant", snow: "No rellevant" },
      rainfall: { preferredAccumulation: "Rehidratació de la fusta després de pluja o crescudes", fruitingDelay: "Dies a setmanes", priorMoisture: "Important", temperatureAfterRain: "Suau", interruption: "Assecament de la fusta o gelada", uncertainty: "La coberta forestal no representa bé soques, arbres urbans ni fusta enterrada; la predicció és orientativa." },
      seasonality: season({ mar: "possible", abr: "moderate", mai: "good", jun: "moderate", set: "possible", oct: "peak", nov: "good", des: "possible" }),
      regions: ["pirineus", "prepirineus", "catalunya-central", "serralades-costeres", "serralades-prelitorals", "emporda", "montseny", "ports", "muntanyes-interiors"]
    },
    idealConditions: ["Soques i arrels de pollancre o salze", "10–23 °C després de pluja", "Primavera i tardor", "No collir flotes brunes sense comprovar anell, esporada i substrat"]
  }),
  profile({
    speciesId: "coprinus-comatus",
    identity: {
      commonName: "Bolet de tinta",
      alternateNames: ["pixacà barbut", "coprí pelut"],
      scientificName: "Coprinus comatus",
      family: "Agaricaceae",
      genus: "Coprinus",
      edibility: "edible",
      identificationDifficulty: "Mitjana",
      typicalSize: "Barret de 4–15 cm d’alt",
      shortDescription: "Bolet blanc i pelut de prats i sòls remoguts, comestible només molt jove abans que les làmines comencin a ennegrir-se."
    },
    morphology: {
      cap: "Cilíndric o ovoide, blanc, cobert d’escates aixecades, amb el centre ocraci; s’obre i es liqua des del marge.",
      hymenium: "Làmines lliures, primer blanques, després rosades i finalment negres i deliqüescents.",
      stem: "Alt, blanc, buit, fràgil i amb un anell mòbil o fugaç.",
      flesh: "Blanca i prima, ennegrint-se ràpidament amb la maduresa.",
      colour: "Blanc, crema, rosa i negre tinta.",
      smell: "Suau de jove, desagradable en descompondre’s.",
      texture: "Tendra de jove i líquida en madurar.",
      typicalAppearance: "Barret blanc, alt i escatós com una metxa, sovint en grups a prats, parcs i marges.",
      keyFeatures: ["Barret cilíndric i pelut", "Deliqüescència negra", "Làmines blanques a negres", "Sòls herbosos o remoguts"],
      variation: "El canvi de blanc a negre pot passar en poques hores; no s’han d’aprofitar exemplars amb làmines rosades o negres."
    },
    similarSpecies: [
      { scientificName: "Coprinopsis atramentaria", commonName: "Bolet de tinta gris", mainDifferences: "Té barret gris i llis o finament fibril·lós, sense les grans escates blanques del bolet de tinta.", edibility: "edible_with_conditions", toxicity: "Pot causar una reacció intensa si es combina amb alcohol.", warning: true },
      { scientificName: "Chlorophyllum brunneum", commonName: "Apagallums tòxic", mainDifferences: "Té un barret ample amb escates brunes, anell gruixut i no es liqua en tinta negra.", edibility: "toxic", toxicity: "Pot provocar una intoxicació gastrointestinal.", warning: true }
    ],
    ecologicalConfig: {
      habitat: { forestTypes: ["Prats", "gespes", "vores de camí", "horts i sòls remoguts"], treeAssociations: [], hosts: [], soilPreference: "Neutre a alcalí, ric en nutrients", substrate: "Sòl herbós o remogut amb matèria orgànica", moisture: "Mitjana després de pluja", altitude: [0, 2000], slope: "Pla a suau", aspect: "Variable", shade: "Baixa", landscapePosition: "Prats, parcs, cunetes, horts i terrenys alterats" },
      soil: { texture: "Franca a francoargilosa", reaction: "Neutra a alcalina", phRange: [6, 8.5], substrate: "Sòl ric en nutrients", organicMatter: "Moderada a alta", drainage: "Bo", waterRetention: "Mitjana", depth: "Variable", humus: "Herbaci o antropitzat", evidence: "limited" },
      climate: { temperatureRange: [7, 20], nightPreference: "Fresca", relativeHumidity: "Moderada a alta", soilMoisture: "Mitjana", rainfall: "Episodis de primavera i tardor", drought: "Interromp la fructificació", heat: "Desfavorable si és seca", frost: "Desfavorable", wind: "Dessecant", snow: "No rellevant" },
      rainfall: { preferredAccumulation: "Pluja que humitegi l’horitzó superficial", fruitingDelay: "Pocs dies a una setmana", priorMoisture: "Moderadament important", temperatureAfterRain: "Fresca a suau", interruption: "Sequera, sol intens o gelada", uncertainty: "El reg, els sòls remoguts i la gestió urbana generen fructificacions que el mapa no pot anticipar bé." },
      seasonality: season({ mar: "possible", abr: "moderate", mai: "good", jun: "moderate", set: "possible", oct: "peak", nov: "good", des: "possible" }),
      regions: ["pirineus", "prepirineus", "catalunya-central", "serralades-costeres", "serralades-prelitorals", "emporda", "montseny", "ports", "muntanyes-interiors"]
    },
    idealConditions: ["Prats i sòls remoguts després de pluja", "7–20 °C", "Collir només exemplars joves de làmines completament blanques", "Consumir ràpidament després d’una identificació segura"]
  }),
  profile({
    speciesId: "suillus-granulatus",
    identity: {
      commonName: "Molleric granellut",
      alternateNames: ["molleric", "moixí", "pinetell", "cabreta"],
      scientificName: "Suillus granulatus",
      family: "Suillaceae",
      genus: "Suillus",
      edibility: "edible_with_conditions",
      identificationDifficulty: "Mitjana",
      typicalSize: "Barret de 4–12 cm",
      shortDescription: "Molleric de pineda amb barret viscós, porus grocs que exsuden gotes i peu granellut sense anell."
    },
    morphology: {
      cap: "Hemisfèric de jove, després convex i finalment estès; de bru groguenc a castany, molt viscós amb humitat i de cutícula separable.",
      hymenium: "Tubs i porus grocs, petits, que sovint exsuden gotes blanquinoses o lletoses quan és jove.",
      stem: "Groc pàl·lid, cilíndric, sense anell i cobert de petits grànuls glandulars cap a la part alta.",
      flesh: "Groga pàl·lida, tova i generalment immutable.",
      colour: "Bru mel, groc i crema.",
      smell: "Suau i resinosa.",
      texture: "Viscosa al barret i esponjosa amb l’edat.",
      typicalAppearance: "Molleric groc i bru sota pins, sense anell i amb gotetes als porus de jove.",
      keyFeatures: ["Absència d’anell", "Gotes als porus", "Grànuls al peu", "Associació exclusiva amb pins"],
      variation: "Les gotes desapareixen en temps sec o amb l’edat i els porus s’enfosqueixen; la cutícula pot retenir restes i irritants digestius."
    },
    similarSpecies: [
      { scientificName: "Suillus luteus", commonName: "Molleric", mainDifferences: "Té un anell membranós ben desenvolupat al peu i barret habitualment més fosc.", edibility: "edible_with_conditions", toxicity: "Pot causar molèsties digestives si no es pela o se’n menja massa." },
      { scientificName: "Suillus collinitus", commonName: "Molleric rosat", mainDifferences: "Sovint mostra fibres radials al barret i miceli rosat visible a la base del peu.", edibility: "edible_with_conditions", toxicity: "Pot causar molèsties digestives en persones sensibles." }
    ],
    ecologicalConfig: {
      habitat: { forestTypes: ["Pinedes", "Pinedes obertes", "Boscos de coníferes"], treeAssociations: ["Pinus halepensis", "Pinus pinea", "Pinus nigra", "Pinus sylvestris"], hosts: ["Pinus"], soilPreference: "Àcid a alcalí", substrate: "Variable, sovint sòls pobres o remoguts", moisture: "Fresca després de pluja", altitude: [0, 2100], slope: "Variable", aspect: "Variable", shade: "Baixa a mitjana", landscapePosition: "Pinedes obertes, vores i plantacions, especialment amb pins joves" },
      soil: { texture: "Arenosa a franca", reaction: "Àcida a alcalina", phRange: [4.5, 8.5], substrate: "Silícic o calcari", organicMatter: "Baixa a moderada", drainage: "Bo", waterRetention: "Baixa a mitjana", depth: "Variable", humus: "Mull de pineda", evidence: "limited" },
      climate: { temperatureRange: [9, 22], nightPreference: "Fresca a suau", relativeHumidity: "Moderada a alta", soilMoisture: "Mitjana", rainfall: "Pluges de primavera i tardor", drought: "Desfavorable", heat: "Tolera calidesa si el sòl resta humit", frost: "Atura la fructificació", wind: "Dessecant", snow: "No rellevant" },
      rainfall: { preferredAccumulation: "Pluja efectiva sobre sòl de pineda", fruitingDelay: "Pocs dies a setmanes", priorMoisture: "Important", temperatureAfterRain: "Fresca a temperada", interruption: "Sequera, vent sec o gelada", uncertainty: "La fructificació és oportunista i les repoblacions joves no sempre queden ben representades a la coberta forestal." },
      seasonality: season({ abr: "possible", mai: "moderate", jun: "possible", set: "moderate", oct: "peak", nov: "good", des: "possible" }),
      regions: ["pirineus", "prepirineus", "catalunya-central", "serralades-costeres", "serralades-prelitorals", "emporda", "montseny", "ports", "muntanyes-interiors"]
    },
    idealConditions: ["Pinedes joves i obertes", "9–22 °C després de pluja", "Pelar la cutícula i retirar els porus tous", "Consum moderat i sempre ben cuinat"]
  }),
  profile({
    speciesId: "pleurotus-eryngii",
    identity: {
      commonName: "Gírgola de panical",
      alternateNames: ["gírgola de card", "gírgola de camp", "gírgola d’arena"],
      scientificName: "Pleurotus eryngii",
      family: "Pleurotaceae",
      genus: "Pleurotus",
      edibility: "excellent_edible",
      identificationDifficulty: "Alta",
      typicalSize: "Barret de 4–12 cm",
      shortDescription: "Gírgola robusta de prats secs i calcaris, vinculada a arrels mortes de panical i altres umbel·líferes."
    },
    morphology: {
      cap: "Convex i després estès o lleugerament deprimit, bru grisenc a castany, llis i amb marge inicialment involut.",
      hymenium: "Làmines blanques a crema, molt decurrents i sovint ramificades prop del peu.",
      stem: "Blanc, ple, robust, central o excèntric, sense anell, eixamplant-se cap a la base.",
      flesh: "Blanca, gruixuda, ferma i immutable.",
      colour: "Bru grisenc, crema i blanc.",
      smell: "Suau, fúngica i agradable.",
      texture: "Molt carnosa i elàstica.",
      typicalAppearance: "Gírgola baixa i robusta de barret bru, al peu de tiges seques de panical en espais oberts.",
      keyFeatures: ["Làmines molt decurrents", "Peu robust sense anell", "Prats oberts", "Associació amb arrels de panical"],
      variation: "El peu pot ser lateral o gairebé central i l’arrel hoste pot quedar enterrada; sense el substrat no és una identificació segura."
    },
    similarSpecies: [
      { scientificName: "Pleurotus ostreatus", commonName: "Gírgola", mainDifferences: "Creix en flotes sobre fusta de planifolis i sol tenir peu lateral molt curt.", edibility: "excellent_edible", toxicity: "Sense toxicitat coneguda quan la identificació és segura." },
      { scientificName: "Omphalotus olearius", commonName: "Bolet d’olivera", mainDifferences: "És taronja, creix en feixos sobre fusta o arrels llenyoses i té làmines fines també taronges.", edibility: "toxic", toxicity: "Pot causar vòmits i diarrea intensos.", warning: true }
    ],
    ecologicalConfig: {
      habitat: { forestTypes: ["Prats", "Pastures", "Gespes", "Matollars"], treeAssociations: [], hosts: ["Eryngium campestre"], soilPreference: "Neutre a alcalí", substrate: "Arrels mortes de panical", moisture: "Baixa a mitjana després de pluja", altitude: [0, 1600], slope: "Pla a moderat", aspect: "Solell", shade: "Baixa", landscapePosition: "Prats i pastures oberts sobre sòls calcaris" },
      soil: { texture: "Franca a pedregosa", reaction: "Neutra a alcalina", phRange: [6.5, 8.5], substrate: "Calcari o ric en bases", organicMatter: "Baixa a moderada", drainage: "Bo", waterRetention: "Baixa a mitjana", depth: "Variable", humus: "Herbaci", evidence: "limited" },
      climate: { temperatureRange: [9, 20], nightPreference: "Fresca a suau", relativeHumidity: "Moderada", soilMoisture: "Mitjana després de pluja", rainfall: "Episodis de primavera i tardor", drought: "Atura la fructificació", heat: "Tolera ambients oberts però no sequera persistent", frost: "Desfavorable", wind: "Dessecant", snow: "No rellevant" },
      rainfall: { preferredAccumulation: "Pluja suficient per rehidratar les arrels mortes", fruitingDelay: "Dies a setmanes", priorMoisture: "Moderadament important", temperatureAfterRain: "Suau", interruption: "Vent sec, sequera o gelada", uncertainty: "La distribució del panical i d’altres plantes hoste no forma part de la coberta forestal; la predicció és especialment orientativa." },
      seasonality: season({ mar: "possible", abr: "moderate", mai: "good", set: "possible", oct: "peak", nov: "good", des: "possible" }),
      regions: ["prepirineus", "catalunya-central", "serralades-costeres", "serralades-prelitorals", "emporda", "ports", "muntanyes-interiors"]
    },
    idealConditions: ["Prats calcaris amb panical", "9–20 °C després de pluges", "Primavera i tardor", "Confirmar l’hoste herbaci i descartar bolets taronja sobre fusta"]
  })
);

const seasonalActivityRank: Record<SeasonalActivity, number> = {
  inactive: 0,
  possible: 1,
  moderate: 2,
  good: 3,
  peak: 4,
};

function season(overrides: Partial<Record<Month, SeasonalActivity>>) {
  return Object.fromEntries(months.map((name) => [name, overrides[name] ?? "inactive"])) as Record<Month, SeasonalActivity>;
}

type Seed = Omit<SpeciesProfile, "culinaryProfile" | "modelConfig" | "predictionMode" | "references" | "media" | "safetyNotice" | "confidence"> & {
  media?: SpeciesProfile["media"];
};

type SafetySeed = Pick<Seed, "speciesId" | "identity" | "morphology" | "similarSpecies" | "ecologicalConfig" | "idealConditions"> &
  Partial<Pick<Seed, "media">>;

function profile(seed: Seed): SpeciesProfile {
  const culinaryProfile = culinaryProfiles[seed.speciesId];
  if (!culinaryProfile) {
    throw new Error(`Missing culinary profile for ${seed.speciesId}`);
  }
  const modelConfig = modelConfigForSpecies(
    seed.speciesId,
    seed.ecologicalConfig.climate.temperatureRange,
    seed.ecologicalConfig.seasonality,
  );

  return {
    ...seed,
    predictionMode: modelConfig.status === "supported" ? "current" : "habitat_only",
    modelConfig,
    culinaryProfile,
    references,
    media: [
      ...(speciesMedia[seed.speciesId] ?? []),
      ...(speciesGalleryMedia[seed.speciesId] ?? []),
      ...(seed.media ?? []),
    ],
    safetyNotice,
    confidence: "limited"
  };
}

function safetyProfile(seed: SafetySeed): SpeciesProfile {
  return profile(seed as Seed);
}

speciesProfiles.push(
  profile({
    speciesId: "boletus-edulis",
    identity: { commonName: "Cep", alternateNames: ["surenc", "siureny"], scientificName: "Boletus edulis", family: "Boletaceae", genus: "Boletus", edibility: "excellent_edible", identificationDifficulty: "Mitjana", typicalSize: "Barret de 7–25 cm", shortDescription: "Bolet robust de porus blancs a olivacis, associat a coníferes i planifolis." },
    media: [
      {
        id: "boletus-edulis-forest",
        sourceUrl: "https://www.magnific.com/premium-photo/mushroom-boletus-edulis-forest_135922590.htm",
        localPath: "/media/boletus-edulis/boletus-edulis-forest.webp",
        attribution: "Magnific",
        license: "Magnific Premium (llicència de pagament confirmada per l’usuari)",
        identificationReference: false,
        alt: "Possible Boletus edulis jove amb barret bru i peu clar sobre la fullaraca del bosc"
      },
      {
        id: "boletus-edulis-close-up",
        sourceUrl: "https://www.magnific.com/free-photo/vertical-shot-orange-mushroom-grown-weed-covered-ground_17359610.htm",
        localPath: "/media/boletus-edulis/boletus-edulis-close-up.webp",
        attribution: "Magnific",
        license: "Magnific Premium (llicència de pagament confirmada per l’usuari)",
        identificationReference: false,
        alt: "Possible Boletus edulis madur amb barret castany i peu robust entre restes vegetals"
      }
    ],
    morphology: { cap: "Convex de jove, després ample; bru castany amb marge més clar.", hymenium: "Porus blancs, grocs i finalment olivacis; mai làmines.", stem: "Gruixut, clar, sovint amb reticle blanc a la part superior.", flesh: "Blanca i immutable al tall.", colour: "Bruns càlids, crema i oliva.", smell: "Suau, agradable.", texture: "Ferm de jove; més esponjós amb l’edat.", typicalAppearance: "Aspecte massís, amb peu ventrut i barret carnós.", keyFeatures: ["Reticle blanc al peu", "Carn que no blaveja", "Porus inicialment blancs"], variation: "La pluja enfosqueix el barret i els exemplars madurs tenen porus olivacis i carn més tova." },
    similarSpecies: [{ scientificName: "Tylopilus felleus", commonName: "Mataparent", mainDifferences: "Porus rosats amb l’edat i gust molt amarg; reticle més fosc.", edibility: "inedible", toxicity: "No tòxic, però incomestible pel gust." }, { scientificName: "Boletus reticulatus", commonName: "Cep d’estiu", mainDifferences: "Més termòfil i sovint amb barret més clar i reticulat.", edibility: "excellent_edible", toxicity: "Sense toxicitat coneguda." }, { scientificName: "Rubroboletus satanas", commonName: "Matagent", mainDifferences: "Porus vermells, peu groc i vermell i carn que blaveja al tall; no presenta els porus clars ni la carn immutable del cep.", edibility: "dangerously_toxic", toxicity: "Tòxic; pot provocar una intoxicació gastrointestinal intensa.", warning: true }],
    ecologicalConfig: { habitat: { forestTypes: ["Fagedes", "avetanoses", "rouredes", "pinedes de muntanya"], treeAssociations: ["Fagus sylvatica", "Abies alba", "Quercus petraea", "Pinus sylvestris"], hosts: ["Fagus", "Abies", "Quercus", "Pinus"], soilPreference: "Àcid a moderadament àcid", substrate: "Silícic o descarbonatat", moisture: "Humit però ben drenat", altitude: [400, 1900], slope: "Suau a moderat", aspect: "Obaga o vessants frescos", shade: "Mitjana", landscapePosition: "Marges de bosc madur i clarianes protegides" }, soil: { texture: "Franca o francoarenosa", reaction: "Àcida a lleugerament àcida", phRange: [4.5, 6.5], substrate: "Preferència freqüent per sòls silícics", organicMatter: "Moderada", drainage: "Bon drenatge", waterRetention: "Mitjana", depth: "Mitjana a profunda", humus: "Mull moderat", evidence: "limited" }, climate: { temperatureRange: [10, 19], nightPreference: "Nits fresques", relativeHumidity: "Moderada a alta", soilMoisture: "Alta", rainfall: "Pluges regulars a finals d’estiu i a la tardor", drought: "Desfavorable", heat: "Desfavorable", frost: "Atura la fructificació", wind: "El vent sec és desfavorable", snow: "No és una condició de fructificació" }, rainfall: { minimumMeaningful: "No establert de manera universal", preferredAccumulation: "Pluja repartida que rehidrati l’horitzó superficial", fruitingDelay: "Habitualment dies o setmanes, segons temperatura i humitat prèvia", priorMoisture: "Molt important", temperatureAfterRain: "Temperatures suaus i nits fresques", interruption: "Calor, vent sec o nova sequera", uncertainty: "La resposta varia molt entre massissos i anys." }, seasonality: season({ ago: "possible", set: "good", oct: "peak", nov: "good" }), regions: ["pirineus", "prepirineus", "montseny", "muntanyes-interiors"] },
    idealConditions: ["Fagedes, avetanoses, rouredes i algunes pinedes", "Sòl humit, drenat i àcid a moderadament àcid", "10–19 °C després de pluges persistents", "Vent sec i calor excessiva: desfavorables"]
  }),
  profile({
    speciesId: "boletus-pinophilus",
    identity: { commonName: "Cep rogenc", alternateNames: ["cep pinícola", "surenc de pi", "cep de pi"], scientificName: "Boletus pinophilus", family: "Boletaceae", genus: "Boletus", edibility: "excellent_edible", identificationDifficulty: "Mitjana", typicalSize: "Barret de 8–25 cm", shortDescription: "Cep de barret vinós fosc, habitual sota pins en terrenys frescos." },
    morphology: { cap: "Carnós, de color granat a bru vinós.", hymenium: "Porus blancs, després groc-oliva.", stem: "Robust, clar, amb reticle blanc visible.", flesh: "Blanca, immutable.", colour: "Vermell vi, bru i crema.", smell: "Agradable i fúngic.", texture: "Compacta de jove.", typicalAppearance: "Més fosc que el cep comú, sovint sota coníferes.", keyFeatures: ["Barret vinós fosc", "Reticle clar", "Carn immutable"], variation: "La tonalitat pot enfosquir-se en ambient humit; els exemplars vells s’estoven." },
    similarSpecies: [{ scientificName: "Boletus edulis", commonName: "Cep", mainDifferences: "Habitualment menys vinós i més associat a fagedes o avetanoses.", edibility: "excellent_edible", toxicity: "Sense toxicitat coneguda." }, { scientificName: "Tylopilus felleus", commonName: "Mataparent", mainDifferences: "Porus rosats i gust amarg; no presenta el mateix reticle clar.", edibility: "inedible", toxicity: "No tòxic, però incomestible.", warning: true }],
    ecologicalConfig: { habitat: { forestTypes: ["Pinedes de pi roig", "pinedes de pi negre", "pinedes de muntanya"], treeAssociations: ["Pinus sylvestris", "Pinus uncinata", "Pinus nigra"], hosts: ["Pinus"], soilPreference: "Àcid a subàcid", substrate: "Silícic o descarbonatat", moisture: "Fresca", altitude: [600, 2100], slope: "Variable", aspect: "Obagues i orientacions fresques", shade: "Mitjana", landscapePosition: "Bosc de coníferes madur" }, soil: { texture: "Franca a arenosa", reaction: "Àcida", phRange: [4.2, 6.2], substrate: "Sovint silícic", organicMatter: "Moderada", drainage: "Bona", waterRetention: "Mitjana", depth: "Mitjana", humus: "Mull de conífera", evidence: "limited" }, climate: { temperatureRange: [8, 17], nightPreference: "Fresca", relativeHumidity: "Alta", soilMoisture: "Alta", rainfall: "Regular i no torrencial", drought: "Molt desfavorable", heat: "Desfavorable", frost: "Limita fortament", wind: "Secant", snow: "Habitual fora de temporada" }, rainfall: { preferredAccumulation: "Rehidratació sostinguda del sòl", fruitingDelay: "Variable, normalment després d’un període humit", priorMoisture: "Essencial", temperatureAfterRain: "Suau", interruption: "Vent sec o baixada brusca de temperatura", uncertainty: "L’altitud modifica molt el calendari." }, seasonality: season({ jul: "possible", ago: "moderate", set: "peak", oct: "good" }), regions: ["pirineus", "prepirineus", "muntanyes-interiors"] },
    idealConditions: ["Pinedes de pi roig, pi negre i pi pinastre", "Sòls frescos, drenats i àcids", "8–17 °C i humitat elevada", "Temporada més activa entre agost i octubre"]
  }),
  profile({
    speciesId: "boletus-aereus",
    identity: { commonName: "Cep negre", alternateNames: ["siureny negre"], scientificName: "Boletus aereus", family: "Boletaceae", genus: "Boletus", edibility: "excellent_edible", identificationDifficulty: "Mitjana", typicalSize: "Barret de 7–20 cm", shortDescription: "Cep mediterrani de barret molt fosc, vinculat sobretot a alzinars i rouredes càlides." },
    morphology: { cap: "Bru molt fosc, gairebé negre, vellutat de jove.", hymenium: "Porus blancs a oliva amb la maduresa.", stem: "Clar, robust, amb reticle pàl·lid.", flesh: "Blanca, ferma, immutable.", colour: "Negre-bronze i crema.", smell: "Suau i agradable.", texture: "Seca o vellutada de jove.", typicalAppearance: "Cep compacte de colors foscos en bosc mediterrani.", keyFeatures: ["Barret negre-bronze", "Porus sense tons vermells", "Reticle clar"], variation: "En temps sec pot esquerdar-se; la humitat intensifica els tons foscos." },
    similarSpecies: [{ scientificName: "Boletus reticulatus", commonName: "Cep d’estiu", mainDifferences: "Més clar i sovint amb reticle molt marcat a tot el peu.", edibility: "excellent_edible", toxicity: "Sense toxicitat coneguda." }, { scientificName: "Rubroboletus satanas", commonName: "Matagent", mainDifferences: "Porus vermells i peu amb colors vius; carn que blaveja.", edibility: "dangerously_toxic", toxicity: "Tòxic; no consumir.", warning: true }],
    ecologicalConfig: { habitat: { forestTypes: ["Alzinars", "suredes", "rouredes mediterrànies"], treeAssociations: ["Quercus ilex", "Quercus suber", "Quercus pubescens"], hosts: ["Quercus"], soilPreference: "Neutre a lleugerament àcid", substrate: "Silícic o descarbonatat", moisture: "Fresca després de pluja", altitude: [50, 1000], slope: "Variable", aspect: "Solells temperats i fondalades", shade: "Mitjana", landscapePosition: "Alzinar madur amb sòl profund" }, soil: { texture: "Franca", reaction: "Subàcida a neutra", phRange: [5.5, 7], substrate: "Variable", organicMatter: "Moderada", drainage: "Bona", waterRetention: "Mitjana", depth: "Profunda", humus: "Mull moderat", evidence: "limited" }, climate: { temperatureRange: [14, 24], nightPreference: "Suau", relativeHumidity: "Moderada", soilMoisture: "Mitjana a alta", rainfall: "Pluges de finals d’estiu o de tardor", drought: "Desfavorable", heat: "Tolera calor moderada", frost: "Desfavorable", wind: "Vent sec desfavorable", snow: "No rellevant" }, rainfall: { preferredAccumulation: "Pluja efectiva amb sòl ja rehidratat", fruitingDelay: "Dies a setmanes segons la calor", priorMoisture: "Important", temperatureAfterRain: "Temperatura temperada", interruption: "Episodis secs o calor intensa", uncertainty: "Espècie termòfila amb resposta local." }, seasonality: season({ ago: "possible", set: "good", oct: "peak", nov: "moderate" }), regions: ["serralades-prelitorals", "serralades-costeres", "ports", "emporda"] },
    idealConditions: ["Alzinars i suredes madures", "Sòl profund i drenat", "Temperatures suaus després de pluja", "Estius molt secs en redueixen l’activitat"]
  }),
  profile({
    speciesId: "boletus-reticulatus",
    identity: { commonName: "Cep d’estiu", alternateNames: ["cep reticulat", "sureny d’estiu"], scientificName: "Boletus reticulatus", family: "Boletaceae", genus: "Boletus", edibility: "excellent_edible", identificationDifficulty: "Mitjana", typicalSize: "Barret de 6–25 cm", shortDescription: "Cep termòfil de barret sec i peu molt reticulat, associat sobretot a roures, faigs i castanyers." },
    morphology: { cap: "Convex i carnós, de bru clar a avellana; superfície seca i sovint clivellada amb la calor.", hymenium: "Porus blancs de jove, després grocs i finalment olivacis.", stem: "Robust, clar a bru pàl·lid, amb un reticle blanc o marronós molt estès.", flesh: "Blanca i immutable al tall; sovint s’estova i es corca aviat amb calor.", colour: "Avellana, ocre i crema.", smell: "Suau i agradable.", texture: "Ferm de jove, més esponjós en madurar.", typicalAppearance: "Cep de tons clars, barret mat i xarxa marcada a bona part del peu.", keyFeatures: ["Reticle molt desenvolupat al peu", "Barret sec, sense marge blanc", "Carn blanca que no blaveja"], variation: "En períodes secs el barret s’esquerda i deixa veure la carn clara; els exemplars madurs tenen porus olivacis." },
    similarSpecies: [{ scientificName: "Boletus edulis", commonName: "Cep", mainDifferences: "Barret sovint més untuós, marge més clar i reticle habitualment concentrat a la part alta del peu.", edibility: "excellent_edible", toxicity: "Sense toxicitat coneguda." }, { scientificName: "Tylopilus felleus", commonName: "Mataparent", mainDifferences: "Porus rosats amb l’edat, reticle fosc i gust intensament amarg.", edibility: "inedible", toxicity: "No es considera tòxic, però és incomestible pel gust." }, { scientificName: "Rubroboletus satanas", commonName: "Matagent", mainDifferences: "Porus vermells, peu de colors vius i carn que blaveja al tall.", edibility: "dangerously_toxic", toxicity: "Tòxic; no consumir.", warning: true }],
    ecologicalConfig: { habitat: { forestTypes: ["Rouredes", "fagedes", "castanyedes", "boscos de planifolis"], treeAssociations: ["Quercus pubescens", "Quercus petraea", "Fagus sylvatica", "Castanea sativa"], hosts: ["Quercus", "Fagus", "Castanea"], soilPreference: "Àcid a neutre", substrate: "Silícic o descarbonatat", moisture: "Fresca després de pluja", altitude: [100, 1500], slope: "Variable", aspect: "Vessants temperats i clarianes càlides", shade: "Mitjana", landscapePosition: "Bosc madur de planifolis i vores arbrades" }, soil: { texture: "Franca a francoarenosa", reaction: "Àcida a neutra", phRange: [4.5, 7], substrate: "Preferentment silícic o poc calcari", organicMatter: "Moderada", drainage: "Bo", waterRetention: "Mitjana", depth: "Mitjana a profunda", humus: "Mull moderat", evidence: "limited" }, climate: { temperatureRange: [14, 24], nightPreference: "Suau", relativeHumidity: "Moderada a alta", soilMoisture: "Mitjana a alta", rainfall: "Pluges de finals de primavera, d’estiu o d’inici de tardor", drought: "Desfavorable si s’allarga", heat: "Tolera temperatures càlides amb sòl humit", frost: "Atura la fructificació", wind: "El vent sec accelera la deshidratació", snow: "No rellevant" }, rainfall: { preferredAccumulation: "Pluja efectiva seguida de temps càlid i humit", fruitingDelay: "Habitualment dies o poques setmanes, segons la humitat acumulada", priorMoisture: "Important", temperatureAfterRain: "Càlida sense calor extrema", interruption: "Sequera, vent sec o calor persistent", uncertainty: "La fructificació estival és irregular i depèn molt de tempestes locals." }, seasonality: season({ mai: "possible", jun: "good", jul: "peak", ago: "good", set: "moderate", oct: "possible" }), regions: ["prepirineus", "catalunya-central", "serralades-prelitorals", "montseny", "muntanyes-interiors", "ports"] },
    idealConditions: ["Rouredes, fagedes i castanyedes temperades", "Sòl drenat d’àcid a neutre", "14–24 °C després de pluges efectives", "Més primerenc i termòfil que el cep comú"]
  }),
  profile({
    speciesId: "lactarius-deliciosus",
    identity: { commonName: "Pinetell", alternateNames: ["rovelló"], scientificName: "Lactarius deliciosus", family: "Russulaceae", genus: "Lactarius", edibility: "excellent_edible", identificationDifficulty: "Baixa a mitjana", typicalSize: "Barret de 4–15 cm", shortDescription: "Lactari taronja de làmines decurrents i làtex color pastanaga, associat als pins." },
    morphology: { cap: "Ataronjat, amb cercles concèntrics, sovint deprimit al centre.", hymenium: "Làmines ataronjades, decurrents, amb taques verdes per pressió.", stem: "Cilíndric, ataronjat, sovint amb clotets.", flesh: "Taronja pàl·lid; exsuda làtex taronja.", colour: "Taronja viu amb verds a la maduresa.", smell: "Afruitat suau.", texture: "Ferm de jove, fràgil amb l’edat.", typicalAppearance: "Bolet taronja de pineda amb làtex color pastanaga.", keyFeatures: ["Làtex taronja", "Cercles al barret", "Verdeja en tocar-lo"], variation: "La humitat i l’edat accentuen les taques verdes i la fragilitat." },
    similarSpecies: [{ scientificName: "Lactarius sanguifluus", commonName: "Rovelló", mainDifferences: "Làtex vermell vinós i tons més apagats.", edibility: "excellent_edible", toxicity: "Sense toxicitat coneguda." }, { scientificName: "Lactarius torminosus", commonName: "Lleterola de cama rosada", mainDifferences: "Barret rosat i pelut, làtex blanc; pot causar trastorns digestius.", edibility: "not_recommended", toxicity: "Pot ser irritant gastrointestinal.", warning: true }],
    ecologicalConfig: { habitat: { forestTypes: ["Pinedes", "pinedes mixtes"], treeAssociations: ["Pinus pinea", "Pinus nigra", "Pinus sylvestris", "Pinus halepensis"], hosts: ["Pinus"], soilPreference: "Variable, sovint silícic", substrate: "Terres de pineda", moisture: "Fresca", altitude: [0, 1800], slope: "Variable", aspect: "Totes, preferentment amb certa humitat", shade: "Mitjana", landscapePosition: "Clariana o marge de pineda" }, soil: { texture: "Arenosa a franca", reaction: "Àcida a neutra", phRange: [5, 7.2], substrate: "Silícic o mixt", organicMatter: "Baixa a moderada", drainage: "Bona", waterRetention: "Mitjana", depth: "Variable", humus: "Mull de pinassa", evidence: "moderate" }, climate: { temperatureRange: [10, 20], nightPreference: "Fresca", relativeHumidity: "Moderada", soilMoisture: "Mitjana a alta", rainfall: "Pluges de tardor", drought: "Desfavorable", heat: "Desfavorable", frost: "Atura el creixement", wind: "Vent sec desfavorable", snow: "No rellevant" }, rainfall: { preferredAccumulation: "Episodis de pluja que mantinguin la pinassa humida", fruitingDelay: "Sovint dins les setmanes posteriors", priorMoisture: "Important", temperatureAfterRain: "Suau", interruption: "Sequera sobtada o vent persistent", uncertainty: "La resposta depèn del tipus de pineda." }, seasonality: season({ set: "good", oct: "peak", nov: "good", des: "possible" }), regions: ["pirineus", "prepirineus", "catalunya-central", "serralades-prelitorals", "emporda", "ports"] },
    idealConditions: ["Pinedes amb pinassa humida", "10–20 °C", "Pluja recent i bon drenatge", "Coloració verda no implica toxicitat"]
  }),
  profile({
    speciesId: "lactarius-sanguifluus",
    identity: { commonName: "Rovelló", alternateNames: ["esclata-sang", "rovelló de sang", "rovelló de solell", "sanguinenc", "rovelló vinós"], scientificName: "Lactarius sanguifluus", family: "Russulaceae", genus: "Lactarius", edibility: "excellent_edible", identificationDifficulty: "Mitjana", typicalSize: "Barret de 4–12 cm", shortDescription: "Lactari de tons vinós-verdosos que segrega làtex vermell fosc sota pinedes mediterrànies i montanes calcàries." },
    morphology: { cap: "Ataronjat apagat a gris vinós, amb zones concèntriques.", hymenium: "Làmines decurrents, que poden virar a vinós.", stem: "Curt, del color del barret o més clar.", flesh: "Segrega làtex vermell vinós.", colour: "Taronja apagat, vi i verd grisós.", smell: "Suau.", texture: "Ferm però fràgil amb l’edat.", typicalAppearance: "Lactari mediterrani menys taronja que el rovelló comú.", keyFeatures: ["Làtex vermell vinós", "Tons grisos o verdosos", "Associació amb pins"], variation: "Els colors s’enfosqueixen ràpidament per pressió o maduresa." },
    similarSpecies: [{ scientificName: "Lactarius deliciosus", commonName: "Pinetell", mainDifferences: "Làtex més taronja i barret generalment més viu.", edibility: "excellent_edible", toxicity: "Sense toxicitat coneguda." }, { scientificName: "Lactarius semisanguifluus", commonName: "Rovelló semisanguinenc", mainDifferences: "Làtex inicialment taronja que es torna més vermellós.", edibility: "edible", toxicity: "Sense toxicitat coneguda." }],
    ecologicalConfig: { habitat: { forestTypes: ["Pinedes de pi blanc, pinassa o pi roig", "pinedes mediterrànies", "pinedes montanes calcàries"], treeAssociations: ["Pinus halepensis", "Pinus pinea", "Pinus nigra", "Pinus sylvestris"], hosts: ["Pinus"], soilPreference: "Sovint calcari o neutre", substrate: "Pineda mediterrània o montana calcària", moisture: "Mitjana", altitude: [0, 1200], slope: "Variable", aspect: "Solells temperats", shade: "Baixa a mitjana", landscapePosition: "Pinedes obertes" }, soil: { texture: "Arenosa a franca", reaction: "Neutra a alcalina", phRange: [6.5, 8], substrate: "Sovint calcari", organicMatter: "Baixa a moderada", drainage: "Bona", waterRetention: "Baixa a mitjana", depth: "Variable", humus: "Pinassa escassa a moderada", evidence: "limited" }, climate: { temperatureRange: [12, 21], nightPreference: "Suau", relativeHumidity: "Moderada", soilMoisture: "Mitjana", rainfall: "Pluges de tardor", drought: "Desfavorable", heat: "Tolera una mica més de calor", frost: "Desfavorable", wind: "Secant", snow: "No rellevant" }, rainfall: { preferredAccumulation: "Pluja de tardor seguida de temps fresc i poc ventós, perquè el sòl conservi la humitat", fruitingDelay: "Variable", priorMoisture: "Important", temperatureAfterRain: "Temperada", interruption: "Vent sec i calor", uncertainty: "Informació ecològica amb variació local." }, seasonality: season({ set: "moderate", oct: "peak", nov: "good", des: "possible" }), regions: ["pirineus", "serralades-costeres", "serralades-prelitorals", "ports", "emporda"] },
    idealConditions: ["Pinedes mediterrànies o montanes calcàries", "Temperatures de tardor suaus", "Pluja efectiva i sòl amb humitat mitjana", "Làtex vinós: tret d’identificació principal"]
  }),
  profile({
    speciesId: "cantharellus-cibarius",
    identity: { commonName: "Rossinyol", alternateNames: ["vaqueta", "ginestrola"], scientificName: "Cantharellus cibarius", family: "Cantharellaceae", genus: "Cantharellus", edibility: "excellent_edible", identificationDifficulty: "Mitjana", typicalSize: "Barret de 3–10 cm", shortDescription: "Bolet groc daurat amb plecs decurrents, aromàtic i propi de boscos humits." },
    morphology: { cap: "Irregular, ondulat i embudat amb l’edat.", hymenium: "Plecs gruixuts, decurrents i bifurcats; no són làmines fines.", stem: "Continu amb el barret, del mateix groc.", flesh: "Blanca-groguenca, ferma.", colour: "Groc d’ou a groc ataronjat.", smell: "Afruitat, sovint recorda l’albercoc.", texture: "Ferm i elàstic.", typicalAppearance: "Silueta ondulada, groga i sense separació neta entre barret i peu.", keyFeatures: ["Plecs, no làmines", "Olor afruitada", "Color groc uniforme"], variation: "En sequera és més petit i pàl·lid; amb pluja pot tenir marge més ondulat." },
    similarSpecies: [{ scientificName: "Hygrophoropsis aurantiaca", commonName: "Fals rossinyol", mainDifferences: "Làmines fines i nombroses, color més ataronjat; creix sovint en fusta o restes.", edibility: "not_recommended", toxicity: "Pot causar molèsties digestives.", warning: true }, { scientificName: "Omphalotus olearius", commonName: "Bolet d’olivera", mainDifferences: "Làmines veritables taronja intens; creix en fusta, pot ser bioluminescent.", edibility: "toxic", toxicity: "Provoca trastorns gastrointestinals intensos.", warning: true }],
    ecologicalConfig: { habitat: { forestTypes: ["Fagedes", "rouredes", "avetanoses", "pinedes humides"], treeAssociations: ["Fagus sylvatica", "Quercus petraea", "Abies alba", "Pinus sylvestris"], hosts: ["Fagus", "Quercus", "Abies", "Pinus"], soilPreference: "Àcid a subàcid", substrate: "Silícic o descarbonatat", moisture: "Humida", altitude: [300, 1800], slope: "Variable", aspect: "Obaga", shade: "Mitjana a alta", landscapePosition: "Mull de bosc fresc" }, soil: { texture: "Franca", reaction: "Àcida", phRange: [4.5, 6.5], substrate: "Preferentment silícic", organicMatter: "Moderada a alta", drainage: "Bona", waterRetention: "Mitjana", depth: "Mitjana", humus: "Mull ric", evidence: "moderate" }, climate: { temperatureRange: [9, 18], nightPreference: "Fresca", relativeHumidity: "Alta", soilMoisture: "Alta", rainfall: "Regular", drought: "Molt desfavorable", heat: "Desfavorable", frost: "Atura la fructificació", wind: "Secant", snow: "Fora de període" }, rainfall: { preferredAccumulation: "Humitat sostinguda, no només xàfecs", fruitingDelay: "Dies a setmanes", priorMoisture: "Molt important", temperatureAfterRain: "Fresca a suau", interruption: "Sequera, vent sec o calor", uncertainty: "Pot formar erols irregulars." }, seasonality: season({ jul: "possible", ago: "moderate", set: "good", oct: "peak", nov: "moderate" }), regions: ["pirineus", "prepirineus", "montseny", "muntanyes-interiors"] },
    idealConditions: ["Boscos humits, sobretot fagedes i rouredes", "Sòls àcids amb mull ric", "Humitat alta i temperatures fresques", "Confusió possible amb espècies tòxiques de làmines"]
  }),
  profile({
    speciesId: "craterellus-lutescens",
    identity: { commonName: "Camagroc", alternateNames: ["rossinyolic", "trompeta groga"], scientificName: "Craterellus lutescens", family: "Cantharellaceae", genus: "Craterellus", edibility: "excellent_edible", identificationDifficulty: "Mitjana", typicalSize: "3–10 cm d’alçada", shortDescription: "Bolet esvelt de peu groc i barret gris bru, molt habitual en pinedes humides." },
    morphology: { cap: "Petit, embudat, gris bru i ondulat.", hymenium: "Cara inferior llisa o amb plecs molt discrets, grisenca.", stem: "Buit, groc viu, esvelt.", flesh: "Fina i flexible.", colour: "Groc, gris i bru.", smell: "Agradable, suau.", texture: "Elàstica.", typicalAppearance: "Trompeta petita amb peu groc cridaner.", keyFeatures: ["Peu buit i groc", "Himeni gairebé llis", "Barret embudat"], variation: "La sequera redueix molt la mida; amb humitat creix en grups nombrosos." },
    similarSpecies: [{ scientificName: "Craterellus tubaeformis", commonName: "Fals camagroc", mainDifferences: "Té plecs més marcats i peu menys groc.", edibility: "edible", toxicity: "Sense toxicitat coneguda." }, { scientificName: "Craterellus cornucopioides", commonName: "Trompeta de la mort", mainDifferences: "Més fosca, sense peu groc viu.", edibility: "excellent_edible", toxicity: "Sense toxicitat coneguda." }],
    ecologicalConfig: { habitat: { forestTypes: ["Pinedes humides", "fagedes mixtes"], treeAssociations: ["Pinus sylvestris", "Pinus nigra", "Fagus sylvatica"], hosts: ["Pinus", "Fagus"], soilPreference: "Àcid a subàcid", substrate: "Mull de bosc", moisture: "Alta", altitude: [400, 1700], slope: "Variable", aspect: "Obaga", shade: "Alta", landscapePosition: "Mosses, molsa i fondalades" }, soil: { texture: "Franca", reaction: "Àcida", phRange: [4.5, 6.5], substrate: "Silícic o descarbonatat", organicMatter: "Alta", drainage: "Bona", waterRetention: "Alta", depth: "Mitjana", humus: "Mull humit", evidence: "limited" }, climate: { temperatureRange: [8, 16], nightPreference: "Fresca", relativeHumidity: "Alta", soilMoisture: "Alta", rainfall: "Humitat persistent", drought: "Molt desfavorable", heat: "Desfavorable", frost: "Desfavorable", wind: "Molt secant", snow: "Fora del pic" }, rainfall: { preferredAccumulation: "Períodes plujosos i humits", fruitingDelay: "Variable, sovint després de persistència d’humitat", priorMoisture: "Molt important", temperatureAfterRain: "Fresca", interruption: "Vent i sequera", uncertainty: "Espècie de microhàbitats humits." }, seasonality: season({ set: "good", oct: "peak", nov: "peak", des: "moderate" }), regions: ["prepirineus", "catalunya-central", "montseny", "muntanyes-interiors"] },
    idealConditions: ["Pinedes humides amb molsa", "Obagues amb molta humitat", "8–16 °C", "Molt sensible a l’assecament"]
  }),
  profile({
    speciesId: "craterellus-cornucopioides",
    identity: { commonName: "Trompeta de la mort", alternateNames: ["trompeta negra"], scientificName: "Craterellus cornucopioides", family: "Cantharellaceae", genus: "Craterellus", edibility: "excellent_edible", identificationDifficulty: "Mitjana", typicalSize: "5–12 cm d’alçada", shortDescription: "Trompeta fosca i prima, difícil de veure sobre la fullaraca de boscos humits." },
    morphology: { cap: "Profundament embudat, negre a gris fosc.", hymenium: "Cara exterior llisa o finament arrugada, grisenca.", stem: "Continu amb l’embut, buit.", flesh: "Molt prima i flexible.", colour: "Negre, gris i bru fosc.", smell: "Agradable, subtil.", texture: "Fina, coriàcia.", typicalAppearance: "Trompeta negra camuflada a terra.", keyFeatures: ["Embut profund", "Color fosc", "Himeni llis"], variation: "En secor s’encongeix i pot esdevenir gairebé negra; rehidrata parcialment." },
    similarSpecies: [{ scientificName: "Craterellus cinereus", commonName: "Trompeta cendrosa", mainDifferences: "Presenta plecs més evidents i tons més cendrosos.", edibility: "edible", toxicity: "Sense toxicitat coneguda." }, { scientificName: "Helvella lacunosa", commonName: "Orella de gat negra", mainDifferences: "Barret lobulat i peu clarament costellat; no té forma de trompeta contínua.", edibility: "not_recommended", toxicity: "No recomanada sense coneixement especialitzat." }],
    ecologicalConfig: { habitat: { forestTypes: ["Fagedes", "rouredes humides", "alzinars frescals"], treeAssociations: ["Fagus sylvatica", "Quercus petraea", "Quercus ilex"], hosts: ["Fagus", "Quercus"], soilPreference: "Neutre a moderadament àcid", substrate: "Fullaraca profunda", moisture: "Alta", altitude: [100, 1600], slope: "Variable", aspect: "Obaga", shade: "Alta", landscapePosition: "Acumulacions de fullaraca i fondalades" }, soil: { texture: "Franca", reaction: "Àcida a neutra", phRange: [5, 7], substrate: "Variable", organicMatter: "Alta", drainage: "Bona", waterRetention: "Alta", depth: "Mitjana", humus: "Fullaraca madura", evidence: "limited" }, climate: { temperatureRange: [8, 17], nightPreference: "Fresca", relativeHumidity: "Alta", soilMoisture: "Alta", rainfall: "Tardor plujosa", drought: "Desfavorable", heat: "Desfavorable", frost: "Atura l’activitat", wind: "Secant", snow: "No rellevant" }, rainfall: { preferredAccumulation: "Humitat acumulada de tardor", fruitingDelay: "Dies a setmanes", priorMoisture: "Molt important", temperatureAfterRain: "Suau", interruption: "Sequera o gelada", uncertainty: "Difícil de detectar; les observacions poden infravalorar-la." }, seasonality: season({ set: "moderate", oct: "peak", nov: "peak", des: "moderate" }), regions: ["prepirineus", "montseny", "muntanyes-interiors", "serralades-prelitorals"] },
    idealConditions: ["Boscos de fullaraca humida", "Obagues i fondalades", "Tardor fresca i plujosa", "El color fosc la fa difícil de localitzar"]
  }),
  profile({
    speciesId: "hydnum-repandum",
    identity: { commonName: "Llengua de bou", alternateNames: ["agulletes", "llémena"], scientificName: "Hydnum repandum", family: "Hydnaceae", genus: "Hydnum", edibility: "edible", identificationDifficulty: "Baixa a mitjana", typicalSize: "Barret de 5–15 cm", shortDescription: "Bolet carnós de tons crema a ataronjats amb agulletes sota el barret." },
    morphology: { cap: "Irregular, crema a ataronjat pàl·lid, sovint ondulat.", hymenium: "Agulletes decurrents i fràgils; tret distintiu.", stem: "Curt, robust, excèntric de vegades.", flesh: "Blanca, ferma, una mica trencadissa.", colour: "Crema, albercoc pàl·lid.", smell: "Suau.", texture: "Ferma de jove.", typicalAppearance: "Barret irregular amb espines en lloc de làmines o porus.", keyFeatures: ["Agulletes decurrents", "Barret ondulat", "Carn blanca"], variation: "Amb l’edat s’enfosqueix i pot agafar gustos amargs." },
    similarSpecies: [{ scientificName: "Hydnum rufescens", commonName: "Llengua de bou rogenca", mainDifferences: "Més petit i més ataronjat; semblant comestibilitat.", edibility: "edible", toxicity: "Sense toxicitat coneguda." }],
    ecologicalConfig: { habitat: { forestTypes: ["Fagedes", "pinedes", "rouredes"], treeAssociations: ["Fagus sylvatica", "Pinus sylvestris", "Quercus"], hosts: ["Fagus", "Pinus", "Quercus"], soilPreference: "Àcid a neutre", substrate: "Mull de bosc", moisture: "Mitjana", altitude: [200, 1800], slope: "Variable", aspect: "Fresca", shade: "Mitjana", landscapePosition: "Bosc madur i vores" }, soil: { texture: "Franca", reaction: "Àcida a neutra", phRange: [5, 7], substrate: "Variable", organicMatter: "Moderada", drainage: "Bona", waterRetention: "Mitjana", depth: "Mitjana", humus: "Mull moderat", evidence: "limited" }, climate: { temperatureRange: [8, 18], nightPreference: "Fresca", relativeHumidity: "Moderada", soilMoisture: "Mitjana", rainfall: "Regular", drought: "Desfavorable", heat: "Desfavorable", frost: "Desfavorable", wind: "Secant", snow: "No rellevant" }, rainfall: { preferredAccumulation: "Humitat regular", fruitingDelay: "Variable", priorMoisture: "Important", temperatureAfterRain: "Fresca", interruption: "Sequera", uncertainty: "Pot aparèixer en grups dispersos." }, seasonality: season({ set: "moderate", oct: "peak", nov: "good", des: "possible" }), regions: ["pirineus", "prepirineus", "montseny", "muntanyes-interiors"] },
    idealConditions: ["Boscos mixtos i humits", "Sòls amb mull moderat", "Temperatures fresques", "Agulletes: identificació clau"]
  }),
  profile({
    speciesId: "macrolepiota-procera",
    identity: { commonName: "Apagallums", alternateNames: ["paloma", "cogomella"], scientificName: "Macrolepiota procera", family: "Agaricaceae", genus: "Macrolepiota", edibility: "edible", identificationDifficulty: "Alta", typicalSize: "10–35 cm d’alçada", shortDescription: "Bolet alt amb anell mòbil i barret escatós, habitual en vores de bosc i prats." },
    morphology: { cap: "Gran, amb escates brunes sobre fons clar i umbó central.", hymenium: "Làmines blanques, lliures del peu.", stem: "Molt alt, amb dibuix de pell de serp i anell mòbil.", flesh: "Blanca, prima al barret.", colour: "Crema, bru i blanc.", smell: "Agradable, de nou.", texture: "Làmines fràgils; peu fibrós.", typicalAppearance: "Silueta d’ombrel·la sobre peu alt.", keyFeatures: ["Anell doble i mòbil", "Peu amb ziga-zaga", "Barret gran escatós"], variation: "Els exemplars joves són ovoides; la pluja pot rentar les escates." },
    similarSpecies: [{ scientificName: "Chlorophyllum molybdites", commonName: "Para-sol de làmina verdosa", mainDifferences: "Làmines que es tornen verdoses amb l’edat; pot causar intoxicacions digestives.", edibility: "toxic", toxicity: "Tòxic gastrointestinal.", warning: true }, { scientificName: "Lepiota brunneoincarnata", commonName: "Lepiota mortal", mainDifferences: "Molt més petita, sense peu llarg ni anell mòbil.", edibility: "dangerously_toxic", toxicity: "Potencialment mortal.", warning: true }],
    ecologicalConfig: { habitat: { forestTypes: ["Clarianes", "vores de bosc", "prats"], treeAssociations: ["Quercus", "Pinus", "Castanea sativa"], hosts: [], soilPreference: "Rics en matèria orgànica", substrate: "Prat, fullaraca i vores", moisture: "Mitjana", altitude: [0, 1700], slope: "Suau", aspect: "Variable", shade: "Baixa a mitjana", landscapePosition: "Prats i marges" }, soil: { texture: "Franca", reaction: "Variable", substrate: "Sòls amb restes vegetals", organicMatter: "Moderada a alta", drainage: "Bona", waterRetention: "Mitjana", depth: "Variable", humus: "Ric", evidence: "limited" }, climate: { temperatureRange: [12, 22], nightPreference: "Suau", relativeHumidity: "Moderada", soilMoisture: "Mitjana", rainfall: "Pluges de finals d’estiu i de tardor", drought: "Desfavorable", heat: "Tolera calor moderada", frost: "Desfavorable", wind: "Pot danyar exemplars alts", snow: "No rellevant" }, rainfall: { preferredAccumulation: "Sòl humit en prats", fruitingDelay: "Sovint ràpid amb temperatura suau", priorMoisture: "Important", temperatureAfterRain: "Suau", interruption: "Vent fort, sequera o gelada", uncertainty: "Espècie sapròbia amb alta variabilitat local." }, seasonality: season({ ago: "possible", set: "good", oct: "peak", nov: "moderate" }), regions: ["catalunya-central", "serralades-prelitorals", "emporda", "muntanyes-interiors"] },
    idealConditions: ["Clarianes, prats i marges", "Sòl ric amb bona humitat", "Cal identificació experta per confusions perilloses", "Anell mòbil i peu escatós: trets essencials"]
  }),
  profile({
    speciesId: "tricholoma-terreum",
    identity: { commonName: "Fredolic", alternateNames: ["negrilla", "bolet de pi"], scientificName: "Tricholoma terreum", family: "Tricholomataceae", genus: "Tricholoma", edibility: "edible_with_conditions", identificationDifficulty: "Alta", typicalSize: "Barret de 3–8 cm", shortDescription: "Bolet gris de pineda, fràgil i freqüent en tardors fresques." },
    morphology: { cap: "Gris, fibril·lós o lleugerament escatós, amb umbó discret.", hymenium: "Làmines blanques a gris pàl·lid, força espaiades.", stem: "Prim, blanquinós, sense anell.", flesh: "Prima, blanca-grisenca.", colour: "Gris, blanc i argentat.", smell: "Suau, farinós en alguns exemplars.", texture: "Fràgil.", typicalAppearance: "Petit tricoloma gris sota pins.", keyFeatures: ["Sense anell", "Barret fibril·lós gris", "Pineda"], variation: "La humitat enfosqueix el barret; l’edat el fa més estès." },
    similarSpecies: [{ scientificName: "Tricholoma pardinum", commonName: "Tricoloma tigrat", mainDifferences: "Més gran, escates contrastades i olor farinosa; és tòxic.", edibility: "toxic", toxicity: "Tòxic gastrointestinal greu.", warning: true }, { scientificName: "Tricholoma portentosum", commonName: "Fredolic gros", mainDifferences: "Més robust, viscoset amb humitat i amb tons grocs al peu.", edibility: "edible", toxicity: "Sense toxicitat coneguda." }],
    ecologicalConfig: { habitat: { forestTypes: ["Pinedes"], treeAssociations: ["Pinus sylvestris", "Pinus nigra", "Pinus halepensis"], hosts: ["Pinus"], soilPreference: "Àcid a neutre", substrate: "Pinassa", moisture: "Mitjana", altitude: [100, 1700], slope: "Variable", aspect: "Variable", shade: "Mitjana", landscapePosition: "Pinedes obertes i vores" }, soil: { texture: "Arenosa a franca", reaction: "Àcida a neutra", phRange: [5, 7], substrate: "Variable", organicMatter: "Baixa a moderada", drainage: "Bona", waterRetention: "Mitjana", depth: "Variable", humus: "Pinassa", evidence: "limited" }, climate: { temperatureRange: [7, 15], nightPreference: "Fresca", relativeHumidity: "Moderada", soilMoisture: "Mitjana", rainfall: "Tardor i inici d’hivern", drought: "Desfavorable", heat: "Desfavorable", frost: "Pot tolerar fred moderat", wind: "Secant", snow: "No rellevant" }, rainfall: { preferredAccumulation: "Pluja regular en pineda", fruitingDelay: "Variable", priorMoisture: "Important", temperatureAfterRain: "Fresca", interruption: "Sequera o calor", uncertainty: "La identificació de Tricholoma exigeix prudència." }, seasonality: season({ oct: "good", nov: "peak", des: "good", gen: "possible" }), regions: ["prepirineus", "catalunya-central", "serralades-prelitorals", "muntanyes-interiors"] },
    idealConditions: ["Pinedes fresques", "Tardor avançada", "Temperatures de 7–15 °C", "No consumir sense descartar espècies tòxiques semblants"]
  }),
  profile({
    speciesId: "hygrophorus-latitabundus",
    identity: { commonName: "Llenega", alternateNames: ["llenega negra"], scientificName: "Hygrophorus latitabundus", family: "Hygrophoraceae", genus: "Hygrophorus", edibility: "edible", identificationDifficulty: "Mitjana", typicalSize: "Barret de 5–15 cm", shortDescription: "Bolet gran i viscoset de pinedes calcàries, de barret bru grisós i peu clar." },
    morphology: { cap: "Gris-brun, molt viscós amb humitat, convex a estès.", hymenium: "Làmines blanques, gruixudes i decurrents.", stem: "Clar, robust, sovint amb zona mucosa.", flesh: "Blanca, ferma.", colour: "Gris bru, blanc i crema.", smell: "Suau.", texture: "Viscosa, sobretot amb pluja.", typicalAppearance: "Bolet robust i enganxós en pinedes calcàries.", keyFeatures: ["Mucositat abundant", "Làmines gruixudes decurrents", "Associació amb pins i calcària"], variation: "En secor perd la mucositat i pot semblar més apagada." },
    similarSpecies: [{ scientificName: "Hygrophorus persoonii", commonName: "Mocosa de surera", mainDifferences: "Més associada a alzinars o suredes i amb tonalitats diferents.", edibility: "edible", toxicity: "Sense toxicitat coneguda." }],
    ecologicalConfig: { habitat: { forestTypes: ["Pinedes calcàries", "pinedes mixtes"], treeAssociations: ["Pinus nigra", "Pinus halepensis", "Pinus sylvestris"], hosts: ["Pinus"], soilPreference: "Neutre a alcalí", substrate: "Calcari", moisture: "Mitjana a alta", altitude: [200, 1500], slope: "Variable", aspect: "Variable", shade: "Mitjana", landscapePosition: "Pineda amb sòl mineral" }, soil: { texture: "Franca a pedregosa", reaction: "Alcalina", phRange: [7, 8.4], substrate: "Calcari", organicMatter: "Baixa a moderada", drainage: "Bona", waterRetention: "Mitjana", depth: "Variable", humus: "Prim a moderat", evidence: "limited" }, climate: { temperatureRange: [8, 17], nightPreference: "Fresca", relativeHumidity: "Moderada a alta", soilMoisture: "Mitjana", rainfall: "Pluges de tardor", drought: "Desfavorable", heat: "Desfavorable", frost: "Desfavorable", wind: "Secant", snow: "No rellevant" }, rainfall: { preferredAccumulation: "Pluges tardorals que activin la pineda", fruitingDelay: "Dies a setmanes", priorMoisture: "Important", temperatureAfterRain: "Fresca", interruption: "Sequera o gelada", uncertainty: "Fructificació variable en sòls calcaris." }, seasonality: season({ oct: "good", nov: "peak", des: "good", gen: "possible" }), regions: ["prepirineus", "catalunya-central", "serralades-prelitorals", "ports"] },
    idealConditions: ["Pinedes sobre calcària", "Sòl drenat amb humitat tardoral", "8–17 °C", "La mucositat és un tret normal de l’espècie"]
  }),
  profile({
    speciesId: "amanita-caesarea",
    identity: { commonName: "Ou de reig", alternateNames: ["reig", "reix", "cocou"], scientificName: "Amanita caesarea", family: "Amanitaceae", genus: "Amanita", edibility: "excellent_edible", identificationDifficulty: "Alta", typicalSize: "Barret de 8–20 cm", shortDescription: "Amanita mediterrània de barret taronja, làmines i peu grocs, amb volva blanca persistent." },
    morphology: { cap: "Hemisfèric de jove i després estès, llis, d’un taronja viu a vermell ataronjat, amb el marge estriat.", hymenium: "Làmines lliures, denses i grogues; mai blanques en un exemplar típic.", stem: "Groc, cilíndric, amb anell groc i una volva blanca ampla a la base.", flesh: "Blanca, groga sota la cutícula, ferma i immutable al tall.", colour: "Taronja intens, groc daurat i blanc a la volva.", smell: "Suau i agradable.", texture: "Carnosa però delicada amb la maduresa.", typicalAppearance: "Barret taronja sobre peu i làmines grogues, emergint d’una volva blanca.", keyFeatures: ["Làmines i peu grocs", "Volva blanca en forma de sac", "Marge del barret estriat"], variation: "Els exemplars molt joves poden quedar completament tancats dins la volva i no s’han d’identificar només per l’aspecte d’ou." },
    similarSpecies: [{ scientificName: "Amanita muscaria", commonName: "Reig bord", mainDifferences: "Barret habitualment vermell amb restes blanques; làmines i peu blancs, no grocs.", edibility: "toxic", toxicity: "Tòxica; pot causar síndrome neurològica.", warning: true }, { scientificName: "Amanita phalloides", commonName: "Farinera borda", mainDifferences: "Barret verdós o olivaci i làmines i peu blancs; la confusió d’exemplars joves pot ser mortal.", edibility: "dangerously_toxic", toxicity: "Potencialment mortal.", warning: true }],
    ecologicalConfig: { habitat: { forestTypes: ["Alzinars", "suredes", "rouredes mediterrànies", "castanyedes"], treeAssociations: ["Quercus ilex", "Quercus suber", "Quercus pubescens", "Castanea sativa"], hosts: ["Quercus", "Castanea"], soilPreference: "Àcid a subàcid", substrate: "Preferentment silícic o descarbonatat", moisture: "Fresca després de pluges estivals o de tardor", altitude: [50, 1200], slope: "Suau a moderat", aspect: "Solells temperats i vessants protegits", shade: "Baixa a mitjana", landscapePosition: "Boscos clars de planifolis termòfils" }, soil: { texture: "Franca a francoarenosa", reaction: "Àcida a lleugerament àcida", phRange: [4.5, 6.5], substrate: "Silícic o descarbonatat", organicMatter: "Moderada", drainage: "Bona", waterRetention: "Mitjana", depth: "Mitjana a profunda", humus: "Mull moderat", evidence: "limited" }, climate: { temperatureRange: [15, 25], nightPreference: "Suau", relativeHumidity: "Moderada a alta", soilMoisture: "Mitjana a alta", rainfall: "Tempestes d’estiu i pluges de principi de tardor", drought: "Desfavorable durant la fructificació", heat: "Termòfila, però la calor seca interromp l’activitat", frost: "Molt desfavorable", wind: "El vent sec redueix la humitat superficial", snow: "No rellevant" }, rainfall: { preferredAccumulation: "Pluja efectiva sobre un sòl encara temperat", fruitingDelay: "Sovint dins les setmanes posteriors a pluges amb temperatures suaus", priorMoisture: "Important, sobretot després d’un estiu sec", temperatureAfterRain: "Temperada a càlida", interruption: "Sequera renovada, vent sec o baixada brusca de temperatura", uncertainty: "La resposta és molt local i depèn de l’arbre hoste, la temperatura del sòl i la humitat prèvia." }, seasonality: season({ jun: "possible", jul: "moderate", ago: "good", set: "peak", oct: "good", nov: "possible" }), regions: ["serralades-costeres", "serralades-prelitorals", "emporda", "montseny", "ports", "catalunya-central"] },
    idealConditions: ["Alzinars, suredes, rouredes i castanyedes sobre sòls àcids", "Sòl temperat i rehidratat després de pluja", "15–25 °C sense vent sec", "No collir exemplars tancats si no es pot comprovar la volva i el color de làmines i peu"]
  }),
  profile({
    speciesId: "marasmius-oreades",
    identity: { commonName: "Camasec", alternateNames: ["cama-sec", "camassec", "carrereta"], scientificName: "Marasmius oreades", family: "Marasmiaceae", genus: "Marasmius", edibility: "edible", identificationDifficulty: "Alta", typicalSize: "Barret de 2–6 cm", shortDescription: "Petit bolet de prats amb peu tenaç i làmines espaiades, sovint disposat en rotllanes després de la pluja." },
    morphology: { cap: "Convex a aplanat, sovint amb un petit umbó; crema, ocre o bru clar i higròfan.", hymenium: "Làmines clares, gruixudes i força espaiades, lliures o gairebé lliures del peu.", stem: "Prim, llis, tenaç i fibrós; es doblega abans de trencar-se.", flesh: "Prima i clara al barret; fibrosa al peu.", colour: "Crema, ocre mel i bru clar.", smell: "Agradable i característic, lleugerament ametllat.", texture: "Barret flexible i peu notablement tenaç.", typicalAppearance: "Petits bolets ocres en arcs o rotllanes sobre l’herba.", keyFeatures: ["Làmines molt espaiades", "Peu tenaç i fibrós", "Creixement en rotllanes o arcs"], variation: "El barret s’aclareix molt quan s’asseca i recupera flexibilitat amb la humitat." },
    similarSpecies: [{ scientificName: "Clitocybe rivulosa", commonName: "Clitocibe blanquinós", mainDifferences: "Barret blanquinós, làmines més denses i decurrents, i peu menys tenaç; pot créixer als mateixos prats.", edibility: "dangerously_toxic", toxicity: "Tòxic per la muscarina; pot provocar una intoxicació greu.", warning: true }, { scientificName: "Marasmius collinus", commonName: "Camasec de turó", mainDifferences: "Molt semblant; el peu és menys tenaç i la identificació requereix examinar diversos trets.", edibility: "not_recommended", toxicity: "No recomanat sense identificació experta.", warning: true }],
    ecologicalConfig: { habitat: { forestTypes: ["Prats", "pastures", "gespes", "vores de camí"], treeAssociations: [], hosts: [], soilPreference: "Variable, amb herba i matèria orgànica", substrate: "Herba i restes vegetals en descomposició", moisture: "Mitjana després de pluja", altitude: [0, 2000], slope: "Pla a suau", aspect: "Variable", shade: "Baixa", landscapePosition: "Espais oberts herbosos, sovint en rotllanes" }, soil: { texture: "Franca a francoarenosa", reaction: "Lleugerament àcida a neutra", phRange: [5.5, 7.5], substrate: "Prat i gespa", organicMatter: "Moderada", drainage: "Bona", waterRetention: "Baixa a mitjana", depth: "Variable", humus: "Herbaci", evidence: "limited" }, climate: { temperatureRange: [10, 22], nightPreference: "Fresca a suau", relativeHumidity: "Moderada", soilMoisture: "Mitjana", rainfall: "Episodis de primavera i tardor", drought: "Interromp ràpidament la fructificació", heat: "La calor seca és desfavorable", frost: "Desfavorable", wind: "Accelera l’assecat", snow: "No rellevant" }, rainfall: { preferredAccumulation: "Pluja regular que humitegi l’horitzó superficial del prat", fruitingDelay: "Pot fructificar pocs dies després d’una pluja amb temperatura suau", priorMoisture: "Moderadament important", temperatureAfterRain: "Suau", interruption: "Sol intens, vent sec, sequera o gelada", uncertainty: "Els regs i la gestió de prats poden alterar el patró natural; una rotllana no confirma per si sola l’espècie." }, seasonality: season({ mar: "possible", abr: "good", mai: "peak", jun: "good", jul: "possible", set: "good", oct: "peak", nov: "moderate" }), regions: ["pirineus", "prepirineus", "catalunya-central", "serralades-costeres", "serralades-prelitorals", "emporda", "montseny", "ports", "muntanyes-interiors"] },
    idealConditions: ["Prats i pastures obertes amb herba", "Pluja recent i temperatures de 10–22 °C", "Primavera i tardor, sovint en rotllanes", "Cal descartar clitocibes blanquinosos tòxics abans de qualsevol consum"]
  }),
  profile({
    speciesId: "calocybe-gambosa",
    identity: { commonName: "Moixeró", alternateNames: ["moixernó", "bolet de Sant Jordi"], scientificName: "Calocybe gambosa", family: "Lyophyllaceae", genus: "Calocybe", edibility: "excellent_edible", identificationDifficulty: "Alta", typicalSize: "Barret de 4–12 cm", shortDescription: "Bolet primaveral blanc o crema, carnós i amb una olor intensa de farina fresca, propi de prats i vores herboses." },
    morphology: { cap: "Hemisfèric a convex, després irregularment aplanat; blanc, crema o ocre pàl·lid, mat i carnós.", hymenium: "Làmines blanques a crema, molt fines, denses i escotades prop del peu.", stem: "Blanc o crema, cilíndric, compacte i sense anell ni volva.", flesh: "Blanca, gruixuda i ferma.", colour: "Blanc crema a ocre molt pàl·lid.", smell: "Molt marcada, de farina fresca o massa crua.", texture: "Compacta i carnosa.", typicalAppearance: "Bolets pàl·lids i robustos que formen grups, arcs o rotllanes entre l’herba.", keyFeatures: ["Olor intensa de farina fresca", "Làmines molt atapeïdes", "Fructificació principalment primaveral"], variation: "Els exemplars vells poden enfosquir-se al centre i esquerdar-se lleugerament en temps sec." },
    similarSpecies: [{ scientificName: "Entoloma sinuatum", commonName: "Entoloma lívid", mainDifferences: "Sol fructificar més tard; les làmines es tornen salmó-rosades i l’olor no és tan netament farinosa.", edibility: "toxic", toxicity: "Pot causar una intoxicació gastrointestinal greu.", warning: true }, { scientificName: "Inocybe erubescens", commonName: "Inocibe rogenc", mainDifferences: "Tendeix a enrogir, presenta fibres radials al barret i no té les làmines blanques tan denses del moixeró.", edibility: "dangerously_toxic", toxicity: "Conté muscarina i pot provocar una intoxicació greu.", warning: true }],
    ecologicalConfig: { habitat: { forestTypes: ["Prats", "pastures", "clarianes", "vores de bosc"], treeAssociations: [], hosts: [], soilPreference: "Neutre a calcari", substrate: "Sòl herbós ric en matèria orgànica", moisture: "Fresca a la primavera", altitude: [100, 1800], slope: "Pla a moderat", aspect: "Solell o mitja ombra", shade: "Baixa", landscapePosition: "Prats, marges de camí i vores herboses de bosc" }, soil: { texture: "Franca", reaction: "Neutra a alcalina", phRange: [6, 8.2], substrate: "Prat sovint calcari", organicMatter: "Moderada a alta", drainage: "Bo", waterRetention: "Mitjana", depth: "Mitjana", humus: "Herbaci", evidence: "limited" }, climate: { temperatureRange: [8, 18], nightPreference: "Fresca", relativeHumidity: "Moderada a alta", soilMoisture: "Mitjana a alta", rainfall: "Pluges de finals d’hivern i de primavera", drought: "Desfavorable", heat: "La calor avançada n’acaba la temporada", frost: "Pot retardar la fructificació", wind: "El vent sec asseca els prats", snow: "El desglaç pot precedir la temporada de muntanya" }, rainfall: { preferredAccumulation: "Humitat primaveral sostinguda al sòl herbós", fruitingDelay: "Variable, sovint després de l’escalfament gradual d’un sòl ja humit", priorMoisture: "Important", temperatureAfterRain: "Fresca a suau", interruption: "Sequera, calor sobtada o vent persistent", uncertainty: "La gestió del prat i els microclimes locals poden desplaçar molt la fructificació." }, seasonality: season({ mar: "possible", abr: "good", mai: "peak", jun: "good", jul: "possible" }), regions: ["pirineus", "prepirineus", "catalunya-central", "montseny", "muntanyes-interiors"] },
    idealConditions: ["Prats i vores herboses, sovint sobre sòl calcari", "Sòl primaveral humit però drenat", "8–18 °C", "Cal verificar l’olor farinosa i descartar espècies blanques tòxiques"]
  }),
  profile({
    speciesId: "hygrophorus-russula",
    identity: { commonName: "Carlet", alternateNames: ["escarlet", "carlet vermell"], scientificName: "Hygrophorus russula", family: "Hygrophoraceae", genus: "Hygrophorus", edibility: "edible", identificationDifficulty: "Mitjana", typicalSize: "Barret de 5–15 cm", shortDescription: "Higròfor robust de tons blancs i rosats vinosos, tardorenc i associat sobretot a alzinars i rouredes." },
    morphology: { cap: "Convex, després aplanat; blanc crema tacat irregularment de rosa, vi o porpra, lleugerament viscós amb humitat.", hymenium: "Làmines blanques a crema amb taques rosades, gruixudes, espaiades i d’adnates a lleugerament decurrents.", stem: "Massís, blanc, sovint amb taques o fibril·les vinoses, sense anell.", flesh: "Blanca, compacta i de vegades lleugerament rosada sota la cutícula.", colour: "Blanc crema, rosa i vermell vinós.", smell: "Suau, poc distintiva.", texture: "Molt carnosa i compacta.", typicalAppearance: "Bolet robust i jaspiat de vinós entre la fullaraca d’alzina o roure.", keyFeatures: ["Taques vinós-rosades irregulars", "Làmines gruixudes i ceroses", "Carn i peu massissos"], variation: "La intensitat del rosa varia molt; exemplars secs o vells poden quedar més pàl·lids o brunencs." },
    similarSpecies: [{ scientificName: "Hygrophorus erubescens", commonName: "Higròfor enrogent", mainDifferences: "Més esvelt, menys massís i habitualment associat a coníferes; pot tenir gust amarg.", edibility: "not_recommended", toxicity: "No recomanat sense una identificació segura." }, { scientificName: "Russula persicina", commonName: "Cualbra rosada", mainDifferences: "Carn i làmines fràgils que es trenquen netament; no té la textura cerosa dels higròfors.", edibility: "not_recommended", toxicity: "Pot resultar acre i causar molèsties digestives." }],
    ecologicalConfig: { habitat: { forestTypes: ["Alzinars", "rouredes mediterrànies", "boscos de planifolis"], treeAssociations: ["Quercus ilex", "Quercus pubescens", "Quercus faginea"], hosts: ["Quercus"], soilPreference: "Neutre a calcari", substrate: "Sòl de planifolis sovint calcari", moisture: "Fresca després de pluges de tardor", altitude: [50, 1400], slope: "Variable", aspect: "Obagues i vessants protegits", shade: "Mitjana", landscapePosition: "Alzinars i rouredes madures amb fullaraca" }, soil: { texture: "Franca a argilosa", reaction: "Neutra a alcalina", phRange: [6, 8.2], substrate: "Sovint calcari", organicMatter: "Moderada", drainage: "Bo a moderat", waterRetention: "Mitjana", depth: "Mitjana", humus: "Mull de planifolis", evidence: "limited" }, climate: { temperatureRange: [8, 18], nightPreference: "Fresca", relativeHumidity: "Moderada a alta", soilMoisture: "Mitjana a alta", rainfall: "Pluges sostingudes de tardor", drought: "Desfavorable", heat: "Desfavorable durant la fructificació", frost: "Les gelades fortes tanquen la temporada", wind: "El vent sec és desfavorable", snow: "No rellevant" }, rainfall: { preferredAccumulation: "Rehidratació sostinguda de la fullaraca i del sòl", fruitingDelay: "Dies a setmanes segons la temperatura del sòl", priorMoisture: "Important", temperatureAfterRain: "Fresca a suau", interruption: "Vent sec, nova sequera o gelada persistent", uncertainty: "Espècie tardana amb resposta local segons el tipus de roureda o alzinar." }, seasonality: season({ set: "possible", oct: "good", nov: "peak", des: "good" }), regions: ["catalunya-central", "serralades-costeres", "serralades-prelitorals", "emporda", "montseny", "ports", "muntanyes-interiors"] },
    idealConditions: ["Alzinars i rouredes sobre sòl neutre o calcari", "Fullaraca humida després de pluges de tardor", "8–18 °C", "Temporada tardana, sovint d’octubre a desembre"]
  }),
  profile({
    speciesId: "morchella-esculenta",
    identity: { commonName: "Múrgola", alternateNames: ["rabassola", "barret de capellà", "múrgola rossa"], scientificName: "Morchella esculenta", family: "Morchellaceae", genus: "Morchella", edibility: "edible_with_conditions", identificationDifficulty: "Alta", typicalSize: "Alçària total de 6–15 cm", shortDescription: "Múrgola primaveral de barret alveolat color mel i interior completament buit, pròpia d’hàbitats humits i sovint alterats." },
    morphology: { cap: "Ovoide a arrodonit, de color mel a bru groguenc, amb alvèols profunds separats per crestes irregulars.", hymenium: "Recobreix les cares internes i externes dels alvèols del barret; no presenta làmines ni porus.", stem: "Blanc a crema, curt, granular i buit, unit a la base del barret.", flesh: "Prima, fràgil i completament buida de la punta del barret a la base del peu.", colour: "Mel, ocre groguenc i crema.", smell: "Suau, fúngica.", texture: "Fràgil i cerosa.", typicalAppearance: "Cos buit amb un barret semblant a un rusc d’abelles.", keyFeatures: ["Interior completament buit", "Barret alveolat, no cerebriforme", "Barret unit al peu per la base"], variation: "El color i la forma dels alvèols varien molt; el complex d’espècies no sempre es pot resoldre només amb morfologia." },
    similarSpecies: [{ scientificName: "Gyromitra esculenta", commonName: "Falsa múrgola", mainDifferences: "Barret plegat com un cervell, no alveolat com un rusc, i interior compartimentat.", edibility: "dangerously_toxic", toxicity: "Pot causar intoxicacions greus o mortals; no consumir.", warning: true }, { scientificName: "Verpa bohemica", commonName: "Verpa", mainDifferences: "El barret penja unit només per la part superior del peu i l’interior pot contenir material cotonós.", edibility: "not_recommended", toxicity: "No recomanada; pot causar trastorns gastrointestinals.", warning: true }],
    ecologicalConfig: { habitat: { forestTypes: ["Bosc de ribera", "boscos de planifolis", "clarianes", "vores de bosc"], treeAssociations: ["Fraxinus angustifolia", "Populus nigra", "Ulmus minor", "Malus domestica"], hosts: [], soilPreference: "Neutre a calcari, ric en humus", substrate: "Sòl humífer o alterat", moisture: "Humida però no entollada", altitude: [0, 1600], slope: "Pla a moderat", aspect: "Fondalades i orientacions fresques", shade: "Baixa a mitjana", landscapePosition: "Boscos de ribera, parcs, horts vells i terrenys alterats" }, soil: { texture: "Franca a francoargilosa", reaction: "Lleugerament àcida a alcalina", phRange: [5.5, 8.2], substrate: "Humus, graves al·luvials o sòl remogut", organicMatter: "Moderada a alta", drainage: "Bo", waterRetention: "Mitjana a alta", depth: "Variable", humus: "Ric i discontinu", evidence: "limited" }, climate: { temperatureRange: [7, 17], nightPreference: "Fresca sense gelada intensa", relativeHumidity: "Moderada a alta", soilMoisture: "Alta", rainfall: "Pluges d’hivern i primavera", drought: "Molt desfavorable", heat: "La calor n’acaba ràpidament la temporada", frost: "Pot retardar o interrompre la fructificació", wind: "Desseca els carpòfors fràgils", snow: "El desglaç pot precedir la fructificació de muntanya" }, rainfall: { preferredAccumulation: "Sòl humit de manera sostinguda durant la primavera", fruitingDelay: "Molt variable; depèn de l’escalfament del sòl i de pertorbacions locals", priorMoisture: "Molt important", temperatureAfterRain: "Fresca a suau", interruption: "Sequera, calor ràpida o gelada tardana", uncertainty: "Fructificació efímera i poc fidel al lloc; incendis, remocions i vegetació de ribera no estan completament representats pel model." }, seasonality: season({ mar: "possible", abr: "peak", mai: "good", jun: "possible" }), regions: ["pirineus", "prepirineus", "catalunya-central", "serralades-costeres", "serralades-prelitorals", "emporda", "montseny", "ports", "muntanyes-interiors"] },
    idealConditions: ["Boscos de ribera i terrenys humífers o alterats", "Primavera plujosa amb 7–17 °C", "Sòl humit però drenat", "Mai crua: identificació experta i cocció completa imprescindibles"]
  }),
  profile({
    speciesId: "lepista-nuda",
    identity: { commonName: "Pimpinella morada", alternateNames: ["peu violeta", "peu blau", "moixernó blau", "blaveta"], scientificName: "Lepista nuda", family: "Tricholomataceae", genus: "Lepista", edibility: "edible_with_conditions", identificationDifficulty: "Alta", typicalSize: "Barret de 5–15 cm", shortDescription: "Bolet sapròtrof de tons violetes, tardà i aromàtic, que creix sobre fullaraca de boscos i parcs." },
    morphology: { cap: "Convex amb marge involut, després aplanat; violeta o lila de jove i més bru amb l’edat o la sequedat.", hymenium: "Làmines fines, denses i violetes, escotades o lleugerament decurrents; esporada rosa pàl·lid.", stem: "Violeta, fibril·lós, cilíndric i sovint eixamplat a la base, sense cortina.", flesh: "Blanquinosa amb tons liles, tendra i compacta de jove.", colour: "Violeta, lila i bru violaci.", smell: "Aromàtica, dolça i perfumada.", texture: "Carnosa, una mica elàstica o viscosa amb humitat.", typicalAppearance: "Bolet violeta robust entre fullaraca, sovint en grups o rotllanes.", keyFeatures: ["Làmines i peu violetes", "Esporada rosa pàl·lid", "Absència de cortina i d’espores rovellades"], variation: "Els tons violetes s’esvaeixen ràpidament amb l’edat, la pluja o el fred i poden quedar gairebé bruns." },
    similarSpecies: [{ scientificName: "Cortinarius traganus", commonName: "Cortinari violaci", mainDifferences: "Presenta restes de cortina al peu, esporada rovellada i una olor desagradable, no dolça.", edibility: "toxic", toxicity: "Tòxic; els cortinaris violacis no s’han de consumir.", warning: true }, { scientificName: "Lepista sordida", commonName: "Pimpinella lilosa", mainDifferences: "Més petita, prima i poc carnosa, sovint en sòls molt rics o jardins.", edibility: "edible", toxicity: "Sense toxicitat coneguda un cop ben cuinada." }],
    ecologicalConfig: { habitat: { forestTypes: ["Boscos de planifolis", "boscos de coníferes", "pinedes", "clarianes"], treeAssociations: ["Pinus sylvestris", "Quercus ilex", "Fagus sylvatica"], hosts: [], soilPreference: "Àcid a neutre, ric en humus", substrate: "Fullaraca i matèria orgànica en descomposició", moisture: "Fresca a humida", altitude: [0, 1800], slope: "Variable", aspect: "Preferentment fresc i protegit", shade: "Mitjana", landscapePosition: "Sòls amb fullaraca de boscos, parcs i marges" }, soil: { texture: "Franca", reaction: "Àcida a lleugerament alcalina", phRange: [5, 8], substrate: "Fullaraca, compost o humus", organicMatter: "Alta", drainage: "Bo", waterRetention: "Mitjana a alta", depth: "Superficial a mitjana", humus: "Ric", evidence: "limited" }, climate: { temperatureRange: [5, 15], nightPreference: "Freda a fresca", relativeHumidity: "Alta", soilMoisture: "Mitjana a alta", rainfall: "Pluges de tardor i principi d’hivern", drought: "Molt desfavorable", heat: "Desfavorable", frost: "Tolera episodis lleus, però les gelades persistents l’aturen", wind: "El vent sec és desfavorable", snow: "Pot fructificar abans de les primeres neus" }, rainfall: { preferredAccumulation: "Humitat sostinguda de la fullaraca", fruitingDelay: "Dies a setmanes després de pluges amb descens de temperatura", priorMoisture: "Important", temperatureAfterRain: "Fresca", interruption: "Sequera, vent sec o gelades persistents", uncertainty: "La gestió de parcs, jardins i acumulacions de fullaraca modifica molt la disponibilitat local." }, seasonality: season({ gen: "possible", set: "possible", oct: "good", nov: "peak", des: "good" }), regions: ["pirineus", "prepirineus", "catalunya-central", "serralades-costeres", "serralades-prelitorals", "emporda", "montseny", "ports", "muntanyes-interiors"] },
    idealConditions: ["Fullaraca humida en boscos, parcs i marges", "5–15 °C després de pluges de tardor", "Sòls rics en humus", "S’ha de coure completament i cal descartar cortinaris violacis"]
  }),
  profile({
    speciesId: "suillus-luteus",
    identity: { commonName: "Molleric de calceta", alternateNames: ["molleric calçat", "pinetell de calceta", "molleric"], scientificName: "Suillus luteus", family: "Suillaceae", genus: "Suillus", edibility: "edible_with_conditions", identificationDifficulty: "Baixa a mitjana", typicalSize: "Barret de 4–12 cm", shortDescription: "Molleric de pineda amb barret bru molt viscós, porus grocs i un anell membranós característic al peu." },
    morphology: { cap: "Hemisfèric a convex, bru castany; cutícula llisa, molt viscosa i fàcil de pelar.", hymenium: "Tubs i porus fins, groc llimona de jove i més olivacis amb l’edat.", stem: "Blanc a groguenc, amb punts glandulars per sobre d’un anell membranós blanc o violaci.", flesh: "Blanca o de color groc pàl·lid, immutable, ferma de jove i aviat esponjosa.", colour: "Bru castany, groc i crema.", smell: "Suau i agradable.", texture: "Molt viscosa al barret; carn tova amb l’edat.", typicalAppearance: "Bolet de porus grocs sota pins, amb barret lluent i anell visible.", keyFeatures: ["Anell membranós al peu", "Cutícula bruna molt viscosa", "Porus grocs sense tons vermells"], variation: "En temps sec el barret perd part de la viscositat; l’anell dels exemplars vells pot quedar enganxat al peu." },
    similarSpecies: [{ scientificName: "Suillus granulatus", commonName: "Molleric de muntanya", mainDifferences: "No té anell i mostra petites gotes o granulacions glandulars a la part alta del peu.", edibility: "edible_with_conditions", toxicity: "Pot causar intolerància digestiva; cal cuinar-lo bé." }, { scientificName: "Suillus collinitus", commonName: "Molleric", mainDifferences: "Sense anell, amb fibril·les radials al barret i miceli basal sovint rosat.", edibility: "edible_with_conditions", toxicity: "Comestible de qualitat modesta després de retirar la cutícula i cuinar-lo." }],
    ecologicalConfig: { habitat: { forestTypes: ["Pinedes", "pinedes de pi roig", "pinedes de pi negre", "boscos de coníferes"], treeAssociations: ["Pinus sylvestris", "Pinus nigra", "Pinus pinaster"], hosts: ["Pinus"], soilPreference: "Àcid a neutre", substrate: "Sòl de pineda, sovint sorrenc", moisture: "Fresca després de pluja", altitude: [0, 1900], slope: "Variable", aspect: "Variable, millor en indrets frescos", shade: "Baixa a mitjana", landscapePosition: "Pinedes joves, clares o marges de pineda" }, soil: { texture: "Arenosa a franca", reaction: "Àcida a neutra", phRange: [4, 7], substrate: "Sovint silícic i pobre en nutrients", organicMatter: "Baixa a moderada", drainage: "Bo", waterRetention: "Baixa a mitjana", depth: "Variable", humus: "Pinassa", evidence: "limited" }, climate: { temperatureRange: [8, 18], nightPreference: "Fresca", relativeHumidity: "Moderada a alta", soilMoisture: "Mitjana a alta", rainfall: "Pluges de finals d’estiu i de tardor", drought: "Desfavorable", heat: "La calor seca és desfavorable", frost: "Atura la fructificació", wind: "Asseca ràpidament la pinassa", snow: "No rellevant durant la fructificació" }, rainfall: { preferredAccumulation: "Pluja efectiva que mantingui humida la capa de pinassa", fruitingDelay: "Sovint dins els dies o setmanes posteriors a la pluja", priorMoisture: "Important", temperatureAfterRain: "Fresca a suau", interruption: "Vent sec, calor o gelada", uncertainty: "La resposta varia entre pinedes naturals, repoblacions i tipus de sòl." }, seasonality: season({ ago: "possible", set: "good", oct: "peak", nov: "good", des: "possible" }), regions: ["pirineus", "prepirineus", "catalunya-central", "serralades-costeres", "serralades-prelitorals", "emporda", "montseny", "ports", "muntanyes-interiors"] },
    idealConditions: ["Pinedes sobre sòl àcid a neutre", "Pinassa humida i bon drenatge", "8–18 °C després de pluges", "Retirar la cutícula viscosa i cuinar-lo bé; pot causar intolerància digestiva"]
  }),
  profile({
    speciesId: "chroogomphus-rutilus",
    identity: { commonName: "Cama de perdiu", alternateNames: ["bec de perdiu", "pota de perdiu", "ull de perdiu", "bitxac"], scientificName: "Chroogomphus rutilus", family: "Gomphidiaceae", genus: "Chroogomphus", edibility: "edible", identificationDifficulty: "Mitjana", typicalSize: "Barret de 4–12 cm", shortDescription: "Bolet de pineda de barret coure a vermellós, làmines gruixudes decurrents i peu groguenc amb tons d’aram." },
    morphology: { cap: "Convex de jove i després aplanat, sovint amb un petit mamelló; bru ataronjat, coure o vermellós, una mica viscós amb temps humit.", hymenium: "Làmines gruixudes, espaiades, bifurcades i molt decurrents; de jove són olivàcies i es tornen bru porpra o fosques amb les espores.", stem: "Cilíndric o una mica afuat cap a la base, groguenc amb tons d’aram o vermellosos; sense anell.", flesh: "Groguenca o de color taronja pàl·lid, més rogenca a la base; pot enfosquir-se o violacejar en cuinar-la.", colour: "Coure, bru ataronjat, vermellós i groc.", smell: "Suau, poc distintiva.", texture: "Carnosa però més aviat tendra; lleugerament viscosa en humit.", typicalAppearance: "Bolet de làmines fosques, gruixudes i molt decurrents que creix sota pins, amb barret color de coure i peu groguenc.", keyFeatures: ["Làmines gruixudes, espaiades i decurrents", "Barret coure o vermellós", "Peu groguenc amb tonalitats d’aram", "Associació amb pinedes"], variation: "El barret és més viscós amb humitat i els colors s’enfosqueixen amb l’edat; els exemplars vells poden semblar gairebé bruns o porpra foscos." },
    similarSpecies: [{ scientificName: "Gomphidius glutinosus", commonName: "Cama de perdiu mucosa", mainDifferences: "Té el barret gris brunenc molt més mucós, peu més curt i sense els tons coure característics; apareix sobretot en pinedes fresques.", edibility: "edible", toxicity: "Sense toxicitat coneguda quan s’identifica amb certesa." }, { scientificName: "Cortinarius rubellus", commonName: "Cortinari mortal", mainDifferences: "Té làmines rovellades, restes de cortina i peu sòlid; no presenta les làmines gruixudes, espaiades i decurrents de la cama de perdiu.", edibility: "dangerously_toxic", toxicity: "Pot provocar una intoxicació renal mortal.", warning: true }],
    ecologicalConfig: { habitat: { forestTypes: ["Pinedes", "pinedes mediterrànies", "boscos de coníferes"], treeAssociations: ["Pinus halepensis", "Pinus sylvestris", "Pinus nigra", "Pinus pinaster"], hosts: ["Pinus"], soilPreference: "Àcid a neutre, sovint ben drenat", substrate: "Sòl de pineda amb pinassa", moisture: "Fresca a moderadament humida", altitude: [0, 1800], slope: "Variable", aspect: "Variable; millor després de períodes humits", shade: "Baixa a mitjana", landscapePosition: "Clarianes, marges i interior de pinedes" }, soil: { texture: "Arenosa a franca", reaction: "Àcida a neutra", phRange: [4.5, 7.5], substrate: "Silícic o descarbonatat, amb pinassa", organicMatter: "Baixa a moderada", drainage: "Bo", waterRetention: "Baixa a mitjana", depth: "Variable", humus: "Pinassa", evidence: "limited" }, climate: { temperatureRange: [8, 19], nightPreference: "Fresca", relativeHumidity: "Moderada a alta", soilMoisture: "Mitjana", rainfall: "Pluges de finals d’estiu i de tardor", drought: "Desfavorable", heat: "La calor seca és desfavorable", frost: "Atura la fructificació", wind: "El vent sec asseca la pinassa", snow: "No rellevant durant la fructificació" }, rainfall: { preferredAccumulation: "Pluja efectiva que mantingui humida la pinassa sense entollar el sòl", fruitingDelay: "Dies a setmanes després de pluges efectives", priorMoisture: "Important", temperatureAfterRain: "Fresca a suau", interruption: "Sequera, vent sec, calor persistent o gelada", uncertainty: "La intensitat de fructificació varia entre tipus de pineda i amb la persistència de la humitat del sòl." }, seasonality: season({ ago: "possible", set: "good", oct: "peak", nov: "good", des: "possible" }), regions: ["pirineus", "prepirineus", "catalunya-central", "serralades-costeres", "serralades-prelitorals", "emporda", "montseny", "ports", "muntanyes-interiors"] },
    idealConditions: ["Pinedes amb pinassa humida i bon drenatge", "8–19 °C després de pluges de finals d’estiu o de tardor", "Làmines gruixudes i decurrents, no làmines rovellades amb cortina", "Cuineu-la completament i no consumiu exemplars sense identificació segura"]
  }),
  profile({
    speciesId: "ramaria-aurea",
    identity: {
      commonName: "Peu de rata daurat",
      alternateNames: ["peu de rata groc"],
      scientificName: "Ramaria aurea",
      family: "Gomphaceae",
      genus: "Ramaria",
      edibility: "not_recommended",
      identificationDifficulty: "Molt alta",
      typicalSize: "Fructificació de 6–16 cm d’alçada",
      shortDescription: "Bolet coral·liforme groc daurat de boscos de planifolis que sovint requereix microscòpia per separar-lo amb seguretat d’altres ramàries grogues."
    },
    morphology: {
      cap: "No forma un barret diferenciat: el carpòfor es divideix repetidament en branques corallines.",
      hymenium: "Recobreix la superfície exterior de les branques, sense làmines ni porus visibles.",
      stem: "Base curta, compacta i blanquinosa, de la qual surten nombroses ramificacions.",
      flesh: "Blanca o de color groc pàl·lid, compacta a la base i més fràgil a les puntes.",
      colour: "Groc ocre a groc daurat, amb la base més clara.",
      smell: "Suau i poc distintiva.",
      texture: "Carnosa però trencadissa a les ramificacions.",
      typicalAppearance: "Mata densa amb aspecte de corall o coliflor groga sobre el sòl del bosc.",
      keyFeatures: ["Ramificació coral·liforme densa", "Color groc daurat força uniforme", "Base robusta i pàl·lida"],
      variation: "Els exemplars vells o masegats s’enfosqueixen i les puntes poden perdre el groc viu."
    },
    similarSpecies: [
      { scientificName: "Ramaria formosa", commonName: "Peu de rata bord", mainDifferences: "Tons salmó o rosats, puntes grogues i base pàl·lida; la separació entre ramàries requereix experiència.", edibility: "toxic", toxicity: "Pot causar trastorns gastrointestinals intensos.", warning: true },
      { scientificName: "Ramaria pallida", commonName: "Peu de rata pàl·lid", mainDifferences: "Tons més pàl·lids, crema o lilacins; la separació segura pot requerir microscòpia.", edibility: "toxic", toxicity: "Pot causar trastorns gastrointestinals importants.", warning: true }
    ],
    ecologicalConfig: {
      habitat: { forestTypes: ["Fagedes", "rouredes", "boscos de planifolis"], treeAssociations: ["Fagus sylvatica", "Quercus pubescens", "Quercus petraea"], hosts: ["Fagus", "Quercus"], soilPreference: "Neutre a alcalí, ric en bases", substrate: "Sòl mineral amb humus de planifolis", moisture: "Fresca a humida, sense entollament", altitude: [400, 1700], slope: "Variable", aspect: "Obagues i vessants frescos", shade: "Mitjana a alta", landscapePosition: "Interior de fagedes i boscos mixtos madurs" },
      soil: { texture: "Franca a francoargilosa", reaction: "Neutra a alcalina", phRange: [6, 8.2], substrate: "Sovint calcari o ric en bases", organicMatter: "Moderada", drainage: "Bo", waterRetention: "Mitjana a alta", depth: "Mitjana", humus: "Mull de planifolis", evidence: "limited" },
      climate: { temperatureRange: [9, 18], nightPreference: "Fresca", relativeHumidity: "Alta", soilMoisture: "Mitjana a alta", rainfall: "Pluges de finals d’estiu i de tardor", drought: "Molt desfavorable", heat: "Desfavorable", frost: "Atura la fructificació", wind: "El vent sec és desfavorable", snow: "Fora del període principal" },
      rainfall: { preferredAccumulation: "Humitat sostinguda al sòl forestal", fruitingDelay: "Variable, habitualment després d’un període humit", priorMoisture: "Important", temperatureAfterRain: "Fresca a suau", interruption: "Sequera, vent sec o gelada", uncertainty: "La fenologia i l’ecologia se solapen amb les d’altres Ramaria i varien localment." },
      seasonality: season({ jul: "possible", ago: "moderate", set: "good", oct: "peak", nov: "possible" }),
      regions: ["pirineus", "prepirineus", "catalunya-central", "emporda", "montseny", "ports", "muntanyes-interiors"]
    },
    idealConditions: ["Fagedes i rouredes fresques", "Sòl humit i ric en bases", "9–18 °C després d’un període plujós", "No recomanada per a recol·lecció alimentària sense confirmació microscòpica"]
  }),
  profile({
    speciesId: "agaricus-campestris",
    identity: {
      commonName: "Camperol",
      alternateNames: ["xampinyó de prat", "terrerol", "rubiol", "bolet de camp"],
      scientificName: "Agaricus campestris",
      family: "Agaricaceae",
      genus: "Agaricus",
      edibility: "edible",
      identificationDifficulty: "Alta",
      typicalSize: "Barret de 3–12 cm",
      shortDescription: "Xampinyó silvestre de prats, amb làmines que passen del rosa al bru xocolata i sense volva."
    },
    morphology: {
      cap: "Hemisfèric de jove i després convex o aplanat; blanc a crema, llis o finament fibril·lós.",
      hymenium: "Làmines lliures, rosades de jove i progressivament de color bru xocolata en madurar.",
      stem: "Blanc, cilíndric, amb anell fi i fugaç; base sense volva.",
      flesh: "Blanca, de vegades lleument rosada al tall, sense groguejar intensament a la base.",
      colour: "Blanc, crema, rosa i bru xocolata.",
      smell: "Suau i agradable, fúngica.",
      texture: "Ferma de jove i més tendra amb l’edat.",
      typicalAppearance: "Bolet blanc de prat, sovint en grups o rotllanes, amb làmines rosades o fosques.",
      keyFeatures: ["Làmines roses que es tornen xocolata", "Absència de volva", "Anell prim i fràgil"],
      variation: "La pluja embruta o fissura el barret i els exemplars madurs presenten làmines molt fosques."
    },
    similarSpecies: [
      { scientificName: "Agaricus xanthodermus", commonName: "Xampinyó pudent", mainDifferences: "Grogueja ràpidament, sobretot a la base del peu, i fa olor de fenol o tinta en escalfar-lo.", edibility: "toxic", toxicity: "Provoca intoxicacions gastrointestinals.", warning: true },
      { scientificName: "Amanita phalloides", commonName: "Farinera borda", mainDifferences: "Manté les làmines blanques i presenta una volva membranosa a la base; pot tenir el barret pàl·lid.", edibility: "dangerously_toxic", toxicity: "Mortal; una confusió pot causar insuficiència hepàtica greu.", warning: true }
    ],
    ecologicalConfig: {
      habitat: { forestTypes: ["Prats", "clarianes", "vores de bosc"], treeAssociations: [], hosts: [], soilPreference: "Lleugerament àcid a neutre i moderadament enriquit", substrate: "Sòl herbós amb restes vegetals i matèria orgànica", moisture: "Humit després de pluja, però drenat", altitude: [0, 2000], slope: "Pla a suau", aspect: "Variable", shade: "Baixa", landscapePosition: "Prats permanents, pastures, gespes i marges herbosos" },
      soil: { texture: "Arenosa, franca, torbosa o argilosa", reaction: "Moderadament àcida a neutra", phRange: [5.5, 7.5], substrate: "Sòl herbós moderadament adobat", organicMatter: "Moderada a alta", drainage: "Bo", waterRetention: "Baixa a mitjana", depth: "Variable", humus: "Herbaci", evidence: "limited" },
      climate: { temperatureRange: [10, 22], nightPreference: "Fresca a suau", relativeHumidity: "Moderada a alta", soilMoisture: "Mitjana", rainfall: "Episodis de primavera i tardor", drought: "Interromp ràpidament la fructificació", heat: "La calor seca és desfavorable", frost: "Desfavorable", wind: "Accelera l’assecat del prat", snow: "No rellevant" },
      rainfall: { preferredAccumulation: "Pluja suficient per rehidratar el sòl herbós", fruitingDelay: "Sovint curt després de pluges amb temperatures suaus", priorMoisture: "Important", temperatureAfterRain: "Suau", interruption: "Sequera, calor o gelada", uncertainty: "El reg, la sega i la fertilització poden alterar fortament la resposta local." },
      seasonality: season({ mar: "possible", abr: "good", mai: "peak", jun: "good", jul: "possible", ago: "possible", set: "good", oct: "peak", nov: "moderate" }),
      regions: ["pirineus", "prepirineus", "catalunya-central", "serralades-costeres", "serralades-prelitorals", "emporda", "montseny", "ports", "muntanyes-interiors"]
    },
    idealConditions: ["Prats permanents i pastures amb herba curta", "Sòl humit però drenat després de pluja", "10–22 °C", "Cal comprovar làmines, base del peu, olor i reacció al fregament"]
  }),
  profile({
    speciesId: "pleurotus-ostreatus",
    identity: {
      commonName: "Gírgola",
      alternateNames: ["orellana", "auriana", "gírgola d’ostra"],
      scientificName: "Pleurotus ostreatus",
      family: "Pleurotaceae",
      genus: "Pleurotus",
      edibility: "edible",
      identificationDifficulty: "Mitjana a alta",
      typicalSize: "Barret de 5–20 cm",
      shortDescription: "Bolet de fusta en forma de petxina, amb làmines blanques decurrents i peu lateral molt curt."
    },
    morphology: {
      cap: "En forma de ventall, petxina o ostra, de gris blavós a gris bru, beix o gairebé blanc; marge inicialment incurvat.",
      hymenium: "Làmines blanques o crema, atapeïdes i profundament decurrents cap al punt d’inserció.",
      stem: "Molt curt, lateral o absent; blanc i sovint pilós a la base.",
      flesh: "Blanca, gruixuda prop de la inserció i més prima al marge.",
      colour: "Gris, bru grisenc, beix i blanc crema.",
      smell: "Suau i fúngica, de vegades lleugerament anisada.",
      texture: "Tendra de jove; més fibrosa o coriàcia amb l’edat.",
      typicalAppearance: "Diversos barrets imbricats que formen prestatges sobre un tronc o una soca de planifoli.",
      keyFeatures: ["Creixement directe sobre fusta", "Barret lateral en forma d’ostra", "Làmines blanques molt decurrents", "Peu curt o absent"],
      variation: "El color depèn de la temperatura i de la soca; els exemplars de temps suau poden ser molt pàl·lids."
    },
    similarSpecies: [
      { scientificName: "Omphalotus olearius", commonName: "Bolet d’olivera", mainDifferences: "Tot el carpòfor és taronja, incloses les làmines i el peu; sol créixer en feixos sobre oliveres o arrels de planifolis.", edibility: "toxic", toxicity: "Provoca una intoxicació gastrointestinal que pot ser intensa.", warning: true },
      { scientificName: "Pleurotus pulmonarius", commonName: "Gírgola pulmonada", mainDifferences: "Més pàl·lida, prima i termòfila, amb fructificació principalment estival; separar les dues espècies pot requerir microscòpia o ADN.", edibility: "edible", toxicity: "Sense toxicitat coneguda." }
    ],
    ecologicalConfig: {
      habitat: { forestTypes: ["Bosc de ribera", "boscos de planifolis"], treeAssociations: ["Populus nigra", "Populus alba", "Fagus sylvatica", "Salix alba", "Alnus glutinosa", "Ulmus minor"], hosts: [], soilPreference: "No determinant; depèn de la disponibilitat de fusta", substrate: "Troncs, soques i branques de planifolis morts o debilitats", moisture: "Fusta humida i aire humit", altitude: [0, 1800], slope: "No determinant", aspect: "Indrets frescos i protegits", shade: "Mitjana a alta", landscapePosition: "Boscos de ribera, fondalades, parcs i arbres vells" },
      soil: { texture: "No determinant", reaction: "No s’ha d’utilitzar com a porta ecològica", substrate: "Fusta de planifoli en descomposició", organicMatter: "Fusta morta o debilitada", drainage: "No aplicable directament", waterRetention: "Alta dins la fusta", depth: "No aplicable", humus: "No determinant", evidence: "limited" },
      climate: { temperatureRange: [6, 17], nightPreference: "Freda a fresca", relativeHumidity: "Alta", soilMoisture: "La humitat de la fusta és més rellevant que la del sòl", rainfall: "Pluges que rehidratin troncs i soques", drought: "Molt desfavorable", heat: "La calor redueix la fructificació típica", frost: "Tolera fred lleu; les gelades fortes o persistents l’aturen", wind: "El vent sec desseca ràpidament els carpòfors", snow: "Pot fructificar abans o després d’episodis freds" },
      rainfall: { preferredAccumulation: "Rehidratació sostinguda de la fusta", fruitingDelay: "Variable; sovint després de pluges i un descens de temperatura", priorMoisture: "Molt important", temperatureAfterRain: "Fresca", interruption: "Vent sec, calor o dessecació del substrat", uncertainty: "El model cartogràfic no observa la fusta morta; la coberta de planifolis només n’és un indicador indirecte i de baixa confiança." },
      seasonality: season({ gen: "good", feb: "possible", set: "possible", oct: "good", nov: "peak", des: "peak" }),
      regions: ["pirineus", "prepirineus", "catalunya-central", "serralades-costeres", "serralades-prelitorals", "emporda", "montseny", "ports", "muntanyes-interiors"]
    },
    idealConditions: ["Fusta humida de pollancre, faig, salze, vern o altres planifolis", "Ambient protegit amb humitat alta", "6–17 °C, sobretot a finals de tardor i a l’hivern", "La presència de bosc compatible no demostra que hi hagi fusta morta adequada"]
  }),
  profile({
    speciesId: "hygrophorus-eburneus",
    identity: {
      commonName: "Llenega blanca",
      alternateNames: ["mocosa blanca", "llenegall blanc"],
      scientificName: "Hygrophorus eburneus",
      family: "Hygrophoraceae",
      genus: "Hygrophorus",
      edibility: "edible",
      identificationDifficulty: "Alta",
      typicalSize: "Barret de 3–8 cm",
      shortDescription: "Higròfor blanc o de vori, molt viscós amb humitat, propi sobretot de fagedes."
    },
    morphology: {
      cap: "Convex a planoconvex, sovint amb umbó baix; blanc de vori, molt viscós, amb el marge inicialment involut.",
      hymenium: "Làmines blanques, gruixudes, ceroses, espaiades i decurrents.",
      stem: "Blanc, ferm i viscoset, excepte l’àpex sec i pruïnós; sovint s’afua cap a la base.",
      flesh: "Blanca i immutable.",
      colour: "Blanc pur a vori, amb tons palla en exemplars vells.",
      smell: "Variable, feble a cerosa o lleugerament aromàtica; no és suficient per identificar-la.",
      texture: "Molt relliscosa amb humitat; carn ferma.",
      typicalAppearance: "Bolet completament blanc i lluent entre la fullaraca de faig.",
      keyFeatures: ["Barret blanc molt viscós", "Làmines gruixudes i decurrents", "Peu blanc viscoset amb àpex sec", "Associació principal amb faig"],
      variation: "La viscositat disminueix en temps sec i els exemplars madurs poden groguejar."
    },
    similarSpecies: [
      { scientificName: "Hygrophorus cossus", commonName: "Llenega pudent", mainDifferences: "Més carnosa i amb una olor forta, àcida o de pell de mandarina; la separació pot exigir proves químiques.", edibility: "not_recommended", toxicity: "No es considera perillosament tòxica, però és poc apreciada i fàcil de confondre." },
      { scientificName: "Amanita virosa", commonName: "Farinera pudent", mainDifferences: "Té làmines lliures, anell i volva basal; no presenta les làmines ceroses i decurrents d’un Hygrophorus.", edibility: "dangerously_toxic", toxicity: "Potencialment mortal.", warning: true }
    ],
    ecologicalConfig: {
      habitat: { forestTypes: ["Fagedes", "rouredes", "boscos de planifolis"], treeAssociations: ["Fagus sylvatica", "Quercus petraea", "Quercus pubescens"], hosts: ["Fagus", "Quercus"], soilPreference: "Subàcid a alcalí, sovint ric en bases", substrate: "Sòl humífer de planifolis, sovint amb molsa", moisture: "Humida però drenada", altitude: [400, 1700], slope: "Variable", aspect: "Obagues i orientacions fresques", shade: "Mitjana a alta", landscapePosition: "Interior i vores humides de fageda" },
      soil: { texture: "Franca a francoargilosa", reaction: "Subàcida a alcalina", phRange: [5.5, 8.2], substrate: "Sovint calcari o ric en bases, però no exclusivament", organicMatter: "Moderada a alta", drainage: "Bo", waterRetention: "Mitjana a alta", depth: "Mitjana", humus: "Mull humit de planifolis", evidence: "limited" },
      climate: { temperatureRange: [7, 16], nightPreference: "Fresca", relativeHumidity: "Alta", soilMoisture: "Alta", rainfall: "Pluges sostingudes de tardor", drought: "Molt desfavorable", heat: "Desfavorable", frost: "Les gelades persistents tanquen la temporada", wind: "El vent sec elimina la viscositat i desseca el carpòfor", snow: "Habitualment fora del pic" },
      rainfall: { preferredAccumulation: "Humitat sostinguda de la fullaraca i el sòl de fageda", fruitingDelay: "Dies a setmanes segons la temperatura del sòl", priorMoisture: "Molt important", temperatureAfterRain: "Fresca", interruption: "Sequera, vent sec o gelada persistent", uncertainty: "El faig és l’associació europea millor sostinguda; el rang de pH és ampli perquè les fagedes catalanes ocupen substrats diversos." },
      seasonality: season({ set: "possible", oct: "peak", nov: "good", des: "possible" }),
      regions: ["pirineus", "prepirineus", "catalunya-central", "emporda", "montseny", "ports", "muntanyes-interiors"]
    },
    idealConditions: ["Fagedes humides i fresques", "Fullaraca o molsa amb humitat sostinguda", "7–16 °C", "Cal comprovar làmines decurrents i absència d’anell i volva"]
  }),
  profile({
    speciesId: "craterellus-tubaeformis",
    identity: {
      commonName: "Fals camagroc",
      alternateNames: ["rossinyolic embudat", "rossinyol embudat", "camagroc embudat"],
      scientificName: "Craterellus tubaeformis",
      family: "Cantharellaceae",
      genus: "Craterellus",
      edibility: "edible",
      identificationDifficulty: "Mitjana",
      typicalSize: "3–10 cm d’alçada; barret de 2–6 cm",
      shortDescription: "Bolet tardorenc de barret bru embudat, plecs gris-groguencs decurrents i peu buit groc o ocre, propi de molses humides."
    },
    morphology: {
      cap: "Bru grisenc a ocre, deprimit i finalment embudat o perforat, amb marge prim i ondulat.",
      hymenium: "Plecs falsos, gruixuts, bifurcats i molt decurrents, grisos a beix groguenc; no són làmines veritables.",
      stem: "Prim, buit, sovint comprimit, llis, groc o ocre apagat.",
      flesh: "Molt prima, flexible i pàl·lida.",
      colour: "Bru grisenc, ocre i groc apagat.",
      smell: "Suau i agradable.",
      texture: "Flexible i una mica elàstica.",
      typicalAppearance: "Petita trompeta bruna de peu buit entre la molsa.",
      keyFeatures: ["Plecs marcats i decurrents", "Peu buit groc o ocre", "Barret embudat comunicat amb el peu"],
      variation: "El peu pot perdre el groc i el barret enfosquir-se amb humitat; els exemplars vells són molt prims i ondulats."
    },
    similarSpecies: [
      { scientificName: "Craterellus lutescens", commonName: "Camagroc", mainDifferences: "Himeni gairebé llis o només venós i peu normalment més groc viu.", edibility: "excellent_edible", toxicity: "Sense toxicitat coneguda." },
      { scientificName: "Hygrophoropsis aurantiaca", commonName: "Fals rossinyol", mainDifferences: "Làmines fines, nombroses i separables, carn més taronja i creixement freqüent sobre restes llenyoses.", edibility: "not_recommended", toxicity: "Pot causar molèsties digestives.", warning: true },
      { scientificName: "Cortinarius rubellus", commonName: "Cortinari mortal", mainDifferences: "Làmines veritables rovellades, peu sòlid, restes de cortina i barret rogenc; cal revisar cada exemplar dels grups barrejats.", edibility: "dangerously_toxic", toxicity: "Pot provocar una intoxicació renal mortal.", warning: true }
    ],
    ecologicalConfig: {
      habitat: { forestTypes: ["Pinedes de muntanya", "pinedes", "fagedes", "boscos de planifolis"], treeAssociations: ["Pinus sylvestris", "Pinus uncinata", "Abies alba", "Fagus sylvatica"], hosts: ["Pinus", "Abies", "Fagus"], soilPreference: "Àcid i pobre en nutrients", substrate: "Molsa, humus i fusta molt descomposta sobre sòl forestal", moisture: "Alta i persistent", altitude: [250, 1500], slope: "Variable", aspect: "Obaga", shade: "Mitjana a alta", landscapePosition: "Molses, fondalades i fusta molt descomposta en bosc fresc" },
      soil: { texture: "Franca i humífera", reaction: "Àcida", phRange: [4, 6.5], substrate: "Humus, molsa i restes llenyoses molt descompostes", organicMatter: "Alta", drainage: "Bo", waterRetention: "Alta", depth: "Mitjana", humus: "Mull àcid de bosc", evidence: "limited" },
      climate: { temperatureRange: [5, 15], nightPreference: "Freda a fresca", relativeHumidity: "Alta", soilMoisture: "Alta", rainfall: "Humitat persistent durant setmanes", drought: "Molt desfavorable", heat: "Molt desfavorable", frost: "Les gelades persistents poden acabar la fructificació", wind: "Molt secant", snow: "Pot marcar el final de temporada" },
      rainfall: { preferredAccumulation: "Humitat sostinguda de molsa i humus, no un sol xàfec", fruitingDelay: "Variable després de setmanes humides", priorMoisture: "Molt important", temperatureAfterRain: "Freda a fresca", interruption: "Sequera, vent sec o gelada persistent", uncertainty: "La molsa i la fusta morta del microhàbitat, així com la complexitat taxonòmica, no queden plenament representades al model." },
      seasonality: season({ gen: "possible", set: "good", oct: "peak", nov: "good", des: "moderate" }),
      regions: ["pirineus", "prepirineus", "catalunya-central", "serralades-prelitorals", "montseny", "muntanyes-interiors"]
    },
    idealConditions: ["Pinedes i boscos mixtos frescos amb molsa", "Sòl àcid amb humitat persistent", "5–15 °C", "Cal revisar cada exemplar per descartar bolets de làmines veritables"]
  }),
  profile({
    speciesId: "tuber-melanosporum",
    predictionCaveat: TUBER_SHORT_TERM_CAVEAT,
    identity: {
      commonName: "Tòfona negra",
      alternateNames: ["tòfona del Perigord", "tòfona negra d’hivern"],
      scientificName: "Tuber melanosporum",
      family: "Tuberaceae",
      genus: "Tuber",
      edibility: "excellent_edible",
      identificationDifficulty: "Molt alta",
      typicalSize: "Habitualment 2–8 cm, però molt variable",
      shortDescription: "Ascomicet ectomicorrízic hipogeu, negre i berrugós, amb gleba fosca marbrejada per venes blanques i aroma intens."
    },
    morphology: {
      cap: "No presenta barret: l’ascocarp és subterrani, globós o irregular, amb peridi negre de berrugues piramidals.",
      hymenium: "Intern dins la gleba, en ascs microscòpics; sense làmines ni porus.",
      stem: "No presenta peu.",
      flesh: "Gleba ferma, bru-negrenca a violàcia en madurar, recorreguda per venes blanques fines i ramificades.",
      colour: "Negre a l’exterior; negre violaci i blanc marbrejat al tall.",
      smell: "Intensa, complexa i persistent quan és madura.",
      texture: "Ferma i compacta.",
      typicalAppearance: "Cos fructífer subterrani, irregular i berrugós, amb interior fosc finament marbrejat.",
      keyFeatures: ["Ascocarp subterrani", "Peridi negre berrugós", "Gleba fosca amb venes blanques fines"],
      variation: "La mida i la forma depenen del sòl; els exemplars immadurs tenen la gleba més clara. La morfologia macroscòpica sola no garanteix l’espècie."
    },
    similarSpecies: [
      { scientificName: "Tuber brumale", commonName: "Tòfona d’hivern", mainDifferences: "Peridi i gleba semblants, però aroma diferent i venes sovint més amples; la confirmació pot requerir microscòpia.", edibility: "edible", toxicity: "Sense toxicitat coneguda." },
      { scientificName: "Tuber aestivum", commonName: "Tòfona d’estiu", mainDifferences: "Gleba més clara i berrugues grosses; madura principalment en una altra època.", edibility: "edible", toxicity: "Sense toxicitat coneguda." },
      { scientificName: "Scleroderma citrinum", commonName: "Escleroderma comú", mainDifferences: "Gleba més uniforme que es torna porpra-negra i polsegosa, sense el marbrejat fi ni l’aroma típica de Tuber.", edibility: "toxic", toxicity: "Pot causar intoxicació gastrointestinal.", warning: true }
    ],
    ecologicalConfig: {
      habitat: { forestTypes: ["Alzinars", "rouredes", "boscos de planifolis"], treeAssociations: ["Quercus ilex", "Quercus pubescens", "Quercus faginea", "Corylus avellana"], hosts: ["Quercus", "Corylus"], soilPreference: "Calcari i bàsic", substrate: "Calcària o dolomia fracturada", moisture: "Humitat estacional sense entollament", altitude: [500, 1300], slope: "Carena o vessant ben drenat", aspect: "Solell o exposició oberta", shade: "Baixa a mitjana", landscapePosition: "Sòls oberts al voltant d’arbres hoste, sovint amb cremat tofoner" },
      soil: { texture: "Franca a pedregosa, amb argila moderada", reaction: "Alcalina", phRange: [7.3, 8.5], substrate: "Calcari, ric en carbonats i amb estructura estable", organicMatter: "Baixa a moderada", drainage: "Excel·lent", waterRetention: "Moderada en profunditat", depth: "10–40 cm", humus: "Prim", evidence: "moderate" },
      climate: { temperatureRange: [2, 14], nightPreference: "Freda a fresca durant la maduració hivernal", relativeHumidity: "Variable", soilMoisture: "Humitat en profunditat sense saturació", rainfall: "Cicle anual amb aigua estival suficient i recàrrega de tardor", drought: "Una sequera estival severa i prolongada redueix la producció", heat: "La calor forma part del cicle anual, però l’estrès hídric extrem és desfavorable", frost: "Les gelades intenses poden malmetre ascocarps superficials", wind: "Efecte principalment indirecte per dessecació", snow: "Pot protegir el sòl de gelades fortes" },
      rainfall: { preferredAccumulation: "Aigua disponible al sòl durant el desenvolupament de mesos, sense entollament", fruitingDelay: "No aplicable com a resposta a un xàfec: l’ascocarp es desenvolupa durant mesos", priorMoisture: "Essencial a escala estacional", temperatureAfterRain: "No és un desencadenant de curt termini validat", interruption: "Estrès hídric profund, sòl compactat o manca d’hoste colonitzat", uncertainty: "El model no observa micorrizes, edat i gestió de l’hoste, estructura calcària, reg, tipus d’aparellament ni temperatura i humitat a la profunditat de l’ascocarp." },
      seasonality: season({ nov: "moderate", des: "good", gen: "peak", feb: "peak", mar: "good" }),
      regions: ["prepirineus", "catalunya-central", "ports", "muntanyes-interiors"]
    },
    idealConditions: ["Alzinars i rouredes oberts sobre substrat calcari", "pH 7,3–8,5 i drenatge excel·lent", "Arbres hoste micorrizats i sòl gestionat", "El mapa descriu potencial d’hàbitat, no una previsió de collita"]
  }),
  profile({
    speciesId: "amanita-phalloides",
    identity: {
      commonName: "Farinera borda",
      alternateNames: ["farinot", "pentinella borda", "cogoma borda"],
      scientificName: "Amanita phalloides",
      family: "Amanitaceae",
      genus: "Amanita",
      edibility: "dangerously_toxic",
      identificationDifficulty: "Molt alta",
      typicalSize: "Barret de 5–15 cm",
      shortDescription: "Amanita mortal de làmines blanques, anell i volva en sac, amb barret sovint verd olivaci però també groguenc o gairebé blanc."
    },
    morphology: {
      cap: "Hemisfèric i després estès, llis o finament fibril·lós, verd oliva a groc verdós; pot ser gairebé blanc, sovint amb marge més pàl·lid.",
      hymenium: "Làmines lliures, blanques i denses; esporada blanca.",
      stem: "Blanc o verdós, fibril·lós, amb anell membranós penjant i base bulbosa dins una volva blanca ampla en forma de sac.",
      flesh: "Blanca i immutable.",
      colour: "Verd oliva, groc verdós i blanc.",
      smell: "Feble de jove; més dolcenca o desagradable amb l’edat.",
      texture: "Carnosa, llisa o lleugerament sedosa.",
      typicalAppearance: "Amanita esvelta amb làmines blanques, anell i volva sovint amagada sota la fullaraca.",
      keyFeatures: ["Volva blanca en sac", "Làmines sempre blanques", "Anell membranós", "Barret oliva molt variable"],
      variation: "Existeixen formes grogues i pràcticament blanques; la pluja pot rentar el barret i la volva pot quedar enterrada."
    },
    similarSpecies: [
      { scientificName: "Amanita caesarea", commonName: "Ou de reig", mainDifferences: "Làmines, peu i anell grocs i barret taronja; els exemplars tancats mai s’han d’identificar només pel color extern.", edibility: "excellent_edible", toxicity: "Sense toxicitat coneguda quan la identificació és segura.", warning: true },
      { scientificName: "Agaricus campestris", commonName: "Camperol", mainDifferences: "Làmines rosades que es tornen xocolata i absència de volva.", edibility: "edible", toxicity: "Una confusió amb Amanita phalloides pot ser mortal.", warning: true },
      { scientificName: "Russula virescens", commonName: "Llora verda", mainDifferences: "Carn i peu trencadissos, sense anell ni volva.", edibility: "edible", toxicity: "Una confusió amb Amanita phalloides pot ser mortal.", warning: true }
    ],
    ecologicalConfig: {
      habitat: { forestTypes: ["Alzinars", "rouredes", "fagedes", "castanyedes", "boscos de planifolis"], treeAssociations: ["Quercus ilex", "Quercus pubescens", "Quercus petraea", "Fagus sylvatica", "Castanea sativa"], hosts: ["Quercus", "Fagus", "Castanea"], soilPreference: "Àcid a moderadament bàsic, sovint ric en bases", substrate: "Sòl forestal humífer", moisture: "Fresca a moderadament humida", altitude: [100, 1400], slope: "Variable", aspect: "Variable, sovint fresca", shade: "Mitjana", landscapePosition: "Interior i vores de boscos de planifolis" },
      soil: { texture: "Franca", reaction: "Àcida a moderadament alcalina", phRange: [5, 8], substrate: "Sòl forestal divers, sovint ric en bases", organicMatter: "Moderada a alta", drainage: "Bo", waterRetention: "Mitjana", depth: "Mitjana", humus: "Mull de planifolis", evidence: "limited" },
      climate: { temperatureRange: [8, 19], nightPreference: "Fresca", relativeHumidity: "Moderada a alta", soilMoisture: "Mitjana a alta", rainfall: "Pluges de finals d’estiu i de tardor", drought: "Desfavorable", heat: "La calor seca és desfavorable", frost: "Atura la fructificació", wind: "El vent sec és desfavorable", snow: "No rellevant durant la fructificació" },
      rainfall: { preferredAccumulation: "Humitat sostinguda del sòl forestal", fruitingDelay: "Dies a setmanes després de pluges efectives", priorMoisture: "Molt important", temperatureAfterRain: "Fresca a suau", interruption: "Sequera, calor, vent sec o gelada", uncertainty: "El rang ecològic és ampli i la coloració del bolet és molt variable; el mapa no substitueix mai la identificació sobre el terreny." },
      seasonality: season({ ago: "possible", set: "good", oct: "peak", nov: "good" }),
      regions: ["pirineus", "prepirineus", "catalunya-central", "serralades-costeres", "serralades-prelitorals", "emporda", "montseny", "ports", "muntanyes-interiors"]
    },
    idealConditions: ["Boscos de planifolis humits després de pluges", "8–19 °C durant la tardor", "La cocció o l’assecat no n’elimina les amatoxines", "Qualsevol ingestió sospitosa és una emergència: 061 Salut Respon"]
  }),
  profile({
    speciesId: "lepiota-brunneoincarnata",
    identity: {
      commonName: "Palometa metzinosa",
      alternateNames: ["lepiota bru-encarnada", "lepiota mortal"],
      scientificName: "Lepiota brunneoincarnata",
      family: "Agaricaceae",
      genus: "Lepiota",
      edibility: "dangerously_toxic",
      identificationDifficulty: "Molt alta",
      typicalSize: "Barret de 2–5 cm",
      shortDescription: "Lepiota petita de barret crema amb escates bru vinós, potencialment mortal per les amatoxines."
    },
    morphology: {
      cap: "Cònic o hemisfèric de jove i després convex a estès, amb un disc bru vinós i escates concèntriques sobre fons crema o rosat.",
      hymenium: "Làmines lliures, denses i blanques o crema; esporada blanca.",
      stem: "Prim i pàl·lid per sobre d’un anell fràgil; per sota presenta fibres o escates brunes sobre un fons rosat o vinós.",
      flesh: "Blanca, sovint rosada o vinosa a la base del peu, sense un canvi de color diagnòstic segur.",
      colour: "Crema, bru castany, rosat i vinós.",
      smell: "Feble, de vegades afruitada o desagradable; no és un criteri segur.",
      texture: "Prima i fràgil.",
      typicalAppearance: "Petit para-sol escatós de tons bruns i rosats en gespes, parcs o clarianes.",
      keyFeatures: ["Mida petita", "Escates bru vinós", "Làmines blanques lliures", "Anell fugaç"],
      variation: "L’anell pot desaparèixer i la pluja pot rentar les escates; cap exemplar petit s’ha de validar com a apagallums."
    },
    similarSpecies: [
      { scientificName: "Macrolepiota procera", commonName: "Apagallums", mainDifferences: "És molt més gran, té un peu llarg amb dibuix de pell de serp i un anell doble i mòbil.", edibility: "edible", toxicity: "Sense toxicitat coneguda quan la identificació és segura.", warning: true },
      { scientificName: "Lepiota cristata", commonName: "Lepiota pudent", mainDifferences: "També és petita i rebutjable; separar Lepiota similars pot requerir microscòpia.", edibility: "toxic", toxicity: "Pot provocar trastorns gastrointestinals i no s’ha de consumir.", warning: true }
    ],
    ecologicalConfig: {
      habitat: { forestTypes: ["Prats", "Vores de camí", "Clarianes", "Vores de bosc"], treeAssociations: [], hosts: [], soilPreference: "Àcid a alcalí, sovint alterat", substrate: "Sòl herbós o nu ric en restes orgàniques", moisture: "Mitjana després de pluja", altitude: [0, 700], slope: "Pla a suau", aspect: "Variable", shade: "Baixa a mitjana", landscapePosition: "Parcs, jardins, camins i clarianes mediterrànies" },
      soil: { texture: "Franca a arenosa", reaction: "Àcida a alcalina", phRange: [5.5, 8], substrate: "Sòl herbós, sorrenc o remogut", organicMatter: "Moderada", drainage: "Bo", waterRetention: "Baixa a mitjana", depth: "Superficial", humus: "Herbaci o ruderal", evidence: "limited" },
      climate: { temperatureRange: [12, 23], nightPreference: "Suau", relativeHumidity: "Moderada", soilMoisture: "Mitjana", rainfall: "Pluges de finals d’estiu i de tardor", drought: "Desfavorable", heat: "La calor seca n’interromp la fructificació", frost: "Desfavorable", wind: "Dessecant", snow: "No rellevant" },
      rainfall: { preferredAccumulation: "Rehidratació del sòl superficial després d’un període sec", fruitingDelay: "Pocs dies a setmanes amb temperatures suaus", priorMoisture: "Moderadament important", temperatureAfterRain: "Suau", interruption: "Sequera, vent sec o gelada", uncertainty: "Els regs i els sòls urbans alteren la fenologia i no queden ben representats al model territorial." },
      seasonality: season({ ago: "possible", set: "good", oct: "peak", nov: "good", des: "possible" }),
      regions: ["catalunya-central", "serralades-costeres", "serralades-prelitorals", "emporda", "montseny", "ports", "muntanyes-interiors"]
    },
    idealConditions: ["Gespes i clarianes després de pluja", "12–23 °C sense sequera", "No consumir cap Lepiota petita", "Els símptomes tardans poden indicar una intoxicació mortal"]
  }),
  profile({
    speciesId: "galerina-marginata",
    identity: {
      commonName: "Galerina metzinosa",
      alternateNames: ["cama-sec bord", "galerina marginada"],
      scientificName: "Galerina marginata",
      family: "Galerinaceae",
      genus: "Galerina",
      edibility: "dangerously_toxic",
      identificationDifficulty: "Molt alta",
      typicalSize: "Barret d’1–6 cm",
      shortDescription: "Bolet petit de tons mel que creix sobre fusta morta i pot causar una intoxicació mortal per amatoxines."
    },
    morphology: {
      cap: "Hemisfèric a convex i després estès, higròfan, de mel o ocre bru quan és humit i més pàl·lid en assecar-se.",
      hymenium: "Làmines adnates a lleugerament decurrents, primer ocres i després bru rovell per l’esporada.",
      stem: "Prim, fibril·lós, amb una zona anular o un anell membranós fugaç; més fosc cap a la base.",
      flesh: "Prima, ocre pàl·lida a bruna.",
      colour: "Mel, ocre, bru i rovell.",
      smell: "Farinosa o feble; variable i no diagnòstica.",
      texture: "Fràgil i fibrosa al peu.",
      typicalAppearance: "Petits bolets bruns, solitaris o en grups, directament sobre troncs, soques o restes llenyoses.",
      keyFeatures: ["Creixement sobre fusta", "Esporada rovellada", "Barret higròfan", "Anell sovint fugaç"],
      variation: "El color canvia molt amb la humitat i l’anell pot perdre’s; la separació de bolets petits de fusta requereix experiència."
    },
    similarSpecies: [
      { scientificName: "Kuehneromyces mutabilis", commonName: "Bolet de soca", mainDifferences: "Forma flotes més denses i presenta escates fosques per sota de l’anell; la separació exigeix revisar tots els exemplars.", edibility: "edible", toxicity: "Una confusió amb Galerina marginata pot ser mortal.", warning: true },
      { scientificName: "Cyclocybe cylindracea", commonName: "Pollancró", mainDifferences: "És més robust, de barret més carnós i habitualment associat a pollancres o altres planifolis.", edibility: "excellent_edible", toxicity: "Sense toxicitat coneguda quan la identificació és segura.", warning: true }
    ],
    ecologicalConfig: {
      habitat: { forestTypes: ["Boscos de coníferes", "Boscos de planifolis", "Boscos humits"], treeAssociations: ["Pinus", "Fagus", "Quercus", "Betula"], hosts: [], soilPreference: "No determinant; depèn de la fusta", substrate: "Fusta morta de coníferes i planifolis", moisture: "Alta a la fusta", altitude: [100, 2100], slope: "Variable", aspect: "Fresca a obaga", shade: "Mitjana a alta", landscapePosition: "Soques, troncs caiguts i fusta enterrada en boscos humits" },
      soil: { texture: "No determinant", reaction: "Àcida a neutra", phRange: [4, 7.5], substrate: "Fusta en descomposició", organicMatter: "Fusta morta", drainage: "No aplicable directament", waterRetention: "Alta dins la fusta", depth: "No aplicable", humus: "Restes llenyoses", evidence: "limited" },
      climate: { temperatureRange: [5, 17], nightPreference: "Freda a fresca", relativeHumidity: "Alta", soilMoisture: "La humitat de la fusta és determinant", rainfall: "Períodes humits prolongats", drought: "Molt desfavorable", heat: "Desfavorable", frost: "Tolera fred lleu", wind: "Molt dessecant", snow: "Pot aparèixer abans o després de la neu" },
      rainfall: { preferredAccumulation: "Rehidratació sostinguda de troncs i soques", fruitingDelay: "Variable després de pluges repetides", priorMoisture: "Molt important", temperatureAfterRain: "Fresca", interruption: "Dessecació de la fusta, calor o gelada persistent", uncertainty: "La cartografia no observa la fusta morta; el bosc compatible és només un indicador indirecte." },
      seasonality: season({ gen: "possible", feb: "possible", mar: "possible", abr: "moderate", mai: "moderate", jun: "possible", jul: "possible", ago: "moderate", set: "good", oct: "peak", nov: "good", des: "moderate" }),
      regions: ["pirineus", "prepirineus", "catalunya-central", "serralades-costeres", "serralades-prelitorals", "emporda", "montseny", "ports", "muntanyes-interiors"]
    },
    idealConditions: ["Fusta morta persistentment humida", "5–17 °C en boscos protegits", "No consumir bolets petits de fusta sense confirmació experta", "Les amatoxines resisteixen la cocció"]
  }),
  profile({
    speciesId: "cortinarius-orellanus",
    identity: {
      commonName: "Cortinari metzinós",
      alternateNames: ["bolet de mantellina", "cortinari color d’orellana"],
      scientificName: "Cortinarius orellanus",
      family: "Cortinariaceae",
      genus: "Cortinarius",
      edibility: "dangerously_toxic",
      identificationDifficulty: "Molt alta",
      typicalSize: "Barret de 3–9 cm",
      shortDescription: "Cortinari bru ataronjat amb orellanina, capaç de provocar insuficiència renal dies després de la ingestió."
    },
    morphology: {
      cap: "Convex i després estès, sec, finament fibril·lós o escatós, de color ocre ataronjat a bru rogenc.",
      hymenium: "Làmines separades, primer de color ocre ataronjat i després rovellades; esporada bru rovell.",
      stem: "Cilíndric o lleugerament afuat, groc ocraci a rogenc, amb restes fines de cortina però sense anell veritable.",
      flesh: "Groguenca a rogenca, immutable.",
      colour: "Ocre, taronja, bru rogenc i rovell.",
      smell: "Feble, de rave o terrosa.",
      texture: "Seca, fibrosa i compacta.",
      typicalAppearance: "Cortinari mitjà i sec de tons ataronjats uniformes sota planifolis.",
      keyFeatures: ["Barret sec bru ataronjat", "Làmines rovellades", "Restes de cortina", "Toxicitat renal tardana"],
      variation: "Els tons varien amb l’edat i la sequedat; només la combinació de trets i, sovint, la microscòpia permet separar cortinaris."
    },
    similarSpecies: [
      { scientificName: "Cortinarius rubellus", commonName: "Cortinari mortal", mainDifferences: "Sol tenir el barret més cònic i viu en boscos àcids de muntanya; també és mortal.", edibility: "dangerously_toxic", toxicity: "Conté orellanina i pot causar insuficiència renal.", warning: true },
      { scientificName: "Chroogomphus rutilus", commonName: "Cama de perdiu", mainDifferences: "Té làmines gruixudes i decurrents, barret sovint viscós i associació estricta amb pins.", edibility: "edible", toxicity: "Sense toxicitat coneguda quan la identificació és segura.", warning: true }
    ],
    ecologicalConfig: {
      habitat: { forestTypes: ["Rouredes", "Fagedes", "Alzinars", "Boscos de coníferes"], treeAssociations: ["Quercus pubescens", "Quercus ilex", "Fagus sylvatica", "Castanea sativa"], hosts: ["Quercus", "Fagus", "Castanea"], soilPreference: "Àcid", substrate: "Silícic o descarbonatat", moisture: "Fresca", altitude: [400, 1900], slope: "Variable", aspect: "Vessants frescos", shade: "Mitjana", landscapePosition: "Interior i vores de boscos madurs" },
      soil: { texture: "Franca a arenosa", reaction: "Àcida", phRange: [4, 6.5], substrate: "Silícic o descarbonatat", organicMatter: "Moderada", drainage: "Bo", waterRetention: "Mitjana", depth: "Mitjana", humus: "Mull de planifolis", evidence: "limited" },
      climate: { temperatureRange: [8, 18], nightPreference: "Fresca", relativeHumidity: "Moderada a alta", soilMoisture: "Mitjana a alta", rainfall: "Pluges de finals d’estiu i de tardor", drought: "Desfavorable", heat: "Desfavorable", frost: "Atura la fructificació", wind: "Dessecant", snow: "Fora del període principal" },
      rainfall: { preferredAccumulation: "Humitat sostinguda al sòl de planifolis", fruitingDelay: "Dies a setmanes després de pluges efectives", priorMoisture: "Important", temperatureAfterRain: "Fresca a suau", interruption: "Sequera, vent sec o gelada", uncertainty: "És poc freqüent i difícil de separar d’altres Cortinarius només amb trets macroscòpics." },
      seasonality: season({ jul: "possible", ago: "moderate", set: "good", oct: "peak", nov: "good" }),
      regions: ["pirineus", "prepirineus", "catalunya-central", "serralades-prelitorals", "emporda", "montseny", "ports", "muntanyes-interiors"]
    },
    idealConditions: ["Boscos de planifolis amb sòl fresc", "8–18 °C després de pluges", "No consumir cap cortinari", "Els símptomes renals poden aparèixer entre dos i quinze dies després"]
  }),
  profile({
    speciesId: "gyromitra-esculenta",
    identity: {
      commonName: "Bolet de greix",
      alternateNames: ["múrgola borda", "falsa múrgola", "giromitra"],
      scientificName: "Gyromitra esculenta",
      family: "Discinaceae",
      genus: "Gyromitra",
      edibility: "dangerously_toxic",
      identificationDifficulty: "Alta",
      typicalSize: "Carpòfor de 4–12 cm d’alçada",
      shortDescription: "Falsa múrgola primaveral de barret cerebriforme, tòxica i potencialment mortal per la giromitrina."
    },
    morphology: {
      cap: "Irregular, plegat i lobulat com un cervell, de bru castany a rogenc fosc, unit al peu en diversos punts.",
      hymenium: "Recobreix la superfície externa dels plecs; no presenta alvèols regulars.",
      stem: "Curt, blanc a crema, solcat i irregular, amb cambres internes.",
      flesh: "Prima, fràgil i cerosa; l’interior forma plecs i cambres, no un buit continu.",
      colour: "Bru rogenc, castany i crema.",
      smell: "Suau o fúngica.",
      texture: "Fràgil, cerosa i lobulada.",
      typicalAppearance: "Massa bruna amb aspecte de cervell sobre un peu pàl·lid en sòls remoguts de pineda.",
      keyFeatures: ["Barret cerebriforme", "Interior amb cambres", "Fructificació primaveral", "Absència d’alvèols regulars"],
      variation: "La forma és molt irregular i els exemplars clars poden recordar una múrgola; cal tallar-los longitudinalment per observar l’interior."
    },
    similarSpecies: [
      { scientificName: "Morchella esculenta", commonName: "Múrgola", mainDifferences: "Té un barret alveolat com una bresca i tot el carpòfor és buit en secció longitudinal.", edibility: "edible_with_conditions", toxicity: "Tòxica crua o poc cuita; requereix cocció completa.", warning: true },
      { scientificName: "Verpa bohemica", commonName: "Verpa", mainDifferences: "El barret campanulat només s’uneix al peu per l’àpex i l’interior conté material cotonós en exemplars joves.", edibility: "not_recommended", toxicity: "No recomanada per risc de confusió i possibles trastorns.", warning: true }
    ],
    ecologicalConfig: {
      habitat: { forestTypes: ["Boscos de coníferes", "Pinedes", "Clarianes"], treeAssociations: ["Pinus sylvestris", "Pinus uncinata", "Picea abies"], hosts: [], soilPreference: "Àcid i sorrenc", substrate: "Sòl remogut, restes llenyoses i vores de pista", moisture: "Fresca després del desglaç", altitude: [300, 2000], slope: "Pla a moderat", aspect: "Fresca", shade: "Baixa a mitjana", landscapePosition: "Clarianes, pistes forestals, cremats antics i sòls alterats de coníferes" },
      soil: { texture: "Arenosa a francoarenosa", reaction: "Àcida", phRange: [4, 6.5], substrate: "Silícic, sorrenc o amb fusta degradada", organicMatter: "Baixa a moderada", drainage: "Bo", waterRetention: "Baixa a mitjana", depth: "Variable", humus: "Prim o alterat", evidence: "limited" },
      climate: { temperatureRange: [3, 15], nightPreference: "Freda", relativeHumidity: "Moderada a alta", soilMoisture: "Mitjana", rainfall: "Desglaç i pluges de primavera", drought: "Desfavorable", heat: "Molt desfavorable", frost: "Tolera fred lleu", wind: "Dessecant", snow: "El desglaç marca l’inici de temporada" },
      rainfall: { preferredAccumulation: "Humitat de desglaç o pluges regulars sobre sòl drenat", fruitingDelay: "Variable durant l’escalfament primaveral", priorMoisture: "Important", temperatureAfterRain: "Freda a fresca", interruption: "Calor, sequera o assecat ràpid del sòl", uncertainty: "Les pertorbacions del sòl i les restes llenyoses no queden plenament representades a la cartografia." },
      seasonality: season({ mar: "moderate", abr: "good", mai: "peak", jun: "possible" }),
      regions: ["pirineus", "prepirineus", "montseny", "muntanyes-interiors"]
    },
    idealConditions: ["Pinedes fredes i sòls sorrencs alterats", "3–15 °C durant el desglaç", "No consumir-la sota cap tractament domèstic", "Tall longitudinal per distingir-la d’una múrgola"]
  }),
  profile({
    speciesId: "amanita-pantherina",
    identity: {
      commonName: "Pixacà",
      alternateNames: ["pigat", "pigat bord", "reig bru", "amanita pantera"],
      scientificName: "Amanita pantherina",
      family: "Amanitaceae",
      genus: "Amanita",
      edibility: "dangerously_toxic",
      identificationDifficulty: "Alta",
      typicalSize: "Barret de 5–12 cm",
      shortDescription: "Amanita bruna amb berrugues blanques i base bulbosa, responsable d’una síndrome neurològica greu."
    },
    morphology: {
      cap: "Hemisfèric i després estès, bru grisenc a bru fosc, amb marge estriat i berrugues blanques separades.",
      hymenium: "Làmines lliures, blanques i denses; esporada blanca.",
      stem: "Blanc, amb anell membranós llis i base bulbosa envoltada per dos o més ribets de volva.",
      flesh: "Blanca i immutable.",
      colour: "Bru, gris, blanc i crema.",
      smell: "Feble, de vegades terrosa.",
      texture: "Carnosa però fràgil amb l’edat.",
      typicalAppearance: "Amanita bruna esquitxada de blanc, amb marge estriat i una base bulbosa escalonada.",
      keyFeatures: ["Barret bru amb berrugues blanques", "Marge estriat", "Anell blanc", "Volva en ribets sobre el bulb"],
      variation: "La pluja pot eliminar les berrugues i aclarir el barret; cal desenterrar sencera la base per veure la volva."
    },
    similarSpecies: [
      { scientificName: "Amanita muscaria", commonName: "Reig bord", mainDifferences: "El barret és habitualment vermell o taronja i la base presenta restes de volva menys regulars.", edibility: "toxic", toxicity: "Provoca una síndrome neurològica.", warning: true },
      { scientificName: "Amanita rubescens", commonName: "Cua de cavall", mainDifferences: "La carn i les ferides s’enrogeixen, les berrugues són grisoses i la base no presenta els ribets nets del pixacà.", edibility: "edible_with_conditions", toxicity: "Tòxica crua; una confusió amb A. pantherina és perillosa.", warning: true }
    ],
    ecologicalConfig: {
      habitat: { forestTypes: ["Rouredes", "Alzinars", "Suredes", "Fagedes", "Boscos de coníferes"], treeAssociations: ["Quercus", "Fagus sylvatica", "Pinus"], hosts: ["Quercus", "Fagus", "Pinus"], soilPreference: "Àcid a alcalí", substrate: "Variable", moisture: "Fresca", altitude: [100, 1800], slope: "Variable", aspect: "Variable", shade: "Mitjana", landscapePosition: "Interior i vores de boscos de planifolis o mixtos" },
      soil: { texture: "Franca a francoargilosa", reaction: "Àcida a alcalina", phRange: [4.5, 8.5], substrate: "Silícic o calcari", organicMatter: "Moderada", drainage: "Bo", waterRetention: "Mitjana", depth: "Mitjana", humus: "Mull", evidence: "limited" },
      climate: { temperatureRange: [9, 20], nightPreference: "Fresca", relativeHumidity: "Moderada a alta", soilMoisture: "Mitjana", rainfall: "Primavera plujosa i tardor", drought: "Desfavorable", heat: "La calor seca és desfavorable", frost: "Atura la fructificació", wind: "Dessecant", snow: "No rellevant" },
      rainfall: { preferredAccumulation: "Humitat sostinguda del sòl forestal", fruitingDelay: "Dies a setmanes després de pluja", priorMoisture: "Important", temperatureAfterRain: "Fresca a suau", interruption: "Sequera, calor o gelada", uncertainty: "L’amplitud d’hàbitat i la variació del barret fan que el mapa no pugui resoldre la identificació local." },
      seasonality: season({ jul: "possible", ago: "moderate", set: "good", oct: "peak", nov: "good" }),
      regions: ["pirineus", "prepirineus", "catalunya-central", "serralades-costeres", "serralades-prelitorals", "emporda", "montseny", "ports", "muntanyes-interiors"]
    },
    idealConditions: ["Boscos frescos sobre sòls forestals variats", "9–20 °C després de pluja", "No consumir cap Amanita bruna", "La pluja pot esborrar les berrugues blanques"]
  }),
  profile({
    speciesId: "amanita-virosa",
    identity: {
      commonName: "Farinera pudent",
      alternateNames: [],
      scientificName: "Amanita virosa",
      family: "Amanitaceae",
      genus: "Amanita",
      edibility: "dangerously_toxic",
      identificationDifficulty: "Molt alta",
      typicalSize: "Barret de 4–10 cm",
      shortDescription: "Amanita completament blanca de boscos frescos, potencialment mortal per les amatoxines."
    },
    morphology: {
      cap: "Cònic a campanulat i finalment convex, blanc, llis o sedós, sovint irregular i amb el centre lleument crema.",
      hymenium: "Làmines lliures, blanques i denses; esporada blanca.",
      stem: "Blanc, fibril·lós o flocós, amb anell membranós fràgil i base bulbosa dins una volva blanca en sac.",
      flesh: "Blanca i immutable.",
      colour: "Blanc pur a crema pàl·lid.",
      smell: "Feble de jove i desagradable o dolcenca en madurar.",
      texture: "Carnosa al barret i fibrosa al peu.",
      typicalAppearance: "Amanita esvelta i completament blanca, de barret sovint cònic, amb anell i volva.",
      keyFeatures: ["Color blanc integral", "Barret cònic", "Anell", "Volva blanca en sac"],
      variation: "L’anell es pot trencar i la volva pot quedar enterrada; els exemplars vells poden groguejar lleument."
    },
    similarSpecies: [
      { scientificName: "Hygrophorus eburneus", commonName: "Llenega blanca", mainDifferences: "Té làmines ceroses i decurrents, superfície molt viscosa i no presenta anell ni volva.", edibility: "edible", toxicity: "Sense toxicitat coneguda quan la identificació és segura.", warning: true },
      { scientificName: "Agaricus campestris", commonName: "Camperol", mainDifferences: "Les làmines passen del rosa al bru xocolata i la base del peu no té volva.", edibility: "edible", toxicity: "Una confusió amb una amanita blanca pot ser mortal.", warning: true }
    ],
    ecologicalConfig: {
      habitat: { forestTypes: ["Fagedes", "Boscos de coníferes", "Boscos humits"], treeAssociations: ["Fagus sylvatica", "Abies alba", "Betula pendula", "Picea abies", "Pinus sylvestris"], hosts: ["Fagus", "Abies", "Betula", "Picea", "Pinus"], soilPreference: "Àcid", substrate: "Silícic o descarbonatat", moisture: "Alta i persistent", altitude: [600, 2000], slope: "Variable", aspect: "Obaga", shade: "Mitjana a alta", landscapePosition: "Boscos frescos i humits de muntanya" },
      soil: { texture: "Franca a arenosa", reaction: "Àcida", phRange: [4, 6.5], substrate: "Silícic o descarbonatat", organicMatter: "Moderada a alta", drainage: "Bo", waterRetention: "Alta", depth: "Mitjana", humus: "Mull àcid", evidence: "limited" },
      climate: { temperatureRange: [6, 16], nightPreference: "Freda", relativeHumidity: "Alta", soilMoisture: "Alta", rainfall: "Pluges d’estiu i tardor", drought: "Molt desfavorable", heat: "Molt desfavorable", frost: "Atura la fructificació", wind: "Molt dessecant", snow: "Fora del període principal" },
      rainfall: { preferredAccumulation: "Humitat persistent del sòl de muntanya", fruitingDelay: "Dies a setmanes després de pluges regulars", priorMoisture: "Molt important", temperatureAfterRain: "Freda a fresca", interruption: "Sequera, calor, vent sec o gelada", uncertainty: "És poc freqüent i la delimitació respecte d’altres amanites blanques pot requerir microscòpia." },
      seasonality: season({ jul: "possible", ago: "good", set: "peak", oct: "good", nov: "possible" }),
      regions: ["pirineus", "prepirineus", "montseny", "muntanyes-interiors"]
    },
    idealConditions: ["Boscos àcids, freds i humits", "6–16 °C a finals d’estiu", "No consumir cap bolet blanc amb anell o volva", "Qualsevol ingestió sospitosa requereix atenció immediata"]
  }),
  profile({
    speciesId: "amanita-verna",
    identity: {
      commonName: "Cogomassa",
      alternateNames: ["farinera vernal", "farinera blanca de primavera"],
      scientificName: "Amanita verna",
      family: "Amanitaceae",
      genus: "Amanita",
      edibility: "dangerously_toxic",
      identificationDifficulty: "Molt alta",
      typicalSize: "Barret de 4–10 cm",
      shortDescription: "Amanita blanca i termòfila de primavera, mortal per les amatoxines i difícil de separar d’espècies pròximes."
    },
    morphology: {
      cap: "Hemisfèric de jove, després convex i finalment estès; blanc, llis, sovint lluent amb humitat i sense marge estriat.",
      hymenium: "Làmines lliures, blanques i denses; esporada blanca.",
      stem: "Blanc, cilíndric, amb anell membranós i una base bulbosa dins una volva blanca ampla.",
      flesh: "Blanca i immutable.",
      colour: "Blanc pur, de vegades crema al centre.",
      smell: "Feble de jove, més desagradable en madurar.",
      texture: "Carnosa i llisa.",
      typicalAppearance: "Amanita blanca de barret arrodonit, anell i volva en boscos mediterranis durant la primavera.",
      keyFeatures: ["Color blanc", "Làmines lliures", "Anell", "Volva en sac"],
      variation: "L’anell es pot perdre, la volva pot quedar enterrada i la separació d’altres amanites blanques requereix prudència taxonòmica."
    },
    similarSpecies: [
      { scientificName: "Agaricus campestris", commonName: "Camperol", mainDifferences: "Té làmines roses que es tornen brunes i mai presenta una volva basal.", edibility: "edible", toxicity: "Una confusió amb Amanita verna pot ser mortal.", warning: true },
      { scientificName: "Amanita caesarea", commonName: "Ou de reig", mainDifferences: "Quan s’obre mostra barret taronja, làmines, peu i anell grocs; no s’ha d’identificar tancada.", edibility: "excellent_edible", toxicity: "Sense toxicitat coneguda quan la identificació és segura.", warning: true }
    ],
    ecologicalConfig: {
      habitat: { forestTypes: ["Alzinars", "Rouredes", "Pinedes", "Boscos de planifolis"], treeAssociations: ["Quercus ilex", "Quercus pubescens", "Quercus faginea", "Castanea sativa", "Pinus"], hosts: ["Quercus", "Castanea", "Pinus"], soilPreference: "Àcid a alcalí, sovint calcari", substrate: "Variable, sovint ric en bases", moisture: "Fresca després de pluges de primavera", altitude: [100, 1200], slope: "Variable", aspect: "Temperada", shade: "Baixa a mitjana", landscapePosition: "Boscos mediterranis oberts i vores de planifolis" },
      soil: { texture: "Franca a francoargilosa", reaction: "Àcida a alcalina", phRange: [5.5, 8.3], substrate: "Silícic o calcari", organicMatter: "Moderada", drainage: "Bo", waterRetention: "Mitjana", depth: "Mitjana", humus: "Mull de planifolis", evidence: "limited" },
      climate: { temperatureRange: [12, 22], nightPreference: "Suau", relativeHumidity: "Moderada a alta", soilMoisture: "Mitjana", rainfall: "Pluges de primavera i episodis suaus de tardor", drought: "Desfavorable", heat: "Tolera calidesa sense sequera", frost: "Molt desfavorable", wind: "Dessecant", snow: "No rellevant" },
      rainfall: { preferredAccumulation: "Pluges efectives sobre un sòl temperat", fruitingDelay: "Dies a setmanes després d’episodis plujosos", priorMoisture: "Important", temperatureAfterRain: "Suau a temperada", interruption: "Sequera, vent sec o fred", uncertainty: "Forma part d’un grup taxonòmic difícil i la seva presència exacta a Catalunya necessita confirmació experta." },
      seasonality: season({ abr: "good", mai: "peak", jun: "good" }),
      regions: ["catalunya-central", "serralades-costeres", "serralades-prelitorals", "emporda", "montseny", "ports", "muntanyes-interiors"]
    },
    idealConditions: ["Boscos mediterranis, sovint calcaris però amb incertesa edàfica", "12–22 °C durant la primavera", "No collir amanites blanques", "La cocció no destrueix les amatoxines"]
  }),
  profile({
    speciesId: "tricholoma-pardinum",
    identity: {
      commonName: "Fredolic metzinós",
      alternateNames: ["fredolic bord", "tricoloma tigrat"],
      scientificName: "Tricholoma pardinum",
      family: "Tricholomataceae",
      genus: "Tricholoma",
      edibility: "toxic",
      identificationDifficulty: "Alta",
      typicalSize: "Barret de 5–20 cm",
      shortDescription: "Tricoloma robust de barret gris tigrat, tòxic i especialment perillós per la semblança amb els fredolics."
    },
    morphology: {
      cap: "Hemisfèric de jove, després convex i finalment estès; gris platejat, cobert d’escates radials més fosques i contrastades.",
      hymenium: "Làmines escotades, blanques a gris pàl·lid, sovint amb gotes clares al marge en exemplars joves.",
      stem: "Blanc o grisenc, robust, ple i sense anell, de vegades ocraci a la base.",
      flesh: "Blanca, gruixuda i immutable.",
      colour: "Gris platejat, gris fosc i blanc.",
      smell: "Farinosa, agradable o poc marcada.",
      texture: "Compacta i carnosa.",
      typicalAppearance: "Fredolic molt gros i massís, amb un dibuix d’escates tigrades sobre el barret.",
      keyFeatures: ["Mida robusta", "Escates tigrades", "Làmines escotades", "Absència d’anell"],
      variation: "Les escates poden ser menys contrastades amb pluja i els exemplars joves poden semblar fredolics comestibles."
    },
    similarSpecies: [
      { scientificName: "Tricholoma terreum", commonName: "Fredolic", mainDifferences: "És més petit, fràgil i de carn prima, amb escates o fibres molt més fines.", edibility: "edible_with_conditions", toxicity: "Consum ocasional i moderat després d’una identificació segura.", warning: true },
      { scientificName: "Tricholoma portentosum", commonName: "Fredolic gros", mainDifferences: "Presenta fibres radials, no escates tigrades, i tons grocs al peu i sovint a les làmines.", edibility: "edible", toxicity: "Sense toxicitat coneguda quan la identificació és segura.", warning: true }
    ],
    ecologicalConfig: {
      habitat: { forestTypes: ["Boscos de coníferes", "Fagedes"], treeAssociations: ["Abies alba", "Fagus sylvatica", "Pinus sylvestris", "Picea abies"], hosts: ["Abies", "Fagus", "Pinus", "Picea"], soilPreference: "Neutre a alcalí", substrate: "Calcari o ric en bases", moisture: "Fresca a humida", altitude: [900, 2000], slope: "Variable", aspect: "Obaga", shade: "Mitjana a alta", landscapePosition: "Boscos montans i subalpins sobre sòls calcaris" },
      soil: { texture: "Franca a pedregosa", reaction: "Neutra a alcalina", phRange: [6, 8.2], substrate: "Calcari o ric en bases", organicMatter: "Moderada", drainage: "Bo", waterRetention: "Mitjana a alta", depth: "Variable", humus: "Mull de muntanya", evidence: "limited" },
      climate: { temperatureRange: [5, 15], nightPreference: "Freda", relativeHumidity: "Alta", soilMoisture: "Mitjana a alta", rainfall: "Pluges de finals d’estiu i de tardor", drought: "Molt desfavorable", heat: "Molt desfavorable", frost: "Les primeres gelades en limiten l’activitat", wind: "Dessecant", snow: "Marca el final de temporada" },
      rainfall: { preferredAccumulation: "Humitat sostinguda del sòl de muntanya", fruitingDelay: "Dies a setmanes després de pluges", priorMoisture: "Important", temperatureAfterRain: "Freda a fresca", interruption: "Sequera, calor o gelada persistent", uncertainty: "La distribució és local i els Tricholoma grisos formen un grup difícil d’identificar." },
      seasonality: season({ ago: "possible", set: "peak", oct: "good", nov: "possible" }),
      regions: ["pirineus", "prepirineus", "montseny", "muntanyes-interiors"]
    },
    idealConditions: ["Boscos calcaris de muntanya", "5–15 °C amb humitat sostinguda", "Comparar mida, escates i tons grocs", "Pot provocar vòmits i diarrea intensos"]
  }),
  profile({
    speciesId: "entoloma-sinuatum",
    identity: {
      commonName: "Carner bord",
      alternateNames: ["escarlet bord", "fals carlet", "fals moixernó"],
      scientificName: "Entoloma sinuatum",
      family: "Entolomataceae",
      genus: "Entoloma",
      edibility: "toxic",
      identificationDifficulty: "Molt alta",
      typicalSize: "Barret de 6–20 cm",
      shortDescription: "Entoloma gros de làmines groguenques que es tornen rosades, responsable d’intoxicacions gastrointestinals greus."
    },
    morphology: {
      cap: "Hemisfèric i després convex a irregularment estès, crema, ivori o gris ocraci, llis i sovint amb marge ondulat.",
      hymenium: "Làmines escotades o sinuades, primer groc crema i després salmó rosat per l’esporada.",
      stem: "Blanc, robust, ple, sense anell ni volva, sovint engruixit a la base.",
      flesh: "Blanca, gruixuda i immutable.",
      colour: "Ivori, crema, gris ocraci, groc pàl·lid i rosa salmó.",
      smell: "Farinosa, de cogombre o desagradable en exemplars vells.",
      texture: "Compacta i carnosa.",
      typicalAppearance: "Bolet pàl·lid, gros i robust de planifolis, amb làmines que adquireixen color rosa.",
      keyFeatures: ["Mida gran", "Làmines grogues a rosades", "Esporada rosa", "Peu robust sense anell"],
      variation: "Els exemplars joves encara no mostren el rosa de les espores i poden recordar diversos comestibles pàl·lids."
    },
    similarSpecies: [
      { scientificName: "Hygrophorus russula", commonName: "Carlet", mainDifferences: "Té taques vinós-rosades, làmines ceroses decurrents i carn que es taca; l’esporada és blanca.", edibility: "edible", toxicity: "Sense toxicitat coneguda quan la identificació és segura.", warning: true },
      { scientificName: "Calocybe gambosa", commonName: "Moixeró", mainDifferences: "Fructifica principalment a la primavera, té làmines blanques molt denses i esporada blanca.", edibility: "excellent_edible", toxicity: "Sense toxicitat coneguda quan la identificació és segura.", warning: true }
    ],
    ecologicalConfig: {
      habitat: { forestTypes: ["Rouredes", "fagedes", "alzinars i boscos mixtos de planifolis"], treeAssociations: ["Quercus pubescens", "Quercus ilex", "Fagus sylvatica", "Castanea sativa"], hosts: ["Quercus", "Fagus", "Castanea"], soilPreference: "Neutre a alcalí", substrate: "Calcari o ric en bases", moisture: "Fresca", altitude: [100, 1600], slope: "Variable", aspect: "Fresca", shade: "Mitjana", landscapePosition: "Clarianes, vores i interior de boscos de planifolis" },
      soil: { texture: "Franca a francoargilosa", reaction: "Neutra a alcalina", phRange: [6, 8.5], substrate: "Calcari o ric en bases", organicMatter: "Moderada", drainage: "Bo", waterRetention: "Mitjana", depth: "Mitjana", humus: "Mull de planifolis", evidence: "limited" },
      climate: { temperatureRange: [9, 19], nightPreference: "Fresca", relativeHumidity: "Moderada a alta", soilMoisture: "Mitjana", rainfall: "Pluges de finals d’estiu i de tardor", drought: "Desfavorable", heat: "Desfavorable si és seca", frost: "Atura la fructificació", wind: "Dessecant", snow: "No rellevant" },
      rainfall: { preferredAccumulation: "Humitat sostinguda al sòl de planifolis", fruitingDelay: "Dies a setmanes després de pluges", priorMoisture: "Important", temperatureAfterRain: "Fresca a suau", interruption: "Sequera, vent sec o gelada", uncertainty: "L’esporada i els trets microscòpics poden ser necessaris per separar Entoloma similars." },
      seasonality: season({ jul: "possible", ago: "moderate", set: "good", oct: "peak", nov: "good" }),
      regions: ["prepirineus", "catalunya-central", "serralades-costeres", "serralades-prelitorals", "emporda", "montseny", "ports", "muntanyes-interiors"]
    },
    idealConditions: ["Planifolis sobre sòls calcaris", "9–19 °C després de pluja", "Làmines que maduren cap al rosa", "No consumir bolets pàl·lids basant-se només en l’olor"]
  }),
  profile({
    speciesId: "inocybe-erubescens",
    identity: {
      commonName: "Inocibe de Patouillard",
      alternateNames: ["barret de bruixa", "inocibe rogenc"],
      scientificName: "Inosperma erubescens",
      family: "Inocybaceae",
      genus: "Inosperma",
      edibility: "dangerously_toxic",
      identificationDifficulty: "Molt alta",
      typicalSize: "Barret de 3–9 cm",
      shortDescription: "Inocibe primaveral pàl·lid que s’enrogeix i conté prou muscarina per provocar una intoxicació greu."
    },
    morphology: {
      cap: "Cònic a campanulat i després estès amb umbó, blanc crema de jove, fibril·lós i esquerdat radialment, després ocre i rogenc.",
      hymenium: "Làmines adnates, primer blanquinoses i després gris ocre a brunes; es poden tacar de vermell.",
      stem: "Blanc, ferm i fibril·lós, sense anell, sovint engruixit a la base i enrogint amb l’edat o el fregament.",
      flesh: "Blanca i progressivament rogenca, sobretot a les ferides.",
      colour: "Blanc, crema, ocre, bru i vermell maó.",
      smell: "Fruitat, espermàtic o feble; variable.",
      texture: "Fibrosa i compacta.",
      typicalAppearance: "Bolet pàl·lid i fibril·lós que adquireix taques vermelloses en boscos i vores calcàries.",
      keyFeatures: ["Barret fibril·lós", "Enrogiment progressiu", "Absència d’anell", "Làmines que s’enfosqueixen"],
      variation: "Els exemplars joves poden ser completament blancs i l’enrogiment triga a aparèixer; l’olor no és fiable."
    },
    similarSpecies: [
      { scientificName: "Calocybe gambosa", commonName: "Moixeró", mainDifferences: "Té barret carnós no fibril·lós, làmines blanques molt denses i no s’enrogeix amb l’edat.", edibility: "excellent_edible", toxicity: "Sense toxicitat coneguda quan la identificació és segura.", warning: true },
      { scientificName: "Agaricus campestris", commonName: "Camperol", mainDifferences: "Les làmines són roses de jove i de color bru xocolata en madurar, amb un anell fi al peu.", edibility: "edible", toxicity: "Sense toxicitat coneguda quan la identificació és segura.", warning: true }
    ],
    ecologicalConfig: {
      habitat: { forestTypes: ["Boscos de planifolis", "Rouredes", "Fagedes", "Vores de bosc"], treeAssociations: ["Fagus sylvatica", "Quercus pubescens", "Quercus ilex", "Tilia"], hosts: ["Fagus", "Quercus", "Tilia"], soilPreference: "Neutre a alcalí", substrate: "Calcari o ric en bases", moisture: "Fresca", altitude: [300, 1600], slope: "Variable", aspect: "Variable", shade: "Baixa a mitjana", landscapePosition: "Vores, camins i sòls remoguts sota planifolis" },
      soil: { texture: "Franca a francoargilosa", reaction: "Neutra a alcalina", phRange: [6.5, 8.5], substrate: "Calcari o ric en bases", organicMatter: "Moderada", drainage: "Bo", waterRetention: "Mitjana", depth: "Mitjana", humus: "Mull o sòl de parc", evidence: "limited" },
      climate: { temperatureRange: [10, 21], nightPreference: "Fresca a suau", relativeHumidity: "Moderada a alta", soilMoisture: "Mitjana", rainfall: "Pluges de primavera i principi d’estiu", drought: "Desfavorable", heat: "La calor seca és desfavorable", frost: "Molt desfavorable", wind: "Dessecant", snow: "No rellevant" },
      rainfall: { preferredAccumulation: "Pluges primaverals que mantinguin fresc el sòl", fruitingDelay: "Dies a setmanes amb temperatures suaus", priorMoisture: "Important", temperatureAfterRain: "Suau", interruption: "Sequera, calor o vent sec", uncertainty: "La cartografia urbana i els sòls remoguts són incomplets; la identificació d’Inosperma sol requerir microscòpia." },
      seasonality: season({ abr: "possible", mai: "peak", jun: "good", jul: "possible", oct: "possible" }),
      regions: ["prepirineus", "catalunya-central", "serralades-costeres", "serralades-prelitorals", "emporda", "montseny", "ports", "muntanyes-interiors"]
    },
    idealConditions: ["Planifolis i parcs sobre sòls calcaris", "10–21 °C a la primavera", "No consumir Inosperma", "L’enrogiment pot aparèixer tard"]
  }),
  profile({
    speciesId: "clitocybe-rivulosa",
    identity: {
      commonName: "Candeleta de vorada",
      alternateNames: ["clitocibe blanquinosa", "candeleta de prat"],
      scientificName: "Collybia rivulosa",
      family: "Clitocybaceae",
      genus: "Collybia",
      edibility: "dangerously_toxic",
      identificationDifficulty: "Molt alta",
      typicalSize: "Barret d’1–6 cm",
      shortDescription: "Bolet blanc de prats amb làmines decurrents, tòxic per muscarina i fàcil de barrejar amb cama-secs."
    },
    morphology: {
      cap: "Convex i després aplanat o deprimit, blanc a crema, amb una pruïna superficial que es clivella en cercles o zones concèntriques.",
      hymenium: "Làmines blanques o crema, nombroses, estretes i lleugerament decurrents.",
      stem: "Prim, blanc, fibril·lós, sense anell i menys tenaç que el del cama-sec.",
      flesh: "Blanca, prima i flexible.",
      colour: "Blanc, crema i ocre molt pàl·lid.",
      smell: "Farinosa o poc definida.",
      texture: "Prima i flexible, amb peu relativament fràgil.",
      typicalAppearance: "Petits embuts blanquinosos en arcs o rotllanes entre l’herba.",
      keyFeatures: ["Barret blanquinós zonat", "Làmines denses i decurrents", "Peu sense anell", "Creixement en prats"],
      variation: "La pluja pot eliminar la pruïna i revelar tons crema o rosats; una rotllana no identifica l’espècie."
    },
    similarSpecies: [
      { scientificName: "Marasmius oreades", commonName: "Camasec", mainDifferences: "Té làmines molt espaiades, un peu tenaç que es doblega abans de trencar-se i barret ocre higròfan.", edibility: "edible", toxicity: "Sense toxicitat coneguda quan la identificació és segura.", warning: true },
      { scientificName: "Clitocybe dealbata", commonName: "Clitocibe emblanquinada", mainDifferences: "És extremadament semblant i sovint tractada dins el mateix grup; també conté muscarina.", edibility: "dangerously_toxic", toxicity: "Pot provocar una intoxicació colinèrgica greu.", warning: true }
    ],
    ecologicalConfig: {
      habitat: { forestTypes: ["Prats", "Pastures", "Vores de camí", "Clarianes"], treeAssociations: [], hosts: [], soilPreference: "Àcid a alcalí", substrate: "Herba i restes vegetals", moisture: "Mitjana després de pluja", altitude: [0, 1900], slope: "Pla a suau", aspect: "Variable", shade: "Baixa", landscapePosition: "Espais herbosos oberts, sovint en arcs o rotllanes" },
      soil: { texture: "Franca a francoarenosa", reaction: "Àcida a alcalina", phRange: [5, 8.5], substrate: "Prat, pastura o gespa", organicMatter: "Moderada", drainage: "Bo", waterRetention: "Baixa a mitjana", depth: "Variable", humus: "Herbaci", evidence: "limited" },
      climate: { temperatureRange: [8, 21], nightPreference: "Fresca a suau", relativeHumidity: "Moderada a alta", soilMoisture: "Mitjana", rainfall: "Episodis de primavera i tardor", drought: "Interromp la fructificació", heat: "La calor seca és desfavorable", frost: "Desfavorable", wind: "Dessecant", snow: "No rellevant" },
      rainfall: { preferredAccumulation: "Rehidratació regular de l’horitzó superficial del prat", fruitingDelay: "Pocs dies a setmanes després de pluja", priorMoisture: "Moderadament important", temperatureAfterRain: "Fresca a suau", interruption: "Sol intens, vent sec, sequera o gelada", uncertainty: "El reg i la gestió de les gespes poden crear fructificacions fora del patró climàtic natural." },
      seasonality: season({ abr: "possible", mai: "moderate", jun: "possible", jul: "possible", ago: "possible", set: "good", oct: "peak", nov: "good", des: "possible" }),
      regions: ["pirineus", "prepirineus", "catalunya-central", "serralades-costeres", "serralades-prelitorals", "emporda", "montseny", "ports", "muntanyes-interiors"]
    },
    idealConditions: ["Prats i gespes humits després de pluja", "8–21 °C", "Revisar tots els cama-secs d’una collita", "La muscarina no s’elimina amb la cocció"]
  }),
  profile({
    speciesId: "paxillus-involutus",
    identity: {
      commonName: "Paxil·le tòxic",
      alternateNames: ["paxil·le involut", "paxil·le de marge cargolat"],
      scientificName: "Paxillus involutus",
      family: "Paxillaceae",
      genus: "Paxillus",
      edibility: "dangerously_toxic",
      identificationDifficulty: "Alta",
      typicalSize: "Barret de 5–25 cm",
      shortDescription: "Bolet bru de marge fortament cargolat que pot desencadenar una hemòlisi immunitària greu, fins i tot després de consums previs."
    },
    morphology: {
      cap: "Convex i després deprimit o en embut, bru ocraci a oliva, vellutat de jove, amb el marge gruixut i molt involut.",
      hymenium: "Làmines groc ocraci, decurrents, ramificades i fàcilment separables; s’enfosqueixen fortament al tacte.",
      stem: "Curt, cilíndric o afuat, ocre i tacant-se de bru, sense anell.",
      flesh: "Groguenca, tova i enfosquint-se al tall o a la pressió.",
      colour: "Ocre, oliva, bru i groc brut.",
      smell: "Fúngica o lleugerament àcida.",
      texture: "Carnosa de jove i flonja amb l’edat.",
      typicalAppearance: "Bolet bru deprimit de làmines decurrents que es taquen, sota bedolls, pins o altres arbres.",
      keyFeatures: ["Marge fortament involut", "Làmines decurrents separables", "Enfosquiment al tacte", "Absència de làtex"],
      variation: "El marge es desplega amb l’edat i els exemplars secs poden perdre el tacte vellutat; la toxicitat no depèn de l’aspecte."
    },
    similarSpecies: [
      { scientificName: "Lactarius deliciosus", commonName: "Pinetell", mainDifferences: "Té color taronja, cercles concèntrics i segrega làtex color pastanaga quan es tallen les làmines.", edibility: "excellent_edible", toxicity: "Sense toxicitat coneguda quan la identificació és segura.", warning: true },
      { scientificName: "Tapinella atrotomentosa", commonName: "Paxil·le vellutat", mainDifferences: "Creix sobre fusta de coníferes i presenta un peu lateral gruixut cobert de vellut fosc.", edibility: "inedible", toxicity: "No recomanat per la duresa i l’amargor." }
    ],
    ecologicalConfig: {
      habitat: { forestTypes: ["Boscos de planifolis", "Boscos de coníferes", "Boscos humits"], treeAssociations: ["Betula pendula", "Pinus sylvestris", "Fagus sylvatica", "Quercus"], hosts: ["Betula", "Pinus", "Fagus", "Quercus"], soilPreference: "Àcid a neutre", substrate: "Silícic, humífer o torbós", moisture: "Fresca a humida", altitude: [100, 2100], slope: "Variable", aspect: "Fresca", shade: "Mitjana", landscapePosition: "Boscos, vores, torberes i sòls alterats sota arbres hoste" },
      soil: { texture: "Arenosa a franca o torbosa", reaction: "Àcida a neutra", phRange: [3.5, 7], substrate: "Silícic, humífer o torbós", organicMatter: "Moderada a alta", drainage: "Variable", waterRetention: "Mitjana a alta", depth: "Variable", humus: "Mull àcid o torba", evidence: "limited" },
      climate: { temperatureRange: [7, 18], nightPreference: "Fresca", relativeHumidity: "Alta", soilMoisture: "Mitjana a alta", rainfall: "Pluges regulars d’estiu i tardor", drought: "Molt desfavorable", heat: "Desfavorable", frost: "Atura la fructificació", wind: "Dessecant", snow: "Fora del pic" },
      rainfall: { preferredAccumulation: "Humitat sostinguda del sòl forestal", fruitingDelay: "Dies a setmanes després de pluges regulars", priorMoisture: "Molt important", temperatureAfterRain: "Fresca", interruption: "Sequera, calor o gelada", uncertainty: "L’espècie ocupa hàbitats amplis i alterats; el mapa no informa de la sensibilització immunitària individual." },
      seasonality: season({ jun: "possible", jul: "moderate", ago: "good", set: "good", oct: "peak", nov: "moderate" }),
      regions: ["pirineus", "prepirineus", "catalunya-central", "serralades-prelitorals", "emporda", "montseny", "muntanyes-interiors"]
    },
    idealConditions: ["Boscos àcids i humits", "7–18 °C amb pluges regulars", "No consumir encara que s’hagi menjat abans", "La reacció hemolítica pot ser sobtada i greu"]
  })
);

/**
 * Select the featured species for the current calendar month. The ecological
 * seasonality remains the source of truth; prediction scores are intentionally
 * not fetched here because they require a spatial scan of Catalonia.
 */
export function getFeaturedSeasonalSpecies(date = new Date(), limit = 3) {
  const month = months[date.getMonth()];
  const edibleStatuses = new Set(["excellent_edible", "edible", "edible_with_conditions"]);
  return speciesProfiles
    .filter((species) =>
      species.predictionMode === "current" &&
      edibleStatuses.has(species.identity.edibility) &&
      species.ecologicalConfig.seasonality[month] !== "inactive"
    )
    .sort((left, right) => seasonalActivityRank[right.ecologicalConfig.seasonality[month]] - seasonalActivityRank[left.ecologicalConfig.seasonality[month]])
    .slice(0, limit);
}

export const speciesById = Object.fromEntries(speciesProfiles.map((item) => [item.speciesId, item]));
const scientificNameAliases: Record<string, string> = {
  "Agrocybe aegerita": "cyclocybe-cylindracea",
  "Agrocybe cylindracea": "cyclocybe-cylindracea",
  "Cantharellus lutescens": "craterellus-lutescens",
  "Clitocybe rivulosa": "clitocybe-rivulosa",
  "Entoloma lividum": "entoloma-sinuatum",
  "Galerina unicolor": "galerina-marginata",
  "Inocybe erubescens": "inocybe-erubescens",
  "Inocybe patouillardii": "inocybe-erubescens",
};
const speciesByScientificName = new Map<string, SpeciesProfile>([
  ...speciesProfiles.map((item) => [item.identity.scientificName.toLocaleLowerCase("la"), item] as const),
  ...Object.entries(scientificNameAliases).flatMap(([scientificName, speciesId]) => {
    const item = speciesById[speciesId];
    return item ? [[scientificName.toLocaleLowerCase("la"), item] as const] : [];
  }),
]);
const catalanSpeciesCollator = new Intl.Collator("ca", { sensitivity: "base" });
export const speciesAlphabetical = [...speciesProfiles].sort((left, right) =>
  catalanSpeciesCollator.compare(left.identity.commonName, right.identity.commonName)
);
export const speciesSelectItems = speciesAlphabetical.map((item) => ({ value: item.speciesId, label: item.identity.commonName }));

export function getSpecies(speciesId: string) {
  return speciesById[speciesId];
}

export function getSpeciesByScientificName(scientificName: string) {
  return speciesByScientificName.get(scientificName.trim().toLocaleLowerCase("la"));
}
