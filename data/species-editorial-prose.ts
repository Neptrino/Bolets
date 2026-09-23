/**
 * Hand-written prose for the twenty most searched species (the top of
 * `speciesBySearchDemand`). Each block opens one profile section: how to
 * recognise the species in field order, the searched lookalike or safety
 * question, when and where it grows in Catalonia (answering «on trobar …»
 * with the searched plural) and how to cook and keep it, or why it must not
 * be eaten. The generated template cannot give this context.
 *
 * Every statement comes from the versioned sources: the species profile in
 * `data/species.ts`, `data/culinary-profiles.ts` and its Canal Aliments/ACSA
 * references, `/conservar-bolets`, and the zone hubs' `forests`/`seasonNotes`
 * and species-at-place guides in `data/location-pages.ts`. Name territories
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
};

export function getSpeciesEditorialProse(speciesId: string): SpeciesEditorialProse | undefined {
  return speciesEditorialProse[speciesId];
}
