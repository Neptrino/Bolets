import type { RegionId } from "@/src/lib/types";

interface TerritorialSource {
  title: string;
  url: string;
}

export interface AreaProfile {
  slug: string;
  name: string;
  nameWithArticle: string;
  prepositionalName: string;
  typeLabel: "comarca" | "massís";
  regionId: RegionId;
  description: string;
  landscape: string;
  source: TerritorialSource;
}

export interface PlaceProfile {
  areaSlug: string;
  slug: string;
  name: string;
  nameWithArticle: string;
  prepositionalName: string;
  typeLabel: "municipi" | "vall" | "paratge";
  mapCentre: [longitude: number, latitude: number];
  description: string;
  landscape: string;
  source: TerritorialSource;
}

export interface SpeciesLocationPage {
  areaSlug: string;
  placeSlug: string;
  speciesSlug: string;
  speciesId: string;
  searchName: string;
  titlePhrase: string;
  introduction: string;
  habitatNote: string;
  seasonNote: string;
}

export const areaProfiles: AreaProfile[] = [
  {
    slug: "ripolles",
    name: "Ripollès",
    nameWithArticle: "el Ripollès",
    prepositionalName: "al Ripollès",
    typeLabel: "comarca",
    regionId: "pirineus",
    description: "Comarca pirinenca de valls, boscos montans, prats i cursos d’aigua, amb una temporada molt condicionada per l’altitud.",
    landscape: "Els canvis ràpids de cota desplacen el calendari entre els fons de vall i l’alta muntanya. Camprodon, Setcases i les Lloses ofereixen tres lectures forestals diferents dins la mateixa comarca.",
    source: { title: "Turisme del Ripollès", url: "https://ripollesturisme.cat/" },
  },
  {
    slug: "bergueda",
    name: "Berguedà",
    nameWithArticle: "el Berguedà",
    prepositionalName: "al Berguedà",
    typeLabel: "comarca",
    regionId: "prepirineus",
    description: "Comarca prepirinenca de gran tradició boletaire, amb pinedes, boscos mixtos i relleus que pugen cap al Cadí-Moixeró.",
    landscape: "La temporada de bolets forma part de la cultura gastronòmica local. El tipus de pi, el sòl, l’orientació i la persistència de la humitat canvien entre les valls i els relleus de l’Alt Berguedà.",
    source: { title: "Visit Pirineus — Berguedà", url: "https://visitpirineus.com/ca/destinations/bergueda" },
  },
  {
    slug: "montseny",
    name: "Montseny",
    nameWithArticle: "el Montseny",
    prepositionalName: "al Montseny",
    typeLabel: "massís",
    regionId: "montseny",
    description: "Massís amb un fort gradient climàtic, des de boscos mediterranis fins a fagedes i formacions humides de muntanya.",
    landscape: "La recol·lecció de bolets forma part del patrimoni cultural del massís. Santa Fe, el Brull i Viladrau representen ambients diferents, i la temporada pot variar notablement entre vessants.",
    source: { title: "Patrimoni cultural immaterial del Montseny — recol·lecció de bolets", url: "https://parcs.diba.cat/es/web/el-patrimoni-cultural-immaterial-del-montseny/inventari/detall/-/contingut/29193465/sabers-relacionats-amb-l-alimentacio-recol-leccio-i-consum-de-bolets" },
  },
  {
    slug: "cerdanya",
    name: "Cerdanya",
    nameWithArticle: "la Cerdanya",
    prepositionalName: "a la Cerdanya",
    typeLabel: "comarca",
    regionId: "pirineus",
    description: "Gran vall pirinenca envoltada de boscos submediterranis, pinedes montanes i prats alpins, amb un gradient altitudinal molt marcat.",
    landscape: "L’orientació est-oest de la vall crea contrastos entre solells, obagues i boscos de muntanya. Bellver permet llegir la transició entre el fons de vall i els vessants del Cadí-Moixeró.",
    source: { title: "Visit Pirineus — Cerdanya", url: "https://visitpirineus.com/en/destinations/cerdanya" },
  },
  {
    slug: "ports",
    name: "Ports",
    nameWithArticle: "els Ports",
    prepositionalName: "als Ports",
    typeLabel: "massís",
    regionId: "ports",
    description: "Massís mediterrani de relleu calcari i fort gradient altitudinal, amb pinedes de pi blanc, pinassa i pi roig entre barrancs, cingles i sectors forestals.",
    landscape: "El canvi de cota separa les pinedes mediterrànies de les formacions montanes. Entorn d’Horta de Sant Joan, el tipus de pi, la reacció del sòl i la persistència de la humitat permeten distingir l’hàbitat del rovelló i el del pinetell.",
    source: { title: "Parc Natural dels Ports — ambients", url: "https://parcsnaturals.gencat.cat/ca/xarxa-de-parcs/ports/el-parc/patrimoni-natural-i-cultural/ambients/" },
  },
];

export const placeProfiles: PlaceProfile[] = [
  {
    areaSlug: "ripolles", slug: "camprodon", name: "Camprodon", nameWithArticle: "Camprodon", prepositionalName: "a Camprodon", typeLabel: "municipi",
    mapCentre: [2.3649, 42.3128],
    description: "Municipi de la vall de Camprodon amb una marcada transició entre fons de vall, boscos montans i vessants pirinencs.",
    landscape: "L’alternança de pinedes, rouredes i fagedes crea hàbitats forestals diversos, però la fructificació continua depenent de la pluja, la humitat acumulada i la temperatura.",
    source: { title: "Visit Pirineus — cuines de la vall de Camprodon", url: "https://www.visitpirineus.com/ca/que-fer/collectiu-de-cuina/cuines-de-la-vall-de-camprodon" },
  },
  {
    areaSlug: "ripolles", slug: "setcases", name: "Setcases", nameWithArticle: "Setcases", prepositionalName: "a Setcases", typeLabel: "municipi",
    mapCentre: [2.3016, 42.3753],
    description: "Municipi d’alta muntanya de la vall de Camprodon, envoltat de pinedes i vessants que pugen cap a les capçaleres del Ter.",
    landscape: "La Fira del Bolet de tardor reflecteix la vinculació local amb els fongs. Les pinedes de muntanya i les nits fresques poden encaixar amb els ceps de pi quan el sòl manté humitat.",
    source: { title: "Turisme Ripollès — Setcases", url: "https://ripollesturisme.cat/wp-content/uploads/2021/12/Web-Folleto-Setcases-ENG-FR.pdf" },
  },
  {
    areaSlug: "ripolles", slug: "les-lloses", name: "Les Lloses", nameWithArticle: "les Lloses", prepositionalName: "a les Lloses", typeLabel: "municipi",
    mapCentre: [2.1167, 42.1506],
    description: "Municipi forestal del sud-oest del Ripollès, entre relleus suaus, rieres, pinedes, alzinars i rouredes.",
    landscape: "Els seus boscos són coneguts entre els aficionats als bolets. El mosaic forestal pot ser compatible amb ceps, però l’orientació i la humitat separen molt els sectors favorables.",
    source: { title: "Visit Pirineus — etapa Ripoll–Alpens", url: "https://www.visitpirineus.com/ca/que-fer/rutes/etapa-de-ruta/etapa-9-ripoll-alpens" },
  },
  {
    areaSlug: "bergueda", slug: "castellar-de-nhug", name: "Castellar de n’Hug", nameWithArticle: "Castellar de n’Hug", prepositionalName: "a Castellar de n’Hug", typeLabel: "municipi",
    mapCentre: [2.0166, 42.2826],
    description: "Municipi de l’Alt Berguedà sota els relleus del Cadí-Moixeró, amb pinedes de muntanya, prats i un fort gradient de cota.",
    landscape: "Les pinedes creen hàbitat potencial per als lactaris associats als pins. La pinassa ha de conservar humitat i el vent o una baixada brusca de temperatura poden escurçar la resposta.",
    source: { title: "Visit Pirineus — Berguedà", url: "https://visitpirineus.com/ca/destinations/bergueda" },
  },
  {
    areaSlug: "bergueda", slug: "rasos-de-peguera", name: "Rasos de Peguera", nameWithArticle: "els Rasos de Peguera", prepositionalName: "als Rasos de Peguera", typeLabel: "paratge",
    mapCentre: [1.7644, 42.1419],
    description: "Relleu prepirinenc elevat al nord de Berga, amb boscos de coníferes, clarianes i vessants exposats a canvis ràpids de temps.",
    landscape: "Les pinedes i les cotes montanes poden encaixar amb l’ecologia del cep. La capacitat del sòl per retenir humitat després de la pluja és més important que un xàfec aïllat.",
    source: { title: "Visit Pirineus — ruta del Caracremada", url: "https://www.visitpirineus.com/sites/default/files/fulleto/fitxer/af_cataleg-senderisme_2017_cat_0.pdf" },
  },
  {
    areaSlug: "montseny", slug: "santa-fe", name: "Santa Fe del Montseny", nameWithArticle: "Santa Fe del Montseny", prepositionalName: "a Santa Fe del Montseny", typeLabel: "vall",
    mapCentre: [2.4635, 41.773],
    description: "Vall alta i humida del massís, coneguda per la fageda i pels ambients frescos que envolten Santa Fe.",
    landscape: "La fageda, la fullaraca i les obagues encaixen amb espècies que necessiten humitat sostinguda. Les activitats del parc han documentat una llarga tradició de descoberta de bolets en aquest entorn.",
    source: { title: "Parc Natural del Montseny — itineraris de bolets", url: "https://parcs.diba.cat/documents/75109/15894267/p03d112.pdf" },
  },
  {
    areaSlug: "montseny", slug: "el-brull", name: "El Brull", nameWithArticle: "el Brull", prepositionalName: "al Brull", typeLabel: "municipi",
    mapCentre: [2.3052, 41.8168],
    description: "Municipi del Montseny occidental amb pinedes, alzinars i una transició marcada entre vessants mediterranis i ambients de muntanya.",
    landscape: "El parc hi organitza activitats de descoberta dels bolets. Les pinedes fresques i els sectors protegits poden conservar la humitat necessària per als camagrocs.",
    source: { title: "Parc Natural del Montseny — els bolets al Brull", url: "https://parcs.diba.cat/ca/web/agenda/-/montseny-els-bolets-amb-uns-altres-ulls-al-brull-1" },
  },
  {
    areaSlug: "montseny", slug: "viladrau", name: "Viladrau", nameWithArticle: "Viladrau", prepositionalName: "a Viladrau", typeLabel: "municipi",
    mapCentre: [2.3907, 41.8483],
    description: "Municipi del vessant nord del Montseny, amb castanyedes, alzinars frescals, rouredes i proximitat a les fagedes del massís.",
    landscape: "Els boscos amb fullaraca profunda i les obagues poden encaixar amb les trompetes de la mort quan la tardor manté una humitat alta i sense gelades persistents.",
    source: { title: "Patrimoni cultural immaterial del Montseny", url: "https://parcs.diba.cat/es/web/el-patrimoni-cultural-immaterial-del-montseny/inventari/detall/-/contingut/29193465/sabers-relacionats-amb-l-alimentacio-recol-leccio-i-consum-de-bolets" },
  },
  {
    areaSlug: "cerdanya", slug: "bellver-de-cerdanya", name: "Bellver de Cerdanya", nameWithArticle: "Bellver de Cerdanya", prepositionalName: "a Bellver de Cerdanya", typeLabel: "municipi",
    mapCentre: [1.7745, 42.3702],
    description: "Municipi de la Cerdanya situat entre el fons de vall i els vessants forestals del Cadí-Moixeró.",
    landscape: "Les pinedes montanes i els boscos de coníferes poden encaixar amb els ceps de pi, especialment en orientacions fresques i sòls àcids que mantenen humitat.",
    source: { title: "Visit Pirineus — Cerdanya", url: "https://visitpirineus.com/en/destinations/cerdanya" },
  },
  {
    areaSlug: "ports", slug: "horta-de-sant-joan", name: "Horta de Sant Joan", nameWithArticle: "Horta de Sant Joan", prepositionalName: "a Horta de Sant Joan", typeLabel: "municipi",
    mapCentre: [0.3154, 40.9555],
    description: "Municipi de la Terra Alta als peus dels Ports, amb accés a un paisatge de pinedes mediterrànies, pinasses, cingleres calcàries i un gradient de cota molt marcat.",
    landscape: "Les pinedes de pi blanc de les cotes baixes i les de pinassa dels sectors més alts ofereixen contextos diferents per als lactaris. El substrat i la humitat efectiva són imprescindibles per separar compatibilitat ecològica de simple presència de pins.",
    source: { title: "Parc Natural dels Ports — Horta de Sant Joan", url: "https://parcsnaturals.gencat.cat/ca/xarxa-de-parcs/ports/gaudeix-del-parc/guia-de-visita/pobles/" },
  },
];

export const speciesLocationPages: SpeciesLocationPage[] = [
  {
    areaSlug: "ripolles", placeSlug: "camprodon", speciesSlug: "ceps", speciesId: "boletus-edulis", searchName: "ceps", titlePhrase: "Ceps a Camprodon",
    introduction: "L’entorn de Camprodon combina boscos i cotes compatibles amb l’ecologia del cep. Això descriu potencial d’hàbitat: no confirma que n’hi hagi en un indret concret ni que estiguin fructificant ara.",
    habitatNote: "Les pinedes de muntanya, fagedes i rouredes fresques encaixen millor quan el sòl és àcid o descarbonatat, conserva humitat i drena bé. Les obagues i els marges de bosc protegits poden resistir millor els episodis secs.",
    seasonNote: "A la muntanya, el calendari pot començar abans a les cotes altes i avançar vall avall. El tram més favorable acostuma a concentrar-se entre finals d’estiu i la tardor, sempre després d’una rehidratació real del sòl.",
  },
  {
    areaSlug: "ripolles", placeSlug: "camprodon", speciesSlug: "rossinyols", speciesId: "cantharellus-cibarius", searchName: "rossinyols", titlePhrase: "Rossinyols a Camprodon",
    introduction: "Les fagedes, rouredes i pinedes humides de l’entorn de Camprodon poden coincidir amb l’ecologia del rossinyol. La guia descriu hàbitat potencial i no confirma presència ni fructificació actual.",
    habitatNote: "Els vessants frescos i les obagues amb sòl àcid, humus ben format i humitat sostinguda són els ambients més compatibles. El drenatge ha d’evitar l’entollament sense deixar assecar la capa superficial.",
    seasonNote: "La finestra general va de finals d’estiu fins al novembre, amb un pic habitual a l’octubre. Les pluges regulars i les nits fresques afavoreixen la resposta; la calor o el vent sec la poden interrompre.",
  },
  {
    areaSlug: "ripolles", placeSlug: "camprodon", speciesSlug: "rovellons", speciesId: "lactarius-sanguifluus", searchName: "rovellons", titlePhrase: "Rovellons a Camprodon",
    introduction: "Els boscos de l’entorn de Camprodon poden contenir pinedes compatibles amb el rovelló vinós, sobretot als sectors montans més temperats. Aquesta lectura ecològica no confirma presència ni assenyala cap indret de recol·lecció.",
    habitatNote: "El rovelló necessita pins i encaixa millor en pinedes obertes sobre sòls neutres o calcaris, ben drenats i amb humitat moderada. La cota i el substrat limiten molt més l’hàbitat potencial que la simple presència de bosc.",
    seasonNote: "La tardor concentra la finestra principal, amb més potencial a l’octubre i novembre. Cal pluja efectiva seguida de temperatures suaus; el fred de muntanya, el vent sec o una nova sequera poden escurçar la resposta.",
  },
  {
    areaSlug: "ripolles", placeSlug: "camprodon", speciesSlug: "pinetells", speciesId: "lactarius-deliciosus", searchName: "pinetells i rovellons", titlePhrase: "Pinetells (rovellons) a Camprodon",
    introduction: "A Camprodon, el nom popular rovelló també pot designar el pinetell de làtex taronja. Les pinedes montanes poden oferir hàbitat compatible, però aquesta guia no confirma exemplars ni revela localitzacions sensibles.",
    habitatNote: "El pinetell s’associa als pins i prefereix pinassa humida sobre sòls àcids o neutres, frescos i ben drenats. Les obagues i els marges protegits poden conservar millor l’aigua, sempre que no quedin entollats.",
    seasonNote: "La finestra general va de setembre a novembre i acostuma a culminar a l’octubre. La pinassa ha de mantenir humitat durant dies; el vent, la sequera sobtada o les primeres gelades poden aturar el desenvolupament.",
  },
  {
    areaSlug: "ripolles", placeSlug: "setcases", speciesSlug: "ceps-de-pi", speciesId: "boletus-pinophilus", searchName: "ceps de pi", titlePhrase: "Ceps de pi a Setcases",
    introduction: "Setcases està envoltat de pinedes i cotes que poden encaixar amb el cep rogenc o cep de pi. La coincidència forestal és només el primer filtre: la humitat prèvia i les nits fresques decideixen la fructificació.",
    habitatNote: "Les pinedes de pi roig i pi negre sobre sòls àcids o descarbonatats són l’associació principal. Les obagues i orientacions fresques poden conservar millor l’aigua, però el vent de muntanya accelera l’assecat.",
    seasonNote: "La finestra general va de l’estiu avançat a la tardor, amb un pic habitual al setembre. L’altitud pot avançar o retardar la resposta i les primeres gelades en poden tallar la temporada.",
  },
  {
    areaSlug: "ripolles", placeSlug: "setcases", speciesSlug: "rossinyols", speciesId: "cantharellus-cibarius", searchName: "rossinyols", titlePhrase: "Rossinyols a Setcases",
    introduction: "Els boscos montans de Setcases poden oferir sectors compatibles amb el rossinyol quan el sòl conserva humitat. Aquesta lectura ecològica no identifica cap bosc concret ni garanteix que hi hagi exemplars.",
    habitatNote: "Les pinedes humides i els boscos mixtos sobre sòls àcids o descarbonatats encaixen millor, especialment en obagues protegides. A l’alta vall, el vent pot anul·lar ràpidament l’efecte d’una pluja curta.",
    seasonNote: "El potencial s’estén de finals d’estiu fins a la tardor i sol culminar a l’octubre. La cota pot avançar la resposta, però les baixades brusques de temperatura i les gelades n’escurcen la finestra.",
  },
  {
    areaSlug: "ripolles", placeSlug: "les-lloses", speciesSlug: "ceps", speciesId: "boletus-edulis", searchName: "ceps", titlePhrase: "Ceps a les Lloses",
    introduction: "Els boscos de les Lloses són apreciats pels boletaires i combinen pinedes, rouredes i fondalades compatibles amb el cep. Aquesta guia no identifica cap bosc concret ni garanteix presència.",
    habitatNote: "Les rouredes fresques, les pinedes de muntanya i els marges de bosc ben drenats encaixen millor amb l’espècie. En un mosaic forestal tan ampli, el substrat i l’exposició poden canviar en poca distància.",
    seasonNote: "La tardor concentra el potencial principal, però la resposta depèn d’una humitat acumulada real. La calor posterior a la pluja o el vent sec poden interrompre el procés abans que apareguin carpòfors.",
  },
  {
    areaSlug: "ripolles", placeSlug: "les-lloses", speciesSlug: "rossinyols", speciesId: "cantharellus-cibarius", searchName: "rossinyols", titlePhrase: "Rossinyols a les Lloses",
    introduction: "El mosaic de rouredes, pinedes i fondalades de les Lloses pot contenir hàbitat compatible amb el rossinyol. La distribució és irregular i aquesta pàgina no assenyala indrets de recol·lecció.",
    habitatNote: "Les obagues amb humus, sòl àcid i humitat sostinguda encaixen millor que els solells o les carenes exposades. La coberta forestal per si sola no basta si el sòl continua sec després de la pluja.",
    seasonNote: "La tardor és el període principal, habitualment amb més potencial a l’octubre. Cal una rehidratació persistent del sòl; una nova sequera, calor anòmala o vent continuat poden aturar la resposta.",
  },
  {
    areaSlug: "bergueda", placeSlug: "castellar-de-nhug", speciesSlug: "rovellons", speciesId: "lactarius-deliciosus", searchName: "rovellons i pinetells", titlePhrase: "Pinetells (rovellons) a Castellar de n’Hug",
    introduction: "Les pinedes de l’entorn de Castellar de n’Hug poden ser compatibles amb el pinetell, sovint inclòs en les cerques de rovellons. No totes les pinedes ni totes les setmanes ofereixen les mateixes condicions.",
    habitatNote: "El pinetell està lligat als pins i prefereix pinassa humida sobre sòls ben drenats. Les clarianes i marges poden funcionar quan la radiació, el vent i la cota no assequen de nou la capa superficial.",
    seasonNote: "La tardor és el període central. Les pluges han de mantenir la pinassa humida durant dies o setmanes; una baixada brusca de temperatura o una nova sequera poden aturar la resposta.",
  },
  {
    areaSlug: "bergueda", placeSlug: "castellar-de-nhug", speciesSlug: "ceps", speciesId: "boletus-edulis", searchName: "ceps", titlePhrase: "Ceps a Castellar de n’Hug",
    introduction: "Les pinedes de muntanya i els vessants frescos de Castellar de n’Hug poden coincidir amb l’ecologia del cep. La coincidència indica potencial d’hàbitat, no presència confirmada ni abundància.",
    habitatNote: "Els boscos madurs, els marges protegits i els sòls àcids o descarbonatats amb bon drenatge són els ambients més compatibles. Les fondalades poden conservar més humitat que els relleus exposats.",
    seasonNote: "El potencial principal va de finals d’estiu fins al novembre, amb un pic general a l’octubre. A les cotes altes, el vent i les primeres gelades poden tancar la finestra encara que hagi plogut.",
  },
  {
    areaSlug: "bergueda", placeSlug: "castellar-de-nhug", speciesSlug: "camagrocs", speciesId: "craterellus-lutescens", searchName: "camagrocs", titlePhrase: "Camagrocs a Castellar de n’Hug",
    introduction: "Les pinedes humides i les fondalades fresques de Castellar de n’Hug poden contenir microhàbitats compatibles amb el camagroc. La guia no confirma presència ni assenyala llocs de recol·lecció.",
    habitatNote: "Les obagues amb molsa, humus abundant i humitat persistent encaixen millor, sobretot sota pins o en boscos mixtos. Les carenes obertes i el vent de muntanya assequen ràpidament el sòl superficial.",
    seasonNote: "La tardor avançada concentra el potencial, especialment entre octubre i novembre. L’espècie necessita humitat sostinguda; una sequera curta, el vent persistent o les gelades en poden tallar la resposta.",
  },
  {
    areaSlug: "bergueda", placeSlug: "rasos-de-peguera", speciesSlug: "ceps", speciesId: "boletus-edulis", searchName: "ceps", titlePhrase: "Ceps als Rasos de Peguera",
    introduction: "Les cotes i els boscos dels Rasos de Peguera poden coincidir amb l’ecologia del cep. El relleu obert i exposat fa que el vent i els canvis de temperatura siguin tan importants com la pluja.",
    habitatNote: "Les pinedes de muntanya i els sectors amb sòl fresc, àcid i ben drenat són els més compatibles. Les fondalades protegides poden conservar humitat més temps que les carenes i clarianes exposades.",
    seasonNote: "El potencial se sol concentrar entre finals d’estiu i la tardor. A aquestes cotes, una nit freda pot afavorir el descens tèrmic necessari, però les gelades persistents tanquen la finestra.",
  },
  {
    areaSlug: "bergueda", placeSlug: "rasos-de-peguera", speciesSlug: "rovellons", speciesId: "lactarius-deliciosus", searchName: "rovellons i pinetells", titlePhrase: "Pinetells (rovellons) als Rasos de Peguera",
    introduction: "Les pinedes dels Rasos de Peguera poden ser compatibles amb el pinetell, sovint cercat amb el nom general de rovelló. La pàgina no confirma presència ni revela cap localització exacta.",
    habitatNote: "La pinassa humida, el bon drenatge i els marges de pineda protegits són els factors més favorables. Les clarianes exposades al vent poden perdre ràpidament la humitat necessària després de ploure.",
    seasonNote: "La tardor concentra la finestra principal, especialment durant l’octubre. La pluja ha de mantenir la pinassa humida durant dies; el vent sec, una nova sequera o les gelades n’aturen el desenvolupament.",
  },
  {
    areaSlug: "bergueda", placeSlug: "rasos-de-peguera", speciesSlug: "camagrocs", speciesId: "craterellus-lutescens", searchName: "camagrocs", titlePhrase: "Camagrocs als Rasos de Peguera",
    introduction: "Les pinedes i els sectors protegits dels Rasos de Peguera poden oferir microhàbitats compatibles amb el camagroc. Aquesta lectura ecològica no identifica cap indret concret ni garanteix fructificació.",
    habitatNote: "Les fondalades amb molsa, humus i humitat persistent encaixen millor que les clarianes o carenes exposades. El drenatge ha de conservar frescor sense entollar, i el vent és un factor limitant important.",
    seasonNote: "El potencial principal se situa entre octubre i novembre, quan el sòl ja acumula humitat i les temperatures són fresques. El vent, una nova sequera o les gelades continuades redueixen ràpidament l’activitat.",
  },
  {
    areaSlug: "bergueda", placeSlug: "rasos-de-peguera", speciesSlug: "fredolics", speciesId: "tricholoma-terreum", searchName: "fredolics", titlePhrase: "Fredolics als Rasos de Peguera",
    introduction: "Les pinedes fresques dels Rasos de Peguera poden coincidir amb l’ecologia del fredolic durant la tardor avançada. La semblança amb altres tricolomes exigeix prudència i identificació experta.",
    habitatNote: "Els sòls de pineda amb pinassa, bon drenatge i humitat moderada són els més compatibles. Els marges oberts poden respondre després de ploure si el vent i la radiació no els assequen de seguida.",
    seasonNote: "La finestra habitual va d’octubre a desembre i sol culminar al novembre. El fred moderat pot mantenir-la activa, però la sequera, la calor anòmala o les gelades persistents la poden interrompre.",
  },
  {
    areaSlug: "montseny", placeSlug: "santa-fe", speciesSlug: "ceps", speciesId: "boletus-edulis", searchName: "ceps", titlePhrase: "Ceps a Santa Fe del Montseny",
    introduction: "La fageda i els ambients frescos de Santa Fe poden encaixar amb l’ecologia del cep. És una lectura d’hàbitat potencial i no una indicació que hi hagi exemplars en un punt concret.",
    habitatNote: "Les fagedes, els marges de bosc madur i els sòls amb bon drenatge encaixen especialment bé. La fullaraca ha de conservar humitat sense quedar saturada i les obagues redueixen l’estrès de calor.",
    seasonNote: "La tardor és el període principal al massís, amb variacions segons la cota i l’exposició. La pluja repartida i les nits fresques són més favorables que els xàfecs intensos i aïllats.",
  },
  {
    areaSlug: "montseny", placeSlug: "santa-fe", speciesSlug: "rossinyols", speciesId: "cantharellus-cibarius", searchName: "rossinyols", titlePhrase: "Rossinyols a Santa Fe del Montseny",
    introduction: "La fageda i els ambients humits de Santa Fe del Montseny poden coincidir amb l’ecologia del rossinyol. La guia expressa compatibilitat ambiental, no una confirmació de presència.",
    habitatNote: "Els sòls àcids amb humus, bon drenatge i humitat sostinguda encaixen millor, sobretot en obagues i marges protegits. La fullaraca humida és rellevant, però no ha de quedar entollada.",
    seasonNote: "El potencial va de finals d’estiu fins al novembre i acostuma a culminar a l’octubre. Les pluges regulars i la frescor afavoreixen la resposta; el vent sec o una tardor càlida la poden frenar.",
  },
  {
    areaSlug: "montseny", placeSlug: "el-brull", speciesSlug: "camagrocs", speciesId: "craterellus-lutescens", searchName: "camagrocs", titlePhrase: "Camagrocs al Brull",
    introduction: "Les pinedes i sectors frescos del Brull poden contenir microhàbitats compatibles amb el camagroc. La compatibilitat és irregular i no equival a una localització de recol·lecció.",
    habitatNote: "Els sectors amb pineda, molsa, humus i humitat persistent són els que encaixen millor. Les obagues i fondalades poden conservar aigua, mentre que el vent i els vessants exposats s’assequen ràpidament.",
    seasonNote: "El màxim potencial se situa habitualment a la tardor avançada. Al Montseny occidental, l’exposició i els episodis de vent poden separar molt l’inici i el final de temporada.",
  },
  {
    areaSlug: "montseny", placeSlug: "el-brull", speciesSlug: "ceps", speciesId: "boletus-edulis", searchName: "ceps", titlePhrase: "Ceps al Brull",
    introduction: "Els boscos de muntanya i els sectors més frescos del Brull poden contenir hàbitat compatible amb el cep. Aquesta lectura no confirma exemplars ni converteix el municipi en una localització de recol·lecció.",
    habitatNote: "Les pinedes fresques, rouredes i marges de bosc madur encaixen millor sobre sòls àcids o descarbonatats que conservin humitat sense entollar-se. L’orientació pot canviar molt el resultat.",
    seasonNote: "La finestra general s’estén de finals d’estiu fins al novembre, amb un pic habitual a l’octubre. La pluja repartida és més favorable que un xàfec, especialment si després bufa vent sec.",
  },
  {
    areaSlug: "montseny", placeSlug: "viladrau", speciesSlug: "trompetes-de-la-mort", speciesId: "craterellus-cornucopioides", searchName: "trompetes de la mort", titlePhrase: "Trompetes de la mort a Viladrau",
    introduction: "Els boscos humits i la fullaraca dels vessants de Viladrau poden coincidir amb l’ecologia de la trompeta de la mort. El seu color i la distribució irregular fan que sigui difícil de detectar.",
    habitatNote: "Les rouredes humides, fagedes pròximes i alzinars frescals amb fullaraca profunda són els ambients més compatibles. L’ombra i la retenció d’humitat pesen més que la simple etiqueta del bosc.",
    seasonNote: "La tardor plujosa és la finestra principal, especialment entre octubre i novembre. Una nova sequera o una gelada sostinguda redueixen ràpidament l’activitat.",
  },
  {
    areaSlug: "montseny", placeSlug: "viladrau", speciesSlug: "ceps", speciesId: "boletus-edulis", searchName: "ceps", titlePhrase: "Ceps a Viladrau",
    introduction: "Les castanyedes, rouredes i fagedes pròximes a Viladrau poden oferir hàbitat compatible amb el cep. Aquesta coincidència ecològica no confirma presència ni indica cap punt concret de recol·lecció.",
    habitatNote: "Els boscos madurs de planifolis, els marges protegits i els vessants frescos encaixen millor quan el sòl és àcid o descarbonatat, conserva humitat i alhora manté un bon drenatge.",
    seasonNote: "El potencial principal se situa entre finals d’estiu i la tardor, amb un pic general a l’octubre. Cal pluja repartida que rehidrati el sòl; la calor, el vent sec o les gelades n’interrompen la resposta.",
  },
  {
    areaSlug: "montseny", placeSlug: "viladrau", speciesSlug: "rossinyols", speciesId: "cantharellus-cibarius", searchName: "rossinyols", titlePhrase: "Rossinyols a Viladrau",
    introduction: "Les obagues i els boscos humits de Viladrau poden coincidir amb l’ecologia del rossinyol. La pàgina descriu compatibilitat ambiental i no garanteix que l’espècie fructifiqui en un lloc o moment determinat.",
    habitatNote: "Les rouredes i fagedes fresques, amb sòl àcid, humus ben format i humitat sostinguda, són els ambients més compatibles. Un xàfec aïllat no compensa un sòl encara sec en profunditat.",
    seasonNote: "La finestra general va de finals d’estiu fins al novembre i sol culminar a l’octubre. Les pluges regulars i les temperatures fresques afavoreixen la resposta; el vent i una nova sequera la poden tallar.",
  },
  {
    areaSlug: "montseny", placeSlug: "viladrau", speciesSlug: "camagrocs", speciesId: "craterellus-lutescens", searchName: "camagrocs", titlePhrase: "Camagrocs a Viladrau",
    introduction: "Els sectors més frescos i humits dels boscos de Viladrau poden contenir microhàbitats compatibles amb el camagroc. La distribució és irregular i aquesta guia no revela localitzacions de recol·lecció.",
    habitatNote: "Les obagues amb molsa, humus i humitat persistent, especialment en pinedes humides o fagedes mixtes, encaixen millor. El vent i els vessants exposats poden assecar ràpidament la capa superficial.",
    seasonNote: "La tardor avançada concentra el potencial principal, habitualment entre octubre i novembre. L’espècie necessita humitat persistent i respon malament als períodes secs o a les gelades continuades.",
  },
  {
    areaSlug: "montseny", placeSlug: "viladrau", speciesSlug: "ous-de-reig", speciesId: "amanita-caesarea", searchName: "ous de reig", titlePhrase: "Ous de reig a Viladrau",
    introduction: "Les castanyedes, rouredes i alzinars temperats de Viladrau poden contenir hàbitat compatible amb l’ou de reig. Els exemplars tancats són especialment perillosos de confondre i no s’han d’identificar només per la forma.",
    habitatNote: "Els boscos clars de planifolis sobre sòls àcids o descarbonatats, ben drenats i encara temperats després de la pluja, encaixen millor. Els solells protegits poden respondre abans que les obagues fredes.",
    seasonNote: "El potencial principal va de finals d’estiu fins a l’octubre, habitualment amb un màxim al setembre. Necessita pluja efectiva seguida de temperatures suaus; el vent sec o una baixada brusca n’aturen l’activitat.",
  },
  {
    areaSlug: "cerdanya", placeSlug: "bellver-de-cerdanya", speciesSlug: "ceps-de-pi", speciesId: "boletus-pinophilus", searchName: "ceps de pi", titlePhrase: "Ceps de pi a Bellver de Cerdanya",
    introduction: "Els vessants forestals de Bellver de Cerdanya poden encaixar amb l’ecologia del cep rogenc, especialment allà on dominen els pins de muntanya. La pàgina no identifica finques ni punts de presència.",
    habitatNote: "Les pinedes de pi roig i pi negre, els sòls àcids i les orientacions fresques formen la combinació més compatible. El contrast entre solell i obaga és especialment rellevant en una vall tan oberta.",
    seasonNote: "El potencial comença a l’estiu avançat i acostuma a culminar al setembre. La cota, el vent i les primeres gelades poden desplaçar molt la temporada d’un vessant a un altre.",
  },
  {
    areaSlug: "cerdanya", placeSlug: "bellver-de-cerdanya", speciesSlug: "ceps", speciesId: "boletus-edulis", searchName: "ceps", titlePhrase: "Ceps a Bellver de Cerdanya",
    introduction: "Els vessants forestals de Bellver de Cerdanya poden coincidir amb l’ecologia del cep en pinedes, fagedes o boscos mixtos. La pàgina descriu potencial i no assenyala punts de presència.",
    habitatNote: "Els sectors frescos amb sòl àcid o descarbonatat, humitat sostinguda i bon drenatge són els més compatibles. A la Cerdanya, el contrast entre obaga, solell i cota modifica ràpidament les condicions.",
    seasonNote: "El potencial principal s’estén de finals d’estiu fins al novembre, habitualment amb un màxim a l’octubre. El vent de la vall i les gelades primerenques poden interrompre la resposta malgrat la pluja recent.",
  },
  {
    areaSlug: "cerdanya", placeSlug: "bellver-de-cerdanya", speciesSlug: "rovellons", speciesId: "lactarius-sanguifluus", searchName: "rovellons", titlePhrase: "Rovellons a Bellver de Cerdanya",
    introduction: "Les pinedes dels vessants baixos i mitjans de Bellver de Cerdanya poden coincidir amb l’ecologia del rovelló vinós quan el substrat també és compatible. La guia descriu potencial i no confirma presència actual.",
    habitatNote: "El rovelló encaixa millor sota pins en sectors temperats, ben drenats i de sòl neutre o calcari. A la Cerdanya, el contrast entre cota, solell i obaga fa que una pineda aparentment semblant pugui oferir condicions molt diferents.",
    seasonNote: "La tardor és la finestra principal, sobretot a l’octubre i novembre abans de les gelades persistents. La pluja ha d’humitejar realment el sòl; el vent de la vall i el fred sobtat poden interrompre la resposta.",
  },
  {
    areaSlug: "cerdanya", placeSlug: "bellver-de-cerdanya", speciesSlug: "pinetells", speciesId: "lactarius-deliciosus", searchName: "pinetells i rovellons", titlePhrase: "Pinetells (rovellons) a Bellver de Cerdanya",
    introduction: "A Bellver de Cerdanya, una part de les cerques populars de rovellons correspon al pinetell de làtex taronja. Les pinedes montanes poden ser compatibles, però la guia no garanteix presència ni assenyala punts sensibles.",
    habitatNote: "El pinetell necessita pins, pinassa humida i sòls àcids o neutres amb bon drenatge. Els vessants forestals més frescos poden conservar la humitat, mentre que el solell, el vent i un substrat massa alcalí en redueixen la compatibilitat.",
    seasonNote: "El potencial se sol concentrar de setembre a novembre, amb un màxim general a l’octubre. La cota pot avançar o retardar la fructificació i les primeres gelades poden tancar la finestra encara que hagi plogut.",
  },
  {
    areaSlug: "ports", placeSlug: "horta-de-sant-joan", speciesSlug: "rovellons", speciesId: "lactarius-sanguifluus", searchName: "rovellons", titlePhrase: "Rovellons a Horta de Sant Joan",
    introduction: "Les pinedes mediterrànies de l’entorn d’Horta de Sant Joan poden coincidir amb l’ecologia del rovelló vinós. Aquesta guia descriu hàbitat potencial agregat: no confirma presència actual ni assenyala cap punt de recol·lecció.",
    habitatNote: "El rovelló s’associa als pins i encaixa millor en pinedes mediterrànies sobre sòls neutres o calcaris, ben drenats i amb humitat moderada. Als Ports, la cota, l’orientació i el tipus de pineda poden canviar aquesta compatibilitat en poca distància.",
    seasonNote: "La tardor concentra la finestra principal, especialment entre octubre i novembre. Cal una pluja efectiva que humitegi el sòl, seguida de temperatures suaus; el vent sec, la calor persistent o una nova sequera poden aturar la resposta.",
  },
  {
    areaSlug: "ports", placeSlug: "horta-de-sant-joan", speciesSlug: "pinetells", speciesId: "lactarius-deliciosus", searchName: "pinetells", titlePhrase: "Pinetells a Horta de Sant Joan",
    introduction: "El mosaic de pinedes que envolta Horta de Sant Joan també pot contenir sectors compatibles amb el pinetell, que popularment sovint s’inclou sota el nom de rovelló. La guia no garanteix presència ni revela localitzacions sensibles.",
    habitatNote: "El pinetell necessita pins, pinassa humida, bon drenatge i sòls àcids o neutres. En un massís calcari, la presència d’una pineda no basta: només els sectors on el sòl i la humitat encaixen amb aquest perfil són potencialment compatibles.",
    seasonNote: "La finestra general va de setembre a novembre i acostuma a culminar a l’octubre. Les pluges han de mantenir la pinassa humida durant dies; el vent, una represa de la sequera o una baixada brusca de temperatura poden interrompre el desenvolupament.",
  },
];

export const areasBySlug = Object.fromEntries(areaProfiles.map((area) => [area.slug, area])) as Record<string, AreaProfile>;
export const placesByPath = Object.fromEntries(placeProfiles.map((place) => [`${place.areaSlug}/${place.slug}`, place])) as Record<string, PlaceProfile>;

export function getPlace(areaSlug: string, placeSlug: string) {
  return placesByPath[`${areaSlug}/${placeSlug}`];
}

export function getLocationPage(areaSlug: string, placeSlug: string, speciesSlug: string) {
  return speciesLocationPages.find((page) => page.areaSlug === areaSlug && page.placeSlug === placeSlug && page.speciesSlug === speciesSlug);
}

export function placesForArea(areaSlug: string) {
  return placeProfiles.filter((place) => place.areaSlug === areaSlug);
}

export function locationPagesForPlace(areaSlug: string, placeSlug: string) {
  return speciesLocationPages.filter((page) => page.areaSlug === areaSlug && page.placeSlug === placeSlug);
}

export function locationPagesForSpecies(speciesId: string) {
  return speciesLocationPages.filter((page) => page.speciesId === speciesId);
}

export function areaPath(area: AreaProfile) {
  return `/zones/${area.slug}`;
}

export function placePath(place: PlaceProfile) {
  return `/zones/${place.areaSlug}/${place.slug}`;
}

export function locationPagePath(page: SpeciesLocationPage) {
  return `/zones/${page.areaSlug}/${page.placeSlug}/${page.speciesSlug}`;
}

export function displaySearchName(searchName: string) {
  return searchName.charAt(0).toLocaleUpperCase("ca") + searchName.slice(1);
}
