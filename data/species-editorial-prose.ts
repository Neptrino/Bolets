/**
 * Hand-written prose for the twenty most searched species (the top of
 * `speciesBySearchDemand`) and every edible species in the catalogue. Each block opens one profile section: how to
 * recognise the species in field order, the searched lookalike or safety
 * question, when and where it grows in Catalonia (answering «on trobar …»
 * with the searched plural) and how to cook and keep it, or why it must not
 * be eaten. The generated template cannot give this context.
 *
 * Every statement comes from the versioned sources: the species profile in
 * `data/species.ts`, `data/culinary-profiles.ts` and its Canal Aliments/ACSA
 * references, `/conservar-bolets`, and the zone hubs' `forests`/`seasonNotes`
 * and species-at-place guides in `data/location-pages.ts`. Descriptive
 * (reference-only) profiles carry no numeric ecology: their text keeps to the
 * sourced season and habitat and says the prediction map does not cover them. Name territories
 * and habitat, never a collection spot, and never present compatible habitat
 * as a confirmed finding. Never add symptoms, treatment or recipes that the
 * sources do not carry.
 *
 * Ranking impact is measured in `docs/species-depth-test-2026-09.md`.
 */

export interface SpeciesEditorialProse {
  /** Opens «Com reconèixer»: the traits in the order a reader checks them, from `morphology`. */
  identification: readonly string[];
  /** Replaces the «On i quan creix» H2 with the searched phrasing, e.g. "On trobar fredolics i quan surten". Omit for toxic species. */
  ecologyHeading?: string;
  /** Opens «On i quan creix»: season, habitat and the territories the zone hubs and local guides describe. */
  ecology: readonly string[];
  /** Opens «A la cuina»: uses, preparation and keeping, from `data/culinary-profiles.ts` and `/conservar-bolets`. */
  cuisine: readonly string[];
  /** Opens «Confusions»: the searched safety or naming question the species attracts. */
  lookalikes: { heading: string; text: string };
}

export const speciesEditorialProse: Record<string, SpeciesEditorialProse> = {
  "boletus-edulis": {
    ecologyHeading: "On trobar ceps i quan surten",
    identification: [
      "El cep és un bolet massís, de barret carnós i peu ventrut. El barret fa de 7 a 25 cm, és convex de jove i després s’eixampla, de color bru castany amb el marge més clar. Gira’l: per sota no té làmines, sinó porus, blancs de jove, després grocs i finalment olivacis. El peu és gruixut i clar, sovint amb un reticle blanc a la part de dalt. Talla’l: la carn és blanca i no canvia de color. L’olor és suau i agradable, i la carn és ferma de jove i més esponjosa amb l’edat.",
      "La pluja enfosqueix el barret, i els exemplars madurs tenen els porus olivacis i la carn més tova: per això, el color del barret enganya. Comprova en cada exemplar els porus clars, el reticle blanc i la carn que no blaveja. Cap d’aquests trets no és suficient tot sol, i la identificació és de dificultat mitjana.",
    ],
    lookalikes: {
      heading: "Mataparent i matagent: com no confondre’ls amb el cep",
      text: "Els dos bolets de porus que cal descartar són el mataparent i el matagent. El mataparent (Tylopilus felleus) té els porus que es tornen rosats amb l’edat, el reticle més fosc i un gust molt amarg: no és tòxic, però és incomestible. El matagent (Rubroboletus satanas) té els porus vermells, el peu groc i vermell i la carn que blaveja al tall, i és molt tòxic: pot provocar una intoxicació gastrointestinal intensa. El cep d’estiu (Boletus reticulatus) també és un comestible excel·lent; prefereix més calor i sovint té el barret més clar. No tastis mai un exemplar dubtós per identificar-lo: compara tots els trets i, si algun no encaixa, deixa’l.",
    },
    ecology: [
      "Els ceps surten del final de l’estiu a la tardor: el calendari va d’agost a novembre, amb el pic a l’octubre, i el setembre i el novembre també són bons mesos. Creixen en fagedes, avetoses, rouredes i pinedes de muntanya, sobretot amb faig, avet, roure i pi roig, entre 400 i 1.900 metres. Busquen sòls àcids o moderadament àcids, silícics o descarbonatats, humits però ben drenats, a les obagues i als vessants frescos, als marges de bosc madur i a les clarianes protegides.",
      "Les guies de zona en descriuen l’hàbitat en moltes comarques de muntanya. Al Montseny, les castanyedes i rouredes de Viladrau i la fageda de Santa Fe; a les Guilleries, les castanyedes i pinedes de l’entorn de Sant Hilari Sacalm, sobre sòls granítics; a la Garrotxa, les fagedes i pinedes de pi roig que tanquen la vall d’en Bas; al Solsonès, les obagues fresques de la vall de Lord i les pinedes del Port del Comte; al Berguedà, Castellar de n’Hug i els Rasos de Peguera; i també al Ripollès, a la Cerdanya i a l’obaga del bosc de Poblet, a Prades. Són zones amb hàbitat compatible, no punts de collida.",
      "Els ceps necessiten que el sòl s’hagi rehidratat de debò: la pluja repartida del final de l’estiu i de la tardor, seguida de temperatures suaus (entre 10 i 19 °C) i de nits fresques, els afavoreix més que un xàfec aïllat, i poden trigar de dies a setmanes a sortir. A la muntanya, la temporada comença abans a les cotes altes i baixa vall avall. La calor, el vent sec o una nova sequera la interrompen, i les gelades l’aturen; tot plegat varia molt segons el massís i l’any.",
    ],
    cuisine: [
      "El cep és un dels comestibles excel·lents segons la Societat Catalana de Micologia, sobretot quan és jove, ferm i sense larves. Té una aroma de bosc i de fruits secs, amb un punt dolç, que s’intensifica quan s’asseca, i de jove la carn és densa i sucosa. Va bé saltat breument, en arrossos, guisats i salses, i també sec i en pols.",
      "Treu-li la terra amb un raspall i no el posis en remull. Retira’n els tubs si són molt madurs o tous; descarta els exemplars tous, parasitats o amb l’olor alterada, i cuina’l fins que sigui ben calent per dins.",
      "A la nevera aguanta poc: l’ACSA recomana guardar els bolets entre 1 i 4 °C, millor en un recipient obert o en un cistell que en una bossa tancada, i cuinar-los d’un a tres dies després de collir-los. Per conservar-lo més temps, asseca’l tallat a llesques o congela’l després d’una cocció breu.",
    ],
  },
  "craterellus-lutescens": {
    ecologyHeading: "On trobar camagrocs i quan surten",
    identification: [
      "El camagroc es reconeix pel contrast entre un barret petit, gris bru, en forma d’embut i amb la vora ondulada, i un peu esvelt de color groc viu. Fa de 3 a 10 cm d’alçada. Talla-li el peu: ha de ser buit. Mira la cara inferior del barret: és grisenca i llisa o amb plecs molt discrets. La carn és fina i elàstica, i l’olor, suau i agradable.",
      "Quan fa humitat surt en grups nombrosos; amb sequera, els exemplars queden molt petits. El peu groc crida l’atenció, però amb això no n’hi ha prou: la cara inferior gairebé llisa i el peu buit són els trets que el separen del fals camagroc.",
    ],
    lookalikes: {
      heading: "Camagroc, fals camagroc i trompeta de la mort",
      text: "Revisa cada exemplar: el camagroc té el peu groc viu i buit i la cara inferior gairebé llisa. El fals camagroc (Craterellus tubaeformis) té els plecs més marcats i el peu menys groc, i la trompeta de la mort és més fosca i no té el peu groc. Tots tres són comestibles, però en una mateixa collita s’hi poden barrejar espècies diferents, i ni el color ni el bosc no permeten identificar-les.",
    },
    ecology: [
      "Els camagrocs surten de setembre a desembre i tenen el pic a l’octubre i el novembre. Busquen pinedes humides i boscos mixtos amb faig, entre 400 i 1.700 metres, a l’obaga: sòls àcids coberts de molsa, amb molt d’humus i ombra constant, sovint a les fondalades que conserven l’aigua entre pluja i pluja.",
      "Per això, les guies de zona en descriuen l’hàbitat a les comarques més humides: els fondals ombrívols de Sant Hilari Sacalm i Osor, a les Guilleries; els sectors frescos de Viladrau i les pinedes protegides del Brull, al Montseny; els boscos humits de la vall d’en Bas, a la Garrotxa, una de les comarques més plujoses del país; els racons humits del bosc de Poblet, a Prades; i les pinedes de muntanya de Castellar de n’Hug i els Rasos de Peguera, al Berguedà. Són zones amb hàbitat compatible, no punts de collida.",
      "Els camagrocs són dels últims bolets de la temporada i dels que més aguanten el fred: a les Guilleries i al Montseny es poden allargar fins ben entrat el desembre si no hi ha gelades fortes. Més que la quantitat d’una sola pluja, compta que la humitat duri. Una sequera curta, el vent persistent o les gelades continuades en tallen la sortida.",
    ],
    cuisine: [
      "El camagroc és petit, però té un gust afruitat i perfumat que es concentra molt quan s’asseca, i una carn prima, flexible i delicada. És bo en la truita de camagrocs, amb pasta, en arrossos i en salses, i un cop sec es pot reduir a pols per perfumar altres plats.",
      "Abans de cuinar-lo, obre’l de dalt a baix per treure’n la sorra i les agulles, neteja’l ràpidament i eixuga’l bé. Revisa cada exemplar mentre el neteges, perquè en una mateixa collita es poden barrejar espècies diferents, i cou-lo sempre del tot.",
      "Es conserva bé de dues maneres: assecat sencer i ben estès, o congelat després de saltar-lo breument. Si l’asseques, guarda’l en un pot hermètic quan estigui completament sec.",
    ],
  },
  "cantharellus-cibarius": {
    ecologyHeading: "On trobar rossinyols i quan surten",
    identification: [
      "El rossinyol és un bolet groc de dalt a baix, sense una separació neta entre el barret i el peu. El barret fa de 3 a 10 cm, va del groc d’ou al groc ataronjat, és irregular i ondulat, i amb l’edat pren forma d’embut. Gira’l: per sota no té làmines fines, sinó plecs gruixuts que es bifurquen i baixen pel peu. El peu continua el barret amb el mateix groc. La carn és d’un blanc groguenc, ferma i elàstica, i l’olor és afruitada, sovint d’albercoc.",
      "Amb temps sec surt més petit i pàl·lid, i amb pluja la vora del barret s’ondula més: per això, amb el color no n’hi ha prou. Fixa’t que tingui alhora plecs, olor afruitada i que creixi a terra: els plecs ajuden a comparar, però tots sols no el confirmen.",
    ],
    lookalikes: {
      heading: "Fals rossinyol i bolet d’olivera: com no confondre’ls",
      text: "El fals rossinyol (Hygrophoropsis aurantiaca) és més ataronjat, té el centre del barret enfonsat i làmines fines, denses i nombroses en lloc de plecs, i sovint creix sobre fusta o restes; no el cullis per menjar-lo, perquè pot causar molèsties digestives. El bolet d’olivera o gírgola d’olivera (Omphalotus olearius) és el veritable perill: té làmines autèntiques d’un taronja intens, la carn d’un taronja pàl·lid i creix en feixos sobre soques, arrels o fusta enterrada. És tòxic i provoca trastorns gastrointestinals intensos. El color no els separa: mira la cara inferior i, en cas de dubte, desenterra la base; si un exemplar no compleix tots els trets, no te’l mengis.",
    },
    ecology: [
      "Els rossinyols surten d’agost a novembre i tenen el pic a l’octubre; al juliol en poden aparèixer els primers. Creixen en fagedes, rouredes, avetoses i pinedes humides, amb faig, roure, avet i pi roig, entre 300 i 1.800 metres. Busquen l’obaga i el bosc fresc: sòls àcids o descarbonatats, amb humus ric i bon drenatge.",
      "Les guies de zona en descriuen l’hàbitat sobretot en boscos humits i ombrívols. Al Ripollès, les fagedes, rouredes i pinedes humides de Camprodon, Setcases, les Lloses i Sant Pau de Segúries, on hi ha les fagedes del Capsacosta. Al Montseny, la fageda de Santa Fe i les obagues de Viladrau. A les Guilleries, les castanyedes, rouredes i pinedes fresques de l’entorn de Sant Hilari Sacalm. A la Garrotxa, les obagues del Puigsacalm, a la vall d’en Bas, i els boscos dels volcans de Santa Pau. Són zones amb hàbitat compatible, no punts de collida.",
      "El rossinyol necessita humitat sostinguda al sòl, no només un xàfec: les pluges regulars i les nits fresques el fan sortir, i pot trigar de dies a setmanes a aparèixer. A les Guilleries i a la Garrotxa, en anys humits, la temporada es pot allargar des del final de la primavera fins al novembre, i els episodis secs curts només la frenen. En general, la sequera, el vent sec, la calor o les gelades l’aturen.",
    ],
    cuisine: [
      "El rossinyol té un gust afruitat, amb notes d’albercoc i un final lleugerament pebrat, i una carn ferma, fibrosa i elàstica que manté bé la forma. Per això admet coccions molt diverses: saltats, truites, salses amb nata i acompanyaments. Per consens, la Societat Catalana de Micologia el considera un comestible excel·lent.",
      "Raspalla’n els plecs i talla’n la base terrosa, però no el deixis en remull, perquè perd l’aroma. Revisa cada exemplar mentre el neteges i cuina’l fins que quedi tendre.",
      "L’ACSA recomana guardar els bolets a la nevera, entre 1 i 4 °C, i cuinar-los d’un a tres dies després de collir-los. Per conservar-lo més temps, congela’l un cop saltat o asseca’l per fer-ne salses.",
    ],
  },
  "lactarius-sanguifluus": {
    ecologyHeading: "On trobar rovellons i quan surten",
    identification: [
      "El rovelló és un lactari de pineda amb el barret de 4 a 12 cm, que va d’un taronja apagat a un gris vinós, amb zones concèntriques i tons verdosos. Gira’l: les làmines baixen pel peu i poden prendre tons vinosos. El peu és curt, del color del barret o més clar. Fes un tall net a les làmines i espera uns segons: la carn deixa anar un làtex vermell vinós. L’olor és suau, i la carn és ferma però es torna fràgil amb l’edat.",
      "Els colors s’enfosqueixen ràpidament quan el toques o quan madura, i el làtex també s’enfosqueix amb l’aire, així que mira’l acabat de sortir. El làtex vinós és el tret principal, però només amb el làtex no n’hi ha prou: comprova’l juntament amb el barret, les làmines, el peu i els pins.",
    ],
    lookalikes: {
      heading: "Rovelló o pinetell, i el rovelló de cabra",
      text: "En aquesta guia, rovelló designa Lactarius sanguifluus, de làtex vermell vinós, i pinetell designa Lactarius deliciosus, de làtex taronja i barret més viu, tot i que popularment a tots dos se’ls diu rovelló. Tots dos són comestibles excel·lents, i el rovelló semisanguinenc (Lactarius semisanguifluus), de làtex taronja que després es torna vermellós, també és comestible. El que cal descartar és el rovelló de cabra (Lactarius torminosus): té el marge del barret densament pelut, fa làtex blanc, s’associa als bedolls i pot provocar trastorns gastrointestinals. Cap lactari de làtex blanc no ha d’anar a la cistella dels bolets per menjar.",
    },
    ecology: [
      "Els rovellons surten a la tardor: de setembre a desembre, amb el pic a l’octubre, i el novembre també és un bon mes. Creixen sota pi blanc, pi pinyer, pinassa i pi roig, en pinedes mediterrànies i pinedes de muntanya calcàries, entre el nivell del mar i 1.200 metres. Prefereixen pinedes obertes i solells temperats, sobre sòls sovint calcaris o neutres, ben drenats i amb humitat mitjana.",
      "Les guies de zona en descriuen l’hàbitat en diversos territoris. A les Muntanyes de Prades, on el rovelló és el bolet més buscat i forma part de la identitat de la vila de Prades, s’hi descriuen les pinedes obertes de pinassa i pi roig de l’altiplà calcari. Als Ports, les pinedes mediterrànies de l’entorn d’Horta de Sant Joan; al Montnegre i el Corredor, les pinedes de pi pinyer i pi blanc de l’entorn de Vallgorguina; i també els vessants baixos i mitjans de Bellver de Cerdanya i els sectors montans més temperats de Camprodon. Són zones amb hàbitat compatible, no punts de collida.",
      "Necessiten una pluja de tardor que humitegi de debò el sòl, seguida de temps fresc i poc ventós perquè la humitat es mantingui. Als Ports, la calor retarda la temporada fins a les pluges d’octubre i novembre, i al Montnegre i el Corredor la temporada s’allarga fins al desembre. El vent sec, la calor persistent, una nova sequera o una gelada primerenca la poden escurçar de cop.",
    ],
    cuisine: [
      "El rovelló és un dels comestibles excel·lents segons el consens micològic català. És carnós, de gust intens, terrós i lleugerament resinós, i de carn compacta i cruixent quan és jove. És molt apreciat a la brasa, i també va bé a la planxa, en guisats de carn i en conserva amb vinagre.",
      "Neteja bé les làmines amb un raspall i un drap humit i no el deixis en remull: la carn xucla l’aigua i després es desfà a la paella. Retira’n les parts parasitades o massa verdes i toves, confirma el làtex vermell vinós exemplar per exemplar i cou-lo completament.",
      "L’ACSA recomana guardar els bolets a la nevera, entre 1 i 4 °C, i cuinar-los d’un a tres dies després de collir-los. Per guardar-los més temps, cuina’ls abans de congelar-los, perquè congelats en cru queden aigualits, o prepara’ls en escabetx i guarda’ls a la nevera.",
    ],
  },
  "tricholoma-terreum": {
    ecologyHeading: "On trobar fredolics i quan surten",
    identification: [
      "El fredolic és un tricoloma petit i gris que surt sota els pins. El barret fa de 3 a 8 cm, és gris i fibril·lós o una mica escatós, amb un bony discret al centre. Gira’l: les làmines són blanques o d’un gris pàl·lid i força espaiades, i el peu és prim, blanquinós i sense anell. La carn és prima, d’un blanc grisenc i fràgil, i l’olor és suau, farinosa en alguns exemplars.",
      "La humitat enfosqueix el barret i, amb l’edat, s’obre: per això, amb el color no n’hi ha prou. La identificació és difícil: comprova tots els trets en cada exemplar, sobretot per separar-lo dels fredolics tòxics.",
    ],
    lookalikes: {
      heading: "Fredolics tòxics: com no confondre’ls",
      text: "Buscar fredolics vol dir descartar els tòxics. El més perillós és el fredolic metzinós o tricoloma tigrat (Tricholoma pardinum): és més gros, té escates contrastades i olor farinosa, i causa una intoxicació gastrointestinal greu. El fredolic gros (Tricholoma portentosum) és comestible, però és més robust, viscós quan fa humitat, i té tons grocs al peu. Amb un sol tret no n’hi ha prou: si un exemplar no els compleix tots, no te’l mengis.",
    },
    ecology: [
      "Els fredolics són bolets de la tardor avançada. A Catalunya surten d’octubre a gener i tenen el pic al novembre, quan la majoria d’espècies de pineda ja s’han acabat. Creixen sota pi roig, pinassa i pi blanc, entre 100 i 1.700 metres, sobre una capa de pinassa fina en sòls que drenen bé.",
      "Les guies de zona en descriuen l’hàbitat sobretot al Prepirineu. Al Solsonès, les pinedes de pi roig i pinassa van de l’altiplà central a la vall de Lord i deixen pas al pi negre al Port del Comte. Al Berguedà, les pinedes fresques dels Rasos de Peguera, al nord de Berga, hi poden coincidir a la tardor avançada. Són zones amb hàbitat compatible, no punts de collida ni presència confirmada.",
      "El fred moderat no els atura. A la vall de Lord, a l’altiplà solsoní i als fons de vall del Berguedà, els fredolics aguanten fins al novembre o el desembre. La temporada s’acaba amb les gelades persistents o la primera neu a les cotes altes, i s’interromp abans si torna la sequera, fa calor fora de temps o el vent asseca la pinassa després de ploure.",
    ],
    cuisine: [
      "El fredolic té un gust suau i poc aromàtic, i una carn fràgil i tendra que es desfà fàcilment. Per això s’aprofita sobretot en sopes, com la sopa de fredolics, en truites i en guisats suaus.",
      "Neteja’ls amb molta delicadesa i torna’ls a revisar un per un a la cuina: separa qualsevol exemplar que no tingui tots els trets. Cou-los completament i menja’n una ració moderada. És un bolet tradicionalment valorat, però aquesta fitxa en recomana un consum ocasional, mai abundant ni repetit, i per això li dona una nota prudent.",
      "Es menja millor fresc i cuinat aviat: l’ACSA recomana guardar els bolets a la nevera, entre 1 i 4 °C, i cuinar-los d’un a tres dies després de collir-los. Si en vols guardar, congela’ls només un cop cuinats.",
    ],
  },
  "calocybe-gambosa": {
    ecologyHeading: "On trobar moixernons i quan surten",
    identification: [
      "El moixernó és un bolet de primavera, pàl·lid i robust, que sol sortir en grups, arcs o rotllanes entre l’herba. El barret fa de 4 a 12 cm, és hemisfèric o convex i després s’aplana irregularment; és blanc, crema o ocre pàl·lid, mat i carnós. Gira’l: les làmines són blanques o crema, molt fines, molt atapeïdes i escotades prop del peu. El peu és blanc o crema, cilíndric i compacte, sense anell ni volva. La carn és blanca, gruixuda i ferma, i fa una olor molt marcada de farina fresca o de massa crua.",
      "Els exemplars vells es poden enfosquir al centre i esquerdar-se una mica en temps sec. La identificació és difícil: l’olor de farina és el tret més característic, però amb l’olor sola no n’hi ha prou. Comprova-la juntament amb les làmines blanques i molt denses, el barret llis i que no hi hagi cap to rogenc.",
    ],
    lookalikes: {
      heading: "Moixernó, entoloma lívid i inocibe: com no confondre’ls",
      text: "A la primavera, el moixernó pot coincidir amb dues espècies tòxiques de tons pàl·lids. L’inocibe rogenc o inocibe de Patouillard (Inocybe erubescens) surt als mateixos prats, clarianes i vores de bosc: té el barret cònic, fibril·lós i esquerdat radialment; les làmines passen de blanquinoses a gris ocre i bru, i s’enrogeix amb l’edat i en fregar-lo. Conté muscarina i provoca una intoxicació greu que requereix atenció hospitalària. L’entoloma lívid (Entoloma sinuatum) sol sortir més tard, té unes làmines que es tornen de color rosa salmó i una olor menys clarament farinosa; pot causar una intoxicació gastrointestinal greu. Si hi veus cap to rogenc o les làmines no són blanques i molt denses, descarta’l.",
    },
    ecology: [
      "Els moixernons surten d’abril a juny i tenen el pic al maig; al març en poden aparèixer els primers i al juliol, els últims. No depenen de cap arbre: creixen en prats, pastures, clarianes, marges de camí i vores herboses de bosc, entre 100 i 1.800 metres, al solell o a mitja ombra. Prefereixen sòls herbosos rics en matèria orgànica, neutres o calcaris i ben drenats.",
      "El perfil de l’espècie encaixa amb prats i vores herboses dels Pirineus i el Prepirineu, la Catalunya Central, el Montseny i els sistemes interiors. A la muntanya, la temporada pot començar després del desglaç. Són zones amb hàbitat compatible, no punts de collida.",
      "El moixernó necessita que les pluges de finals d’hivern i de primavera mantinguin humit el sòl del prat, i sovint surt quan aquest sòl humit s’escalfa a poc a poc, amb temperatures d’entre 8 i 18 °C. Les gelades el poden endarrerir. La sequera, una calor sobtada o el vent persistent, que asseca els prats, l’aturen, i quan la calor s’instal·la s’acaba la temporada. La gestió del prat i el clima de cada racó poden avançar-lo o endarrerir-lo molt.",
    ],
    cuisine: [
      "El moixernó té un gust farinós, intens i lleugerament dolç, i una carn compacta, ferma i sucosa. S’aprofita en truites, remenats, guisats i salses. La Societat Catalana de Micologia el situa entre els comestibles excel·lents.",
      "Neteja la terra de la base i revisa les làmines de cada exemplar: si algun no coincideix en tots els trets, aparta’l, perquè l’entoloma lívid és tòxic. Talla els exemplars grossos perquè es coguin uniformement i cou-los completament.",
      "L’ACSA recomana guardar els bolets a la nevera, entre 1 i 4 °C, i cuinar-los d’un a tres dies després de collir-los. Per conservar-los més temps, congela’ls un cop saltats o asseca’ls per fer-ne salses.",
    ],
  },
  "hygrophorus-russula": {
    ecologyHeading: "On trobar carlets i quan surten",
    identification: [
      "El carlet és un bolet robust i jaspiat de tons vinosos que surt entre la fullaraca d’alzina o de roure. El barret fa de 5 a 15 cm, és convex i després aplanat, blanc crema tacat irregularment de rosa, vi o porpra, i lleugerament viscós amb la humitat. Gira’l: les làmines són blanques o crema amb taques rosades, gruixudes, ceroses i espaiades. El peu és massís, blanc, sovint amb taques o fibril·les vinoses, i no té anell. La carn és blanca, molt compacta i de vegades lleugerament rosada sota la pell del barret, i l’olor és suau i poc característica.",
      "La intensitat del rosa varia molt, i els exemplars secs o vells poden quedar més pàl·lids o brunencs. Ni el nom ni el color rosat no identifiquen un exemplar: comprova en cadascun les taques vinoses, les làmines gruixudes i ceroses i la carn compacta.",
    ],
    lookalikes: {
      heading: "Carlet o carner bord: com no confondre’ls",
      text: "La confusió perillosa és el carner bord (Entoloma sinuatum), tòxic: pot provocar una intoxicació gastrointestinal greu. Té les làmines més fines i sinuades, que passen de crema a rosa salmó, i l’esporada rosada; en canvi, no té ni les taques vinoses ni la textura cerosa del carlet. L’higròfor enrogent (Hygrophorus erubescens) és més esvelt i menys massís, creix amb coníferes i pot ser amarg; la cualbra rosada (Russula persicina) té la carn i les làmines fràgils, que es trenquen netament, i pot resultar acre i causar molèsties digestives. Cap dels dos no es recomana. Amb una sola fotografia no n’hi ha prou: si un exemplar no coincideix en tots els trets, no te’l mengis.",
    },
    ecology: [
      "Els carlets són bolets de tardor avançada: el calendari va de setembre a desembre, amb el pic al novembre, i l’octubre i el desembre també són bons mesos. Creixen en alzinars, rouredes mediterrànies i altres boscos de planifolis, sobretot amb alzines i roures, entre 50 i 1.400 metres. Busquen sòls neutres o calcaris, la fullaraca dels alzinars i rouredes madurs, i les obagues i els vessants protegits.",
      "Les guies de zona en descriuen l’hàbitat a l’entorn de Prades, on el carlet és un clàssic de la cultura boletaire de les muntanyes tarragonines: hi encaixen els boscos de planifolis de l’altiplà i els vessants, amb fullaraca fina i un sòl eixut en superfície però fresc en fondària. El perfil de l’espècie també encaixa amb alzinars i rouredes de la Catalunya central, les serralades costeres i prelitorals, l’Empordà, el Montseny i els Ports. Són zones amb hàbitat compatible, no punts de collida.",
      "Necessiten pluges de tardor sostingudes que rehidratin la fullaraca i el sòl, i surten més tard que els rovellons. Toleren bé la tardor avançada mentre no arribin gelades fortes, però el sòl ha de conservar prou humitat de fons. El vent sec, una nova sequera o la calor els aturen, i les gelades fortes tanquen la temporada: a l’altiplà de Prades, cap al novembre.",
    ],
    cuisine: [
      "El carlet és un molt bon comestible segons la Societat Catalana de Micologia. És robust i carnós, de carn compacta i abundant, i de gust suau i dolç, de vegades amb un final amargant. S’aprofita en guisats, arrossos, saltats i escabetx.",
      "Neteja’l sense deixar-lo en remull i, si la pell del barret és amarga, pela’l: és la manera de reduir-ne el gust amarg. Pelar-lo no corregeix una identificació dubtosa: primer descarta el carner bord i després cou-lo completament.",
      "L’ACSA recomana guardar els bolets a la nevera, entre 1 i 4 °C, i cuinar-los d’un a tres dies després de collir-los. Per conservar-los més temps, congela’ls un cop cuinats o fes-los en escabetx i guarda’ls a la nevera.",
    ],
  },
  "macrolepiota-procera": {
    ecologyHeading: "On trobar apagallums i quan surten",
    identification: [
      "L’apagallums és un bolet molt alt, de 10 a 35 cm, amb silueta d’ombrel·la. El barret és gran, amb escates brunes sobre fons clar i un bony al centre. Gira’l: les làmines són blanques, fràgils i lliures del peu. El peu és molt alt i fibrós, amb un dibuix de pell de serp en ziga-zaga, i porta un anell doble i mòbil que pots fer córrer amunt i avall. La carn és blanca i prima al barret, i fa una olor agradable de nous.",
      "Els exemplars joves són ovoides i la pluja pot rentar les escates del barret, per això l’aspecte canvia molt. La identificació és difícil: només la combinació de mida gran, peu alt amb pell de serp i anell doble i mòbil el separa de les lepiotes tòxiques; cap d’aquests trets tot sol no és suficient.",
    ],
    lookalikes: {
      heading: "Apagallums tòxic? Com no confondre’l amb les lepiotes",
      text: "L’apagallums es considera comestible només quan està completament desenvolupat i identificat amb certesa; el perill ve dels bolets que s’hi assemblen. La palometa metzinosa o lepiota mortal (Lepiota brunneoincarnata) és molt més petita, amb un barret de 2 a 5 cm i escates de color bru vinós, un peu prim amb escates brunes sobre fons rosat o vinós i un anell fràgil que pot haver desaparegut. Conté amatoxines, com la farinera borda, i és potencialment mortal. El para-sol de làmina verdosa (Chlorophyllum molybdites) té unes làmines que es tornen verdoses amb l’edat i causa intoxicacions gastrointestinals. No cullis cap lepiota petita, ni exemplars joves, tancats o dubtosos, i, davant de qualsevol ingestió sospitosa, truca al 061.",
    },
    ecology: [
      "Els apagallums surten de setembre a novembre i tenen el pic a l’octubre; a l’agost en poden aparèixer els primers. Creixen en clarianes, prats i vores de bosc, a l’entorn de roures i alzines, pins i castanyers, des del nivell del mar fins a 1.900 metres. Viuen de les restes vegetals: busquen sòls rics en matèria orgànica, amb fullaraca i humus, i ben drenats.",
      "El perfil de l’espècie encaixa amb clarianes, prats i marges de la Catalunya Central, les serralades prelitorals, l’Empordà i els sistemes interiors. Són zones amb hàbitat compatible, no punts de collida.",
      "L’apagallums respon a les pluges de finals d’estiu i de tardor, i amb temperatures suaus sovint surt de pressa, sempre que el sòl ja estigui humit. Tolera bé una calor moderada. La sequera, les gelades i el vent fort, que pot fer malbé els exemplars alts, n’interrompen la temporada. Com que viu de restes vegetals, la seva presència varia molt d’un lloc a l’altre.",
    ],
    cuisine: [
      "De l’apagallums s’aprofita sobretot el barret, ample, tendre i carnós, amb un gust suau de fruita seca, lleugerament torrat. Es fa arrebossat, a la planxa o al forn. El peu és dur i fibrós i, un cop sec, es pot moldre per fer-ne pols. El consens micològic català el classifica com a molt bon comestible, però cal identificar-lo amb seguretat.",
      "Fes servir només exemplars completament desenvolupats i ben identificats. Treu-los el peu o asseca’l per fer-ne pols, i cou bé el barret.",
      "L’ACSA recomana guardar els bolets a la nevera, entre 1 i 4 °C, i cuinar-los d’un a tres dies després de collir-los. Per conservar-los més temps, congela els barrets un cop cuinats i asseca els peus per fer-ne pols.",
    ],
  },
  "amanita-caesarea": {
    ecologyHeading: "On trobar ous de reig i quan surten",
    identification: [
      "L’ou de reig és una amanita gran i vistosa. El barret fa de 8 a 20 cm, és hemisfèric de jove i després estès, llis, de color taronja viu a vermell ataronjat, i té el marge estriat. Gira’l: les làmines són lliures, denses i grogues, i en un exemplar típic mai no són blanques. El peu és groc i cilíndric, amb un anell groc, i neix d’una volva blanca ampla en forma de sac: desenterra la base sencera per veure-la. La carn és blanca, groga sota la pell del barret, ferma, i no canvia de color en tallar-la. L’olor és suau.",
      "Els exemplars molt joves poden quedar tancats dins la volva, i en aquesta fase el color de fora no el distingeix d’amanites mortals: no l’identifiquis per l’aspecte d’ou. Amb la volva tampoc no n’hi ha prou, perquè la farinera borda també en té. Comprova alhora les làmines, el peu i l’anell grocs i el marge estriat.",
    ],
    lookalikes: {
      heading: "Ou de reig fals: farinera borda i reig bord",
      text: "La confusió més greu és la farinera borda (Amanita phalloides): té el barret verdós o olivaci, que pot ser gairebé blanc, el marge llis i les làmines, el peu i l’anell blancs, i també surt d’una volva blanca en forma de sac. És potencialment mortal, comparteix alzinars, rouredes i castanyedes amb l’ou de reig i els símptomes poden trigar de sis a dotze hores a aparèixer. El reig bord (Amanita muscaria) té el barret habitualment vermell amb restes blanques i les làmines i el peu blancs; és tòxic i pot causar una intoxicació neurològica. La pluja pot rentar les restes blanques del reig bord i deixar-lo ataronjat i llis; per això, amb el barret no n’hi ha prou. No cullis ous tancats, no et refiïs d’una foto i, davant de qualsevol ingestió sospitosa, truca al 061.",
    },
    ecology: [
      "Els ous de reig surten de juliol a octubre i tenen el pic al setembre; els primers poden aparèixer al juny i els últims, al novembre. Creixen en alzinars, suredes, rouredes mediterrànies i castanyedes, amb alzina, surera, roure martinenc i castanyer, entre 50 i 1.200 metres. Prefereixen boscos clars, solells temperats i vessants protegits, sobre sòls àcids o descarbonatats i ben drenats.",
      "Les guies de zona en descriuen l’hàbitat en dos massissos. Al Montseny hi encaixen les castanyedes, rouredes i alzinars temperats de Viladrau, als vessants més càlids del massís; al Montnegre i el Corredor, els solells d’alzinar i sureda amb sòl silícic i les clarianes de l’entorn de Vallgorguina, més que no pas les obagues fresques del Montnegre alt. El perfil de l’espècie també encaixa amb boscos de les serralades costeres i prelitorals, l’Empordà, els Ports i la Catalunya Central. Són zones amb hàbitat compatible, no punts de collida.",
      "L’ou de reig respon a la pluja efectiva sobre un sòl encara temperat: les tempestes d’estiu i les pluges de principi de tardor, seguides de temperatures suaus, sovint el fan sortir en les setmanes següents. La humitat prèvia compta molt, sobretot després d’un estiu sec. Una nova sequera, el vent sec o una baixada brusca de temperatura l’aturen, i les nits fredes de la tardor avançada n’acaben la temporada abans que la d’altres espècies.",
    ],
    cuisine: [
      "L’ou de reig és un dels comestibles excel·lents segons el consens de la Societat Catalana de Micologia. Té un gust fi i dolç, amb notes de fruita seca, i una carn tendra, sucosa i compacta en els exemplars joves oberts. Queda molt bé saltat suaument, a la planxa i amb ous o arrossos.",
      "No facis servir exemplars encara tancats en forma d’ou. Abans de cuinar-los, torna a comprovar en cada exemplar les làmines, el peu i l’anell grocs i la volva blanca, i cou-los completament. Una confusió amb la farinera borda pot ser mortal, i no n’hi ha prou amb la fitxa ni amb una foto.",
      "És millor menjar-lo fresc: l’ACSA recomana guardar els bolets a la nevera, entre 1 i 4 °C, i cuinar-los d’un a tres dies després de collir-los. Per conservar-los més temps, congela’ls després d’una cocció breu.",
    ],
  },
  "hygrophorus-latitabundus": {
    ecologyHeading: "On trobar llenegues i quan surten",
    identification: [
      "La llenega negra és un bolet robust i enganxós. El barret fa de 5 a 15 cm, és gris bru, primer convex i després estès, i amb la humitat es cobreix d’una capa viscosa abundant. Gira’l: les làmines són blanques i gruixudes, i baixen pel peu. El peu és clar, robust i sovint també viscós. La carn és blanca i ferma, i l’olor és suau.",
      "En temps sec perd la viscositat i pot semblar més apagada; per això el tacte no sempre ajuda. Fixa’t en la combinació de làmines gruixudes que baixen pel peu, carn ferma i pineda sobre sòl calcari.",
    ],
    lookalikes: {
      heading: "Llenega, llanega i llenega blanca",
      text: "La llenega negra (Hygrophorus latitabundus) també s’anomena mocosa negra, i en castellà, llanega negra o babosa negra. No és la llenega blanca (Hygrophorus eburneus), que és una altra espècie. Amb la humitat, la llenega negra es torna molt viscosa: és un tret normal de l’espècie, no un senyal que estigui malmesa. El nom no identifica cap exemplar; cal comprovar tots els trets.",
    },
    ecology: [
      "Les llenegues negres surten d’octubre a gener, amb el pic al novembre. Són bolets de pineda sobre sòl calcari: de pinassa, pi blanc i pi roig, entre 200 i 1.500 metres, amb un sòl fresc i ben drenat que conserva la humitat de fons entre pluja i pluja.",
      "El Solsonès n’és el paisatge típic. Les pinedes de pi roig i pinassa cobreixen la comarca des de l’altiplà central fins a la vall de Lord, i a Sant Llorenç de Morunys la llenega negra és un dels bolets més apreciats de la cuina local. Fora del Solsonès, el perfil de l’espècie també encaixa amb pinedes calcàries del Prepirineu, la Catalunya central, les serralades prelitorals i els Ports. Són zones amb hàbitat compatible, no punts de collida.",
      "Aguanten el fred moderat millor que altres espècies: a la vall de Lord i a l’altiplà duren fins al novembre o el desembre si no hi ha gelades persistents. En canvi, necessiten pluges de tardor generoses abans de sortir, i el vent que asseca la pineda les perjudica.",
    ],
    cuisine: [
      "La llenega negra és un dels bolets més valorats a taula: el consens micològic català la considera un comestible excel·lent. Té un gust suau i lleugerament dolç, és carnosa i sucosa, i és sobretot un bolet de guisat: estofats, arrossos i saltats, amb una tradició especial a la Catalunya central.",
      "La capa viscosa del barret pot resultar amarga o indigesta. La guia de Canal Aliments indica que es pot pelar i que el moc del peu es renta sense amarar la carn. Pelar-la no corregeix una identificació dubtosa: primer confirma l’espècie i després cou-la completament.",
      "Per conservar-les, cuina les llenegues abans de congelar-les o fes-les en escabetx i guarda-les a la nevera. No guardis exemplars passats.",
    ],
  },
  "tylopilus-felleus": {
    identification: [
      "El mataparent té aspecte de cep: és ferm i carnós, amb un barret de 5 a 15 cm, convex, bru o ocraci i amb la superfície seca i una mica vellutada. Gira’l: els porus són blancs de jove i es tornen rosats o de color carn amb l’edat. Mira el peu: és robust i pàl·lid, amb un reticle bru fosc molt marcat. La carn és blanca i generalment no canvia al tall, i l’olor és suau i poc característica.",
      "En exemplars joves, amb els porus encara blancs, el que decideix és el reticle fosc. El color dels porus depèn de la maduresa, i no has de tastar un exemplar dubtós per identificar-lo: revisa els porus i el peu de cada bolet.",
    ],
    lookalikes: {
      heading: "Mataparent o cep",
      text: "El mataparent és una de les confusions més importants amb els ceps. El cep té porus blancs que es tornen groc olivaci i un reticle clar concentrat a la part alta del peu; el mataparent té porus rosats o de color carn i una xarxa bruna fosca sobre un peu pàl·lid. El cep d’estiu també té els porus clars i el reticle més pàl·lid. Els porus i el reticle es comproven en pocs segons: si un exemplar no hi encaixa, descarta’l.",
    },
    ecology: [
      "El mataparent surt de juny a novembre, amb el pic al setembre, i és freqüent de l’agost a l’octubre. Creix en pinedes, rouredes i fagedes, entre 200 i 1.800 metres, sobre sòls àcids o neutres, en vessants frescos i en boscos madurs amb vores protegides.",
      "El seu perfil encaixa amb els Pirineus, el Prepirineu, la Catalunya Central, el Montseny i els sistemes interiors. Són zones on pot aparèixer, no punts on s’hagi confirmat.",
      "Comparteix pinedes, rouredes i fagedes amb el cep, i les temporades coincideixen del tot: ni el bosc ni el mes no t’ajuden a distingir-los. Qualsevol bolet amb aspecte de cep que trobis en aquests boscos, gira’l i mira’n els porus i el peu.",
    ],
    cuisine: [
      "No. El mataparent no es considera tòxic, però l’amargor extrema el fa incomestible. Un sol exemplar amarga tota la cassola sense remei. No el tastis per provar-lo si la identificació és dubtosa: descarta qualsevol exemplar que no puguis confirmar.",
      "Si has menjat un bolet que no tenies identificat amb certesa, consulta la guia de l’ACSA i truca al 061 Salut Respon. No esperis que apareguin símptomes ni apliquis remeis casolans. Conserva les restes dels bolets, també les de la neteja: ajuden a identificar l’espècie a l’hospital.",
    ],
  },
  "chroogomphus-rutilus": {
    ecologyHeading: "On trobar cames de perdiu i quan surten",
    identification: [
      "La cama de perdiu és un bolet de pineda de làmines fosques. El barret fa de 4 a 12 cm, és convex de jove i després aplanat, sovint amb un petit mamelló, de color coure, bru ataronjat o vermellós, i una mica viscós amb temps humit. Gira’l: les làmines són gruixudes, espaiades, bifurcades i baixen molt pel peu; de joves són olivàcies i, amb les espores, es tornen de color bru porpra o fosques. El peu és cilíndric o una mica afuat cap a la base, groguenc amb tons d’aram o vermellosos, i no té anell. La carn és groguenca o taronja pàl·lid, més rogenca a la base, i l’olor, suau i poc característica.",
      "Amb humitat el barret és més viscós, i amb l’edat els colors s’enfosqueixen fins que els exemplars vells semblen gairebé bruns o de color porpra fosc; per això, amb el color no n’hi ha prou. Fixa’t en el conjunt: làmines gruixudes, espaiades i decurrents, peu groguenc sense anell ni restes de cortina, i pineda. Cap d’aquests trets, tot sol, no l’identifica.",
    ],
    lookalikes: {
      heading: "Cama de perdiu: quines confusions té",
      text: "La confusió que cal descartar és el cortinari mortal (Cortinarius rubellus), que pot provocar una intoxicació renal mortal: té làmines rovellades, restes de cortina i peu sòlid, i no té les làmines gruixudes, espaiades i decurrents de la cama de perdiu. La cama de perdiu mucosa (Gomphidius glutinosus) és comestible, però té el barret gris brunenc i molt més mucós, el peu més curt i no té cap to de coure. La cama de perdiu també es coneix com a pota de perdiu, bec de perdiu o ull de perdiu, i en castellà com a pata de perdiz, però el nom no serveix per identificar cap exemplar: si no té tots els trets, no te l’has de menjar.",
    },
    ecology: [
      "Les cames de perdiu surten de setembre a novembre, amb el pic a l’octubre, i es poden avançar a l’agost o allargar fins al desembre. Són bolets de pineda: pi blanc, pi roig, pinassa i pi pinastre, des del nivell del mar fins a 1.800 metres, a les clarianes, als marges i a l’interior del bosc, sobre una capa de pinassa, en sòls d’àcids a neutres i ben drenats.",
      "Com que no depenen d’un sol tipus de pi, el perfil de l’espècie encaixa amb pinedes i boscos de coníferes de gairebé tot el país: els Pirineus i el Prepirineu, la Catalunya Central, el Montseny, les serralades costeres i prelitorals, l’Empordà, els Ports i els sistemes interiors. Són zones amb hàbitat compatible, no punts de collida.",
      "Necessiten pluges efectives de final d’estiu o de tardor que mantinguin humida la pinassa sense entollar el sòl, i surten uns dies o unes setmanes després, amb temperatures fresques o suaus, entre 8 i 19 °C. La sequera, el vent sec que asseca la pinassa, la calor persistent o les gelades n’aturen la sortida, i la quantitat varia d’un tipus de pineda a un altre segons quant de temps es mantingui humit el sòl.",
    ],
    cuisine: [
      "La cama de perdiu té un gust suau i discret, i una carn que absorbeix bé els sabors del plat: tendra de jove, es torna més tova i viscosa amb l’edat o la pluja. Tradicionalment s’aprecia més barrejada amb altres bolets que no pas pel seu gust propi, i per això aquesta fitxa li dona una nota modesta. Va bé en saltats barrejats, truites, guisats i arrossos. Quan es cuina, la carn pot enfosquir-se o agafar tons violacis.",
      "Tria exemplars joves i ben identificats. Raspalla’n la pinassa, treu-ne les parts malmeses i pela el barret si la cutícula és molt viscosa. Abans de posar-los al foc, torna a comprovar en cada exemplar les làmines gruixudes i decurrents i l’absència de cortina, i cou-los bé.",
      "Es menja millor fresca: l’ACSA recomana guardar els bolets a la nevera, entre 1 i 4 °C, i cuinar-los d’un a tres dies després de collir-los. Si la vols guardar més temps, congela-la un cop cuinada.",
    ],
  },
  "amanita-phalloides": {
    identification: [
      "La farinera borda és una amanita esvelta de làmines blanques, i el primer que has de mirar és la base. Desenterra-la sencera: el peu acaba en un bulb dins una volva blanca ampla en forma de sac, que sovint queda amagada sota la fullaraca. Més amunt, el peu és blanc o verdós i fibril·lós, amb un anell membranós penjant. Gira el barret: les làmines són lliures, blanques i atapeïdes, i no canvien mai de color. El barret fa de 5 a 15 cm, és hemisfèric i després estès, llis o finament fibril·lós, verd oliva o groc verdós i sovint amb el marge més pàl·lid. La carn és blanca i no canvia al tall, i l’olor és feble de jove i més dolcenca o desagradable amb l’edat.",
      "El color no et serveix de guia: hi ha formes grogues i gairebé blanques, i la pluja pot rentar el barret. Amb la volva tampoc no n’hi ha prou: l’ou de reig també en té una en forma de sac, i si l’exemplar s’arrenca malament pot quedar enterrada. La identificació és molt difícil: només la combinació de làmines blanques, anell i volva en sac, comprovada en cada exemplar sencer, t’ha de fer descartar-la.",
    ],
    lookalikes: {
      heading: "Farinera borda: les confusions que maten",
      text: "La farinera borda es pot confondre amb tres comestibles, i qualsevol d’aquests errors pot ser mortal. L’ou de reig també té volva en sac, però té les làmines, el peu i l’anell grocs, el barret taronja i el marge estriat; un ou tancat no s’ha d’identificar mai pel color de fora. El camperol no té volva i té les làmines que passen de rosades a color xocolata, mentre que les de la farinera borda es mantenen blanques. La llora verda té la carn i el peu trencadissos i no té anell ni volva. Si trobes làmines blanques que no canvien o una volva a la base, descarta tota la collita i no la barregis amb la resta del cistell.",
    },
    ecology: [
      "La farinera borda surt de l’agost al novembre i té el pic a l’octubre, en plena temporada de tardor. Creix sota arbres planifolis: alzinars, rouredes, fagedes i castanyedes, entre 100 i 1.400 metres, a l’interior i a les vores del bosc, en sòls frescos i rics en humus després de ploure.",
      "El seu perfil encaixa amb gairebé tot el país: els Pirineus i el Prepirineu, la Catalunya Central, les serralades costeres i prelitorals, l’Empordà, el Montseny, els Ports i els sistemes interiors. Són zones on pot aparèixer, no punts on s’hagi confirmat.",
      "Tingues-ho present: comparteix alzinars, rouredes i castanyedes amb l’ou de reig, i les temporades coincideixen a la tardor, de manera que és normal trobar-los al mateix lloc i el mateix dia. A les vores del bosc també pot créixer a pocs metres dels prats on surt el camperol. Qualsevol bolet blanc o d’aspecte comestible que cullis en aquests boscos a la tardor s’ha de revisar sencer.",
    ],
    cuisine: [
      "No. La farinera borda és una espècie mortal i no té cap ús culinari segur. Conté amatoxines, i ni la cocció, ni l’assecatge ni la congelació no la fan segura. Causa la major part de les intoxicacions mortals per bolets. No la manipulis juntament amb bolets que vulguis menjar.",
      "Davant una ingestió sospitosa, truca immediatament al 061 Salut Respon i segueix la guia de l’ACSA. No esperis que apareguin símptomes ni apliquis remeis casolans. Conserva les restes dels bolets, també les de la neteja: ajuden a identificar l’espècie a l’hospital.",
    ],
  },
  "coprinus-comatus": {
    ecologyHeading: "On trobar bolets de tinta i quan surten",
    identification: [
      "El bolet de tinta és alt, blanc i pelut. El barret fa de 4 a 15 cm d’alt, és cilíndric o ovoide, blanc i cobert d’escates aixecades, amb el centre ocraci. Mira les làmines: són lliures, primer blanques, després rosades i finalment negres, i es desfan en un líquid negre. El peu és alt, blanc, buit i fràgil, amb un anell mòbil o que desapareix aviat. La carn és blanca i prima, i l’olor és suau de jove i desagradable quan es descompon.",
      "El barret s’obre i es desfà des del marge, i el pas de blanc a negre pot ser qüestió de poques hores: en un mateix grup hi pot haver exemplars aprofitables i d’altres que ja no ho són. Comprova tots els trets en cada exemplar; el color blanc o les escates, tots sols, no són prou.",
    ],
    lookalikes: {
      heading: "Bolet de tinta: quan deixa de ser comestible",
      text: "El bolet de tinta només s’aprofita molt jove, amb el barret blanc i tancat i les làmines completament blanques: descarta qualsevol exemplar amb zones rosades o negres o que hagi començat a liquar-se. El bolet de tinta gris (Coprinopsis atramentaria) té el barret gris i llis o finament fibril·lós, sense les grans escates blanques; només és comestible amb condicions, perquè pot causar una reacció intensa si es combina amb alcohol. L’apagallums tòxic (Chlorophyllum brunneum) té un barret ample amb escates brunes i un anell gruixut, no es desfà en tinta negra i pot provocar una intoxicació gastrointestinal. Cap d’aquests trets, per ell mateix, no n’assegura la identificació.",
    },
    ecology: [
      "Els bolets de tinta tenen dues temporades. A la primavera poden sortir de març a juny, amb el millor moment al maig, i a la tardor tornen al setembre, tenen el pic a l’octubre i poden durar fins al desembre. No depenen de cap arbre: creixen en prats, gespes, vores de camí, cunetes, parcs, horts i terrenys remoguts, en sòls rics en nutrients i matèria orgànica, des del nivell del mar fins a 2.000 metres.",
      "Com que segueixen els sòls herbosos i remoguts més que no pas el bosc, el perfil de l’espècie encaixa amb gairebé tot el país: els Pirineus i el Prepirineu, la Catalunya Central, l’Empordà, el Montseny, les serralades costeres i prelitorals, els Ports i els sistemes interiors. El reg, la terra remoguda i la gestió dels parcs fan que en surtin en llocs que el mapa no pot preveure bé. Són zones amb hàbitat compatible, no punts de collida.",
      "Surten poc després de ploure, entre uns quants dies i una setmana després, quan l’aigua ha humitejat la capa superficial del sòl i les temperatures són fresques o suaus, entre 7 i 20 °C. La sequera, el sol intens i les gelades n’interrompen la sortida.",
    ],
    cuisine: [
      "El bolet de tinta té un gust suau, delicat i lleugerament vegetal, i una carn tendra i sucosa de molt jove que es liqua en madurar. És un bon comestible mentre el barret és completament blanc i ferm, però es fa malbé molt de pressa. Queda bé saltat al moment, en truites i en sopes suaus.",
      "Accepta només exemplars blancs, tancats i sense cap zona rosada o negra, neteja’ls ràpidament i cuina’ls el mateix dia. No en cullis en zones contaminades ni als vorals de les carreteres.",
      "Aquí no serveix el termini general de l’ACSA, que recomana cuinar els bolets d’un a tres dies després de collir-los: el bolet de tinta s’ha de menjar de seguida. Si en vols guardar, cou-los breument abans de congelar-los.",
    ],
  },
  "amanita-muscaria": {
    identification: [
      "El reig bord és un bolet vermell molt visible. El barret fa de 8 a 20 cm, és vermell viu o ataronjat, primer convex i després estès, i sol dur berrugues blanques. Gira’l: les làmines són lliures i blanques. El peu és blanc i robust, amb anell, i acaba en una base bulbosa amb restes de volva, no en un sac ample. La carn és blanca i, just sota la pell del barret, groguenca o vermellosa. L’olor és feble.",
      "La pluja pot rentar les berrugues i aclarir el barret fins a deixar-lo ataronjat i llis, però això no el fa comestible. Per això no et pots fiar només del barret: comprova alhora el color de les làmines, del peu i de l’anell, i desenterra la base sencera.",
    ],
    lookalikes: {
      heading: "Reig bord o ou de reig",
      text: "La confusió més preocupant és amb l’ou de reig, un comestible excel·lent. L’ou de reig té les làmines, el peu i l’anell grocs, el barret llis amb el marge estriat i una volva blanca ampla en forma de sac; el reig bord els té blancs, sol dur berrugues i té la base en forma de bulb amb restes de volva. No decideixis pel color del barret, perquè un reig bord rentat per la pluja pot quedar ataronjat i sense berrugues. També s’assembla al pixacà, més bru o grisenc i perillosament tòxic, que pot provocar una intoxicació neurològica greu.",
    },
    ecology: [
      "El reig bord surt de l’agost al novembre i té el pic a l’octubre. Creix en pinedes, fagedes i boscos mixtos frescos, amb pins, faigs i bedolls, entre 400 i 2.100 metres, sobre sòls àcids. Sovint el veuràs a les obagues, als marges i a les clarianes del bosc.",
      "El seu perfil encaixa amb els Pirineus, el Prepirineu, el Montseny i els sistemes interiors. Són zones on pot aparèixer, no punts on s’hagi confirmat.",
      "L’ou de reig prefereix alzinars, suredes i castanyedes, i el reig bord, pinedes, fagedes i boscos mixtos. El tipus de bosc orienta, però als boscos mixtos poden coincidir, i les temporades se superposen a la tardor: qualsevol amanita vermella o taronja que hi trobis s’ha de revisar sencera.",
    ],
    cuisine: [
      "No. El reig bord és tòxic i pot causar una síndrome neurològica. No és una varietat segura del reig, i la cocció no elimina el risc d’intoxicació. Que hagi perdut les berrugues blanques tampoc no el fa segur.",
      "Davant una ingestió sospitosa, actua de seguida: consulta la guia de l’ACSA i truca al 061 Salut Respon. No esperis que apareguin símptomes ni apliquis remeis casolans. Conserva les restes dels bolets, també les de la neteja: ajuden a identificar l’espècie a l’hospital.",
    ],
  },
  "hygrophorus-eburneus": {
    ecologyHeading: "On trobar llenegues blanques i quan surten",
    identification: [
      "La llenega blanca és un bolet blanc i relliscós. El barret fa de 3 a 8 cm, és convex o planoconvex, sovint amb un bony poc marcat, de color blanc d’ivori, molt viscós, i de jove té el marge enrotllat cap endins. Gira’l: les làmines són blanques, gruixudes, ceroses, espaiades i baixen pel peu. El peu és blanc, ferm i una mica viscós, excepte la part alta, que és seca i com empolsinada, i sovint s’estreny cap a la base. La carn és blanca i no canvia de color. L’olor és variable, de feble a cerosa o lleugerament aromàtica, i no serveix per identificar-la.",
      "En temps sec perd viscositat, i els exemplars madurs poden groguejar. El blanc no és cap garantia, perquè hi ha amanites blanques mortals: comprova en cada exemplar que les làmines siguin ceroses i baixin pel peu i que no hi hagi anell ni volva a la base. Amb un sol tret no n’hi ha prou.",
    ],
    lookalikes: {
      heading: "Llenega blanca, llenega negra i amanites blanques",
      text: "La confusió més greu és amb la farinera pudent (Amanita virosa), potencialment mortal: té les làmines lliures, anell i volva a la base, i no té les làmines ceroses que baixen pel peu d’una llenega. La llenega pudent (Hygrophorus cossus) és més carnosa i fa una olor forta, àcida o de pell de mandarina; no es considera perillosament tòxica, però és poc apreciada i distingir-la pot exigir proves químiques. Tampoc no s’ha de confondre amb la llenega negra (Hygrophorus latitabundus), una altra espècie, de barret gris bru, que creix en pinedes. Un bolet blanc exigeix prudència extrema: si no compleix tots els trets, no l’has de menjar.",
    },
    ecology: [
      "Les llenegues blanques surten de setembre a desembre, amb el pic a l’octubre, i el novembre encara és un bon mes. Són bolets sobretot de fageda, i també de rouredes i altres boscos de planifolis, entre 400 i 1.700 metres. Busquen obagues i orientacions fresques, l’interior i les vores humides de les fagedes, i un sòl ric en humus, sovint amb molsa, humit però ben drenat.",
      "El perfil de l’espècie encaixa amb boscos dels Pirineus, el Prepirineu, la Catalunya Central, l’Empordà, el Montseny, els Ports i els sistemes interiors. L’arbre al qual s’associen més clarament és el faig, i, com que les fagedes catalanes ocupen substrats diversos, accepten sòls de lleugerament àcids a calcaris. Són zones amb hàbitat compatible, no punts de collida.",
      "Necessiten pluges de tardor sostingudes que mantinguin humides la fullaraca i el sòl de la fageda, i surten dies o setmanes després, segons la temperatura del sòl, amb un ambient fresc, entre 7 i 16 °C. La sequera i el vent sec, que les assequen i els fan perdre la viscositat, n’aturen la sortida, i les gelades persistents tanquen la temporada.",
    ],
    cuisine: [
      "La llenega blanca té un gust suau i discret, i interessa més per la textura, carnosa, llisa i mucilaginosa quan és humida, que no pas per l’aroma. El consens micològic català la compta entre els bons comestibles. S’aprofita en guisats, saltats i sopes.",
      "Neteja-la o treu-li el mucílag de la superfície. Abans de cuinar-la, torna a comprovar cada exemplar: que les làmines baixin pel peu i que no tingui anell ni volva, perquè una amanita blanca no és una llenega. Després, cou-la del tot.",
      "És millor menjar-la fresca: l’ACSA recomana guardar els bolets a la nevera, entre 1 i 4 °C, i cuinar-los d’un a tres dies després de collir-los. Si en vols guardar més temps, congela-la un cop cuinada.",
    ],
  },
  "hydnum-repandum": {
    ecologyHeading: "On trobar llengües de bou i quan surten",
    identification: [
      "La llengua de bou es reconeix per les agulletes que té sota el barret en lloc de làmines o porus. El barret fa de 5 a 15 cm, és irregular i sovint ondulat, de color crema a ataronjat pàl·lid, com d’albercoc. Gira’l: la cara inferior està coberta d’agulletes fràgils que baixen pel peu. El peu és curt i robust, de vegades descentrat. La carn és blanca, ferma i una mica trencadissa, i l’olor, suau.",
      "Amb l’edat s’enfosqueix i es pot tornar amarga. Les agulletes són el tret clau, però amb elles no n’hi ha prou: comprova també el barret, el peu i la carn de cada exemplar.",
    ],
    lookalikes: {
      heading: "Llengua de bou i llengua de bou rogenca",
      text: "La llengua de bou rogenca (Hydnum rufescens) també té agulletes sota el barret: és més petita i més ataronjada, i té una comestibilitat semblant. La llengua de bou també es coneix com a agulletes o llémena, i en castellà com a lengua de vaca, però el nom no identifica cap exemplar. Comprova tots els trets de cada bolet abans de menjar-te’l.",
    },
    ecology: [
      "Les llengües de bou surten de setembre a desembre, amb el pic a l’octubre, i el novembre encara és un bon mes. Creixen en fagedes, pinedes de pi roig i rouredes, i en boscos mixtos i humits, entre 200 i 1.800 metres. Prefereixen orientacions fresques, el bosc madur i les seves vores, i sòls d’àcids a neutres amb una capa d’humus moderada.",
      "El perfil de l’espècie encaixa amb boscos dels Pirineus, el Prepirineu, el Montseny i els sistemes interiors, i sovint surten en grups dispersos. Són zones amb hàbitat compatible, no punts de collida.",
      "Necessiten que el sòl es mantingui humit de manera regular, ja des d’abans, i temperatures fresques, entre 8 i 18 °C. La sequera en talla la sortida, i la calor, les gelades i el vent que asseca el bosc tampoc no les afavoreixen.",
    ],
    cuisine: [
      "La llengua de bou té un gust suau, amb una amargor que pot créixer en els exemplars madurs, i una carn densa, ferma i lleugerament granulosa. Per aquesta carn ferma, la fitxa la considera un bon bolet de cuina. S’aprofita en guisats, saltats i arrossos, i també en escabetx.",
      "Tria exemplars joves: els vells poden ser amargs i indigestos. Raspalla-la, i si s’hi ha acumulat terra, treu-li les agulletes. Si un exemplar és amarg, escalda’l i llença l’aigua, i després cou-lo sempre del tot.",
      "Per menjar-la fresca, l’ACSA recomana guardar-la a la nevera, entre 1 i 4 °C, i cuinar-la d’un a tres dies després de collir-la. Per guardar-la més temps, escalda-la i congela-la, o fes-la en escabetx i guarda-la a la nevera.",
    ],
  },
  "lactarius-deliciosus": {
    ecologyHeading: "On trobar pinetells i quan surten",
    identification: [
      "El pinetell és un bolet taronja de pineda. El barret fa de 4 a 15 cm, és ataronjat, amb cercles concèntrics, i sovint enfonsat al centre. Gira’l: les làmines són ataronjades, baixen pel peu i es taquen de verd quan les prems. El peu és cilíndric, ataronjat i sovint té clotets. Fes un tall a les làmines: la carn, taronja pàl·lid, deixa anar un làtex taronja, de color de pastanaga. L’olor és suaument afruitada, i la carn és ferma de jove i fràgil amb l’edat.",
      "La humitat i l’edat accentuen les taques verdes, que no indiquen toxicitat. El làtex taronja és el primer tret que cal mirar, però amb això sol no n’hi ha prou: contrasta’l amb els cercles del barret, les làmines, el peu i la presència de pins.",
    ],
    lookalikes: {
      heading: "Pinetell o rovelló: com diferenciar-los",
      text: "Popularment, el pinetell també es diu rovelló, i en castellà níscalo o robellón. En aquesta guia, però, rovelló designa Lactarius sanguifluus, de làtex vermell vinós i tons més apagats; tots dos són comestibles i confondre’ls no és perillós. El que sí que cal descartar és el rovelló de cabra (Lactarius torminosus), de barret rosat i pelut i làtex blanc, associat als bedolls, que pot provocar trastorns gastrointestinals. Si un lactari fa làtex blanc o té el barret pelut, no és un pinetell.",
    },
    ecology: [
      "Els pinetells surten a la tardor: de setembre a desembre, amb el pic a l’octubre, i el setembre i el novembre també són bons mesos. Creixen sota pi pinyer, pinassa, pi roig i pi blanc, en pinedes i pinedes mixtes, des del nivell del mar fins a 1.800 metres. Prefereixen la pinassa humida dels marges i les clarianes de pineda, sobre sòls sovint silícics, d’àcids a neutres i ben drenats.",
      "Les guies de zona en situen l’hàbitat sobretot a les pinedes de muntanya: al Solsonès, on bona part dels rovellons que es busquen són pinetells, les pinedes del Port del Comte i de la vall de Lord, a Sant Llorenç de Morunys; al Berguedà, Castellar de n’Hug i els Rasos de Peguera, i també Camprodon, Bellver de Cerdanya, l’altiplà de Prades i Horta de Sant Joan, als Ports, on només encaixen els sectors amb el sòl i la humitat adequats. Són zones amb hàbitat compatible, no punts de collida.",
      "Necessiten pluges de tardor que mantinguin la pinassa humida durant dies, i sovint surten les setmanes següents. L’altitud pot avançar o endarrerir la temporada: a la part alta del Port del Comte s’avança i s’escurça. Una sequera sobtada, el vent persistent o les primeres gelades n’aturen la sortida, i a Prades els pinetells tanquen la temporada cap al novembre, quan les gelades arriben a l’altiplà.",
    ],
    cuisine: [
      "Segons la Societat Catalana de Micologia, el pinetell és un molt bon comestible, un esglaó per sota dels excel·lents. És un bolet tradicional de pineda, de gust resinós, terrós i lleugerament dolç, i de carn ferma i trencadissa de jove, més granulosa amb l’edat. És saborós a la brasa, a la planxa amb all i julivert, en guisats i en escabetx.",
      "Neteja’n les làmines amb cura i retalla’n les parts verdoses toves o fetes malbé. Confirma sempre que el làtex sigui taronja i cou-lo bé, fins al centre.",
      "L’ACSA recomana guardar els bolets a la nevera, entre 1 i 4 °C, i cuinar-los d’un a tres dies després de collir-los. Per conservar-lo més temps, congela’l ja cuinat o fes-lo en escabetx i guarda’l a la nevera.",
    ],
  },
  "lepista-nuda": {
    ecologyHeading: "On trobar peus blaus i quan surten",
    identification: [
      "La pimpinella morada, també coneguda com a peu blau, és un bolet robust de tons violetes. El barret fa de 5 a 15 cm, primer és convex, amb el marge enrotllat cap endins, i després s’aplana; és violeta o lila de jove i més bru amb l’edat o en temps sec. Gira’l: les làmines són fines, denses i violetes, i l’esporada és rosa pàl·lid. El peu és violeta, fibril·lós, cilíndric i sovint eixamplat a la base, sense cortina. La carn és blanquinosa amb tons liles, tendra i compacta de jove, i l’olor és aromàtica, dolça i perfumada.",
      "Els tons violetes s’esvaeixen de pressa amb l’edat, la pluja o el fred i poden quedar gairebé bruns, i hi ha cortinaris tòxics que també són violacis. La identificació és difícil: comprova en cada exemplar que l’esporada sigui rosa pàl·lid, que no tingui cortina ni espores rovellades i que faci olor dolça. Tots aquests trets han de coincidir.",
    ],
    lookalikes: {
      heading: "Peu blau i cortinaris violacis: com no confondre’ls",
      text: "La pimpinella morada també es coneix com a peu blau, peu violeta, moixernó blau o blaveta, i en castellà com a pie azul. La confusió que cal descartar és amb el cortinari violaci (Cortinarius traganus), que és tòxic: té restes de cortina al peu, esporada rovellada i una olor desagradable, no dolça. Els cortinaris violacis no s’han de menjar. La pimpinella lilosa (Lepista sordida) és comestible un cop ben cuinada, però és més petita, prima i poc carnosa, i sovint surt en sòls molt rics o en jardins. Amb el color violeta no n’hi ha prou: si un exemplar no compleix tots els trets, no l’has de menjar.",
    },
    ecology: [
      "La pimpinella morada és un bolet tardà: surt d’octubre a desembre, amb el pic al novembre, i es pot avançar al setembre o allargar fins al gener. No viu associada a cap arbre, sinó que s’alimenta de fullaraca i matèria orgànica en descomposició. Creix entre la fullaraca humida de boscos de planifolis i de coníferes, pinedes, clarianes, parcs i marges, sovint en grups o rotllanes, des del nivell del mar fins a 1.800 metres, en sòls rics en humus.",
      "Com que segueix la fullaraca més que un arbre concret, el perfil de l’espècie encaixa amb gairebé tot el país: els Pirineus i el Prepirineu, la Catalunya Central, les serralades costeres i prelitorals, l’Empordà, el Montseny, els Ports i els sistemes interiors. La gestió de parcs, jardins i piles de fullaraca fa variar molt els llocs on surt. Són zones amb hàbitat compatible, no punts de collida.",
      "Surt dies o setmanes després de les pluges de tardor i de principi d’hivern, quan la temperatura baixa a entre 5 i 15 °C, i pot aparèixer abans de les primeres neus. Tolera gelades lleus, però la sequera, el vent sec i les gelades persistents l’aturen.",
    ],
    cuisine: [
      "La pimpinella morada té un gust dolç, floral i perfumat, de vegades intens, i és carnosa, amb una carn que es torna una mica flonja amb l’edat. Es fa servir en guisats, truites, arrossos i barreges de bolets.",
      "Només és comestible amb condicions. Fes servir exemplars ferms i identificats amb certesa, no la mengis mai crua i cou-la del tot. El primer cop, menja’n poca, perquè a algunes persones els pot provocar intolerància. Aquesta fitxa li dona una bona nota culinària, però això no compensa el risc de confondre-la amb cortinaris.",
      "Per menjar-la fresca, l’ACSA recomana guardar-la a la nevera, entre 1 i 4 °C, i cuinar-la d’un a tres dies després de collir-la. Per guardar-la més temps, congela-la un cop cuinada o fes-la en escabetx i guarda-la a la nevera.",
    ],
  },
  "gyromitra-esculenta": {
    identification: [
      "El bolet de greix és una falsa múrgola de primavera amb aspecte de cervell. Fa de 4 a 12 cm d’alçada. El barret és irregular, plegat i lobulat, de color bru castany a rogenc fosc, sense els alvèols regulars de la múrgola, i s’uneix al peu en diversos punts. El peu és curt, blanc o crema, solcat i irregular. Talla l’exemplar pel llarg: per dins veuràs plecs i cambres, no un buit continu. La carn és prima, fràgil i cerosa, i l’olor, suau.",
      "La forma és molt irregular i els exemplars clars poden recordar una múrgola; per això, amb l’aspecte exterior no n’hi ha prou. El tall longitudinal és la comprovació decisiva: si hi ha cambres i envans interns, és un bolet de greix.",
    ],
    lookalikes: {
      heading: "Bolet de greix o múrgola",
      text: "Tots dos surten a la primavera i es poden trobar al cistell la mateixa setmana. La múrgola té un barret alveolat com una bresca, de color de mel a bru groguenc, i és buida de la punta del barret a la base del peu; el bolet de greix té lòbuls com un cervell, tons rogencs foscos i cambres internes. La verpa, que tampoc no es recomana, té un barret en forma de campana unit al peu només per la punta. Recorda que la múrgola també és tòxica crua o poc cuita. Cap exemplar amb forma de cervell no s’ha de menjar.",
    },
    ecology: [
      "El bolet de greix surt de març a juny, amb el pic al maig. Creix en pinedes fredes i altres boscos de coníferes, amb pi roig i pi negre, entre 300 i 2.000 metres, en sòls àcids i sorrencs, sovint remoguts: clarianes, vores de pistes forestals, cremats antics i restes de fusta. La humitat del desglaç i les pluges de primavera l’afavoreixen.",
      "El seu perfil encaixa amb els Pirineus, el Prepirineu, el Montseny i els sistemes interiors. Són zones on pot aparèixer, no punts on s’hagi confirmat.",
      "A la primavera coincideix amb la múrgola, que prefereix boscos de ribera, planifolis i clarianes. El tipus de bosc orienta, però no és determinant: qualsevol bolet de barret irregular que cullis a la primavera l’has de tallar pel llarg abans de posar-lo amb la resta.",
    ],
    cuisine: [
      "No. El bolet de greix conté giromitrina i pot causar intoxicacions mortals. No és una múrgola comestible, i ni l’assecat ni la cocció no n’eliminen el risc de manera fiable. No el mengis fresc, assecat ni bullit: una tradició local de consum no equival a seguretat.",
      "Davant una ingestió sospitosa, actua de seguida: consulta la guia de l’ACSA i truca al 061 Salut Respon. No esperis que apareguin símptomes ni apliquis remeis casolans. Conserva les restes dels bolets, també les de la neteja: ajuden a identificar l’espècie a l’hospital.",
    ],
  },
  "pleurotus-ostreatus": {
    ecologyHeading: "On trobar gírgoles i quan surten",
    identification: [
      "La gírgola, també anomenada orellana o auriana, és un bolet que creix directament sobre la fusta. Sol formar diversos barrets imbricats, com prestatges, sobre un tronc o una soca de planifoli. El barret fa de 5 a 20 cm i té forma de ventall, de petxina o d’ostra, amb el marge incurvat de jove; el color va del gris blavós al gris bru, el beix o gairebé el blanc. Gira’l: les làmines són blanques o de color crema, atapeïdes, i baixen molt cap al punt d’inserció. El peu és molt curt, lateral o absent, blanc i sovint pilós a la base. La carn és blanca, gruixuda prop de la inserció i més prima al marge, i l’olor és suau i fúngica, de vegades lleugerament anisada.",
      "El color canvia amb la temperatura i amb la soca, i els exemplars de temps suau poden ser molt pàl·lids; amb l’edat, la carn es torna més fibrosa o coriàcia. Tampoc no n’hi ha prou que creixi sobre fusta: altres bolets de soca, alguns de tòxics, també surten en grups sobre troncs. Comprova en cada exemplar la forma, les làmines, el peu i el color de la carn.",
    ],
    lookalikes: {
      heading: "Gírgola o bolet d’olivera: com no confondre’ls",
      text: "La confusió que cal descartar és amb el bolet d’olivera (Omphalotus olearius), que també creix en grups sobre fusta. És taronja de dalt a baix, amb les làmines, el peu i la carn també taronges; té un peu curt però definit, excèntric i fibrós, i forma feixos sobre oliveres, alzines o arrels de planifolis. Causa vòmits i diarrees intensos que poden requerir atenció mèdica. Cap gírgola no és taronja per dins: si les làmines o la carn tenen tons taronja, descarta l’exemplar. La gírgola pulmonada (Pleurotus pulmonarius) és comestible: és més pàl·lida i prima, i surt sobretot a l’estiu; separar-la de la gírgola pot requerir microscopi o una anàlisi d’ADN.",
    },
    ecology: [
      "Les gírgoles són bolets de fred: surten de setembre a febrer, tenen el pic al novembre i al desembre, i el gener encara és un bon mes. Creixen sobre troncs, soques i branques de planifolis morts o debilitats, sobretot de pollancre, àlber, faig, salze, vern i om, des del nivell del mar fins als 1.800 metres. Busquen indrets frescos, protegits i ombrívols: boscos de ribera, fondalades, parcs i arbres vells. El tipus de sòl no hi influeix; el que importa és que la fusta i l’aire siguin humits.",
      "Com que depèn de la fusta més que no pas del bosc, el perfil de l’espècie encaixa amb gairebé tot el país: els Pirineus i el Prepirineu, la Catalunya Central, les serralades costeres i prelitorals, l’Empordà, el Montseny, els Ports i els sistemes interiors. El mapa, però, no veu la fusta morta: un bosc de planifolis compatible no vol dir que hi hagi els troncs adequats. Són zones amb hàbitat compatible, no punts de collida.",
      "La gírgola surt quan les pluges rehidraten a fons troncs i soques, sovint després d’un descens de temperatura, amb temperatures d’entre 6 i 17 °C i nits fredes o fresques. Pot sortir abans o després d’un episodi de fred i tolera el fred lleu, però les gelades fortes o persistents l’aturen. La calor en redueix la sortida, i la sequera i el vent sec, que asseca la fusta i els bolets, la tallen.",
    ],
    cuisine: [
      "La gírgola té un gust suau i umami, lleugerament anisat en alguns exemplars, i una textura carnosa i fibrosa; el peu pot ser tenaç. El consens micològic la considera un bon comestible, fàcil d’integrar en plats de cada dia: a la planxa, saltada, en arrossos i en guisats.",
      "Retira la base dura i les restes de fusta, i separa els barrets perquè es coguin igual. Cou-la fins que quedi tendra. No mengis exemplars silvestres sense haver descartat les espècies de fusta semblants, sobretot el bolet d’olivera.",
      "Segons l’ACSA, els bolets s’han de guardar a la nevera, entre 1 i 4 °C, i cuinar d’un a tres dies després de collir-los. Si vols conservar gírgoles més temps, congela-les un cop saltades o deshidrata-les per fer-ne brous.",
    ],
  },
  "tricholoma-portentosum": {
    ecologyHeading: "On trobar fredolics grossos i quan surten",
    identification: [
      "El fredolic gros, també anomenat fredolic llenegat, és un tricoloma gris i robust de les pinedes fredes de muntanya. El barret fa de 5 a 12 cm; és convex i després s’estén, de color gris plom a gris bru, i el recorren fibres radials fosques. Quan fa humitat, és viscós. Gira’l: les làmines són blanques, escotades prop del peu i sovint amb reflexos grocs quan madura. El peu és cilíndric, ple i sense anell, blanc amb tons grocs, sobretot cap a la base. La carn és blanca, groguenca sota la cutícula, i no canvia de color; l’olor és farinosa i suau.",
      "Els tons grocs poden ser febles, i el barret s’aclareix quan s’asseca. Els tricolomes grisos exigeixen una comparació completa, i alguns només es poden separar amb microscopi: ni les fibres radials ni el groc no basten sense la resta de trets.",
    ],
    lookalikes: {
      heading: "Fredolic gros o fredolic metzinós: com distingir-los",
      text: "La confusió perillosa és amb el fredolic metzinós (Tricholoma pardinum), que causa una intoxicació gastrointestinal intensa. És més massís, té el barret cobert d’escates tigrades, no de simples fibres radials, i normalment no té els tons grocs del fredolic gros. El tricoloma virgós (Tricholoma virgatum) no és comestible: té un bony punxegut al centre, no té tons grocs i té un gust molt acre que pot causar molèsties. El fredolic (Tricholoma terreum) és comestible, però és més petit i menys robust, i no té el barret viscós ni els tons grocs al peu. Descarta qualsevol exemplar amb escates tigrades o que no coincideixi en tots els trets.",
    },
    ecology: [
      "Els fredolics grossos són bolets de la tardor avançada: surten d’octubre a desembre, amb el pic al novembre, i en poden aparèixer al setembre i al gener. Creixen sobretot en pinedes montanes i subalpines de pi roig i pi negre, i també sota avets, entre 500 i 2.200 metres, sovint entre la molsa i la virosta de les obagues i els vessants frescos. Prefereixen sòls àcids o neutres, silícics o descarbonatats i ben drenats.",
      "El perfil de l’espècie encaixa amb les muntanyes dels Pirineus i el Prepirineu, el Montseny i els sistemes interiors. La producció varia molt d’un any a l’altre. Són zones amb hàbitat compatible, no punts de collida.",
      "Surten dies o setmanes després de les pluges de tardor i de principi d’hivern, quan el sòl de la pineda es manté humit i les temperatures baixen fins a valors d’entre 3 i 14 °C, amb nits fredes. Poden aguantar fins a les primeres gelades, i la neu tanca la temporada. La sequera, la calor, el vent sec o la neu persistent n’aturen la sortida.",
    ],
    cuisine: [
      "El fredolic gros té un gust suau, farinós i lleugerament dolç, i una carn ferma i carnosa, més resistent que la del fredolic petit. És una espècie comercial apreciada i s’aprofita en sopes, guisats, saltats i truites.",
      "Neteja la cutícula viscosa dels fredolics sense amarar-los, torna a comprovar en cada exemplar els tons grocs del peu i de les làmines, i cou-los completament.",
      "Es mengen millor frescos: l’ACSA recomana guardar els bolets a la nevera, entre 1 i 4 °C, i cuinar-los d’un a tres dies després de collir-los. Si te’n sobren, congela’ls ja cuinats.",
    ],
  },
  "pleurotus-eryngii": {
    ecologyHeading: "On trobar gírgoles de panical i quan surten",
    identification: [
      "La gírgola de panical, també coneguda com a gírgola de card, de camp o d’arena, és una gírgola baixa i robusta que no surt sobre la fusta dels arbres, sinó al peu de les tiges seques del panical, en prats i espais oberts. El barret fa de 4 a 12 cm; és convex i després s’estén o s’enfonsa una mica, de color bru grisenc a castany, llis i amb el marge enrotllat cap endins de jove. Gira’l: les làmines són blanques o de color crema, baixen molt pel peu i sovint s’hi ramifiquen a prop. El peu és blanc, ple i robust, central o excèntric, sense anell, i s’eixampla cap a la base. La carn és blanca, gruixuda i ferma, i no canvia de color; l’olor és suau, fúngica i agradable.",
      "El peu pot ser lateral o gairebé central, i l’arrel on creix sovint queda enterrada. Sense veure el substrat, la identificació no és segura, però el substrat tampoc no basta: l’arrel herbàcia, el barret, les làmines i el peu han de coincidir en cada exemplar.",
    ],
    lookalikes: {
      heading: "Gírgola de panical o bolet d’olivera: com no confondre’ls",
      text: "La gírgola (Pleurotus ostreatus) també és comestible, però creix en flotes sobre fusta de planifolis i sol tenir un peu lateral molt curt. La confusió que cal descartar és amb el bolet d’olivera (Omphalotus olearius), que és tòxic i pot causar vòmits i diarrees intensos: és taronja, té les làmines fines també taronges i creix en feixos sobre fusta o arrels llenyoses. Si els exemplars formen feixos taronges sobre fusta, descarta’ls. En castellà, la gírgola de panical es coneix com a seta de cardo.",
    },
    ecology: [
      "La gírgola de panical té dues temporades. A la tardor surt de setembre a desembre, amb el pic a l’octubre i un bon novembre; a la primavera en poden sortir de març a maig, i el maig és el millor mes. Viu en prats, pastures, gespes i matollars oberts i assolellats, sobre les arrels mortes del panical i d’altres umbel·líferes, des del nivell del mar fins als 1.600 metres. Prefereix sòls calcaris o rics en bases, de neutres a alcalins i ben drenats, en terrenys plans o de pendent moderat.",
      "El perfil de l’espècie encaixa amb els prats calcaris del Prepirineu, la Catalunya Central, les serralades costeres i prelitorals, l’Empordà, els Ports i els sistemes interiors. El panical no forma part de la coberta forestal que fa servir el mapa, i per això la predicció d’aquesta espècie és especialment orientativa. Són zones amb hàbitat compatible, no punts de collida.",
      "Surt dies o setmanes després que les pluges de primavera o de tardor rehidratin les arrels mortes, amb temperatures d’entre 9 i 20 °C i nits fresques o suaus. Tolera els espais oberts i assolellats, però no la sequera persistent: la sequera, el vent sec i les gelades n’aturen la sortida.",
    ],
    cuisine: [
      "La gírgola de panical té un gust intens, lleugerament dolç i amb notes de fruita seca, i una carn gruixuda, molt ferma i carnosa, agradable a la mossegada. Es comporta molt bé a la planxa i a la brasa, i també va bé en arrossos i guisats.",
      "Neteja la base terrosa i revisa l’estat del substrat. Talla pel llarg els exemplars grossos i cou-los completament. No en cullis en vorals ni en terrenys contaminats.",
      "Guarda les gírgoles de panical a la nevera, entre 1 i 4 °C, i cuina-les d’un a tres dies després de collir-les, com recomana l’ACSA. Per conservar-les més temps, congela-les després de saltar-les o asseca-les tallades a làmines.",
    ],
  },
  "morchella-esculenta": {
    ecologyHeading: "On trobar múrgoles i quan surten",
    identification: [
      "La múrgola, també coneguda com a rabassola o barret de capellà, és un bolet de primavera amb un barret que recorda un rusc d’abelles. Fa de 6 a 15 cm d’alçada. El barret és ovoide o arrodonit, de color de mel a bru groguenc, i està cobert d’alvèols profunds separats per crestes irregulars; no té làmines ni porus. El peu és blanc o crema, curt i granulós. Talla l’exemplar pel llarg: la múrgola és completament buida, de la punta del barret a la base del peu, i el barret s’uneix al peu per la base. La carn és prima, fràgil i cerosa, i l’olor, suau i fúngica.",
      "El color i la forma dels alvèols varien molt, i ni tan sols la morfologia permet sempre separar les espècies del grup. Per això, el barret alveolat és només el primer indici: comprova en cada exemplar, amb un tall longitudinal, que sigui buit de dalt a baix i que el barret s’uneixi al peu per la base.",
    ],
    lookalikes: {
      heading: "Múrgola o bolet de greix: diferències",
      text: "La confusió perillosa és amb el bolet de greix o falsa múrgola (Gyromitra esculenta), que surt la mateixa temporada. Té el barret plegat com un cervell, no alveolat com una bresca, de color bru castany a rogenc fosc i unit al peu en diversos punts, i per dins té cambres i envans, mai un buit continu. Pot causar intoxicacions greus o mortals, i ni l’assecat ni la cocció no n’eliminen la toxina de manera fiable. La verpa (Verpa bohemica) tampoc no es recomana, perquè pot causar trastorns gastrointestinals: el barret penja unit només a la part superior del peu, i l’interior pot tenir un material cotonós. Cap exemplar amb forma de cervell no s’ha de menjar.",
    },
    ecology: [
      "Les múrgoles surten a la primavera: el pic és a l’abril, el maig continua sent un bon mes, i en poden sortir des del març fins al juny. Creixen en boscos de ribera i de planifolis, clarianes i vores de bosc, sovint amb freixe de fulla petita, pollancre, om o pomera, i també en parcs, horts vells i terrenys alterats, des del nivell del mar fins als 1.600 metres. Prefereixen fondalades i orientacions fresques, i sòls rics en humus, de neutres a calcaris, humits però no entollats, sovint de graves al·luvials o de terra remoguda.",
      "El perfil de l’espècie encaixa amb gairebé tot el país: els Pirineus i el Prepirineu, la Catalunya Central, les serralades costeres i prelitorals, l’Empordà, el Montseny, els Ports i els sistemes interiors. La sortida és efímera i poc fidel al lloc, i el mapa no representa del tot els incendis, les remocions de terra ni la vegetació de ribera. Són zones amb hàbitat compatible, no punts de collida.",
      "La múrgola necessita que les pluges d’hivern i de primavera mantinguin el sòl humit de manera continuada, amb temperatures d’entre 7 i 17 °C i nits fresques sense gelades intenses. El moment en què surt és molt variable: depèn de com s’escalfa el sòl i de les alteracions de cada lloc, i a la muntanya el desglaç la pot precedir. Una gelada tardana la pot endarrerir o interrompre; la sequera i el vent, que asseca els exemplars fràgils, l’aturen, i quan arriba la calor la temporada s’acaba de pressa.",
    ],
    cuisine: [
      "A la cuina, la múrgola és excel·lent: té un gust profund, torrat i lleugerament fumat, i una textura elàstica i alveolada que reté molt bé les salses. S’aprofita en salses de crema, guisats, plats d’ous i farcits.",
      "Només és comestible amb condicions: no la mengis mai crua ni poc feta. Obre-la i neteja bé totes les cavitats, i cou-la entre 20 i 30 minuts, o bull-la 15 minuts i llença l’aigua abans d’acabar el plat. Tampoc no convé menjar-ne grans quantitats en dies seguits.",
      "L’ACSA recomana guardar els bolets a la nevera, entre 1 i 4 °C, i cuinar-los d’un a tres dies després de collir-los. Per conservar múrgoles més temps, asseca-les o congela-les un cop cuinades. L’assecat no substitueix la cocció: un cop rehidratades, també les has de cuinar del tot.",
    ],
  },
  "craterellus-cornucopioides": {
    ecologyHeading: "On trobar trompetes de la mort i quan surten",
    identification: [
      "La trompeta de la mort té forma d’embut profund i és tota fosca, de negre a gris fosc, amb tons bruns. Fa de 5 a 12 cm d’alçada. Mira la cara exterior de l’embut: és grisenca i llisa o finament arrugada, sense làmines. El peu continua l’embut sense cap separació i és buit. La carn és molt prima i flexible, una mica coriàcia, i l’olor, agradable i subtil.",
      "Com que és tan fosca, es camufla sobre la fullaraca i costa de veure. Amb temps sec s’encongeix i es pot tornar gairebé negra, i amb la humitat només es rehidrata en part: per això, amb el color no n’hi ha prou. Comprova en cada exemplar que l’embut continuï fins al peu buit i que la cara exterior no tingui plecs marcats.",
    ],
    lookalikes: {
      heading: "Trompeta de la mort, trompeta cendrosa i orella de gat negra",
      text: "La trompeta cendrosa (Craterellus cinereus) s’hi assembla molt, però té plecs més evidents a la cara exterior i tons més cendrosos; també és comestible i no se’n coneix toxicitat. L’orella de gat negra (Helvella lacunosa) és fosca com la trompeta, però té el barret lobulat i el peu clarament costellat, i no forma una trompeta contínua; no es recomana menjar-la sense coneixement especialitzat. El color fosc és comú a totes tres: revisa la forma, la cara exterior i el peu de cada exemplar.",
    },
    ecology: [
      "Les trompetes de la mort surten de setembre a desembre, amb el pic a l’octubre i el novembre. Creixen en fagedes, rouredes humides i alzinars frescals, amb faig, roure i alzina, entre 100 i 1.600 metres. Busquen l’obaga i l’ombra: les acumulacions de fullaraca profunda i les fondalades, sobre sòls de neutres a moderadament àcids, rics en matèria orgànica, que retenen bé l’aigua.",
      "Les guies de zona en descriuen l’hàbitat en boscos humits i ombrívols. Al Ripollès, les obagues amb faig o roure de Sant Pau de Segúries, a la transició forestal del Capsacosta. Al Montseny, les rouredes humides i la fullaraca dels vessants de Viladrau. A les Guilleries, les castanyedes i els alzinars ombrívols de la vall d’Osor. A la Garrotxa, la fageda d’en Jordà i les rouredes humides de Santa Pau. I a Prades, les fondalades de l’obaga del bosc de Poblet. Són zones amb hàbitat compatible, no punts de collida.",
      "Necessiten una tardor plujosa i que la fullaraca es mantingui humida durant setmanes, amb temperatures suaus, entre 8 i 17 °C; poden trigar de dies a setmanes a sortir. A les Guilleries són dels últims bolets a aparèixer i dels que més aguanten el fred, i al Montseny i a Santa Pau es poden allargar fins al desembre si no hi ha gelades fortes. Una nova sequera, el vent sec o les gelades persistents n’aturen la sortida.",
    ],
    cuisine: [
      "La trompeta de la mort té un gust profund, fumat i terrós, i una aroma potent que es concentra quan s’asseca. La carn és prima i flexible, i en els exemplars vells pot resultar una mica tenaç. La Societat Catalana de Micologia la situa entre els comestibles molt bons. Va bé en salses, arrossos i guisats, i seca i en pols dona aroma a altres plats.",
      "Obre l’embut per treure’n la terra i els petits invertebrats; renta-la només si cal i eixuga-la de seguida. Descarta les trompetes massa seques, florides o que facin una olor estranya, i cou-la sempre del tot.",
      "Segons l’ACSA, els bolets s’han de guardar a la nevera, entre 1 i 4 °C, i cuinar d’un a tres dies després de collir-los. Si vols conservar les trompetes més temps, asseca-les; també les pots reduir a pols i guardar en un pot hermètic.",
    ],
  },
  "cyclocybe-cylindracea": {
    ecologyHeading: "On trobar pollancrons i quan surten",
    identification: [
      "El pollancró, també conegut com a bolet de pollancre o gírgola de pollancre, creix en flotes compactes sobre troncs, soques i arrels de pollancres, salzes i altres planifolis. El barret fa de 4 a 15 cm; és hemisfèric de jove, després convex i finalment estès, de color bru fosc al principi, que s’aclareix cap al crema des del marge, i sovint clivellat. Gira’l: les làmines són adnates, primer pàl·lides i després de color tabac o brunes per l’esporada, que és bruna. El peu és de blanc a ocraci, fibrós i sovint corbat, i té un anell membranós persistent. La carn és blanca, gruixuda al barret i fibrosa al peu, i l’olor és fúngica, agradable i una mica vinosa.",
      "El barret s’aclareix molt amb l’edat, i si la fusta queda enterrada pot semblar que el bolet surt de terra. Créixer sobre fusta no garanteix res: comprova en cada exemplar l’anell, l’esporada bruna i el substrat, i no cullis cap flota bruna sense haver-ho fet.",
    ],
    lookalikes: {
      heading: "Pollancró i galerina metzinosa: com no confondre’ls",
      text: "El risc greu és la galerina metzinosa (Galerina marginata), que pot créixer sobre la mateixa fusta i és mortal perquè conté amatoxines. Sol ser més petita i rovellada, amb el peu fibril·lós i olor farinosa. El bolet de pi bord (Hypholoma fasciculare) pot causar una intoxicació gastrointestinal: té tons groc sofre, làmines verdoses i un gust molt amarg, i generalment no té l’anell membranós del pollancró. Per això, no barregis a la collita cap altre bolet petit de fusta. El pollancró també es coneix com a Agrocybe aegerita, i en castellà, com a seta de chopo.",
    },
    ecology: [
      "El pollancró té dues temporades. A la tardor surt de setembre a desembre, amb el pic a l’octubre i un bon novembre; a la primavera, de març a juny, amb el maig com a millor mes. Creix sobre fusta viva o morta i sobre arrels enterrades de pollancres, salzes, oms, aurons i saücs, des del nivell del mar fins als 1.400 metres, en boscos de ribera i altres boscos humits de planifolis, plantacions i parcs, en terrenys plans o de pendent suau. El sòl no hi influeix: tot depèn de la fusta.",
      "Com que segueix la fusta, el perfil de l’espècie encaixa amb gairebé tot el país: els Pirineus i el Prepirineu, la Catalunya Central, les serralades costeres i prelitorals, l’Empordà, el Montseny, els Ports i els sistemes interiors. La coberta forestal del mapa no representa bé les soques, els arbres urbans ni la fusta enterrada, i per això la predicció és orientativa. Són zones amb hàbitat compatible, no punts de collida.",
      "Surt dies o setmanes després que la pluja o les crescudes rehidratin la fusta, amb temperatures d’entre 10 i 23 °C; a la ribera, la mateixa humitat de l’entorn també hi ajuda. Tolera la calor si la fusta reté la humitat, però la sequera, el vent sec, que asseca la fusta, i les gelades n’aturen la sortida.",
    ],
    cuisine: [
      "El pollancró és un comestible tradicional molt bo per l’aroma i la consistència dels exemplars joves. Té un gust aromàtic i terrós, amb un punt de fruita seca, i una textura carnosa al barret i més fibrosa al peu. S’aprofita en guisats, arrossos, saltats i truites.",
      "Tria exemplars joves i ferms, retira la part fibrosa del peu i cou-los completament. Revisa la collita i aparta qualsevol bolet petit de fusta que no sigui pollancró, perquè algunes galerines contenen amatoxines.",
      "L’ACSA recomana guardar els bolets a la nevera, entre 1 i 4 °C, i cuinar-los d’un a tres dies després de collir-los. Per conservar pollancrons més temps, congela’ls un cop cuinats o fes-ne una conserva esterilitzada seguint un procediment segur.",
    ],
  },
  "suillus-luteus": {
    ecologyHeading: "On trobar mollerics i quan surten",
    identification: [
      "El molleric de calceta és un bolet de porus de pineda, amb el barret molt viscós i un anell al peu. El barret fa de 4 a 12 cm, és hemisfèric i després convex, de color bru castany, amb la cutícula llisa, molt viscosa i fàcil de pelar. Gira’l: per sota té porus fins, grocs com la llimona de jove i més olivacis amb l’edat, sense tons vermells. Mira el peu: és blanc o groguenc, amb un anell membranós blanc o violaci i puntets glandulars per sobre. La carn és blanca o groc pàl·lid, no canvia de color al tall, és ferma de jove i aviat esponjosa, i l’olor és suau i agradable.",
      "En temps sec el barret perd part de la viscositat, i en els exemplars vells l’anell pot quedar enganxat al peu. L’anell és el tret que el separa dels altres mollerics, però tot sol no n’hi ha prou: comprova també el barret, els porus i que surti sota pins.",
    ],
    lookalikes: {
      heading: "Molleric de calceta o molleric granellut: com distingir-los",
      text: "El molleric de calceta també es coneix com a molleric calçat o pinetell de calceta, i en castellà com a boleto anillado. El molleric granellut (Suillus granulatus) no té anell i té petites gotes o granulacions glandulars a la part alta del peu; pot causar intolerància digestiva i s’ha de cuinar bé. El molleric rosat (Suillus collinitus) tampoc no té anell, té fibril·les radials al barret i sovint la base del peu rosada; és un comestible de qualitat modesta un cop retirada la cutícula i cuinat. Tots tres només són comestibles amb condicions: revisa cada exemplar, pela’ls i cou-los bé.",
    },
    ecology: [
      "Els mollerics de calceta surten de setembre a novembre, amb el pic a l’octubre; a l’agost en poden sortir els primers, i al desembre, els últims. Creixen sota pins, especialment pi roig i pinassa, en pinedes i altres boscos de coníferes, des del nivell del mar fins a 1.900 metres. Prefereixen les pinedes joves o clares i els marges de pineda, sobretot en indrets frescos, sobre sòls d’àcids a neutres, sovint sorrencs, silícics i pobres en nutrients, amb bon drenatge.",
      "El perfil de l’espècie encaixa amb pinedes de gairebé tot el país: els Pirineus i el Prepirineu, la Catalunya Central, les serralades costeres i prelitorals, l’Empordà, el Montseny, els Ports i els sistemes interiors. La resposta varia entre pinedes naturals i repoblacions i segons el tipus de sòl. Són zones amb hàbitat compatible, no punts de collida.",
      "Necessiten pluges del final de l’estiu i de la tardor que mantinguin humida la capa de pinassa, seguides de temps fresc o suau, entre 8 i 18 °C, i sovint surten els dies o les setmanes següents. El vent, que asseca de pressa la pinassa, la calor seca i les gelades n’aturen la sortida.",
    ],
    cuisine: [
      "El molleric de calceta és un comestible modest i només amb condicions: pot causar molèsties digestives, sobretot si no es pela o se’n menja massa. Té un gust suau i poc persistent i una carn tendra i esponjosa, que resulta viscosa si no se’n treu la cutícula. S’aprofita en guisats, sopes i barreges de bolets.",
      "Pela’n completament la cutícula viscosa i, en els exemplars madurs, retira’n els porus. Cou-lo bé i, el primer cop, menja’n una ració petita.",
      "L’ACSA recomana guardar els bolets a la nevera, entre 1 i 4 °C, i cuinar-los d’un a tres dies després de collir-los. Per conservar-lo més temps, escalda’l i congela’l; si ja l’has cuinat, guarda’l a la nevera i menja’l aviat.",
    ],
  },
  "boletus-aereus": {
    ecologyHeading: "On trobar ceps negres i quan surten",
    identification: [
      "El cep negre és el cep més fosc del grup. El barret fa de 7 a 20 cm, és d’un bru molt fosc, gairebé negre, amb tons de bronze, i de jove té la superfície seca o vellutada. Gira’l: per sota té porus blancs que es tornen de color oliva amb la maduresa, sense cap to vermell. El peu és clar i robust, amb un reticle pàl·lid. Talla’l: la carn és blanca, ferma i no canvia de color. L’olor és suau i agradable, i tot el bolet és compacte.",
      "En temps sec el barret es pot esquerdar, i la humitat n’intensifica els tons foscos. Comprova en cada exemplar que els porus no tinguin cap to vermell, que el reticle sigui clar i que la carn no blavegi al tall. El barret fosc orienta, i l’alzina o la surera a prop també, però cap d’aquests indicis no l’identifica tot sol: cal que hi encaixin tots els trets.",
    ],
    lookalikes: {
      heading: "Cep negre o sureny, i com no confondre’l amb el matagent",
      text: "En aquesta guia, sureny o siureny negre designa el cep negre (Boletus aereus), però segons la comarca també es diu surenc, sureny o siureny al cep (Boletus edulis): per això, amb el nom no n’hi ha prou per saber de quin cep es parla. Entre els ceps no hi ha perill: el cep té el barret bru castany amb el marge més clar i prefereix boscos frescos, i el cep d’estiu (Boletus reticulatus) és més clar i sovint té un reticle molt marcat a tot el peu; tots dos són comestibles excel·lents. El que cal descartar és el matagent (Rubroboletus satanas), que creix en alzinars i rouredes sobre sòls calcaris, com el cep negre: té els porus vermells, el peu de colors vius, groc i vermell, i la carn que blaveja al tall. És tòxic i pot provocar una intoxicació gastrointestinal intensa. Si un exemplar té algun to vermell als porus o la carn li blaveja, deixa’l.",
    },
    ecology: [
      "Els ceps negres surten del final de l’estiu a la tardor: el calendari va d’agost a novembre, amb el pic a l’octubre, i el setembre també és un bon mes. Són els ceps mediterranis, més termòfils que els de muntanya: creixen en alzinars, suredes i rouredes mediterrànies, amb alzina, surera i roure martinenc, entre 50 i 1.000 metres. Busquen l’alzinar madur amb sòl profund i ben drenat, de neutre a lleugerament àcid, als solells temperats i a les fondalades.",
      "Les guies de zona en descriuen l’hàbitat al Montnegre i el Corredor, als alzinars i les suredes més frescos de l’entorn de Vallgorguina, sobretot als vessants silícics amb sòl profund i ombra parcial. La guia dels ceps també els associa a l’Empordà, les Serralades Costeres i els Ports, i el perfil de l’espècie inclou les Serralades Prelitorals. Són zones amb hàbitat compatible, no punts de collida.",
      "El cep negre necessita una pluja efectiva sobre un sòl que ja s’hagi rehidratat, seguida de temperatures suaus, entre 14 i 24 °C, i pot trigar de dies a setmanes a sortir, segons la calor. Al Montnegre i el Corredor respon a la calor humida de setembre i octubre. Els estius molt secs en redueixen la temporada; els episodis secs, la calor intensa i el vent sec la interrompen, i el fred humit persistent l’atura.",
    ],
    cuisine: [
      "El cep negre és un dels ceps més apreciats i, segons el consens de la Societat Catalana de Micologia, un comestible excel·lent. Té un gust profund i torrat, amb notes de fruita seca, i de jove la carn és molt ferma i agradable a la mossegada. Va bé a la planxa, rostit, en arrossos i en salses.",
      "Neteja’l sense posar-lo en remull i separa’n els tubs quan siguin massa tous. Abans de cuinar-lo, torna a comprovar que no tingui porus vermells ni carn que blavegi, i cuina’l de manera uniforme.",
      "A la nevera aguanta poc: l’ACSA recomana guardar els bolets entre 1 i 4 °C i cuinar-los d’un a tres dies després de collir-los, i els ceps es guarden millor en un recipient obert o en un cistell que en una bossa tancada. Per conservar-lo més temps, asseca’l o congela’l després de saltar-lo.",
    ],
  },
  "suillus-granulatus": {
    ecologyHeading: "On trobar mollerics granelluts i quan surten",
    identification: [
      "El molleric granellut és un molleric de pineda sense anell. El barret fa de 4 a 12 cm; primer és hemisfèric, després convex i finalment estès, de bru groguenc a castany, molt viscós amb humitat i amb una cutícula que es pela. Gira’l: els porus són grocs i petits, i de jove sovint deixen anar gotes blanquinoses o lletoses. Mira el peu: és groc pàl·lid, cilíndric, sense anell i cobert de petits grànuls glandulars a la part alta. La carn és groc pàl·lid, tova i generalment no canvia de color, i l’olor és suau i resinosa.",
      "Les gotes dels porus desapareixen en temps sec o amb l’edat, i els porus s’enfosqueixen; per això, no sempre les veuràs. Comprova alhora que no tingui anell, que el peu sigui granellut i que surti sota pins: un sol tret no l’identifica.",
    ],
    lookalikes: {
      heading: "Molleric granellut o molleric de calceta: com distingir-los",
      text: "El molleric granellut també es coneix com a molleric, moixí, pinetell o cabreta, i en castellà com a boleto granulado, però cap d’aquests noms no identifica un exemplar. El molleric de calceta (Suillus luteus) té un anell membranós ben desenvolupat al peu i el barret habitualment més fosc. El molleric rosat (Suillus collinitus) sovint té fibres radials al barret i la base del peu rosada. Tots tres només són comestibles amb condicions i poden causar molèsties digestives: revisa cada exemplar, pela’ls i cou-los bé.",
    },
    ecology: [
      "Els mollerics granelluts tenen dues temporades. A la tardor surten de setembre a desembre, amb el pic a l’octubre, i el novembre també és un bon mes; a la primavera en poden sortir d’abril a juny, sobretot al maig, i a l’estiu apareixen de manera esporàdica. Creixen sota pi blanc, pi pinyer, pinassa i pi roig, en pinedes obertes, vores i plantacions, especialment amb pins joves, des del nivell del mar fins a 2.100 metres, sobre sòls d’àcids a alcalins, silícics o calcaris, sovint pobres o remoguts.",
      "El perfil de l’espècie encaixa amb pinedes de gairebé tot el país: els Pirineus i el Prepirineu, la Catalunya Central, les serralades costeres i prelitorals, l’Empordà, el Montseny, els Ports i els sistemes interiors. Com que sovint surt en repoblacions joves, que el mapa forestal no sempre recull bé, pot aparèixer en pinedes que el mapa no preveu. Són zones amb hàbitat compatible, no punts de collida.",
      "Surten de manera oportunista, entre pocs dies i unes setmanes després d’una pluja efectiva sobre el sòl de pineda, amb temperatures d’entre 9 i 22 °C. Toleren la calidesa si el sòl es manté humit, però la sequera, el vent sec i les gelades n’aturen la sortida.",
    ],
    cuisine: [
      "El molleric granellut és un comestible modest i només amb condicions: la cutícula pot resultar laxant o indigesta. Té un gust suau i poc persistent i una carn tendra i esponjosa, que es torna flonja de pressa. S’aprofita en guisats, cremes i barreges de bolets.",
      "Aprofita els exemplars joves. Treu-los completament la cutícula viscosa, i també els porus si són tous o molt madurs. No els mengis mai crus: cou-los del tot i menja’n poca quantitat.",
      "Per menjar-lo fresc, l’ACSA recomana guardar-lo a la nevera, entre 1 i 4 °C, i cuinar-lo d’un a tres dies després de collir-lo. Per conservar-lo més temps, congela’l després de cuinar-lo.",
    ],
  },
  "craterellus-tubaeformis": {
    ecologyHeading: "On trobar falsos camagrocs i quan surten",
    identification: [
      "El fals camagroc és una petita trompeta bruna de peu buit que surt entre la molsa. Fa de 3 a 10 cm d’alçada, amb un barret de 2 a 6 cm, de bru grisenc a ocre, enfonsat al centre i finalment en forma d’embut o perforat, amb el marge prim i ondulat. Gira’l: per sota té plecs gruixuts i bifurcats, de gris a beix groguenc, que baixen molt pel peu; no són làmines veritables. El peu és prim, llis, buit i sovint aplanat, de color groc o ocre apagat. La carn és molt prima, flexible i pàl·lida, i l’olor, suau i agradable.",
      "Amb la humitat el peu pot perdre el groc i el barret s’enfosqueix, i els exemplars vells queden molt prims i ondulats. Mira si el centre del barret és perforat i comunica amb el peu buit. Els plecs marcats el separen del camagroc, però cap tret no basta tot sol: revisa cada exemplar, perquè entre la molsa hi pot haver bolets de làmines veritables.",
    ],
    lookalikes: {
      heading: "Fals camagroc o camagroc: com distingir-los",
      text: "Malgrat el nom, el fals camagroc és comestible. El camagroc (Craterellus lutescens) té la cara inferior gairebé llisa o només venosa i el peu d’un groc més viu; el fals camagroc té plecs marcats i un conjunt més gris i apagat. Tots dos són comestibles i sovint surten al mateix racó. El que cal descartar és el fals rossinyol (Hygrophoropsis aurantiaca), de làmines fines, nombroses i separables i carn més taronja, que sovint creix sobre restes de fusta i pot causar molèsties digestives, i sobretot el cortinari mortal (Cortinarius rubellus), de barret rogenc, làmines veritables rovellades, peu sòlid i restes de cortina, que pot provocar una intoxicació renal mortal. Qualsevol exemplar amb làmines veritables s’ha de deixar fora del cistell.",
    },
    ecology: [
      "Els falsos camagrocs surten de setembre a desembre, amb el pic a l’octubre, i el setembre i el novembre també són bons mesos; al gener encara en poden sortir. Creixen en pinedes de muntanya, altres pinedes, fagedes i boscos de planifolis, amb pi roig, pi negre, avet i faig, entre 250 i 1.500 metres. Busquen l’obaga i l’ombra: les molses, les fondalades i la fusta molt descomposta, sobre sòls àcids, pobres en nutrients i rics en humus.",
      "El perfil de l’espècie encaixa amb boscos dels Pirineus, el Prepirineu, la Catalunya Central, les serralades prelitorals, el Montseny i els sistemes interiors. Comparat amb el camagroc, puja més als boscos de muntanya. Són zones amb hàbitat compatible, no punts de collida.",
      "Necessiten que la molsa i l’humus es mantinguin humits durant setmanes, no un sol xàfec, i temperatures fresques o fredes, entre 5 i 15 °C. Aguanten més el fred que el camagroc i allarguen la temporada, però la sequera, el vent sec i les gelades persistents la interrompen, i la neu en pot marcar el final.",
    ],
    cuisine: [
      "El fals camagroc té un gust fúngic i lleugerament afruitat, més intens quan és sec, i una carn prima, flexible i una mica elàstica. La Societat Catalana de Micologia el considera un bon comestible. És útil en salses, sopes i arrossos, i un cop sec es pot reduir a pols.",
      "Obre’n el peu buit per treure’n la molsa i la terra, revisa’ls un per un perquè no s’hi barregi cap petit cortinari, i cou-lo sempre del tot.",
      "L’ACSA recomana guardar els bolets a la nevera, entre 1 i 4 °C, i cuinar-los d’un a tres dies després de collir-los. Per conservar-lo més temps, asseca’l o congela’l després de saltar-lo.",
    ],
  },
  "marasmius-oreades": {
    ecologyHeading: "On trobar carreretes i quan surten",
    identification: [
      "El camasec, també conegut com a carreretes, és un bolet petit de prat que sovint forma arcs o rotllanes entre l’herba. El barret fa de 2 a 6 cm, és convex i després aplanat, sovint amb un petit mamelló, de color crema, ocre o bru clar. Gira’l: les làmines són clares, gruixudes i força espaiades, lliures o gairebé lliures del peu. Torça el peu: és prim, llis, tenaç i fibrós, i es doblega abans de trencar-se. La carn és prima i clara al barret, i l’olor, agradable i lleugerament ametllada.",
      "El barret s’aclareix molt quan s’asseca i recupera la flexibilitat amb la humitat; per això, amb el color no n’hi ha prou. La rotllana tampoc no confirma l’espècie, perquè també en formen bolets tòxics: comprova en cada exemplar les làmines espaiades i el peu tenaç. És una identificació difícil.",
    ],
    lookalikes: {
      heading: "Camasec o candeleta de prat: com no confondre’ls",
      text: "La candeleta de vorada o de prat, també dita clitocibe blanquinosa (Clitocybe rivulosa), pot créixer als mateixos prats i a les mateixes rotllanes que el camasec, fins i tot barrejada en un mateix cercle. Té el barret blanc o crema, amb una capa empolsinada que es clivella en zones concèntriques, les làmines denses, estretes i una mica decurrents, i el peu fràgil, que es trenca en lloc de doblegar-se. Conté muscarina i pot provocar una intoxicació greu, amb sudoració, salivació i alteracions cardíaques que requereixen atenció mèdica. El camasec de turó (Marasmius collinus) és molt semblant, però té el peu menys tenaç; no es recomana menjar-lo sense identificació experta. Revisa cada exemplar, no la rotllana: si no el pots separar amb certesa, no te’l mengis.",
    },
    ecology: [
      "El camasec té dues temporades. A la primavera surt d’abril a juny, amb el pic al maig, i a la tardor torna de setembre a novembre, amb el pic a l’octubre; al març i al juliol també en poden sortir alguns. No depèn de cap arbre: creix en prats, pastures, gespes i vores de camí, en terreny pla o poc inclinat i sovint en rotllanes, des del nivell del mar fins a 2.000 metres, sobre sòls de lleugerament àcids a neutres, amb herba i matèria orgànica.",
      "Com que segueix l’herba més que no pas el bosc, el perfil de l’espècie encaixa amb gairebé tot el país: els Pirineus i el Prepirineu, la Catalunya Central, l’Empordà, el Montseny, les serralades costeres i prelitorals, els Ports i els sistemes interiors. El reg i la gestió dels prats poden alterar molt on i quan surt. Són zones amb hàbitat compatible, no punts de collida.",
      "Pot sortir pocs dies després d’una pluja regular que humitegi la capa superficial del prat, amb temperatures suaus, entre 10 i 22 °C. La sequera l’interromp de pressa, i el sol intens, el vent sec i les gelades també n’aturen la sortida.",
    ],
    cuisine: [
      "El camasec és petit, però molt aromàtic, de gust dolç i ametllat, intens quan és sec. El consens micològic català el classifica entre els comestibles excel·lents. El barret és flexible i el peu, molt tenaç i fibrós. S’aprofita en truites, sopes, salses i arrossos.",
      "Treu-ne el peu fibrós i revisa un per un els exemplars collits en rotllanes. Cou els barrets del tot. No te’l mengis si no el pots separar amb certesa dels petits bolets de prat tòxics.",
      "Guarda’ls a la nevera, entre 1 i 4 °C, i cuina’ls d’un a tres dies després de collir-los, tal com recomana l’ACSA. Assecar-lo és una de les millors maneres de conservar-lo, perquè en concentra el gust; també el pots congelar després de cuinar-lo.",
    ],
  },
  "russula-virescens": {
    ecologyHeading: "On trobar llores verdes i quan surten",
    identification: [
      "La llora verda és una rússula robusta de barret verd grisenc, amb la cutícula esquerdada en plaques que dibuixen un mosaic. El barret fa de 5 a 15 cm, és hemisfèric i després s’aplana o s’enfonsa al centre. Gira’l: les làmines són blanques o de color crema pàl·lid, denses i fràgils. Desenterra el peu sencer: és blanc, cilíndric i compacte de jove, i no té ni anell ni volva. Trenca’n un tros: la carn és blanca i gruixuda, de textura granulosa, i es trenca com el guix. L’olor és suau i poc distintiva.",
      "El mosaic pot ser poc visible en exemplars molt joves o molls, i un barret verd no és cap garantia: la farinera borda, mortal, també pot tenir colors verdosos. Per això, amb el color i el mosaic no n’hi ha prou. La identificació és difícil: comprova en cada exemplar la carn trencadissa, el peu sense anell i la base sense volva, i si en falla un, descarta’l.",
    ],
    lookalikes: {
      heading: "Llora verda o farinera borda: com no confondre-les",
      text: "La confusió que cal evitar és la farinera borda (Amanita phalloides), mortal per amatoxines. Totes dues poden tenir el barret verdós, totes dues tenen les làmines blanques, surten en rouredes, fagedes, castanyedes i alzinars, i poden coincidir de l’agost a l’octubre: ni el color, ni les làmines, ni el bosc, ni el mes no les separen. El que les separa és el peu i la carn. La farinera borda té un anell membranós penjant, una volva blanca en forma de sac a la base, que sovint queda enterrada, i la carn fibrosa; la llora verda no té ni anell ni volva, i la carn es trenca com el guix. Desenterra sempre el bolet sencer: si hi veus volva o anell, o la carn no es trenca, no el cullis per menjar i no el barregis amb la resta de la collita. La llora de làmines forcades (Russula heterophylla) té el barret verd llis o només finament clivellat i les làmines més forcades; és comestible quan la identificació és segura. Davant de qualsevol ingestió sospitosa, truca al 061.",
    },
    ecology: [
      "Les llores verdes surten de l’estiu a la tardor: el calendari va de juny a octubre, amb el pic al setembre, i l’agost també és un bon mes. Creixen en rouredes, fagedes, castanyedes i alzinars frescos, amb roure martinenc, alzina, faig i castanyer, entre 100 i 1.500 metres. Busquen boscos madurs de planifolis i clarianes protegides, sobre sòls àcids o neutres, silícics o descarbonatats, frescos i ben drenats.",
      "El perfil de l’espècie inclou els Prepirineus, la Catalunya Central, les Serralades Prelitorals, l’Empordà, el Montseny, els Ports i els Sistemes interiors, sempre en boscos de planifolis sobre sòls àcids o neutres. Són zones amb hàbitat compatible, no punts de collida.",
      "La llora verda respon a les tempestes d’estiu i a les pluges del principi de tardor quan el sòl del bosc ja s’ha rehidratat, amb temperatures suaus, entre 13 i 23 °C, i pot trigar de dies a setmanes a sortir. Tolera la calor si el sòl es manté humit, però la producció d’estiu depèn molt de les tempestes locals. La sequera, el vent sec o el fred la interrompen, i les gelades l’aturen.",
    ],
    cuisine: [
      "El consens micològic considera la llora verda una llora molt bona, ferma i de gust agradable: dolç i suau, amb notes de fruita seca. La carn és ferma però trencadissa, com la de totes les rússules. Va bé a la planxa, saltada, en guisats i en arrossos.",
      "La preparació comença al bosc: extreu el bolet sencer per comprovar que no té volva, i a la cuina torna a revisar en cada exemplar la carn trencadissa i l’absència d’anell. Una confusió amb una farinera borda pàl·lida o verdosa pot ser mortal, i no n’hi ha prou amb la fitxa ni amb una foto. Cuina-la completament.",
      "Es menja millor fresca: l’ACSA recomana guardar els bolets a la nevera, entre 1 i 4 °C, i cuinar-los d’un a tres dies després de collir-los. Per conservar-la més temps, congela-la després de saltar-la.",
    ],
  },
  "hygrophorus-marzuolus": {
    ecologyHeading: "On trobar marçots i quan surten",
    identification: [
      "El marçot, també anomenat bolet de neu o llenega de primavera, és un higròfor robust que surt a finals d’hivern i a la primavera, sovint mig enterrat entre la fullaraca o prop de clapes de neu. El barret fa de 4 a 12 cm; és convex i després s’estén o es torna irregular, blanquinós de jove i cada cop més gris, fins al gris pissarra, llis i una mica viscós quan fa humitat. Gira’l: les làmines són blanques, gruixudes, espaiades i ceroses, d’adnates a decurrents. El peu és curt, gruixut i ple, de blanc a grisenc, sense anell ni volva. La carn és blanca, compacta i no canvia de color, i l’olor és feble i agradable.",
      "Com que sovint queda gairebé enterrat i els exemplars joves són molt pàl·lids, has de treure’l sencer, amb la base, abans de descartar que sigui una amanita. Un barret gris no l’identifica: les làmines ceroses i espaiades, el peu sense anell ni volva i la temporada han de coincidir.",
    ],
    lookalikes: {
      heading: "Marçot, llenega olorosa i entoloma: com no confondre’ls",
      text: "La llenega olorosa (Hygrophorus agathosmus) és comestible, però fa una olor marcada d’ametlla amarga i surt sobretot a la tardor sota coníferes, no a finals d’hivern. La confusió que cal evitar és amb l’entoloma de peu fibrós (Entoloma hirtipes), que pot causar una intoxicació gastrointestinal: és més esvelt, les làmines no són ceroses i es tornen rosades, i l’esporada és rosa. Com que el marçot surt mig enterrat, cal veure’l sencer, amb la base, per descartar també una amanita. Si un exemplar no té les làmines blanques, gruixudes i ceroses, no te’l mengis.",
    },
    ecology: [
      "El marçot obre la temporada a finals d’hivern: surt de gener a juny, amb el pic al març i bons mesos al febrer i a l’abril, segons l’altitud. Creix en boscos frescos de muntanya, pinedes, fagedes i boscos de coníferes, amb pi roig, pi negre, avet, faig o roures, entre 500 i 2.200 metres, a l’obaga i amb força ombra, sovint sota la fullaraca o la neu recent. Tolera sòls d’àcids a alcalins, sobre substrat silícic o calcari, amb força matèria orgànica, frescos o humits i ben drenats.",
      "El perfil de l’espècie encaixa amb els boscos de muntanya dels Pirineus i el Prepirineu, el Montseny i els sistemes interiors. És una espècie local i difícil de detectar, perquè sovint queda enterrada. Són zones amb hàbitat compatible, no punts de collida.",
      "El marçot necessita un sòl molt humit per les pluges d’hivern o pel desglaç, i surt a mesura que aquest sòl s’escalfa a poc a poc, amb temperatures d’entre 2 i 12 °C i nits fredes. Tolera el fred moderat, però no un sòl glaçat de manera persistent. La sequera i la calor li són molt desfavorables, i un escalfament ràpid o el vent sec n’aturen la sortida.",
    ],
    cuisine: [
      "El marçot té un gust suau, net i lleugerament dolç, i una carn compacta i carnosa que es manté consistent fins i tot després de cuinar-la. És un comestible acceptable, singular perquè obre la temporada a finals d’hivern. Va bé en guisats i coccions suaus, i també en saltats, truites i arrossos.",
      "Com que sovint surt mig enterrat, retira’n la terra amb cura. Revisa que les làmines siguin ceroses i que no tingui anell ni volva, i cou-lo completament. Per trobar-lo, no remenis a fons la fullaraca.",
      "Com recomana l’ACSA, guarda els bolets a la nevera, entre 1 i 4 °C, i cuina’ls d’un a tres dies després de collir-los. Els marçots es mengen sobretot frescos; per guardar-los més temps, congela’ls després d’una cocció breu.",
    ],
  },
  "agaricus-campestris": {
    ecologyHeading: "On trobar camperols i quan surten",
    identification: [
      "El camperol és un xampinyó silvestre de prat, blanc i sense volva. El barret fa de 3 a 12 cm; primer és hemisfèric i després convex o aplanat, blanc o crema, llis o finament fibril·lós. Gira’l: les làmines són lliures, rosades de jove, i en madurar es tornen de color bru xocolata. El peu és blanc i cilíndric, amb un anell prim que desapareix aviat. Desenterra la base sencera: no ha de tenir volva ni groguejar intensament. La carn és blanca, de vegades una mica rosada al tall, i l’olor és suau i agradable, de bolet.",
      "La pluja pot embrutar o esquerdar el barret, i els exemplars madurs tenen les làmines molt fosques. La identificació és difícil, i el blanc del barret no demostra res: comprova en cada exemplar el color de les làmines, la base sense volva, l’olor i si grogueja quan el freges. Si algun d’aquests trets no encaixa, no el cullis per menjar.",
    ],
    lookalikes: {
      heading: "Camperol o farinera borda: la confusió que pot ser mortal",
      text: "La farinera borda (Amanita phalloides) pot tenir el barret pàl·lid, però té les làmines blanques i no canvien mai de color, i a la base té una volva blanca membranosa en forma de sac. És mortal: confondre-la amb un camperol pot causar una insuficiència hepàtica greu. Si un exemplar té les làmines blanques o volva, no és un camperol: descarta tota la collita i no la barregis amb la resta del cistell. Abans de menjar-te’l, descarta també les altres amanites blanques. El xampinyó pudent (Agaricus xanthodermus) grogueja ràpidament, sobretot a la base del peu, i fa olor de fenol o de tinta quan s’escalfa; provoca intoxicacions gastrointestinals. L’hàbitat ajuda, però no n’hi ha prou: a les vores de bosc, el camperol i la farinera borda poden créixer a pocs metres.",
    },
    ecology: [
      "Els camperols tenen dues temporades. A la primavera surten d’abril a juny, amb el pic al maig, i a la tardor tornen de setembre a novembre, amb el pic a l’octubre; al març i a l’estiu també en poden sortir alguns. No depenen de cap arbre: creixen en prats permanents, pastures d’herba curta, gespes, clarianes i marges herbosos, des del nivell del mar fins a 2.000 metres, en sòls de moderadament àcids a neutres, moderadament adobats i amb matèria orgànica.",
      "Com que segueixen l’herba més que no pas el bosc, el perfil de l’espècie encaixa amb gairebé tot el país: els Pirineus i el Prepirineu, la Catalunya Central, l’Empordà, el Montseny, les serralades costeres i prelitorals, els Ports i els sistemes interiors. El reg, la sega i l’adobat dels prats poden alterar molt la resposta de cada lloc. Són zones amb hàbitat compatible, no punts de collida.",
      "Surten poc després d’una pluja que rehidrati el sòl herbós, amb temperatures suaus, entre 10 i 22 °C, i un sòl humit però ben drenat. La sequera n’interromp la sortida de pressa, i la calor, les gelades i el vent, que asseca el prat, també l’aturen.",
    ],
    cuisine: [
      "El camperol té un gust net i familiar, suau i agradable, que s’intensifica amb la cocció, i una carn ferma i sucosa quan és jove. La Societat Catalana de Micologia el classifica com a bon comestible. Va bé en saltats, truites, salses i guisats, sempre que la identificació sigui inequívoca.",
      "No en tallis la base del peu fins que no n’hagis completat la identificació. Descarta els exemplars que groguegin intensament o facin olor química, i cou la resta sempre del tot.",
      "L’ACSA recomana guardar els bolets a la nevera, entre 1 i 4 °C, i cuinar-los d’un a tres dies després de collir-los. Per conservar-lo més temps, congela’l un cop cuinat.",
    ],
  },
  "boletus-pinophilus": {
    ecologyHeading: "On trobar ceps de pi i quan surten",
    identification: [
      "El cep rogenc, també anomenat cep de pi, és el cep de les pinedes, amb el barret més vinós i fosc que el del cep comú. El barret fa de 8 a 25 cm, és carnós i va del granat al bru vinós. Gira’l: per sota té porus blancs, que després es tornen d’un groc oliva. El peu és robust i clar, amb un reticle blanc ben visible. Talla’l: la carn és blanca i no canvia de color. L’olor és agradable i fúngica, i de jove és un bolet compacte.",
      "En ambient humit el barret s’enfosqueix, i els exemplars vells s’estoven: per això, amb el to vinós no n’hi ha prou. Comprova en cada exemplar els porus clars, el reticle blanc i la carn que no canvia al tall. Sota pi de muntanya el cep rogenc és més probable, però l’arbre tampoc no el confirma: la identificació demana tots els trets alhora.",
    ],
    lookalikes: {
      heading: "Cep de pi, cep i mataparent: com no confondre’ls",
      text: "Cep rogenc, cep de pi, cep pinícola i surenc de pi són noms del mateix bolet, Boletus pinophilus. El cep (Boletus edulis) s’hi assembla molt: té el barret bru castany amb el marge més clar, en lloc de granat o vinós, i ocupa més boscos, perquè també surt en fagedes i avetoses; tots dos són comestibles excel·lents, i els porus i la carn no els separen. El que cal descartar és el mataparent (Tylopilus felleus), que també creix en pinedes: té els porus que es tornen rosats o de color carn amb l’edat, un reticle bru fosc sobre el peu pàl·lid i un gust molt amarg. No és tòxic, però és incomestible, i un sol exemplar amarga tota la cassola. Si un exemplar té els porus rosats o el reticle fosc, descarta’l.",
    },
    ecology: [
      "Els ceps de pi surten de l’estiu avançat a la tardor: el calendari va de juliol a octubre, amb el pic al setembre, i l’octubre també és un bon mes; al juliol en poden sortir els primers. Són els ceps que pugen més amunt: creixen en pinedes de pi roig, de pi negre i de pinassa, en bosc de coníferes madur, entre 600 i 2.100 metres. Busquen sòls àcids o subàcids, sovint silícics o descarbonatats, a les obagues i a les orientacions fresques.",
      "Les guies de zona en descriuen l’hàbitat al Pirineu. A la Cerdanya, les pinedes de pi roig dels vessants de Bellver de Cerdanya i, més amunt, el pi negre del Cadí-Moixeró; al Ripollès, les pinedes de pi roig i de pi negre d’alta muntanya de Setcases. La guia dels ceps també els associa als Pirineus i als Sistemes interiors, i el perfil de l’espècie inclou els Prepirineus. Són zones amb hàbitat compatible, no punts de collida.",
      "Els ceps de pi necessiten que el sòl es rehidrati de manera sostinguda, amb pluja regular i no torrencial, i després temperatures suaus, entre 8 i 17 °C, amb humitat alta. L’altitud en modifica molt el calendari: a la Cerdanya poden començar a finals d’agost després de tempestes d’estiu, i la temporada principal es concentra al setembre i l’octubre. El vent sec i les baixades brusques de temperatura la interrompen, i les gelades d’octubre i el vent del nord sovint la tanquen abans que a les comarques prepirinenques.",
    ],
    cuisine: [
      "El cep rogenc forma part dels ceps que el consens micològic català qualifica d’excel·lents. Té un gust intens, fúngic i lleugerament dolç, i de jove la carn és compacta i carnosa. És molt versàtil: va bé a la planxa, en guisats i en arrossos, i també sec.",
      "Neteja’l en sec o amb un drap humit, retira’n els porus esponjosos si és vell i cuina’l completament. Abans de fer-ho, comprova que no tingui porus rosats: el gust amarg del mataparent espatlla el plat.",
      "Fresc, dura poc: l’ACSA recomana guardar els bolets entre 1 i 4 °C i cuinar-los d’un a tres dies després de collir-los, i els ceps es guarden millor en un recipient obert o en un cistell que en una bossa tancada. Per conservar-lo més temps, asseca’l tallat a làmines o congela’l un cop saltat.",
    ],
  },
  "boletus-reticulatus": {
    ecologyHeading: "On trobar ceps d’estiu i quan surten",
    identification: [
      "El cep d’estiu és el cep de tons clars i el més primerenc del grup. El barret fa de 6 a 25 cm, és convex i carnós, de bru clar a avellana, amb la superfície seca i mat i sense marge blanc. Gira’l: els porus són blancs de jove, després grocs i finalment olivacis. Mira el peu: és robust, de clar a bru pàl·lid, i té un reticle blanc o marronós molt desenvolupat, que s’estén per bona part del peu. Talla’l: la carn és blanca i no blaveja. L’olor és suau i agradable.",
      "Amb la calor i els períodes secs el barret s’esquerda i deixa veure la carn clara, i els exemplars madurs tenen els porus olivacis i la carn que s’estova i es corca aviat. El reticle estès és el tret més útil, però amb el reticle no n’hi ha prou: comprova també els porus, la carn que no canvia de color i que no hi hagi tons rosats ni vermells enlloc.",
    ],
    lookalikes: {
      heading: "Cep d’estiu o cep: com diferenciar-los, i el mataparent",
      text: "El cep d’estiu i el cep (Boletus edulis) poden coincidir en boscos de planifolis, però entre ells no hi ha perill: tots dos són comestibles excel·lents. El cep té el barret sovint més untuós, bru castany i amb el marge més clar, i el reticle concentrat a la part alta del peu; el cep d’estiu el té sec i sovint clivellat, i el reticle li baixa per bona part del peu. La data també ajuda: un cep de juny en una roureda calenta és gairebé sempre cep d’estiu. El que cal descartar és el mataparent (Tylopilus felleus), de porus rosats amb l’edat, reticle fosc i gust intensament amarg: no es considera tòxic, però és incomestible. El matagent (Rubroboletus satanas), de porus vermells, peu de colors vius i carn que blaveja al tall, és tòxic i no s’ha de consumir. No tastis mai un exemplar dubtós per identificar-lo.",
    },
    ecology: [
      "Els ceps d’estiu són els més primerencs dels ceps: el calendari va de maig a octubre, amb el pic al juliol; el juny i l’agost també són bons mesos, i al setembre encara en poden sortir. Creixen en rouredes, fagedes, castanyedes i altres boscos de planifolis, amb roures, faig i castanyer, entre 100 i 1.500 metres. Busquen el bosc madur de planifolis i les vores arbrades, als vessants temperats i a les clarianes càlides, sobre sòls àcids o neutres, preferentment silícics o poc calcaris.",
      "La guia dels ceps els associa a la Catalunya Central i a les Serralades Prelitorals, on encaixen amb els boscos temperats de planifolis, i el perfil de l’espècie també inclou els Prepirineus, el Montseny, els Sistemes interiors i els Ports. Són zones amb hàbitat compatible, no punts de collida.",
      "El cep d’estiu respon a una pluja efectiva seguida de temps càlid i humit, sense calor extrema, entre 14 i 24 °C: les pluges del final de la primavera, de l’estiu o de l’inici de la tardor, quan el sòl conserva escalfor i humitat. Pot trigar de dies a poques setmanes a sortir, segons la humitat acumulada. Com que depèn molt de les tempestes locals, la temporada d’estiu és irregular; la sequera, el vent sec o la calor persistent la interrompen, i les gelades l’aturen.",
    ],
    cuisine: [
      "El cep d’estiu és un dels ceps excel·lents de la taula de consens micològic català, on apareix amb el sinònim Boletus aestivalis. Té un gust fúngic i càlid, una mica més delicat que el d’altres ceps, i la carn és ferma de jove, però s’esponja de pressa quan fa calor. Va bé saltat, en arrossos i en cremes, i també sec.",
      "Aprofita’l jove, perquè es corca i s’estova ràpidament. Revisa’l bé per detectar-hi larves, retira’n les parts toves i els tubs molt madurs, i cuina’l completament.",
      "Com que es fa malbé aviat, no el guardis gaire: l’ACSA recomana guardar els bolets a la nevera, entre 1 i 4 °C, i cuinar-los d’un a tres dies després de collir-los, i els ceps es guarden millor en un recipient obert o en un cistell que en una bossa tancada. Per conservar-lo més temps, asseca’l de seguida o congela’l després d’una cocció breu.",
    ],
  },
  "calvatia-gigantea": {
    identification: [
      "El pet de llop gegant, també anomenat esclatabufa gegant o bufa del diable, és una gran bola blanca entre l’herba, que pot arribar a 60 cm de diàmetre. No té barret ni un peu desenvolupat: tot el bolet és un cos globós unit al substrat per la base. Mira’n la superfície: de jove és llisa i blanca, i després passa a tons ivori i brunencs. No té làmines ni porus a l’exterior, perquè les espores maduren dins d’una massa interior, la gleba. Talla’l de dalt a baix: de jove, la gleba és blanca i densa; després es torna més tova i d’un groc verdós, i finalment bruna i polsegosa, mentre la coberta es fa fràgil.",
      "La mida varia molt, i un exemplar petit no s’identifica només perquè tingui forma de bola. Tampoc no n’hi ha prou amb el color exterior: la superfície llisa, la manca de peu i un interior blanc i homogeni s’han de comprovar junts, i fins i tot així cal una identificació segura.",
    ],
    lookalikes: {
      heading: "Pet de llop gegant, altres pets de llop i amanites tancades",
      text: "Una bola blanca també pot ser un altre bolet encara immadur. Els exemplars d’amanita encara tancats, com la farinera borda, poden semblar petits pets de llop, i la farinera borda pot causar una intoxicació mortal: fes sempre un tall longitudinal complet i descarta l’exemplar si hi veus el barret, les làmines o el peu en formació. El pet de llop perlat és més petit, en forma de pera, amb una base allargada i agullons que deixen marques en desprendre’s. El pet de llop gros també és més petit que el gegant, té la base ampla i la superfície jove es clivella en plaques piramidals en mosaic en lloc de ser llisa; aquesta fitxa no en recomana el consum perquè les fonts discrepen sobre el seu interès culinari.",
    },
    ecology: [
      "Aranzadi situa el pet de llop gegant a l’estiu i la tardor, en prats i pastures. La fitxa descriu aquest ambient general, no llocs de recol·lecció.",
      "No hi ha una configuració ecològica quantitativa validada per a aquesta espècie, i per això Bolets no la mostra al mapa de predicció ni en publica un mapa d’hàbitat ni unes condicions actuals. La temporada i el tipus de prat ajuden a situar una troballa, però no confirmen l’espècie.",
    ],
    cuisine: [
      "Aranzadi el considera comestible de jove, però poc apreciat, i aquesta valoració no és una garantia de seguretat. Només es consumeixen els exemplars joves i ben identificats, amb tot l’interior blanc i homogeni: descarta els que comencen a groguejar i els madurs, i no en colleixis en gespes tractades amb productes químics. Un interior blanc és una condició necessària, però no confirma tot sol l’espècie.",
      "Examina un tall complet de dalt a baix: no hi ha d’haver estructures de barret, làmines ni peu. Retira’n la pell exterior i cuina’l bé, a llesques. Segons l’ACSA, els bolets frescos s’han de guardar a la nevera, entre 1 i 4 °C i evitant la humitat, i s’han de cuinar d’un a tres dies després de collir-los.",
    ],
  },
  "lactifluus-rugatus": {
    ecologyHeading: "On trobar lleteroles i quan surten",
    identification: [
      "La lleterola roja, també anomenada lleterola vera, té un barret de 4 a 12 cm, convex i umbilicat de jove i després aplanat o enfonsat, sovint irregular i lobulat. La superfície és seca, mat, finament vellutada i marcada per arrugues, de color taronja a vermell rajola. Gira’l: les làmines són clares, relativament espaiades i fràgils, amb laminetes intercalades, i quan es fereixen deixen sortir làtex blanc abundant. El peu és robust, cilíndric, del color del barret o una mica més clar, ple de jove i més buit o fràgil amb l’edat. La carn és blanca i ferma de jove, i en tallar-la pot prendre lentament tons rosats, sobretot on el làtex toca les làmines. Segons les fonts catalanes, l’olor és feble o absent.",
      "La forma del barret pot ser molt irregular, i el nom popular canvia d’un territori a un altre. Per això, cal separar-la de les altres lleteroles amb més d’un tret: el barret arrugat, les làmines espaiades, el làtex blanc abundant i l’olor poc marcada s’han de comprovar junts.",
    ],
    lookalikes: {
      heading: "Lleterola roja, lleterola vera o sastre: a quina espècie es refereix el nom",
      text: "El nom lleterola roja no és unívoc: també s’aplica a Lactifluus volemus, que algunes fonts anomenen sastre. Aquesta acostuma a tenir les làmines més denses i una olor intensa que recorda crustacis o arengades. També és comestible, però són espècies diferents, i no pots decidir pel nom: confirma que la guia, la fotografia i l’exemplar es refereixen a Lactifluus rugatus. El pinetell bord (Lactarius chrysorrheus) no és apte per al consum: el seu làtex blanc es torna ràpidament groc sofre i el barret sol ser més pàl·lid i zonat. No tastis mai el làtex per identificar una lleterola.",
    },
    ecology: [
      "La lleterola roja surt al final de l’estiu i a la tardor. Les fonts catalanes la descriuen com una lleterola pròpia dels alzinars i les suredes, i també es troba en matollars mediterranis amb estepes; la literatura científica en confirma el caràcter mediterrani.",
      "Aquesta descripció general no permet fer-ne una predicció local: no es publiquen altituds, respostes a la pluja ni calendaris mensuals quantificats. Per això, Bolets no mostra aquesta espècie al mapa de predicció, i l’alzinar o la sureda ajuden a descriure una troballa, però no confirmen l’espècie.",
    ],
    cuisine: [
      "Les fonts catalanes la consideren comestible i apreciada, amb un gust suau i una carn ferma de jove que es fa més fràgil amb la maduresa. Tot i això, el solapament de noms i la semblança amb altres lleteroles exigeixen una identificació experta, i el sabor no serveix com a prova de camp. Fes-la servir en preparacions cuinades, només amb exemplars joves, sans i confirmats, i descarta els vells, deteriorats o de determinació dubtosa.",
      "Confirma el nom científic i descarta els exemplars que no encaixin amb tots els trets. Neteja-la i cuina-la completament: la cocció no corregeix una identificació errònia. Guarda-la a la nevera, entre 1 i 4 °C i evitant la humitat, com recomana l’ACSA, i cuina-la tan aviat com puguis, d’un a tres dies després de collir-la.",
    ],
  },
  "leccinellum-lepidum": {
    identification: [
      "El cigró, també anomenat alzinenc, alzinall o modeguí, és un bolet de porus, gruixut, amb un barret de 5 a 15 cm, hemisfèric de jove i després convex o aplanat, de bru groguenc a castany fosc i sovint abonyegat. En temps sec és finament vellutat, i amb humitat es torna untuós o viscós. Gira’l: els tubs i els porus són petits, de color groc viu, després més verdosos o ocres, i s’enfosqueixen lentament quan els prems. El peu és groguenc, robust i curt de jove i després més allargat, cobert de petites granulacions o esquames que s’enfosqueixen. Talla’l: la carn és compacta i groguenca, i pot tornar-se lentament rosada, després gris violàcia i finalment gris fosca.",
      "El barret es pot enfosquir molt i la reacció de la carn és lenta: espera i observa el conjunt, sense confiar només en el primer color del tall. Els porus grocs, el peu esquamós, el canvi de la carn i l’arbre s’han de comprovar junts, perquè els bolets de porus també inclouen espècies no comestibles o tòxiques.",
    ],
    lookalikes: {
      heading: "Cigró, leccí de les estepes i leccí clivellat",
      text: "El leccí de les estepes (Leccinellum corsicum) sol ser més petit i està associat a les estepes del gènere Cistus, no principalment a alzines o suredes. El leccí clivellat (Leccinellum crocipodium) té una silueta més esvelta, i el barret tendeix a clivellar-se de manera marcada amb la maduresa. Tots dos es consideren comestibles, però no identifiquis una espècie per la comestibilitat atribuïda al grup: confirma l’arbre i la resta de trets. Tampoc no donis per bo cap bolet de porus pel sol fet de créixer sota alzines.",
    },
    ecology: [
      "El cigró surt tard, a la tardor i a l’hivern. Micoex el descriu sota alzina i surera, en alzinars, suredes i altres boscos mediterranis de Quercus. El nom alzinenc reflecteix aquesta associació, però l’arbre tot sol no confirma l’espècie.",
      "Bolets no converteix aquesta associació amb les alzines en una capa de mapa: falten paràmetres ecològics quantitatius validats per fer-ne prediccions o un calendari mensual. Per això, aquesta espècie no apareix al mapa de predicció.",
    ],
    cuisine: [
      "Micoex el considera comestible però de qualitat modesta, i les valoracions locals varien. És un comestible secundari quan està sa i ben identificat, d’olor i sabor poc marcats, amb la carn compacta de jove i més tova amb l’edat. Va bé en guisats o saltats amb exemplars joves i ferms. La carn que s’enfosqueix pot resultar poc atractiva, però el color que pren un cop cuinat no indica si és segur.",
      "Revisa la base, el peu esquamós i els porus abans de netejar-lo. Retira’n les parts toves o parasitades, descarta els exemplars envellits o massa tous i cuina’l completament. Guarda’l a la nevera, entre 1 i 4 °C i evitant la humitat, com recomana l’ACSA, i menja’l aviat, d’un a tres dies després de collir-lo: els exemplars madurs es fan malbé ràpidament.",
    ],
  },
  "lycoperdon-perlatum": {
    ecologyHeading: "On trobar pets de llop i quan surten",
    identification: [
      "El pet de llop perlat té la forma d’una petita pera invertida, de 3 a 8 cm, sense barret separat. El cos és blanc o crema, arrodonit a dalt i més estret a la base, que s’allarga com un peu curt. Mira’n la pell: té agullons cònics que es desprenen i hi deixen petites marques. No té làmines: les espores es formen a l’interior, en una massa anomenada gleba, i en madurar surten per una obertura al capdamunt. Talla’l de dalt a baix: la gleba jove és blanca i després s’enfosqueix fins a tornar-se polsegosa, mentre la pell passa de blanc d’ivori a tons grisencs o brunencs.",
      "Els exemplars vells perden els agullons, i el nom pet de llop també s’aplica a altres espècies. Amb un interior blanc no n’hi ha prou per confirmar un pet de llop: la forma de pera, els agullons, la base allargada i el tall longitudinal s’han de comprovar junts.",
    ],
    lookalikes: {
      heading: "Pet de llop o amanita tancada: com no confondre’ls",
      text: "La confusió que cal descartar sempre és la de les amanites immadures: una farinera borda encara tancada dins el vel pot semblar una bola blanca, i pot causar una intoxicació mortal. Fes un tall longitudinal de dalt a baix a cada exemplar: si hi veus estructures de barret, làmines i peu en formació, no és un pet de llop i no s’ha de menjar. El pet de llop gegant té la superfície llisa i un cos globós que pot ser molt més gran, sense la base allargada. El pet de llop gros és més gran i ample, propi sobretot de prats, i té la superfície dividida en plaques piramidals romes que formen un mosaic; aquesta fitxa no en recomana el consum perquè les fonts discrepen sobre el seu interès culinari.",
    },
    ecology: [
      "El pet de llop perlat surt de la primavera a la tardor. La ICHN el documenta en ambients de bosc i de prat, i Aranzadi el descriu sota planifolis i coníferes; també apareix en clarianes.",
      "Aquesta descripció no permet calcular unes condicions actuals ni delimitar un mapa d’hàbitat fiable per a l’espècie. Per això, Bolets no el mostra al mapa de predicció.",
    ],
    cuisine: [
      "L’Irish Wildlife Trust el considera comestible de jove, i Aranzadi li atribueix poc interès culinari. Només es pot menjar quan és jove i la gleba és completament blanca, després d’una identificació segura i d’una cocció adequada. La fitxa no hi destaca cap aroma: l’interior és compacte de jove i polsegós en madurar.",
      "Examina tot l’exemplar, amb un tall longitudinal de dalt a baix, i descarta’l si hi ha estructures internes de barret o de peu, o si la gleba ja no és blanca: no mengis mai exemplars amb l’interior groc, bru o polsegós, ni inhalis la pols d’espores dels exemplars madurs. Cuina’l bé, tenint present que la cocció no fa segur un bolet mal identificat. L’ACSA recomana guardar els bolets frescos a la nevera, entre 1 i 4 °C i evitant la humitat, i cuinar-los d’un a tres dies després de collir-los.",
    ],
  },
  "russula-cyanoxantha": {
    ecologyHeading: "On trobar llores i quan surten",
    identification: [
      "La llora aspra, també coneguda com a llora, blavet, puagra llora, palomins o cualbra, té un barret de 6 a 15 cm, carnós, convex de jove i després aplanat o deprimit al centre, amb tons verds, grisos o violacis sovint barrejats. Amb humitat, la pell pot fer-se brillant i viscosa. Gira’l: les làmines són blanques, atapeïdes, elàstiques i de tacte greixós, un tret útil dins el grup de les rússules. El peu és robust i cilíndric, blanc o amb matisos violacis, sense anell ni volva. Talla’l: la carn és blanca, gruixuda, granulosa i trencadissa, i pot tenir un matís violaci sota la pell del barret. L’olor és feble i no ajuda a identificar-la.",
      "Hi ha exemplars predominantment verds i d’altres de violacis, i per això amb el color sol no n’hi ha prou per separar-la d’altres espècies. Les làmines blanques i flexibles, la carn trencadissa i un peu sense anell ni volva, comprovat fins a la base, s’han de mirar junts.",
    ],
    lookalikes: {
      heading: "Llora aspra, llora verda i farinera borda",
      text: "Els tons verdosos obliguen a descartar la farinera borda, una confusió potencialment mortal: pot compartir el color, però té la carn fibrosa, un anell i una volva a la base. Examina l’exemplar sencer, inclosa la base del peu, perquè la volva pot quedar enterrada. La llora verda sol tenir la superfície del barret dividida en plaques verdoses, però cal valorar també la resta de trets, i la semblança amb una llora comestible no confirma la identificació. No tastis mai un exemplar desconegut per identificar-lo.",
    },
    ecology: [
      "La llora aspra surt a l’estiu i a la tardor, en boscos de planifolis i de coníferes. Aranzadi la descriu especialment sota faigs, roures i castanyers, i la Sociedad Micológica Extremeña també la documenta en suredes i alzinars.",
      "Les fonts en descriuen els ambients i la temporada, però no proporcionen una configuració numèrica validada per calcular-ne la predicció. Per això, Bolets no mostra aquesta espècie al mapa de predicció.",
    ],
    cuisine: [
      "Aranzadi i la Sociedad Micológica Extremeña la destaquen per la qualitat culinària, i és una llora apreciada a la cuina quan la identificació és segura. Té un sabor suau, una olor feble i la carn ferma i granulosa; ni el gust ni l’olor no són una prova d’identificació. Fes-la servir en preparacions cuinades amb exemplars sans i ben identificats.",
      "Examina l’exemplar complet, inclosa la base del peu, abans de netejar-lo. Neteja les llores i cuina-les bé, tenint present que la cocció no elimina la toxicitat d’una amanita confosa. Per conservar-les, l’ACSA recomana la nevera, entre 1 i 4 °C i sense humitat, i cuinar-les d’un a tres dies després de collir-les.",
    ],
  },
  "tuber-melanosporum": {
    ecologyHeading: "On trobar tòfones negres i quan maduren",
    identification: [
      "La tòfona negra no té barret, ni peu, ni làmines, ni porus: és un cos fructífer subterrani, globós o irregular, que habitualment fa de 2 a 8 cm, tot i que la mida és molt variable. Mira’n l’exterior: el peridi, la pell, és negre i està cobert de berrugues piramidals. Talla-la: la gleba, l’interior, és ferma i compacta, d’un bru negrenc a violaci quan madura, i està recorreguda per venes blanques fines i ramificades que li donen un aspecte marbrejat. Quan és madura fa una olor intensa, complexa i persistent.",
      "La mida i la forma depenen del sòl, i els exemplars immadurs tenen la gleba més clara. És una identificació molt difícil: la morfologia visible no garanteix l’espècie, i separar-la d’altres tòfones pot requerir microscòpia. Per això, ni el peridi negre ni el marbrejat no basten, i per establir-ne el valor comercial cal una verificació experta.",
    ],
    lookalikes: {
      heading: "Tòfona negra, tòfona d’hivern i escleroderma: com no confondre’ls",
      text: "La tòfona d’hivern (Tuber brumale) té el peridi i la gleba semblants, però una aroma diferent i les venes sovint més amples, i confirmar-la pot requerir microscòpia. La tòfona d’estiu (Tuber aestivum) té la gleba més clara i berrugues grosses, i madura principalment en una altra època. Totes dues són comestibles. El que cal descartar és l’escleroderma comú (Scleroderma citrinum): té la gleba més uniforme, que es torna d’un porpra negrós i polsegosa, sense el marbrejat fi ni l’aroma de la tòfona, i pot causar una intoxicació gastrointestinal. Talla sempre cada exemplar: si l’interior no té les venes blanques fines, no te’l mengis.",
    },
    ecology: [
      "La tòfona negra madura a l’hivern: el calendari va de novembre a març, amb el pic al gener i el febrer, i el desembre i el març també són bons mesos. No surt a la superfície: es desenvolupa sota terra durant mesos, associada a les arrels d’alzines, roures i avellaners. Creix en alzinars i rouredes oberts sobre substrat calcari, entre 500 i 1.300 metres, en sòls alcalins, amb un pH d’entre 7,3 i 8,5, de textura franca a pedregosa, de 10 a 40 cm de fondària i amb un drenatge excel·lent. Prefereix els solells i els vessants o carenes ben drenats, i els sòls oberts al voltant de l’arbre hoste, sovint amb un cremat tofoner.",
      "El perfil de l’espècie inclou els Prepirineus, la Catalunya Central, els Ports i els Sistemes interiors. A diferència del que passa amb els altres bolets, el mapa només mostra on el sòl i el bosc podrien ser adequats: el temps recent no permet saber si hi ha tòfones madures. Són zones amb hàbitat compatible, no punts de collida.",
      "Més que una pluja concreta, compta el cicle de tot l’any: aigua suficient a l’estiu i recàrrega a la tardor, amb humitat en profunditat però sense entollament. La tòfona no respon a un xàfec com els altres bolets, perquè es desenvolupa durant mesos. Una sequera estival severa i prolongada en redueix la producció, i l’estrès hídric profund, el sòl compactat o la manca d’un arbre hoste colonitzat la frenen. Les gelades intenses poden malmetre les tòfones més superficials, i la neu pot protegir el sòl de les gelades fortes.",
    ],
    cuisine: [
      "La tòfona negra és un comestible excel·lent segons el consens micològic català i es valora sobretot per l’aroma: terrosa, profunda, aliàcia i persistent, i molt dependent de la maduració. Madura, té una textura ferma i compacta i una mossegada fina. S’utilitza com a condiment, en poca quantitat i amb coccions suaus: ratllada sobre ous, en pasta i arrossos, en salses suaus o en mantega tofonada, que s’ha de guardar a la nevera.",
      "Raspalla-la sota un fil d’aigua i eixuga-la bé. Talla-la o ratlla-la just abans de servir-la i evita les coccions llargues, que en dissipen l’aroma.",
      "Es guarda a la nevera i s’ha de consumir ràpidament. També es pot congelar sencera, tot i que perd textura.",
    ],
  },
};

export function getSpeciesEditorialProse(speciesId: string): SpeciesEditorialProse | undefined {
  return speciesEditorialProse[speciesId];
}
