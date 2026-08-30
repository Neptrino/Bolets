import type { RegionId, SpatialBounds } from "@/src/lib/types";

interface TerritorialSource {
  title: string;
  url: string;
}

export interface PlaceResource extends TerritorialSource {
  label: "Turisme local" | "Espai natural" | "Rutes i patrimoni" | "Context territorial";
}

export interface AreaProfile {
  slug: string;
  name: string;
  nameWithArticle: string;
  prepositionalName: string;
  typeLabel: "comarca" | "massís";
  regionId: RegionId;
  /**
   * Aggregation window for the area's live conditions. Tighter than the parent
   * prediction region on purpose: the hub reads the massís or comarca, not the
   * 200 km strip around it.
   */
  bounds: SpatialBounds;
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
  resources: [PlaceResource, PlaceResource];
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
    bounds: { west: 1.95, south: 42.05, east: 2.5, north: 42.45 },
    description: "Comarca pirinenca de valls, boscos montans, prats i cursos d’aigua, amb una temporada molt condicionada per l’altitud.",
    landscape: "Els canvis ràpids de cota desplacen el calendari entre els fons de vall i l’alta muntanya. Camprodon, Setcases, Sant Pau de Segúries i les Lloses ofereixen quatre lectures forestals diferents dins la mateixa comarca.",
    source: { title: "Turisme del Ripollès", url: "https://ripollesturisme.cat/" },
  },
  {
    slug: "bergueda",
    name: "Berguedà",
    nameWithArticle: "el Berguedà",
    prepositionalName: "al Berguedà",
    typeLabel: "comarca",
    regionId: "prepirineus",
    bounds: { west: 1.6, south: 41.9, east: 2.1, north: 42.35 },
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
    bounds: { west: 2.25, south: 41.7, east: 2.55, north: 41.9 },
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
    bounds: { west: 1.55, south: 42.25, east: 2.05, north: 42.5 },
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
    bounds: { west: 0.15, south: 40.7, east: 0.5, north: 41.05 },
    description: "Massís mediterrani de relleu calcari i fort gradient altitudinal, amb pinedes de pi blanc, pinassa i pi roig entre barrancs, cingles i sectors forestals.",
    landscape: "El canvi de cota separa les pinedes mediterrànies de les formacions montanes. Entorn d’Horta de Sant Joan, el tipus de pi, la reacció del sòl i la persistència de la humitat permeten distingir l’hàbitat del rovelló i el del pinetell.",
    source: { title: "Parc Natural dels Ports — ambients", url: "https://parcsnaturals.gencat.cat/ca/xarxa-de-parcs/ports/el-parc/patrimoni-natural-i-cultural/ambients/" },
  },
  {
    slug: "prades",
    name: "Muntanyes de Prades",
    nameWithArticle: "les Muntanyes de Prades",
    prepositionalName: "a les Muntanyes de Prades",
    typeLabel: "massís",
    regionId: "muntanyes-interiors",
    bounds: { west: 0.85, south: 41.22, east: 1.15, north: 41.42 },
    description: "Massís calcari elevat entre el Baix Camp, la Conca de Barberà i el Priorat, amb pinedes de pinassa i pi roig, rouredes i alzinars muntanyencs.",
    landscape: "És un dels territoris boletaires més coneguts del sud de Catalunya, amb el rovelló com a protagonista cultural. L’altiplà de Prades i els vessants del bosc de Poblet ofereixen lectures forestals diferents dins del mateix relleu.",
    source: { title: "Muntanyes de la Costa Daurada", url: "https://www.muntanyescostadaurada.cat/" },
  },
  {
    slug: "solsones",
    name: "Solsonès",
    nameWithArticle: "el Solsonès",
    prepositionalName: "al Solsonès",
    typeLabel: "comarca",
    regionId: "prepirineus",
    bounds: { west: 1.3, south: 41.85, east: 1.75, north: 42.25 },
    description: "Comarca prepirinenca de boscos extensos i poc fragmentats, amb pinedes de pi roig i pinassa que pugen des de l’altiplà central fins al Port del Comte.",
    landscape: "La tradició boletaire hi és profunda i el mosaic de pinedes, rouredes i pastures canvia amb la cota. La vall de Lord i els vessants del Port del Comte concentren els gradients més marcats de la comarca.",
    source: { title: "Turisme Solsonès", url: "https://turismesolsones.com/" },
  },
  {
    slug: "guilleries",
    name: "Guilleries",
    nameWithArticle: "les Guilleries",
    prepositionalName: "a les Guilleries",
    typeLabel: "massís",
    regionId: "montseny",
    bounds: { west: 2.4, south: 41.85, east: 2.65, north: 42.05 },
    description: "Massís humit de la Serralada Transversal, entre Osona i la Selva, cobert de castanyedes, alzinars frescals, pinedes i clapes de fageda.",
    landscape: "És un dels territoris amb més cultura boletaire del país, amb Sant Hilari Sacalm com a capital de les Guilleries. La humitat persistent i el relleu enclotat mantenen actius els boscos quan altres sectors ja s’han assecat.",
    source: { title: "Espai Natural de les Guilleries-Savassona", url: "https://parcs.diba.cat/web/guilleries" },
  },
  {
    slug: "montnegre-corredor",
    name: "Montnegre i el Corredor",
    nameWithArticle: "el Montnegre i el Corredor",
    prepositionalName: "al Montnegre i el Corredor",
    typeLabel: "massís",
    regionId: "serralades-costeres",
    bounds: { west: 2.4, south: 41.55, east: 2.75, north: 41.75 },
    description: "Serralada litoral de boscos vora el mar, amb alzinars, suredes, pinedes i, als sectors culminants del Montnegre, rouredes i castanyedes humides.",
    landscape: "És el territori boletaire més proper a l’àrea metropolitana de Barcelona. El contrast entre el vessant marítim i l’interior, i entre cotes baixes i culminants, desplaça les condicions en pocs quilòmetres.",
    source: { title: "Parc del Montnegre i el Corredor", url: "https://parcs.diba.cat/web/montnegre" },
  },
  {
    slug: "garrotxa",
    name: "Garrotxa",
    nameWithArticle: "la Garrotxa",
    prepositionalName: "a la Garrotxa",
    typeLabel: "comarca",
    regionId: "prepirineus",
    bounds: { west: 2.3, south: 42.05, east: 2.75, north: 42.35 },
    description: "Comarca volcànica i humida, amb fagedes sobre colades de lava, rouredes, alzinars i pinedes que pugen cap al Puigsacalm i l’Alta Garrotxa.",
    landscape: "El clima plujós i els sòls profunds mantenen boscos frescos bona part de la tardor. La fageda d’en Jordà i els vessants de la vall d’en Bas són dues lectures molt diferents de la mateixa comarca.",
    source: { title: "OH! Garrotxa — turisme de la Garrotxa", url: "https://ohgarrotxa.com/" },
  },
];

export const placeProfiles: PlaceProfile[] = [
  {
    areaSlug: "ripolles", slug: "camprodon", name: "Camprodon", nameWithArticle: "Camprodon", prepositionalName: "a Camprodon", typeLabel: "municipi",
    mapCentre: [2.3649, 42.3128],
    description: "Municipi de la vall de Camprodon amb una marcada transició entre fons de vall, boscos montans i vessants pirinencs.",
    landscape: "L’alternança de pinedes, rouredes i fagedes crea hàbitats forestals diversos, però la fructificació continua depenent de la pluja, la humitat acumulada i la temperatura.",
    source: { title: "Visit Pirineus — cuines de la vall de Camprodon", url: "https://www.visitpirineus.com/ca/que-fer/collectiu-de-cuina/cuines-de-la-vall-de-camprodon" },
    resources: [
      { label: "Turisme local", title: "Visit Camprodon", url: "https://visitcamprodon.cat/" },
      { label: "Context territorial", title: "Turisme del Ripollès", url: "https://ripollesturisme.cat/" },
    ],
  },
  {
    areaSlug: "ripolles", slug: "setcases", name: "Setcases", nameWithArticle: "Setcases", prepositionalName: "a Setcases", typeLabel: "municipi",
    mapCentre: [2.3016, 42.3753],
    description: "Municipi d’alta muntanya de la vall de Camprodon, envoltat de pinedes i vessants que pugen cap a les capçaleres del Ter.",
    landscape: "La Fira del Bolet de tardor reflecteix la vinculació local amb els fongs. Les pinedes de muntanya i les nits fresques poden encaixar amb els ceps de pi quan el sòl manté humitat.",
    source: { title: "Turisme Ripollès — Setcases", url: "https://ripollesturisme.cat/wp-content/uploads/2021/12/Web-Folleto-Setcases-ENG-FR.pdf" },
    resources: [
      { label: "Espai natural", title: "Punt d’informació del Parc Natural a Setcases", url: "https://setcases.cat/coneix/espai-dinteres-natural-de-la-capcalera-del-riu-ter/punt-dinformacio-del-parc-natural-setcases/" },
      { label: "Turisme local", title: "Setcases a Turisme del Ripollès", url: "https://ripollesturisme.cat/municipi/setcases/" },
    ],
  },
  {
    areaSlug: "ripolles", slug: "sant-pau-de-seguries", name: "Sant Pau de Segúries", nameWithArticle: "Sant Pau de Segúries", prepositionalName: "a Sant Pau de Segúries", typeLabel: "municipi",
    mapCentre: [2.3652, 42.2614],
    description: "Municipi a l’entrada de la Vall de Camprodon, entre el Ter, el Capsacosta i vessants forestals que connecten els ambients pirinencs amb els de la Garrotxa.",
    landscape: "Les fagedes del Capsacosta, els boscos ombrívols i els sectors humits i freds de Sant Pau de Segúries creen un mosaic de planifolis especialment coherent amb els bolets que depenen de fullaraca i humitat sostinguda.",
    source: { title: "Ripollès Turisme — Sant Pau de Segúries", url: "https://ripollesturisme.cat/municipi/sant-pau-de-seguries/" },
    resources: [
      { label: "Espai natural", title: "Ruta de les set fonts i les tres fagedes", url: "https://ripollesturisme.cat/ruta-senderisme/ruta-de-les-fagedes/" },
      { label: "Rutes i patrimoni", title: "Excursions pel municipi de Sant Pau de Segúries", url: "https://santpauseguries.cat/coneix/planols-i-rutes-2/excursions-pel-municipi-i-el-seu-entorn/" },
    ],
  },
  {
    areaSlug: "ripolles", slug: "les-lloses", name: "Les Lloses", nameWithArticle: "les Lloses", prepositionalName: "a les Lloses", typeLabel: "municipi",
    mapCentre: [2.1167, 42.1506],
    description: "Municipi forestal del sud-oest del Ripollès, entre relleus suaus, rieres, pinedes, alzinars i rouredes.",
    landscape: "Els seus boscos són coneguts entre els aficionats als bolets. El mosaic forestal pot ser compatible amb ceps, però l’orientació i la humitat separen molt els sectors favorables.",
    source: { title: "Visit Pirineus — etapa Ripoll–Alpens", url: "https://www.visitpirineus.com/ca/que-fer/rutes/etapa-de-ruta/etapa-9-ripoll-alpens" },
    resources: [
      { label: "Turisme local", title: "Ajuntament de les Llosses", url: "https://lesllosses.cat/" },
      { label: "Context territorial", title: "Turisme del Ripollès", url: "https://ripollesturisme.cat/" },
    ],
  },
  {
    areaSlug: "bergueda", slug: "castellar-de-nhug", name: "Castellar de n’Hug", nameWithArticle: "Castellar de n’Hug", prepositionalName: "a Castellar de n’Hug", typeLabel: "municipi",
    mapCentre: [2.0166, 42.2826],
    description: "Municipi de l’Alt Berguedà sota els relleus del Cadí-Moixeró, amb pinedes de muntanya, prats i un fort gradient de cota.",
    landscape: "Les pinedes creen hàbitat potencial per als lactaris associats als pins. La pinassa ha de conservar humitat i el vent o una baixada brusca de temperatura poden escurçar la resposta.",
    source: { title: "Visit Pirineus — Berguedà", url: "https://visitpirineus.com/ca/destinations/bergueda" },
    resources: [
      { label: "Turisme local", title: "Turisme de Castellar de n’Hug", url: "https://www.turismecastellardenhug.cat/site/index/ca.html" },
      { label: "Rutes i patrimoni", title: "Llocs d’interès de Castellar de n’Hug", url: "https://www.ajcastellardenhug.cat/turisme/llocs-dinteres" },
    ],
  },
  {
    areaSlug: "bergueda", slug: "rasos-de-peguera", name: "Rasos de Peguera", nameWithArticle: "els Rasos de Peguera", prepositionalName: "als Rasos de Peguera", typeLabel: "paratge",
    mapCentre: [1.7644, 42.1419],
    description: "Relleu prepirinenc elevat al nord de Berga, amb boscos de coníferes, clarianes i vessants exposats a canvis ràpids de temps.",
    landscape: "Les pinedes i les cotes montanes poden encaixar amb l’ecologia del cep. La capacitat del sòl per retenir humitat després de la pluja és més important que un xàfec aïllat.",
    source: { title: "Visit Pirineus — ruta del Caracremada", url: "https://www.visitpirineus.com/sites/default/files/fulleto/fitxer/af_cataleg-senderisme_2017_cat_0.pdf" },
    resources: [
      { label: "Turisme local", title: "Rasos de Peguera", url: "https://www.rasos.net/" },
      { label: "Rutes i patrimoni", title: "Volta per les Canals de Catllarí", url: "https://www.elbergueda.cat/ca/pl161/descobreix/a-peu/itineraris-i-xarxa-de-camins/id603/volta-per-les-canals-de-catllari.htm" },
    ],
  },
  {
    areaSlug: "montseny", slug: "santa-fe", name: "Santa Fe del Montseny", nameWithArticle: "Santa Fe del Montseny", prepositionalName: "a Santa Fe del Montseny", typeLabel: "vall",
    mapCentre: [2.4635, 41.773],
    description: "Vall alta i humida del massís, coneguda per la fageda i pels ambients frescos que envolten Santa Fe.",
    landscape: "La fageda, la fullaraca i les obagues encaixen amb espècies que necessiten humitat sostinguda. Les activitats del parc han documentat una llarga tradició de descoberta de bolets en aquest entorn.",
    source: { title: "Parc Natural del Montseny — itineraris de bolets", url: "https://parcs.diba.cat/documents/75109/15894267/p03d112.pdf" },
    resources: [
      { label: "Espai natural", title: "Centre d’informació Can Casades", url: "https://parcs.diba.cat/ca/web/equipaments/detall-equipament/-/contingut/155678/centre-d-informacio-can-casades" },
      { label: "Context territorial", title: "Parc Natural del Montseny", url: "https://parcs.diba.cat/web/montseny" },
    ],
  },
  {
    areaSlug: "montseny", slug: "el-brull", name: "El Brull", nameWithArticle: "el Brull", prepositionalName: "al Brull", typeLabel: "municipi",
    mapCentre: [2.3052, 41.8168],
    description: "Municipi del Montseny occidental amb pinedes, alzinars i una transició marcada entre vessants mediterranis i ambients de muntanya.",
    landscape: "El parc hi organitza activitats de descoberta dels bolets. Les pinedes fresques i els sectors protegits poden conservar la humitat necessària per als camagrocs.",
    source: { title: "Parc Natural del Montseny — els bolets al Brull", url: "https://parcs.diba.cat/ca/web/agenda/-/montseny-els-bolets-amb-uns-altres-ulls-al-brull-1" },
    resources: [
      { label: "Rutes i patrimoni", title: "Llocs d’interès del Brull", url: "https://www.elbrull.cat/turisme/llocs-dinteres" },
      { label: "Rutes i patrimoni", title: "Rutes del Brull", url: "https://www.elbrull.cat/turisme/rutes" },
    ],
  },
  {
    areaSlug: "montseny", slug: "viladrau", name: "Viladrau", nameWithArticle: "Viladrau", prepositionalName: "a Viladrau", typeLabel: "municipi",
    mapCentre: [2.3907, 41.8483],
    description: "Municipi del vessant nord del Montseny, amb castanyedes, alzinars frescals, rouredes i proximitat a les fagedes del massís.",
    landscape: "Els boscos amb fullaraca profunda i les obagues poden encaixar amb les trompetes de la mort quan la tardor manté una humitat alta i sense gelades persistents.",
    source: { title: "Patrimoni cultural immaterial del Montseny", url: "https://parcs.diba.cat/es/web/el-patrimoni-cultural-immaterial-del-montseny/inventari/detall/-/contingut/29193465/sabers-relacionats-amb-l-alimentacio-recol-leccio-i-consum-de-bolets" },
    resources: [
      { label: "Turisme local", title: "Informació turística de Viladrau", url: "https://www.viladrau.cat/en/tourism/tourist-information" },
      { label: "Context territorial", title: "Viladrau a Osona Turisme", url: "https://osonaturisme.cat/descobreix-osona/viladrau/" },
    ],
  },
  {
    areaSlug: "cerdanya", slug: "bellver-de-cerdanya", name: "Bellver de Cerdanya", nameWithArticle: "Bellver de Cerdanya", prepositionalName: "a Bellver de Cerdanya", typeLabel: "municipi",
    mapCentre: [1.7745, 42.3702],
    description: "Municipi de la Cerdanya situat entre el fons de vall i els vessants forestals del Cadí-Moixeró.",
    landscape: "Les pinedes montanes i els boscos de coníferes poden encaixar amb els ceps de pi, especialment en orientacions fresques i sòls àcids que mantenen humitat.",
    source: { title: "Visit Pirineus — Cerdanya", url: "https://visitpirineus.com/en/destinations/cerdanya" },
    resources: [
      { label: "Turisme local", title: "Turisme de Bellver de Cerdanya", url: "https://www.bellver.org/turisme" },
      { label: "Rutes i patrimoni", title: "Què visitar a Bellver", url: "https://www.bellver.org/turisme/que-visitar" },
    ],
  },
  {
    areaSlug: "ports", slug: "horta-de-sant-joan", name: "Horta de Sant Joan", nameWithArticle: "Horta de Sant Joan", prepositionalName: "a Horta de Sant Joan", typeLabel: "municipi",
    mapCentre: [0.3154, 40.9555],
    description: "Municipi de la Terra Alta als peus dels Ports, amb accés a un paisatge de pinedes mediterrànies, pinasses, cingleres calcàries i un gradient de cota molt marcat.",
    landscape: "Les pinedes de pi blanc de les cotes baixes i les de pinassa dels sectors més alts ofereixen contextos diferents per als lactaris. El substrat i la humitat efectiva són imprescindibles per separar compatibilitat ecològica de simple presència de pins.",
    source: { title: "Parc Natural dels Ports — Horta de Sant Joan", url: "https://parcsnaturals.gencat.cat/ca/xarxa-de-parcs/ports/gaudeix-del-parc/guia-de-visita/pobles/" },
    resources: [
      { label: "Turisme local", title: "Turisme d’Horta de Sant Joan", url: "https://turismehortadesantjoan.cat/" },
      { label: "Espai natural", title: "Ambients del Parc Natural dels Ports", url: "https://parcsnaturals.gencat.cat/ca/xarxa-de-parcs/ports/el-parc/patrimoni-natural-i-cultural/ambients/" },
    ],
  },
  {
    areaSlug: "prades", slug: "prades", name: "Prades", nameWithArticle: "Prades", prepositionalName: "a Prades", typeLabel: "municipi",
    mapCentre: [0.9866, 41.3123],
    description: "Vila vermella de l’altiplà de les Muntanyes de Prades, envoltada de pinedes de pi roig i pinassa sobre relleus calcaris d’entre 900 i 1.200 metres.",
    landscape: "L’altiplà combina pinedes obertes, rouredes i pastures on la tradició del rovelló és part de la identitat local. La cota alta suavitza les temperatures de tardor, però el vent hi asseca ràpidament la capa superficial del sòl.",
    source: { title: "Ajuntament de Prades", url: "https://www.prades.cat/" },
    resources: [
      { label: "Turisme local", title: "Turisme de Prades", url: "https://prades.cat/turisme/" },
      { label: "Turisme local", title: "Oficina de Turisme de Prades", url: "https://prades.cat/turisme/oficina-de-turisme/" },
    ],
  },
  {
    areaSlug: "prades", slug: "bosc-de-poblet", name: "Bosc de Poblet", nameWithArticle: "el bosc de Poblet", prepositionalName: "al bosc de Poblet", typeLabel: "paratge",
    mapCentre: [1.06, 41.36],
    description: "Vessant nord de les Muntanyes de Prades protegit com a paratge natural, amb rouredes, alzinars muntanyencs i pinedes que conserven bé la humitat.",
    landscape: "L’obaga del massís acumula fondalades frescos i sòls profunds, amb l’única roureda de roure reboll de Catalunya. Els ambients ombrívols allarguen les finestres de tardor respecte de l’altiplà veí.",
    source: { title: "Paratge Natural d’Interès Nacional de Poblet", url: "https://parcsnaturals.gencat.cat/ca/xarxa-de-parcs/poblet/" },
    resources: [
      { label: "Rutes i patrimoni", title: "Itineraris del Paratge de Poblet", url: "https://parcsnaturals.gencat.cat/ca/xarxa-de-parcs/poblet/gaudeix-del-paratge/equipaments-i-itineraris/itineraris/" },
      { label: "Rutes i patrimoni", title: "Itinerari geològic del bosc de Poblet", url: "https://parcsnaturals.gencat.cat/ca/xarxa-de-parcs/poblet/gaudeix-del-paratge/equipaments-i-itineraris/itineraris/itinerari-geologic-del-bosc-de-poblet/" },
    ],
  },
  {
    areaSlug: "solsones", slug: "port-del-comte", name: "Port del Comte", nameWithArticle: "el Port del Comte", prepositionalName: "al Port del Comte", typeLabel: "paratge",
    mapCentre: [1.558, 42.176],
    description: "Massís calcari del nord del Solsonès que s’enfila per sobre dels 2.300 metres, amb pinedes extenses de pi roig i pi negre a les cotes mitjanes i altes.",
    landscape: "És un dels sectors boletaires més coneguts del Prepirineu. Les pinedes montanes conserven humitat a les obagues, però la cota i el vent poden tancar la temporada d’un dia per l’altre a la tardor avançada.",
    source: { title: "Port del Comte — estació de muntanya", url: "https://www.portdelcomte.net/" },
    resources: [
      { label: "Turisme local", title: "La Vall de Lord", url: "https://lavalldelord.com/" },
      { label: "Context territorial", title: "Turisme Solsonès", url: "https://turismesolsones.com/" },
    ],
  },
  {
    areaSlug: "solsones", slug: "sant-llorenc-de-morunys", name: "Sant Llorenç de Morunys", nameWithArticle: "Sant Llorenç de Morunys", prepositionalName: "a Sant Llorenç de Morunys", typeLabel: "municipi",
    mapCentre: [1.5936, 42.1394],
    description: "Municipi de la vall de Lord, entre serres calcàries i pinedes de pi roig i pinassa que pugen des del pantà de la Llosa del Cavall cap al Port del Comte.",
    landscape: "La vall tancada concentra contrastos forts entre solells i obagues. Les pinedes fresques de la capçalera responen millor a les pluges de tardor que els vessants oberts i ventejats de l’altiplà solsoní.",
    source: { title: "Turisme Solsonès", url: "https://turismesolsones.com/" },
    resources: [
      { label: "Turisme local", title: "La Vall de Lord", url: "https://lavalldelord.com/" },
      { label: "Turisme local", title: "Oficina de Turisme de la Vall de Lord", url: "https://www.catalunya.com/es/continguts/experiencies-turistiques/oficina-de-turismo-de-vall-de-lord-20-2-490522" },
    ],
  },
  {
    areaSlug: "guilleries", slug: "sant-hilari-sacalm", name: "Sant Hilari Sacalm", nameWithArticle: "Sant Hilari Sacalm", prepositionalName: "a Sant Hilari Sacalm", typeLabel: "municipi",
    mapCentre: [2.5044, 41.8781],
    description: "Capital de les Guilleries, envoltada de castanyedes, alzinars frescals i pinedes humides sobre sòls granítics d’entre 600 i 1.000 metres.",
    landscape: "La vila de les cent fonts concentra una de les cultures boletaires més vives del país. Les castanyedes i els boscos enclotats mantenen humitat persistent i allarguen la temporada quan la tardor és regular.",
    source: { title: "Les Guilleries km0 — turisme de Sant Hilari Sacalm", url: "https://lesguillerieskm0.cat/" },
    resources: [
      { label: "Turisme local", title: "Oficina de Turisme de Sant Hilari Sacalm", url: "https://www.santhilari.cat/viusanthilari/oficina-de-turisme/" },
      { label: "Espai natural", title: "Espai Natural de les Guilleries-Savassona", url: "https://parcs.diba.cat/web/guilleries" },
    ],
  },
  {
    areaSlug: "guilleries", slug: "osor", name: "Osor", nameWithArticle: "Osor", prepositionalName: "a Osor", typeLabel: "municipi",
    mapCentre: [2.547, 41.945],
    description: "Municipi de la vall de la riera d’Osor, al cor forestal de les Guilleries, entre castanyedes, alzinars i vessants enclotats que baixen cap a Susqueda.",
    landscape: "És un dels racons més humits i boscosos del massís. Les fondalades ombrívoles i la fullaraca profunda conserven l’aigua de les pluges de tardor força més temps que els vessants oberts.",
    source: { title: "Espai Natural de les Guilleries-Savassona", url: "https://parcs.diba.cat/web/guilleries" },
    resources: [
      { label: "Turisme local", title: "Què fer a Osor", url: "https://www.osor.cat/que-fer-a-osor/" },
      { label: "Rutes i patrimoni", title: "Senderisme a Osor", url: "https://www.osor.cat/que-fer-a-osor/activitats/senderisme/" },
    ],
  },
  {
    areaSlug: "montnegre-corredor", slug: "vallgorguina", name: "Vallgorguina", nameWithArticle: "Vallgorguina", prepositionalName: "a Vallgorguina", typeLabel: "municipi",
    mapCentre: [2.5106, 41.6467],
    description: "Municipi del Vallès Oriental a cavall del Montnegre i el Corredor, amb alzinars, suredes i pinedes mediterrànies que pugen dels fondals cap a les carenes.",
    landscape: "El parc hi manté un mosaic forestal dens a tocar de l’àrea metropolitana. Les obagues del Montnegre conserven humitat més temps que els vessants marítims, i la tardor hi arriba abans que a la costa.",
    source: { title: "Parc del Montnegre i el Corredor", url: "https://parcs.diba.cat/web/montnegre" },
    resources: [
      { label: "Rutes i patrimoni", title: "Llocs d’interès de Vallgorguina", url: "https://www.vallgorguina.cat/el-municipi/informacio-del-municipi/llocs-dinteres" },
      { label: "Context territorial", title: "Vallgorguina al Vallès Oriental", url: "https://www.vallesoriental.cat/la-comarca/els-municipis/vallgorguina.html" },
    ],
  },
  {
    areaSlug: "garrotxa", slug: "vall-den-bas", name: "Vall d’en Bas", nameWithArticle: "la Vall d’en Bas", prepositionalName: "a la Vall d’en Bas", typeLabel: "vall",
    mapCentre: [2.4333, 42.1167],
    description: "Vall agrícola i forestal del sud-oest de la Garrotxa, tancada per les fagedes i pinedes que pugen cap al Puigsacalm i el collsacabra.",
    landscape: "Els vessants humits que envolten el pla combinen fagedes, rouredes i pinedes de pi roig. La pluja abundant de la comarca hi manté sòls profunds i frescos que responen bé a les tardors regulars.",
    source: { title: "OH! Garrotxa — turisme de la Garrotxa", url: "https://ohgarrotxa.com/" },
    resources: [
      { label: "Turisme local", title: "Turisme de la Vall d’en Bas", url: "https://vallbas.cat/turisme/" },
      { label: "Espai natural", title: "Parc Natural de la Zona Volcànica de la Garrotxa", url: "https://parcsnaturals.gencat.cat/ca/xarxa-de-parcs/garrotxa/" },
    ],
  },
  {
    areaSlug: "garrotxa", slug: "santa-pau", name: "Santa Pau", nameWithArticle: "Santa Pau", prepositionalName: "a Santa Pau", typeLabel: "municipi",
    mapCentre: [2.5702, 42.1447],
    description: "Municipi medieval del cor de la zona volcànica, entre la fageda d’en Jordà, els volcans coberts de bosc i les rouredes humides de la vall de Ser.",
    landscape: "Les fagedes sobre colades de lava i els sòls volcànics profunds retenen la humitat de manera excepcional. És un dels paisatges forestals més estables de la comarca davant els episodis secs curts.",
    source: { title: "Parc Natural de la Zona Volcànica de la Garrotxa", url: "https://parcsnaturals.gencat.cat/ca/xarxa-de-parcs/garrotxa/" },
    resources: [
      { label: "Turisme local", title: "Turisme de Santa Pau", url: "https://santapau.cat/turisme/" },
      { label: "Rutes i patrimoni", title: "Llocs d’interès de Santa Pau", url: "https://santapau.cat/turisme/llocs-dinteres/" },
    ],
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
    areaSlug: "ripolles", placeSlug: "sant-pau-de-seguries", speciesSlug: "trompetes-de-la-mort", speciesId: "craterellus-cornucopioides", searchName: "trompetes de la mort", titlePhrase: "Trompetes de la mort a Sant Pau de Segúries",
    introduction: "Les fagedes i els boscos humits de Sant Pau de Segúries coincideixen amb l’ecologia general de la trompeta de la mort. La guia descriu hàbitat potencial a escala municipal: no confirma exemplars ni revela cap punt de recol·lecció.",
    habitatNote: "Les obagues amb faig o roure, fullaraca madura i humitat persistent són els ambients més compatibles. La transició forestal del Capsacosta pot crear contrastos molt locals, i la presència de bosc per si sola no substitueix les condicions de sòl i drenatge.",
    seasonNote: "La finestra principal se situa a la tardor, sobretot entre octubre i novembre, després d’una rehidratació sostinguda de la fullaraca. Una nova sequera, el vent sec o les gelades persistents poden interrompre-la ràpidament.",
  },
  {
    areaSlug: "ripolles", placeSlug: "sant-pau-de-seguries", speciesSlug: "rossinyols", speciesId: "cantharellus-cibarius", searchName: "rossinyols", titlePhrase: "Rossinyols a Sant Pau de Segúries",
    introduction: "Les fagedes, els boscos ombrívols i els ambients humits de Sant Pau de Segúries poden contenir sectors compatibles amb el rossinyol. Aquesta lectura ecològica no confirma presència ni identifica cap lloc de recol·lecció.",
    habitatNote: "Els vessants frescos amb faig o roure, sòl àcid o descarbonatat, humus ric i bon drenatge encaixen millor amb l’espècie. Les obagues poden conservar la humitat més temps, però un episodi sec o ventós torna insuficient una pluja aïllada.",
    seasonNote: "El potencial general va de finals d’estiu fins al novembre i acostuma a culminar a l’octubre. Les pluges regulars i les nits fresques afavoreixen la resposta; la calor, el vent sec o una gelada primerenca la poden frenar.",
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
  {
    areaSlug: "prades", placeSlug: "prades", speciesSlug: "rovellons", speciesId: "lactarius-sanguifluus", searchName: "rovellons", titlePhrase: "Rovellons a Prades",
    introduction: "El rovelló és el bolet més buscat de les Muntanyes de Prades i forma part de la identitat gastronòmica de la vila. Les pinedes calcàries de l’altiplà poden ser compatibles amb la seva ecologia, però aquesta guia descriu hàbitat potencial i no confirma presència ni assenyala cap punt de recol·lecció.",
    habitatNote: "El rovelló vinós s’associa als pins sobre sòls calcaris o neutres, ben drenats i amb humitat moderada: exactament el perfil dominant de l’altiplà de Prades. Les pinedes de pinassa i pi roig obertes encaixen millor que els sectors densos, i l’orientació separa molt els vessants que conserven l’aigua dels que l’evaporen.",
    seasonNote: "La tardor concentra la finestra principal, habitualment entre octubre i novembre. A la cota de l’altiplà, les nits fresques afavoreixen la resposta després d’una pluja efectiva, però el vent persistent o una gelada primerenca poden escurçar-la de manera brusca.",
  },
  {
    areaSlug: "prades", placeSlug: "prades", speciesSlug: "pinetells", speciesId: "lactarius-deliciosus", searchName: "pinetells i rovellons", titlePhrase: "Pinetells (rovellons) a Prades",
    introduction: "A les Muntanyes de Prades, una part del que popularment es ven i es cerca com a rovelló correspon al pinetell de làtex taronja. Les pinedes montanes de l’altiplà poden oferir hàbitat compatible, però la guia no garanteix presència ni revela localitzacions sensibles.",
    habitatNote: "El pinetell necessita pins i prefereix pinassa humida sobre sòls ben drenats, dels àcids als neutres. A Prades, els sectors on la pinassa es manté humida uns quants dies —fondalades, marges protegits, obagues suaus— són els que encaixen millor amb el seu perfil.",
    seasonNote: "El potencial va de setembre a novembre, amb un màxim general a l’octubre. La pluja ha d’humitejar la pinassa en profunditat; el vent de l’altiplà i les primeres gelades poden aturar la resposta encara que el sòl hagi quedat moll.",
  },
  {
    areaSlug: "prades", placeSlug: "prades", speciesSlug: "carlets", speciesId: "hygrophorus-russula", searchName: "carlets", titlePhrase: "Carlets a Prades",
    introduction: "El carlet és un clàssic de la cultura boletaire de les muntanyes tarragonines i pot trobar hàbitat compatible als boscos de l’entorn de Prades. Aquesta lectura ecològica descriu compatibilitat d’ambient, no presència confirmada ni cap indicació de lloc.",
    habitatNote: "El carlet s’associa sobretot a alzinars i rouredes sobre sòls calcaris, ben drenats i encara temperats a la tardor. A l’altiplà i els vessants de Prades, els boscos de planifolis amb fullaraca fina i sòl eixut en superfície però fresc en fondària són els més compatibles.",
    seasonNote: "La finestra habitual va d’octubre a desembre, més tardana que la del rovelló. Tolera bé la tardor avançada mentre no arribin gelades fortes, però necessita que el sòl mantingui una humitat de fons real.",
  },
  {
    areaSlug: "prades", placeSlug: "bosc-de-poblet", speciesSlug: "ceps", speciesId: "boletus-edulis", searchName: "ceps", titlePhrase: "Ceps al bosc de Poblet",
    introduction: "L’obaga del bosc de Poblet combina rouredes, castanyedes i pinedes fresques que poden encaixar amb l’ecologia del cep. La guia descriu potencial d’hàbitat dins d’un paratge protegit i no confirma presència ni assenyala cap indret concret.",
    habitatNote: "El cep prefereix boscos madurs sobre sòls àcids o descarbonatats, frescos i ben drenats. Al vessant nord de les Muntanyes de Prades, les rouredes ombrívoles i els sòls silícics del paratge ofereixen el perfil més compatible, lluny dels sectors calcaris i assolellats de l’altiplà.",
    seasonNote: "El potencial principal va de finals d’estiu fins al novembre, amb un màxim habitual a l’octubre. L’obaga allarga la finestra respecte dels solells, però cal pluja repartida i nits fresques perquè la resposta arribi a produir-se.",
  },
  {
    areaSlug: "prades", placeSlug: "bosc-de-poblet", speciesSlug: "trompetes-de-la-mort", speciesId: "craterellus-cornucopioides", searchName: "trompetes de la mort", titlePhrase: "Trompetes de la mort al bosc de Poblet",
    introduction: "La fullaraca profunda de les rouredes i castanyedes del bosc de Poblet pot coincidir amb l’ecologia de la trompeta de la mort. La seva distribució és irregular i críptica, i aquesta guia no confirma presència ni revela sectors concrets del paratge.",
    habitatNote: "La trompeta busca boscos ombrívols de planifolis amb fullaraca humida i sòls frescos, sense entollaments. Les fondalades i els peus de vessant de l’obaga, on la humitat es conserva dies després de la pluja, són els ambients potencialment més compatibles del paratge.",
    seasonNote: "La tardor plujosa és la seva finestra, sobretot entre octubre i novembre. Necessita humitat mantinguda: una represa de la sequera o un episodi de vent sec poden tallar l’activitat encara que el bosc sembli fresc.",
  },
  {
    areaSlug: "prades", placeSlug: "bosc-de-poblet", speciesSlug: "camagrocs", speciesId: "craterellus-lutescens", searchName: "camagrocs", titlePhrase: "Camagrocs al bosc de Poblet",
    introduction: "Els racons més humits del bosc de Poblet poden contenir microhàbitats compatibles amb el camagroc, especialment sota les pinedes fresques de l’obaga. La guia expressa compatibilitat ecològica i no garanteix fructificació ni identifica indrets.",
    habitatNote: "El camagroc encaixa en sòls molsosos i humits sota coníferes o boscos mixtos, amb humus ben format i ombra constant. Al paratge, les fondalades amb molsa i els marges de torrentera que no s’assequen entre pluges són el perfil més favorable.",
    seasonNote: "El potencial es concentra a la tardor avançada, entre octubre i desembre si no arriben gelades fortes. La constància de la humitat pesa més que la quantitat de pluja d’un sol episodi.",
  },
  {
    areaSlug: "solsones", placeSlug: "port-del-comte", speciesSlug: "ceps", speciesId: "boletus-edulis", searchName: "ceps", titlePhrase: "Ceps al Port del Comte",
    introduction: "Les pinedes montanes del Port del Comte són un dels escenaris boletaires més coneguts del Prepirineu i poden encaixar amb l’ecologia del cep. Aquesta guia llegeix el potencial d’hàbitat del massís i no confirma presència ni assenyala cap sector concret.",
    habitatNote: "El cep prefereix pinedes de pi roig i pi negre fresques, amb sòl profund i ben drenat que conservi la humitat de fons. A la muntanya calcària, els sectors amb sòls descarbonatats i molsa a les obagues encaixen millor que les carenes primes i ventejades.",
    seasonNote: "La finestra sol començar a finals d’estiu a les cotes altes i baixa amb la tardor. Les nits fresques després d’una pluja ben repartida són el senyal més favorable; les gelades fermes de novembre acostumen a tancar la temporada.",
  },
  {
    areaSlug: "solsones", placeSlug: "port-del-comte", speciesSlug: "pinetells", speciesId: "lactarius-deliciosus", searchName: "rovellons i pinetells", titlePhrase: "Pinetells (rovellons) al Port del Comte",
    introduction: "Al Solsonès, la cerca popular de rovellons correspon en gran part al pinetell de làtex taronja, i el Port del Comte n’és un dels territoris amb més tradició. Les pinedes del massís poden ser-hi compatibles, però la guia no confirma presència ni revela punts sensibles.",
    habitatNote: "El pinetell s’associa als pins i respon millor on la pinassa es manté humida amb bon drenatge. Als vessants del Port del Comte, les pinedes mitjanes i les fondalades protegides conserven la humitat més temps que les clarianes altes exposades al vent.",
    seasonNote: "El potencial va de setembre a novembre segons la cota, amb el màxim habitual a l’octubre. A la part alta la temporada s’avança i s’escurça; les primeres gelades fermes n’aturen la resposta.",
  },
  {
    areaSlug: "solsones", placeSlug: "port-del-comte", speciesSlug: "fredolics", speciesId: "tricholoma-terreum", searchName: "fredolics", titlePhrase: "Fredolics al Port del Comte",
    introduction: "Les pinedes fresques del Port del Comte poden coincidir amb l’ecologia del fredolic quan la tardor ja és freda. La semblança amb tricolomes tòxics exigeix identificació experta, i aquesta guia no confirma presència ni indica llocs de recol·lecció.",
    habitatNote: "El fredolic fructifica en sòls de pineda amb pinassa fina i bon drenatge, tolerant sòls més pobres que altres espècies. Als vessants del massís, els marges de pineda i els sectors oberts poden respondre si el vent no els asseca immediatament després de la pluja.",
    seasonNote: "És espècie de tardor avançada: la finestra habitual va d’octubre a desembre, amb màxim al novembre. El fred moderat la manté activa, però les gelades contínues i la neu primerenca de la cota alta la tanquen.",
  },
  {
    areaSlug: "solsones", placeSlug: "sant-llorenc-de-morunys", speciesSlug: "ceps", speciesId: "boletus-edulis", searchName: "ceps", titlePhrase: "Ceps a Sant Llorenç de Morunys",
    introduction: "Les pinedes que envolten la vall de Lord poden oferir hàbitat compatible amb el cep, sobretot als vessants frescos que pugen cap al Port del Comte. La guia descriu compatibilitat ecològica i no confirma presència ni cap indret concret.",
    habitatNote: "El cep encaixa en pinedes i boscos mixtos madurs amb sòl fresc, profund i ben drenat. A la vall tancada, les obagues i fondalades conserven la humitat de les pluges força més temps que els solells oberts de l’altiplà solsoní.",
    seasonNote: "El potencial s’estén de finals d’estiu fins al novembre, amb el màxim habitual a l’octubre. La pluja repartida i les nits fresques de la vall afavoreixen la resposta; el vent sec o una gelada ferma la interrompen.",
  },
  {
    areaSlug: "solsones", placeSlug: "sant-llorenc-de-morunys", speciesSlug: "llenegues", speciesId: "hygrophorus-latitabundus", searchName: "llenegues", titlePhrase: "Llenegues a Sant Llorenç de Morunys",
    introduction: "La llenega negra és un dels bolets més apreciats de la cuina solsonina i les pinedes calcàries de la vall de Lord poden encaixar amb la seva ecologia. Aquesta lectura descriu hàbitat potencial i no confirma presència ni revela sectors concrets.",
    habitatNote: "La llenega negra s’associa als pins sobre sòls calcaris o neutres, un perfil molt present als vessants de la vall. Els sectors de pinassa i pi roig amb sòl fresc i bon drenatge encaixen millor, especialment on la humitat de fons persisteix entre pluges.",
    seasonNote: "És espècie de tardor plena i avançada, habitualment d’octubre a desembre. Tolera el fred moderat millor que altres espècies, però necessita pluges prèvies generoses i pateix amb el vent assecant de la vall.",
  },
  {
    areaSlug: "solsones", placeSlug: "sant-llorenc-de-morunys", speciesSlug: "pinetells", speciesId: "lactarius-deliciosus", searchName: "rovellons i pinetells", titlePhrase: "Pinetells (rovellons) a Sant Llorenç de Morunys",
    introduction: "A la vall de Lord, els rovellons que centren la temporada boletaire corresponen majoritàriament al pinetell de làtex taronja. Les pinedes de la vall poden ser-hi compatibles, però la guia no garanteix presència ni assenyala localitzacions sensibles.",
    habitatNote: "El pinetell necessita pins amb pinassa humida i bon drenatge, dels sòls àcids als neutres. A la vall, els marges de pineda protegits del vent i les fondalades que no s’entollen són els sectors amb el perfil més favorable.",
    seasonNote: "La finestra general va de setembre a novembre amb màxim a l’octubre. La pinassa ha de conservar la humitat uns quants dies seguits; una represa seca o les primeres gelades fermes n’aturen el desenvolupament.",
  },
  {
    areaSlug: "guilleries", placeSlug: "sant-hilari-sacalm", speciesSlug: "ceps", speciesId: "boletus-edulis", searchName: "ceps", titlePhrase: "Ceps a Sant Hilari Sacalm",
    introduction: "Les castanyedes i els boscos frescos que envolten Sant Hilari Sacalm poden encaixar amb l’ecologia del cep, en un dels territoris amb més cultura boletaire del país. La guia descriu potencial d’hàbitat i no confirma presència ni indica cap bosc concret.",
    habitatNote: "El cep prefereix boscos madurs sobre sòls àcids —castanyedes, rouredes, pinedes humides— amb humitat de fons i bon drenatge. El substrat granític de les Guilleries i el relleu enclotat que reté la humitat componen un perfil especialment compatible.",
    seasonNote: "El potencial s’estén de finals d’estiu fins al novembre, amb màxim habitual a l’octubre. La humitat persistent del massís allarga les finestres respecte de territoris més secs, sempre que la tardor porti pluges regulars.",
  },
  {
    areaSlug: "guilleries", placeSlug: "sant-hilari-sacalm", speciesSlug: "rossinyols", speciesId: "cantharellus-cibarius", searchName: "rossinyols", titlePhrase: "Rossinyols a Sant Hilari Sacalm",
    introduction: "Els boscos humits de l’entorn de Sant Hilari Sacalm poden coincidir amb l’ecologia del rossinyol, un dels bolets més constants de les Guilleries. Aquesta lectura expressa compatibilitat ambiental i no garanteix presència ni fructificació actual.",
    habitatNote: "El rossinyol encaixa en castanyedes, rouredes i pinedes fresques sobre sòls àcids amb humus ben format. Les obagues i els fondals molsosos del massís, on la capa superficial no s’asseca entre pluges, són els ambients potencialment més favorables.",
    seasonNote: "La finestra és llarga: de finals de primavera fins a la tardor en anys humits, amb el gruix entre setembre i novembre. Les pluges regulars el mantenen actiu; els episodis secs curts el frenen sense tancar-lo del tot.",
  },
  {
    areaSlug: "guilleries", placeSlug: "sant-hilari-sacalm", speciesSlug: "camagrocs", speciesId: "craterellus-lutescens", searchName: "camagrocs", titlePhrase: "Camagrocs a Sant Hilari Sacalm",
    introduction: "Les pinedes humides i els racons molsosos de les Guilleries poden contenir microhàbitats compatibles amb el camagroc a l’entorn de Sant Hilari Sacalm. La guia descriu aquesta compatibilitat i no assenyala indrets ni confirma presència.",
    habitatNote: "El camagroc busca sòls àcids coberts de molsa sota coníferes o boscos mixtos, amb ombra i humitat constants. Els fondals enclotats del massís, que conserven l’aigua durant setmanes, ofereixen el perfil més compatible del territori.",
    seasonNote: "És bolet de tardor avançada: el potencial va d’octubre a desembre mentre no gelí amb força. La constància de la humitat compta més que la intensitat d’una sola pluja.",
  },
  {
    areaSlug: "guilleries", placeSlug: "osor", speciesSlug: "trompetes-de-la-mort", speciesId: "craterellus-cornucopioides", searchName: "trompetes de la mort", titlePhrase: "Trompetes de la mort a Osor",
    introduction: "Les castanyedes i els alzinars ombrívols de la vall d’Osor poden coincidir amb l’ecologia de la trompeta de la mort. El seu color fosc la fa difícil de veure i la distribució és irregular: la guia no confirma presència ni revela sectors concrets.",
    habitatNote: "La trompeta prefereix boscos de planifolis amb fullaraca profunda i humida, en obagues i fondals que no s’assequen. Els vessants enclotats de la riera d’Osor, amb ombra contínua i sòls frescos, són el perfil més compatible del municipi.",
    seasonNote: "La tardor plujosa concentra la finestra, sobretot entre octubre i novembre. Necessita humitat sostinguda durant setmanes; el vent sec o una represa de la sequera aturen l’activitat ràpidament.",
  },
  {
    areaSlug: "guilleries", placeSlug: "osor", speciesSlug: "camagrocs", speciesId: "craterellus-lutescens", searchName: "camagrocs", titlePhrase: "Camagrocs a Osor",
    introduction: "Els fondals humits i molsosos de la vall d’Osor poden oferir microhàbitats compatibles amb el camagroc, en ple cor forestal de les Guilleries. Aquesta lectura ecològica no garanteix fructificació ni identifica cap indret de recol·lecció.",
    habitatNote: "El camagroc encaixa en sòls àcids amb molsa i humus, sota pinedes humides o boscos mixtos ombrívols. Els marges de torrentera i les fondalades que conserven aigua entre pluges componen el perfil més favorable de la vall.",
    seasonNote: "El potencial es concentra entre octubre i desembre, mentre les gelades no siguin persistents. La humitat contínua és el factor decisiu, per davant de la quantitat de pluja d’un episodi concret.",
  },
  {
    areaSlug: "montnegre-corredor", placeSlug: "vallgorguina", speciesSlug: "rovellons", speciesId: "lactarius-sanguifluus", searchName: "rovellons", titlePhrase: "Rovellons a Vallgorguina",
    introduction: "Les pinedes mediterrànies del Montnegre i el Corredor poden coincidir amb l’ecologia del rovelló vinós a l’entorn de Vallgorguina, el territori boletaire més proper a Barcelona. La guia descriu hàbitat potencial i no confirma presència ni assenyala punts de recol·lecció.",
    habitatNote: "El rovelló s’associa als pins sobre sòls ben drenats amb humitat moderada. Al parc, les pinedes de pi pinyer i pi blanc dels vessants baixos i mitjans encaixen millor on el sòl no és massa àcid, i les obagues conserven la humitat més temps que el vessant marítim.",
    seasonNote: "La tardor és la finestra principal, sovint més tardana que a la muntanya interior: d’octubre fins a principis de desembre en anys suaus. Cal pluja efectiva de tardor; la calor residual i el vent de mar poden retardar o interrompre la resposta.",
  },
  {
    areaSlug: "montnegre-corredor", placeSlug: "vallgorguina", speciesSlug: "ceps-negres", speciesId: "boletus-aereus", searchName: "ceps negres", titlePhrase: "Ceps negres a Vallgorguina",
    introduction: "Els alzinars i suredes del Montnegre poden encaixar amb l’ecologia del cep negre, el bolet mediterrani de la família dels ceps. Aquesta lectura descriu compatibilitat d’hàbitat a l’entorn de Vallgorguina i no confirma presència ni indica cap sector concret.",
    habitatNote: "El cep negre prefereix boscos esclerofil·les temperats —alzinars, suredes i rouredes seques— sobre sòls àcids i ben drenats. Els vessants silícics del parc en són un perfil clàssic, especialment als sectors amb sòl profund i ombra parcial.",
    seasonNote: "És més termòfil que el cep de muntanya: la finestra va de finals d’estiu a la tardor, amb màxims entre setembre i octubre. Respon a pluges càlides seguides de temps temperat i s’atura amb el fred humit persistent.",
  },
  {
    areaSlug: "montnegre-corredor", placeSlug: "vallgorguina", speciesSlug: "ous-de-reig", speciesId: "amanita-caesarea", searchName: "ous de reig", titlePhrase: "Ous de reig a Vallgorguina",
    introduction: "Els alzinars i suredes assolellats del Montnegre i el Corredor poden contenir hàbitat compatible amb l’ou de reig. Els exemplars tancats es poden confondre amb amanites mortals: la identificació ha de ser experta i aquesta guia no confirma presència ni llocs.",
    habitatNote: "L’ou de reig prefereix boscos clars i temperats de planifolis mediterranis sobre sòls àcids i ben drenats. Al parc, els solells d’alzinar i sureda amb sòl silícic i clarianes hi encaixen millor que les obagues fresques del Montnegre alt.",
    seasonNote: "El potencial va de finals d’estiu a mitjan tardor, amb màxim habitual al setembre. Necessita pluja seguida de temperatures suaus; les nits fredes de la tardor avançada tanquen la finestra abans que la d’altres espècies.",
  },
  {
    areaSlug: "garrotxa", placeSlug: "vall-den-bas", speciesSlug: "ceps", speciesId: "boletus-edulis", searchName: "ceps", titlePhrase: "Ceps a la Vall d’en Bas",
    introduction: "Les fagedes i pinedes que pugen de la vall d’en Bas cap al Puigsacalm poden encaixar amb l’ecologia del cep en una de les comarques més plujoses del país. La guia llegeix potencial d’hàbitat i no confirma presència ni assenyala boscos concrets.",
    habitatNote: "El cep prefereix boscos madurs i frescos amb sòl profund i ben drenat. Els vessants humits de fageda i pi roig que tanquen la vall, amb sòls descarbonatats i fullaraca espessa, ofereixen un perfil molt més compatible que el fons agrícola del pla.",
    seasonNote: "El potencial s’estén de finals d’estiu fins al novembre, amb màxim habitual a l’octubre. La pluviometria alta de la comarca hi allarga les finestres, però les gelades primerenques dels vessants alts poden tancar-les abans que a cotes baixes.",
  },
  {
    areaSlug: "garrotxa", placeSlug: "vall-den-bas", speciesSlug: "rossinyols", speciesId: "cantharellus-cibarius", searchName: "rossinyols", titlePhrase: "Rossinyols a la Vall d’en Bas",
    introduction: "Els boscos humits que envolten la vall d’en Bas poden coincidir amb l’ecologia del rossinyol durant bona part de l’any. Aquesta lectura expressa compatibilitat ambiental de la vall i no garanteix presència ni fructificació en cap sector determinat.",
    habitatNote: "El rossinyol encaixa en fagedes, rouredes i pinedes fresques amb sòl àcid o descarbonatat i humus ben format. Les obagues del Puigsacalm i els marges de bosc amb molsa, on la humitat persisteix entre pluges, en són el perfil més favorable.",
    seasonNote: "La finestra és llarga en clima humit: de la primavera avançada fins al novembre en anys regulars, amb el gruix entre setembre i octubre. Els episodis secs el frenen temporalment sense tancar la temporada sencera.",
  },
  {
    areaSlug: "garrotxa", placeSlug: "vall-den-bas", speciesSlug: "camagrocs", speciesId: "craterellus-lutescens", searchName: "camagrocs", titlePhrase: "Camagrocs a la Vall d’en Bas",
    introduction: "Les pinedes i els boscos mixtos humits dels vessants de la vall d’en Bas poden contenir microhàbitats compatibles amb el camagroc. La distribució és irregular i aquesta guia no confirma presència ni revela localitzacions de recol·lecció.",
    habitatNote: "El camagroc busca sòls molsosos i frescos sota coníferes o boscos mixtos ombrívols. A la vall, les fondalades i els peus de vessant on la molsa es manté xopa setmanes senceres componen el perfil potencialment més compatible.",
    seasonNote: "El potencial es concentra a la tardor avançada, d’octubre a desembre si no gela amb persistència. La constància d’humitat que caracteritza la comarca juga a favor de finestres llargues.",
  },
  {
    areaSlug: "garrotxa", placeSlug: "santa-pau", speciesSlug: "trompetes-de-la-mort", speciesId: "craterellus-cornucopioides", searchName: "trompetes de la mort", titlePhrase: "Trompetes de la mort a Santa Pau",
    introduction: "La fageda d’en Jordà i les rouredes humides de Santa Pau poden coincidir amb l’ecologia de la trompeta de la mort. El seu color la camufla entre la fullaraca i la distribució és irregular: la guia no confirma presència ni assenyala sectors del parc.",
    habitatNote: "La trompeta prefereix boscos de planifolis ombrívols amb fullaraca profunda i sòl fresc. La fageda sobre colada de lava, amb sòl volcànic que reté la humitat de manera excepcional, ofereix un dels perfils més compatibles de la comarca.",
    seasonNote: "La tardor plujosa és la seva finestra, sobretot entre octubre i novembre. Necessita humitat mantinguda durant setmanes; en un any de tardor regular, la fageda pot allargar l’activitat fins a les primeres gelades fermes.",
  },
  {
    areaSlug: "garrotxa", placeSlug: "santa-pau", speciesSlug: "rossinyols", speciesId: "cantharellus-cibarius", searchName: "rossinyols", titlePhrase: "Rossinyols a Santa Pau",
    introduction: "Els boscos humits que cobreixen els volcans de Santa Pau poden encaixar amb l’ecologia del rossinyol. Aquesta lectura descriu compatibilitat d’ambient dins d’un espai natural protegit i no confirma presència ni indica cap indret concret.",
    habitatNote: "El rossinyol encaixa en fagedes, rouredes i boscos mixtos frescos amb humus ben format i sòl que no s’entolla. Els vessants volcànics boscosos, amb sòls profunds i drenatge excel·lent, ofereixen exactament aquest equilibri d’humitat i aireig.",
    seasonNote: "La finestra va de finals de primavera fins al novembre en anys humits, amb el màxim entre setembre i octubre. Les pluges regulars de la comarca l’afavoreixen; els episodis secs curts només el pausen.",
  },
];

export const areasBySlug = Object.fromEntries(areaProfiles.map((area) => [area.slug, area])) as Record<string, AreaProfile>;
const placesByPath = Object.fromEntries(placeProfiles.map((place) => [`${place.areaSlug}/${place.slug}`, place])) as Record<string, PlaceProfile>;

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

export function locationPagesForArea(areaSlug: string) {
  return speciesLocationPages.filter((page) => page.areaSlug === areaSlug);
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

/**
 * Window the area summary reads over. ~12 km beyond the union of the area's
 * documented places keeps the window at massís/comarca scale — the whole point
 * of hub-level readings is not to dilute a storm across a 200 km region.
 */
const AREA_BOUNDS_BUFFER_DEGREES = 0.14;

const cataloniaClamp: SpatialBounds = {
  west: 0.05,
  south: 40.48,
  east: 3.32,
  north: 42.92,
};

/** Same buffered window, centred on a single place (paratge-scale hubs). */
export function placeBounds(place: PlaceProfile): SpatialBounds {
  const [longitude, latitude] = place.mapCentre;
  return {
    west: Math.max(longitude - AREA_BOUNDS_BUFFER_DEGREES, cataloniaClamp.west),
    south: Math.max(latitude - AREA_BOUNDS_BUFFER_DEGREES, cataloniaClamp.south),
    east: Math.min(longitude + AREA_BOUNDS_BUFFER_DEGREES, cataloniaClamp.east),
    north: Math.min(latitude + AREA_BOUNDS_BUFFER_DEGREES, cataloniaClamp.north),
  };
}

export function areaBounds(area: AreaProfile): SpatialBounds {
  const centres = placesForArea(area.slug).map((place) => place.mapCentre);
  const longitudes = centres.map(([longitude]) => longitude);
  const latitudes = centres.map(([, latitude]) => latitude);
  return {
    west: Math.max(Math.min(...longitudes) - AREA_BOUNDS_BUFFER_DEGREES, cataloniaClamp.west),
    south: Math.max(Math.min(...latitudes) - AREA_BOUNDS_BUFFER_DEGREES, cataloniaClamp.south),
    east: Math.min(Math.max(...longitudes) + AREA_BOUNDS_BUFFER_DEGREES, cataloniaClamp.east),
    north: Math.min(Math.max(...latitudes) + AREA_BOUNDS_BUFFER_DEGREES, cataloniaClamp.north),
  };
}
