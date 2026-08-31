const plainRainfallLimitations: Record<string, string> = {
  "cyclocybe-cylindracea":
    "El mapa no pot saber on hi ha soques, arbres urbans o fusta enterrada; per això només ofereix una orientació general.",
  "coprinus-comatus":
    "Pot aparèixer de manera irregular, i les pinedes joves no sempre es distingeixen bé al mapa.",
  "pleurotus-eryngii":
    "El mapa no pot saber on creix el panical ni altres plantes que aquesta espècie necessita; per això només ofereix una orientació general.",
  "morchella-esculenta":
    "Pot aparèixer durant poc temps i canviar molt de lloc; el mapa no recull bé els incendis, els terrenys remoguts ni tota la vegetació de ribera.",
  "ramaria-aurea":
    "La temporada i el tipus de bosc es poden assemblar als d’altres ramàries i varien segons el lloc.",
  "pleurotus-ostreatus":
    "El mapa no pot saber on hi ha fusta morta; la presència de boscos de fulla ampla només n’ofereix una orientació general.",
  "craterellus-tubaeformis":
    "El mapa no pot veure la molsa ni la fusta morta de cada racó del bosc, i aquesta espècie pot ser difícil de separar d’altres de semblants.",
  "tuber-melanosporum":
    "El mapa no pot saber si les arrels estan colonitzades ni conèixer l’edat dels arbres, el reg o la humitat a la profunditat on creix la tòfona.",
  "lepiota-brunneoincarnata":
    "El reg i els sòls urbans poden canviar la temporada habitual, i el mapa no els pot representar bé.",
};

export function rainfallLimitationCopy(speciesId: string, fallback: string) {
  return plainRainfallLimitations[speciesId] ?? fallback;
}
