export type SpeciesMapPage = {
  slug: string;
  speciesId: string;
  quickLabel: string;
  mapNoun: string;
  dativeName: string;
  lead?: string;
  title: string;
  heading: string;
  description: string;
};

export const speciesMapPages = [
  {
    slug: "rovello",
    speciesId: "lactarius-sanguifluus",
    quickLabel: "Rovelló",
    mapNoun: "del rovelló",
    dativeName: "per al rovelló",
    title: "Mapa del rovelló a Catalunya: condicions avui",
    heading: "Mapa del rovelló a Catalunya",
    description: "Consulta on l’hàbitat i el temps recent ofereixen avui les condicions més favorables per al rovelló a Catalunya.",
  },
  {
    slug: "pinetell",
    speciesId: "lactarius-deliciosus",
    quickLabel: "Pinetell",
    mapNoun: "del pinetell",
    dativeName: "per al pinetell",
    title: "Mapa del pinetell a Catalunya: condicions avui",
    heading: "Mapa del pinetell a Catalunya",
    description: "Consulta on l’hàbitat i el temps recent ofereixen avui les condicions més favorables per al pinetell a Catalunya.",
  },
  {
    slug: "cep",
    speciesId: "boletus-edulis",
    quickLabel: "Cep",
    mapNoun: "del cep",
    dativeName: "per al cep",
    lead: "Compara les zones on l’hàbitat i el temps recent poden afavorir la fructificació de ceps.",
    title: "Mapa del cep a Catalunya: condicions avui",
    heading: "Mapa del cep a Catalunya",
    description: "Consulta on l’hàbitat i el temps recent ofereixen avui les condicions més favorables per al cep a Catalunya.",
  },
  {
    slug: "camagroc",
    speciesId: "craterellus-lutescens",
    quickLabel: "Camagroc",
    mapNoun: "del camagroc",
    dativeName: "per al camagroc",
    title: "Mapa del camagroc a Catalunya: condicions avui",
    heading: "Mapa del camagroc a Catalunya",
    description: "Consulta on l’hàbitat i el temps recent ofereixen avui les condicions més favorables per al camagroc a Catalunya.",
  },
  {
    slug: "rossinyol",
    speciesId: "cantharellus-cibarius",
    quickLabel: "Rossinyol",
    mapNoun: "del rossinyol",
    dativeName: "per al rossinyol",
    title: "Mapa del rossinyol a Catalunya: condicions avui",
    heading: "Mapa del rossinyol a Catalunya",
    description: "Consulta on l’hàbitat i el temps recent ofereixen avui les condicions més favorables per al rossinyol a Catalunya.",
  },
  {
    slug: "trompeta-de-la-mort",
    speciesId: "craterellus-cornucopioides",
    quickLabel: "Trompeta",
    mapNoun: "de la trompeta de la mort",
    dativeName: "per a la trompeta de la mort",
    title: "Mapa de la trompeta de la mort a Catalunya",
    heading: "Mapa de la trompeta de la mort",
    description: "Consulta on l’hàbitat i el temps recent ofereixen avui les condicions més favorables per a la trompeta de la mort a Catalunya.",
  },
] as const satisfies readonly SpeciesMapPage[];

const mapPageBySlug = new Map<string, SpeciesMapPage>(
  speciesMapPages.map((page) => [page.slug, page]),
);
const mapPageBySpeciesId = new Map<string, SpeciesMapPage>(
  speciesMapPages.map((page) => [page.speciesId, page]),
);

export const speciesMapRoutes: Record<string, string> = {
  all: "/map",
  ...Object.fromEntries(speciesMapPages.map((page) => [page.speciesId, `/map/${page.slug}`])),
};

export function getSpeciesMapPageBySlug(slug: string) {
  return mapPageBySlug.get(slug);
}

export function getSpeciesMapPageBySpeciesId(speciesId: string | undefined) {
  return speciesId ? mapPageBySpeciesId.get(speciesId) : undefined;
}

export function speciesMapPath(speciesId: string) {
  return speciesMapRoutes[speciesId] ?? `/map?species=${encodeURIComponent(speciesId)}`;
}

export function speciesMapHref(
  speciesId: string,
  parameters: Record<string, string | undefined> = {},
) {
  const basePath = speciesMapPath(speciesId);
  const [pathname, existingQuery = ""] = basePath.split("?");
  const query = new URLSearchParams(existingQuery);

  for (const [key, value] of Object.entries(parameters)) {
    if (value) query.set(key, value);
  }

  const suffix = query.toString();
  return suffix ? `${pathname}?${suffix}` : pathname;
}
