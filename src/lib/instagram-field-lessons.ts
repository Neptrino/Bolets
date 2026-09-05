import type { InstagramEducationTopic } from "@/src/lib/instagram-education";

// Editorial observation aids, not identification keys. Sources checked 2026-09-05;
// no independent mycological review. Keep each lesson useful without live scores.
export const instagramFieldLessons = [
  {
    id: "field-photos", title: "Quatre fotos que expliquen més", guidePath: "/parts-dun-bolet",
    source: { label: "Michael Kuo · MushroomExpert", url: "https://www.mushroomexpert.com/studying.html" },
    captionIntro: "Una foto del barret deixa moltes preguntes obertes.",
    captionBody: "Prepara una sèrie: barret, part inferior, peu i base visible, i entorn. Anota el substrat i els arbres propers. Aquest registre ajuda a consultar una guia o una persona experta; no confirma la identificació ni la comestibilitat.",
    slides: [
      { eyebrow: "Quadern de camp", title: "Quines fotos falten?", body: "Quatre enquadraments per documentar un bolet." },
      { eyebrow: "01 · Vista general", title: "El barret necessita context", body: "Fotografia’l al lloc on creix, abans de moure res.", points: [{ label: "Barret", detail: "Forma, marge i superfície enfocats." }, { label: "Escala", detail: "Inclou una referència de mida." }] },
      { eyebrow: "02 · Per sota", title: "La vista que sovint oblidem", body: "Acosta la càmera a la part inferior del barret.", points: [{ label: "Superfície", detail: "Làmines, porus, plecs o agulles?" }, { label: "Unió amb el peu", detail: "Que també quedi visible a la foto." }] },
      { eyebrow: "03 + 04 · Completa la sèrie", title: "Peu i entorn també compten", body: "No tallis el peu de l’enquadrament.", points: [{ label: "Peu i base visible", detail: "Registra’n la forma sense malmetre el lloc." }, { label: "Entorn", detail: "Fusta, terra o fullaraca? Quins arbres hi ha?" }] },
      { eyebrow: "Desa aquesta pauta", title: "Abans de marxar", body: "Comprova que les fotos siguin nítides.", points: [{ label: "4 vistes", detail: "Barret · part inferior · peu · entorn" }, { label: "Una nota", detail: "Data, substrat i arbres propers." }] },
    ],
  },
  {
    id: "field-underside", title: "Què hi ha sota el barret?", guidePath: "/parts-dun-bolet",
    source: { label: "Bolets Atles · Parts d’un bolet i fonts", url: "https://bolets.app/parts-dun-bolet" },
    captionIntro: "Làmines, porus, plecs o agulles: aprèn a descriure la part inferior.",
    captionBody: "Són formes diferents de la superfície productora d’espores. Observar-ne l’estructura i la unió amb el peu és més informatiu que quedar-se només amb el color del barret. Cap d’aquests trets, tot sol, identifica una espècie.",
    slides: [
      { eyebrow: "Aprèn a observar", title: "Mira sota el barret", body: "Quatre estructures que convé distingir." },
      { eyebrow: "Làmines i plecs", title: "Aletes fines o relleus?", body: "Mira l’estructura de prop, sense arrencar-la.", points: [{ label: "Làmines", detail: "Aletes amb una vora definida." }, { label: "Plecs", detail: "Relleus menys afilats de la superfície." }] },
      { eyebrow: "Porus i agulles", title: "Foradets o petites pues?", body: "Canvia l’angle de la foto per veure’n el relleu.", points: [{ label: "Porus", detail: "Obertures dels tubs sota el barret." }, { label: "Agulles", detail: "Petites projeccions que pengen cap avall." }] },
      { eyebrow: "Una observació més", title: "Segueix la unió amb el peu", body: "La relació entre les dues parts també aporta informació.", points: [{ label: "Pregunta", detail: "La superfície baixa pel peu o acaba abans?" }, { label: "Registre", detail: "Una foto lateral i una altra per sota." }] },
      { eyebrow: "Desa el vocabulari", title: "Descriu abans de posar nom", body: "Escriu el que veus; deixa els dubtes oberts.", points: [{ label: "Estructura", detail: "Làmines · plecs · porus · agulles" }, { label: "Detalls", detail: "Color, disposició i unió amb el peu." }] },
    ],
  },
  {
    id: "field-lookalike", title: "Rossinyol o fals rossinyol?", guidePath: "/fals-rossinyol",
    source: { label: "ICHN · El medi natural del Bages", url: "https://elmedinaturaldelbages.cat/species/fals-rossinyol-hygrophoropsis-aurantiaca/" },
    captionIntro: "Rossinyol i fals rossinyol: el color no resol la comparació.",
    captionBody: "El rossinyol (Cantharellus cibarius) té plecs; el fals rossinyol (Hygrophoropsis aurantiaca), làmines denses, sovint bifurcades, que baixen pel peu. És una diferència per observar, no una clau completa: hi ha altres confusions possibles.",
    slides: [
      { eyebrow: "Una confusió habitual", title: "Taronja no és suficient", body: "Una diferència per aprendre a observar." },
      { eyebrow: "Compara per sota", title: "Plecs o làmines?", body: "No decideixis només pel barret.", points: [{ label: "Rossinyol", detail: "Cantharellus cibarius · plecs" }, { label: "Fals rossinyol", detail: "Hygrophoropsis aurantiaca · làmines" }] },
      { eyebrow: "Fixa’t en el detall", title: "El fals rossinyol té làmines", body: "Observa-les de prop.", points: [{ label: "Disposició", detail: "Denses i sovint bifurcades." }, { label: "Unió", detail: "Baixen pel peu: són decurrents." }] },
      { eyebrow: "El límit de la comparació", title: "No són les úniques opcions", body: "Altres bolets també poden tenir tons taronja.", points: [{ label: "Evita el salt", detail: "Descartar una espècie no confirma l’altra." }, { label: "Completa el registre", detail: "Part inferior, peu sencer i substrat." }] },
      { eyebrow: "Per recordar", title: "Un tret ajuda. No confirma.", body: "Consulta la guia completa i una persona experta si hi ha dubtes.", points: [{ label: "Pregunta de camp", detail: "Veig plecs o làmines?" }, { label: "Límit", detail: "Aquest carrusel no decideix si es pot menjar." }] },
    ],
  },
  {
    id: "field-wood", title: "El tronc també explica el bolet", guidePath: "/bolets-de-soca",
    source: { label: "Museu de les Terres de l’Ebre", url: "https://www.museuterresebre.cat/pagina.asp?i=ca&id=248" },
    captionIntro: "Quan fotografies un bolet de soca, inclou també la fusta.",
    captionBody: "Alguns fongs viuen sobre arbres vius i altres descomponen fusta morta; una mateixa espècie pot ocupar les dues situacions. La descomposició retorna nutrients al medi. El substrat aporta context, però no identifica el bolet.",
    slides: [
      { eyebrow: "Ecologia de camp", title: "No retallis el tronc", body: "El lloc on creix també forma part de la història." },
      { eyebrow: "Primera pregunta", title: "Fusta viva o morta?", body: "Anota el que pots observar sense fer malbé l’arbre.", points: [{ label: "Arbre viu", detail: "Hi ha fongs que n’extreuen nutrients." }, { label: "Fusta morta", detail: "Hi ha fongs que la descomponen." }] },
      { eyebrow: "Reciclatge al bosc", title: "La fusta no desapareix sola", body: "Els fongs descomponedors participen en el retorn dels nutrients al medi.", points: [{ label: "Procés", detail: "Fusta morta → descomposició → nutrients" }, { label: "Funció", detail: "Una part del cicle de la vida al bosc." }] },
      { eyebrow: "No dedueixis massa", title: "L’aspecte no explica tot el procés", body: "Algunes espècies poden viure sobre fusta viva i morta.", points: [{ label: "Observació", detail: "Descriu el suport i l’estat aparent." }, { label: "Dubte", detail: "No atribueixis una malaltia només per una foto." }] },
      { eyebrow: "Desa la pauta", title: "Dues fotos, més context", body: "Deixa el substrat tal com l’has trobat.", points: [{ label: "Detall", detail: "El bolet i el punt on s’uneix a la fusta." }, { label: "Pla general", detail: "El tronc, la soca o la branca sencera." }] },
    ],
  },
] as const satisfies readonly InstagramEducationTopic[];
