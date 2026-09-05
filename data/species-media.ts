import type { MediaAsset } from "@/src/lib/types";

// Own field photographs are listed before the Wikimedia identification reference so the gallery opens on them.

export const speciesMedia: Record<string, MediaAsset[]> = {
  "lycoperdon-utriforme": [{
    id: "aleix-ventayol-lycoperdon-utriforme-edited",
    localPath: "/media/editorial/lycoperdon-utriforme.webp",
    sourceUrl: "https://bolets.app/media/editorial/lycoperdon-utriforme.webp",
    attribution: "Aleix Ventayol",
    license: "Cedida per l’autor a Bolets · edició assistida amb IA",
    identificationReference: false,
    alt: "Pet de llop gros jove i blanc en un prat, amb les plaques piramidals de la superfície destacades per la llum baixa.",
  }, {
    id: "wikimedia-lycoperdon-utriforme-chernilevsky",
    localPath: "/media/wikimedia/lycoperdon-utriforme-reference.webp",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/e/ef/Lycoperdon_utriforme%2C_Mosaic_Puffball_2010_G1.jpg",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Lycoperdon_utriforme,_Mosaic_Puffball_2010_G1.jpg",
    attribution: "George Chernilevsky",
    license: "Domini públic · mida i format adaptats",
    identificationReference: true,
    alt: "Lycoperdon utriforme de prop de catorze centímetres, ample i blanc, amb la base lleugerament més estreta.",
  }],
  "lycoperdon-perlatum": [{
    id: "wikimedia-single-lycoperdon-perlatum",
    localPath: "/media/wikimedia/lycoperdon-perlatum.webp",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/3/35/Single_lycoperdon_perlatum.jpg",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Single_lycoperdon_perlatum.jpg",
    attribution: "Daniel Ullrich, Threedots", license: "CC BY-SA 3.0 · format adaptat",
    identificationReference: true,
    alt: "Pet de llop perlat blanc amb agullons cònics i base allargada, entre la fullaraca del bosc.",
  }],
  "calvatia-gigantea": [{
    id: "wikimedia-calvatia-gigantea-hillewaert",
    localPath: "/media/wikimedia/calvatia-gigantea.webp",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/e/e4/Calvatia_gigantea.jpg",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Calvatia_gigantea.jpg",
    attribution: "© Hans Hillewaert", license: "CC BY-SA 4.0 · mida i format adaptats",
    identificationReference: true,
    alt: "Pet de llop gegant, blanc i de superfície llisa, entre l’herba d’una pastura amb vaques al fons.",
  }],
  "russula-cyanoxantha": [{
    id: "wikimedia-russula-cyanoxantha-g21",
    localPath: "/media/wikimedia/russula-cyanoxantha.webp",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/6/66/Russula_cyanoxantha_G2.1.jpg",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Russula_cyanoxantha_G2.1.jpg",
    attribution: "Jerzy Opioła", license: "CC BY-SA 4.0 · mida i format adaptats",
    identificationReference: true,
    alt: "Llora aspra de barret violaci amb tons verdosos i peu blanc sobre el sòl del bosc.",
  }],
  "hygrophoropsis-aurantiaca": [
    {
      id: "wikimedia-hygrophoropsis-aurantiaca-anglars",
      localPath: "/media/wikimedia/hygrophoropsis-aurantiaca.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b5/Hygrophoropsis_aurantiaca_anglars.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Hygrophoropsis_aurantiaca_anglars.jpg",
      attribution: "Bubulcus",
      license: "CC BY 3.0 · mida i format adaptats",
      identificationReference: true,
      alt: "Barret taronja i làmines bifurcades del fals rossinyol, amb un exemplar capgirat sobre la pinassa.",
    },
    {
      id: "wikimedia-hygrophoropsis-aurantiaca-anneli-salo",
      localPath: "/media/wikimedia/hygrophoropsis-aurantiaca-soca.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d3/Hygrophoropsis_aurantiaca_Valevahvero_C_IMG_6188.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Hygrophoropsis_aurantiaca_Valevahvero_C_IMG_6188.jpg",
      attribution: "Anneli Salo",
      license: "CC BY-SA 3.0 · mida i format adaptats",
      identificationReference: false,
      alt: "Dos barrets ataronjats de fals rossinyol al costat d’una soca coberta de líquens.",
    },
  ],
  "boletus-edulis": [
    {
      id: "wikimedia-boletus-edulis-it",
      localPath: "/media/wikimedia/boletus-edulis.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Boletus_edulis_IT.jpg/1280px-Boletus_edulis_IT.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Boletus_edulis_IT.jpg",
      attribution: "ReddishClover",
      license: "CC BY-SA 4.0",
      identificationReference: true,
      alt: "Exemplar de Boletus edulis en un bosc mixt de muntanya."
    }
  ],
  "boletus-pinophilus": [
    {
      id: "aleix-boletus-pinophilus-field-20250913",
      localPath: "/media/contributed/boletus-pinophilus-field-aleix-20250913.webp",
      sourceUrl: "https://bolets.app/equip-editorial#autoria",
      attribution: "Aleix Ventayol",
      license: "© Aleix Ventayol",
      identificationReference: true,
      alt: "Boletus pinophilus: Ceps acabats de collir sobre l’herba amb pinassa; dos barrets vinosos foscos i un de més clar amb el peu blanc i gruixut.",
    },
    {
      id: "wikimedia-boletus-pinophilus3",
      localPath: "/media/wikimedia/boletus-pinophilus.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Boletus_pinophilus3.JPG/1280px-Boletus_pinophilus3.JPG",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Boletus_pinophilus3.JPG",
      attribution: "Paffka",
      license: "CC BY-SA 3.0",
      identificationReference: false,
      alt: "Exemplars de Boletus pinophilus sobre el terra del bosc."
    }
  ],
  "boletus-aereus": [
    {
      id: "wikimedia-boletus-aereus-29105181796",
      localPath: "/media/wikimedia/boletus-aereus.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Boletus_aereus_%2829105181796%29.jpg/1280px-Boletus_aereus_%2829105181796%29.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Boletus_aereus_(29105181796).jpg",
      attribution: "Björn Sothmann",
      license: "CC BY-SA 2.0",
      identificationReference: true,
      alt: "Exemplars foscos de Boletus aereus entre la fullaraca."
    }
  ],
  "boletus-reticulatus": [
    {
      id: "wikimedia-boletus-reticulatus-2009-g2",
      localPath: "/media/wikimedia/boletus-reticulatus.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Boletus_reticulatus_2009_G2.jpg/1280px-Boletus_reticulatus_2009_G2.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Boletus_reticulatus_2009_G2.jpg",
      attribution: "George Chernilevsky",
      license: "Domini públic",
      identificationReference: true,
      alt: "Exemplar de Boletus reticulatus amb barret bru clar i reticle marcat al peu."
    }
  ],
  "lactarius-deliciosus": [
    {
      id: "aleix-lactarius-deliciosus-field-20241124",
      localPath: "/media/contributed/lactarius-deliciosus-field-aleix-20241124.webp",
      sourceUrl: "https://bolets.app/equip-editorial#autoria",
      attribution: "Aleix Ventayol",
      license: "© Aleix Ventayol",
      identificationReference: true,
      alt: "Lactarius deliciosus: Barret ataronjat amb cercles concèntrics i el centre deprimit; les làmines i el peu clars es veuen entre l’herba curta.",
    },
    {
      id: "aleix-lactarius-deliciosus-field-20250913",
      localPath: "/media/contributed/lactarius-deliciosus-field-aleix-20250913.webp",
      sourceUrl: "https://bolets.app/equip-editorial#autoria",
      attribution: "Aleix Ventayol",
      license: "© Aleix Ventayol",
      identificationReference: false,
      alt: "Lactarius deliciosus: Barret taronja amb taques més clares mig amagat entre la molsa i la pinassa, fotografiat des de dalt.",
    },
    {
      id: "wikimedia-lactarius-deliciosus",
      localPath: "/media/wikimedia/lactarius-deliciosus.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/8/89/Lactarius_deliciosus.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Lactarius_deliciosus.jpg",
      attribution: "Eric Steinert",
      license: "CC BY-SA 3.0",
      identificationReference: false,
      alt: "Exemplars taronja de Lactarius deliciosus al bosc."
    }
  ],
  "lactarius-sanguifluus": [
    {
      id: "wikimedia-lactarius-sanguifluus",
      localPath: "/media/wikimedia/lactarius-sanguifluus.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Weinroter_Kiefern-Reizker_Lactarius_sanguifluus.jpg/1280px-Weinroter_Kiefern-Reizker_Lactarius_sanguifluus.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Weinroter_Kiefern-Reizker_Lactarius_sanguifluus.jpg",
      attribution: "Holger Krisp",
      license: "CC BY 3.0",
      identificationReference: true,
      alt: "Exemplar de Lactarius sanguifluus entre la pinassa."
    }
  ],
  "cantharellus-cibarius": [
    {
      id: "wikimedia-cantharellus-cibarius",
      localPath: "/media/wikimedia/cantharellus-cibarius.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Chanterelle_Cantharellus_cibarius.jpg/1280px-Chanterelle_Cantharellus_cibarius.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Chanterelle_Cantharellus_cibarius.jpg",
      attribution: "Strobilomyces",
      license: "CC BY-SA 3.0",
      identificationReference: true,
      alt: "Grup de Cantharellus cibarius grocs sobre el terra del bosc."
    }
  ],
  "craterellus-lutescens": [
    {
      id: "wikimedia-craterellus-lutescens",
      localPath: "/media/wikimedia/craterellus-lutescens.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Cantharellus_lutescens.jpg/1280px-Cantharellus_lutescens.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Cantharellus_lutescens.jpg",
      attribution: "Pau Cabot",
      license: "CC BY-SA 3.0",
      identificationReference: true,
      alt: "Grup de Craterellus lutescens entre vegetació baixa."
    }
  ],
  "craterellus-cornucopioides": [
    {
      id: "wikimedia-craterellus-cornucopioides",
      localPath: "/media/wikimedia/craterellus-cornucopioides.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Craterellus_cornucopioides_JPG1.jpg/1280px-Craterellus_cornucopioides_JPG1.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Craterellus_cornucopioides_JPG1.jpg",
      attribution: "Jean-Pol GRANDMONT",
      license: "CC BY 3.0",
      identificationReference: true,
      alt: "Grup de Craterellus cornucopioides foscos entre la fullaraca."
    }
  ],
  "hydnum-repandum": [
    {
      id: "wikimedia-hydnum-repandum",
      localPath: "/media/wikimedia/hydnum-repandum.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b9/Hedgehog_fungi2.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Hedgehog_fungi2.jpg",
      attribution: "D J Kelly",
      license: "Domini públic",
      identificationReference: true,
      alt: "Exemplars clars de Hydnum repandum sobre el sòl del bosc."
    }
  ],
  "macrolepiota-procera": [
    {
      id: "aleix-macrolepiota-procera-field-20241103",
      localPath: "/media/contributed/macrolepiota-procera-field-aleix-20241103.webp",
      sourceUrl: "https://bolets.app/equip-editorial#autoria",
      attribution: "Aleix Ventayol",
      license: "© Aleix Ventayol",
      identificationReference: true,
      alt: "Macrolepiota procera: Exemplar alt a contrallum de l’alba en un prat, amb el barret escatós obert, l’anell doble i el peu amb dibuix de pell de serp.",
    },
    {
      id: "aleix-macrolepiota-procera-field-20260822",
      localPath: "/media/generated/macrolepiota-procera-field-aleix-v1.webp",
      sourceUrl: "https://bolets.app/equip-editorial#autoria",
      attribution: "Aleix Ventayol",
      license: "© Aleix Ventayol",
      identificationReference: false,
      alt: "Macrolepiota procera amb el barret escatós obert entre l’herba d’un prat.",
    },
    {
      id: "wikimedia-macrolepiota-procera",
      localPath: "/media/wikimedia/macrolepiota-procera.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Parasol-Macrolepiota-procera.jpg/1280px-Parasol-Macrolepiota-procera.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Parasol-Macrolepiota-procera.jpg",
      attribution: "Holger Krisp",
      license: "CC BY 3.0",
      identificationReference: false,
      alt: "Macrolepiota procera alta amb el barret obert en un prat."
    }
  ],
  "tricholoma-terreum": [
    {
      id: "wikimedia-tricholoma-terreum",
      localPath: "/media/wikimedia/tricholoma-terreum.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Tricholoma_terreum_20061105wa.jpg/1280px-Tricholoma_terreum_20061105wa.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Tricholoma_terreum_20061105wa.jpg",
      attribution: "Strobilomyces",
      license: "CC BY-SA 3.0",
      identificationReference: true,
      alt: "Grup de Tricholoma terreum gris sobre el terra."
    }
  ],
  "hygrophorus-latitabundus": [
    {
      id: "wikimedia-hygrophorus-latitabundus",
      localPath: "/media/wikimedia/hygrophorus-latitabundus.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Hygrophorus_latitabundus1.JPG/1280px-Hygrophorus_latitabundus1.JPG",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Hygrophorus_latitabundus1.JPG",
      attribution: "Paffka",
      license: "CC BY-SA 3.0",
      identificationReference: true,
      alt: "Exemplars de Hygrophorus latitabundus sota una pineda."
    }
  ],
  "amanita-caesarea": [
    {
      id: "wikimedia-amanita-caesarea",
      localPath: "/media/wikimedia/amanita-caesarea.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Oronges.jpg/1280px-Oronges.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Oronges.jpg",
      attribution: "Yaqui",
      license: "CC BY-SA 3.0",
      identificationReference: true,
      alt: "Exemplars taronja d’Amanita caesarea sobre l’herba."
    }
  ],
  "marasmius-oreades": [
    {
      id: "aleix-marasmius-oreades-field-20260513",
      localPath: "/media/contributed/marasmius-oreades-field-aleix-20260513.webp",
      sourceUrl: "https://bolets.app/equip-editorial#autoria",
      attribution: "Aleix Ventayol",
      license: "© Aleix Ventayol",
      identificationReference: true,
      alt: "Marasmius oreades: Grup de barrets ocre amb mamelló central i peus prims i clars entre l’herba alta d’un prat.",
    },
    {
      id: "wikimedia-marasmius-oreades",
      localPath: "/media/wikimedia/marasmius-oreades.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Michigan_Marasmius_oreades.jpg/1280px-Michigan_Marasmius_oreades.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Michigan_Marasmius_oreades.jpg",
      attribution: "Alan Rockefeller",
      license: "CC BY 4.0",
      identificationReference: false,
      alt: "Grup de Marasmius oreades creixent entre l’herba."
    }
  ],
  "calocybe-gambosa": [
    {
      id: "wikimedia-calocybe-gambosa-080420wa",
      localPath: "/media/wikimedia/calocybe-gambosa.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Calocybe_gambosa_080420wa.jpg/1280px-Calocybe_gambosa_080420wa.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Calocybe_gambosa_080420wa.jpg",
      attribution: "Strobilomyces",
      license: "CC BY-SA 4.0",
      identificationReference: true,
      alt: "Dos exemplars pàl·lids de Calocybe gambosa entre l’herba."
    }
  ],
  "hygrophorus-russula": [
    {
      id: "wikimedia-hygrophorus-russula-moselle",
      localPath: "/media/wikimedia/hygrophorus-russula.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Hygrophorus_russula_%28Moselle%2C_France%29.jpg/1280px-Hygrophorus_russula_%28Moselle%2C_France%29.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Hygrophorus_russula_(Moselle,_France).jpg",
      attribution: "Jean.claude",
      license: "CC BY-SA 4.0",
      identificationReference: true,
      alt: "Grup de Hygrophorus russula amb barrets jaspiats de rosa vinós entre fullaraca."
    }
  ],
  "morchella-esculenta": [
    {
      id: "wikimedia-morchella-esculenta-speise-morchel",
      localPath: "/media/wikimedia/morchella-esculenta.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Speise-Morchel_Morchella_esculenta.jpg/1280px-Speise-Morchel_Morchella_esculenta.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Speise-Morchel_Morchella_esculenta.jpg",
      attribution: "Holger Krisp",
      license: "CC BY 3.0",
      identificationReference: true,
      alt: "Exemplars de Morchella esculenta amb barrets alveolats de color mel."
    }
  ],
  "lepista-nuda": [
    {
      id: "wikimedia-lepista-nuda-lc0372",
      localPath: "/media/wikimedia/lepista-nuda.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Lepista_nuda_LC0372.jpg/1280px-Lepista_nuda_LC0372.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Lepista_nuda_LC0372.jpg",
      attribution: "Jörg Hempel",
      license: "CC BY-SA 3.0 DE",
      identificationReference: true,
      alt: "Dos exemplars violetes de Lepista nuda entre la fullaraca."
    }
  ],
  "suillus-luteus": [
    {
      id: "wikimedia-suillus-luteus-1",
      localPath: "/media/wikimedia/suillus-luteus.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Suillus_luteus_1.jpg/1280px-Suillus_luteus_1.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Suillus_luteus_1.jpg",
      attribution: "Dmitry Brant",
      license: "CC BY-SA 4.0",
      identificationReference: true,
      alt: "Grup de Suillus luteus amb barrets viscosos i un exemplar que mostra els porus grocs."
    }
  ],
  "chroogomphus-rutilus": [
    {
      id: "wikimedia-chroogomphus-rutilus-nt3-9",
      localPath: "/media/wikimedia/chroogomphus-rutilus.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Chroogomphus_rutilus_NT3_%289%29.jpg/1280px-Chroogomphus_rutilus_NT3_%289%29.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Chroogomphus_rutilus_NT3_(9).jpg",
      attribution: "Jerzy Opioła",
      license: "CC BY-SA 4.0",
      identificationReference: true,
      alt: "Exemplar de Chroogomphus rutilus amb barret rogenc, làmines decurrents i peu groguenc."
    }
  ],
  "ramaria-aurea": [
    {
      id: "wikimedia-ramaria-aurea-crop",
      localPath: "/media/wikimedia/ramaria-aurea.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/13/2012-09-03_Ramaria_aurea_crop.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:2012-09-03_Ramaria_aurea_crop.jpg",
      attribution: "Böhringer Friedrich; retall d’Ak ccm",
      license: "CC BY-SA 2.5",
      identificationReference: true,
      alt: "Fructificació coral·liforme de color groc daurat de Ramaria aurea sobre el sòl del bosc."
    }
  ],
  "agaricus-campestris": [
    {
      id: "wikimedia-agaricus-campestris-051011a",
      localPath: "/media/wikimedia/agaricus-campestris.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/3/34/Agaricus_campestris_051011A.JPG",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Agaricus_campestris_051011A.JPG",
      attribution: "Strobilomyces",
      license: "CC BY-SA 3.0",
      identificationReference: true,
      alt: "Exemplar d’Agaricus campestris en un prat, amb barret clar i làmines ja fosques."
    }
  ],
  "pleurotus-ostreatus": [
    {
      id: "wikimedia-pleurotus-ostreatus-20201231",
      localPath: "/media/wikimedia/pleurotus-ostreatus.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/0/0a/Gewone_oesterzwam_%28Pleurotus_ostreatus%29_31-12-2020_%28d.j.b.%29_03.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Gewone_oesterzwam_(Pleurotus_ostreatus)_31-12-2020_(d.j.b.)_03.jpg",
      attribution: "Dominicus Johannes Bergsma",
      license: "CC BY-SA 4.0",
      identificationReference: true,
      alt: "Grup de Pleurotus ostreatus amb barrets grisosos creixent lateralment sobre un tronc."
    }
  ],
  "hygrophorus-eburneus": [
    {
      id: "wikimedia-hygrophorus-eburneus-elfenbeinschneckling",
      localPath: "/media/wikimedia/hygrophorus-eburneus.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/2/21/Elfenbeinschneckling_Hygrophorus_eburneus.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Elfenbeinschneckling_Hygrophorus_eburneus.jpg",
      attribution: "Holger Krisp",
      license: "CC BY 3.0",
      identificationReference: true,
      alt: "Exemplars blancs i viscosos d’Hygrophorus eburneus entre fulles de faig."
    }
  ],
  "craterellus-tubaeformis": [
    {
      id: "wikimedia-craterellus-tubaeformis-110921w",
      localPath: "/media/wikimedia/craterellus-tubaeformis.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/9/99/Craterellus_tubaeformis_110921w.JPG",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Craterellus_tubaeformis_110921w.JPG",
      attribution: "Strobilomyces",
      license: "CC BY-SA 3.0",
      identificationReference: true,
      alt: "Grup de Craterellus tubaeformis de barret bru i peu groguenc entre molsa humida."
    }
  ],
  "tuber-melanosporum": [
    {
      id: "wikimedia-tuber-melanosporum-agreda",
      localPath: "/media/wikimedia/tuber-melanosporum.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Tuber_melanosporum_-_trufa_negra%2C_%C3%81greda%2C_Espa%C3%B1a.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Tuber_melanosporum_-_trufa_negra,_Ágreda,_España.jpg",
      attribution: "Diego Delso",
      license: "CC BY-SA 3.0",
      identificationReference: true,
      alt: "Diverses tòfones negres Tuber melanosporum acabades d’extreure del sòl."
    }
  ],
  "amanita-phalloides": [
    {
      id: "wikimedia-amanita-phalloides-1",
      localPath: "/media/wikimedia/amanita-phalloides.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/9/99/Amanita_phalloides_1.JPG",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Amanita_phalloides_1.JPG",
      attribution: "Archenzo",
      license: "CC BY-SA 3.0",
      identificationReference: true,
      alt: "Dos exemplars d’Amanita phalloides que mostren les làmines blanques, l’anell i la volva basal."
    }
  ],
  "rubroboletus-satanas": [
    {
      id: "wikimedia-rubroboletus-satanas-satans-rohrling",
      localPath: "/media/wikimedia/rubroboletus-satanas.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/0/0d/Satans-R%C3%B6hrling_Boletus_satanas.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Satans-R%C3%B6hrling_Boletus_satanas.jpg",
      attribution: "Holger Krisp",
      license: "CC BY 3.0",
      identificationReference: true,
      alt: "Matagent de barret pàl·lid, porus vermells i peu acolorit."
    }
  ],
  "tylopilus-felleus": [
    {
      id: "wikimedia-tylopilus-felleus-gallenrohrling",
      localPath: "/media/wikimedia/tylopilus-felleus.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/f/fd/Gemeine_Gallenr%C3%B6hrling_Tylopilus_felleus.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Gemeine_Gallenr%C3%B6hrling_Tylopilus_felleus.jpg",
      attribution: "Holger Krisp",
      license: "CC BY 3.0",
      identificationReference: true,
      alt: "Mataparent amb barret bru i porus pàl·lids que es tornen rosats."
    }
  ],
  "amanita-muscaria": [
    {
      id: "wikimedia-amanita-muscaria-fly-agaric",
      localPath: "/media/wikimedia/amanita-muscaria.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Fliegenpilz_fly_agaric_Amanita_muscaria.JPG",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Fliegenpilz_fly_agaric_Amanita_muscaria.JPG",
      attribution: "Holger Krisp",
      license: "CC BY 3.0",
      identificationReference: true,
      alt: "Reig bord vermell amb berrugues blanques i peu clar."
    }
  ],
  "cortinarius-rubellus": [
    {
      id: "wikimedia-cortinarius-rubellus-01",
      localPath: "/media/wikimedia/cortinarius-rubellus.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/7/76/Cortinarius_rubellus_01.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Cortinarius_rubellus_01.jpg",
      attribution: "Eric Steinert",
      license: "CC BY-SA 3.0",
      identificationReference: true,
      alt: "Cortinari mortal de tons rogencs i làmines rovellades."
    }
  ],
  "omphalotus-olearius": [
    {
      id: "wikimedia-omphalotus-olearius",
      localPath: "/media/wikimedia/omphalotus-olearius.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9c/Omphalotus_olearius.JPG",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Omphalotus_olearius.JPG",
      attribution: "Antonio Abbatiello",
      license: "Domini públic",
      identificationReference: true,
      alt: "Feix taronja de bolet d’olivera amb làmines decurrents."
    }
  ],
  "lepiota-brunneoincarnata": [
    {
      id: "wikimedia-lepiota-brunneoincarnata",
      localPath: "/media/wikimedia/lepiota-brunneoincarnata.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/14/2015-10-11_Lepiota_brunneoincarnata_Chodat_%26_C._Mart%C3%ADn_564314.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:2015-10-11_Lepiota_brunneoincarnata_Chodat_%26_C._Mart%C3%ADn_564314.jpg",
      attribution: "Murselin Guney (Beyrek)",
      license: "CC BY-SA 3.0",
      identificationReference: true,
      alt: "Grup de petites lepiotes amb barrets bru-rosats esquamosos i un exemplar girat que mostra les làmines blanques."
    }
  ],
  "galerina-marginata": [
    {
      id: "wikimedia-galerina-marginata",
      localPath: "/media/wikimedia/galerina-marginata.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/b/bb/Galerina_marginata_Point_Reyes.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Galerina_marginata_Point_Reyes.jpg",
      attribution: "Alan Rockefeller",
      license: "CC BY-SA 4.0",
      identificationReference: true,
      alt: "Grup de Galerina marginata sobre fusta, amb barrets mel i peus anellats; exemplars seccionats al davant."
    }
  ],
  "cortinarius-orellanus": [
    {
      id: "wikimedia-cortinarius-orellanus",
      localPath: "/media/wikimedia/cortinarius-orellanus.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1c/2013-10-16_Cortinarius_orellanus_1a.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:2013-10-16_Cortinarius_orellanus_1a.jpg",
      attribution: "Andreas Kunze",
      license: "CC BY-SA 3.0",
      identificationReference: true,
      alt: "Cortinarius orellanus al bosc, amb barret sec ataronjat i peu groguenc sense anell."
    }
  ],
  "gyromitra-esculenta": [
    {
      id: "wikimedia-gyromitra-esculenta",
      localPath: "/media/wikimedia/gyromitra-esculenta.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/d/df/Lukas_Large_-_Gyromitra_esculenta_%2853590247585%29.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Lukas_Large_-_Gyromitra_esculenta_(53590247585).jpg",
      attribution: "Lukas Large",
      license: "CC BY-SA 2.0",
      identificationReference: true,
      alt: "Gyromitra esculenta amb barret bru fosc fortament lobulat i plegat sobre un peu pàl·lid."
    }
  ],
  "amanita-pantherina": [
    {
      id: "wikimedia-amanita-pantherina",
      localPath: "/media/wikimedia/amanita-pantherina.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/f/fd/Amanita_pantherina_342115529.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Amanita_pantherina_342115529.jpg",
      attribution: "Matej Frančeškin",
      license: "CC BY 4.0",
      identificationReference: true,
      alt: "Amanita pantherina madura amb barret bru cobert de berrugues blanques i anell al peu."
    }
  ],
  "amanita-virosa": [
    {
      id: "wikimedia-amanita-virosa",
      localPath: "/media/wikimedia/amanita-virosa.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/3/3c/Fatra_2023_P187_Velka_Fatra_Amanita_virosa.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Fatra_2023_P187_Velka_Fatra_Amanita_virosa.jpg",
      attribution: "Fallaner",
      license: "CC BY 4.0",
      identificationReference: true,
      alt: "Amanita virosa blanca al bosc, amb barret cònic irregular i peu llarg anellat."
    }
  ],
  "amanita-verna": [
    {
      id: "wikimedia-amanita-verna",
      localPath: "/media/wikimedia/amanita-verna.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/c/ca/Amanita_verna_%28destroying_angel_mushroom%29.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Amanita_verna_(destroying_angel_mushroom).jpg",
      attribution: "James St. John",
      license: "CC BY 2.0",
      identificationReference: true,
      alt: "Dos estadis d’Amanita verna amb barrets blancs llisos, anell i base volvada."
    }
  ],
  "tricholoma-pardinum": [
    {
      id: "wikimedia-tricholoma-pardinum",
      localPath: "/media/wikimedia/tricholoma-pardinum.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7f/2012-03-28_Tricholoma_pardinum_Qu%C3%A9l_208648.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:2012-03-28_Tricholoma_pardinum_Qu%C3%A9l_208648.jpg",
      attribution: "David Rust (incredulis)",
      license: "CC BY-SA 3.0",
      identificationReference: true,
      alt: "Grup de Tricholoma pardinum amb barrets grisos coberts d’escates fosques concèntriques."
    }
  ],
  "entoloma-sinuatum": [
    {
      id: "wikimedia-entoloma-sinuatum",
      localPath: "/media/wikimedia/entoloma-sinuatum.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/0/0e/Entoloma_sinuatum_573398400.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Entoloma_sinuatum_573398400.jpg",
      attribution: "Matej Frančeškin",
      license: "CC BY 4.0",
      identificationReference: true,
      alt: "Entoloma sinuatum madur amb barret crema ondulat i peu blanc robust."
    }
  ],
  "inocybe-erubescens": [
    {
      id: "wikimedia-inocybe-erubescens",
      localPath: "/media/wikimedia/inocybe-erubescens.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/a/aa/Inosperma_erubescens.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Inosperma_erubescens.jpg",
      attribution: "The Brook",
      license: "CC BY-SA 4.0",
      identificationReference: true,
      alt: "Inosperma erubescens amb barret fibril·lós ocre i taques vermelloses al peu i al marge."
    }
  ],
  "clitocybe-rivulosa": [
    {
      id: "wikimedia-clitocybe-rivulosa",
      localPath: "/media/wikimedia/clitocybe-rivulosa.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1d/2016-09-14_Clitocybe_rivulosa_%28Pers.%29_P._Kumm_688616.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:2016-09-14_Clitocybe_rivulosa_(Pers.)_P._Kumm_688616.jpg",
      attribution: "Igor (Igor_Yevdokimov)",
      license: "CC BY-SA 3.0",
      identificationReference: true,
      alt: "Clitocybe rivulosa a la gespa amb barrets blancs deprimits i cercles ocracis."
    }
  ],
  "paxillus-involutus": [
    {
      id: "wikimedia-paxillus-involutus",
      localPath: "/media/wikimedia/paxillus-involutus.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/4e/2021-11-14_Paxillus_involutus_%28Flickr_51690952401%29.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:2021-11-14_Paxillus_involutus_(Flickr_51690952401).jpg",
      attribution: "Lutz Blohm",
      license: "CC BY-SA 2.0",
      identificationReference: true,
      alt: "Paxillus involutus al bosc amb barret bru deprimit i marge fortament enrotllat."
    }
  ],
  "hygrophorus-marzuolus": [
    {
      id: "wikimedia-hygrophorus-marzuolus",
      localPath: "/media/wikimedia/hygrophorus-marzuolus.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/e/ef/Hygrophorus_marzuolus_485550068.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Hygrophorus_marzuolus_485550068.jpg",
      attribution: "Matej Frančeškin",
      license: "CC BY 4.0",
      identificationReference: true,
      alt: "Hygrophorus marzuolus emergint de la fullaraca amb barret gris fosc irregular."
    }
  ],
  "tricholoma-portentosum": [
    {
      id: "wikimedia-tricholoma-portentosum",
      localPath: "/media/wikimedia/tricholoma-portentosum.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/0/05/Tricholoma_portentosum_a1_%282%29.JPG",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Tricholoma_portentosum_a1_(2).JPG",
      attribution: "Jerzy Opioła",
      license: "CC BY-SA 4.0",
      identificationReference: true,
      alt: "Tricholoma portentosum amb barret gris fosc fibril·lós, peu clar i reflexos grocs."
    }
  ],
  "russula-virescens": [
    {
      id: "wikimedia-russula-virescens",
      localPath: "/media/wikimedia/russula-virescens.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9f/Lukas_Large_-_Russula_virescens_%2853128945610%29.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Lukas_Large_-_Russula_virescens_(53128945610).jpg",
      attribution: "Lukas Large",
      license: "CC BY-SA 2.0",
      identificationReference: true,
      alt: "Russula virescens madura amb mosaic d’esquerdes verdoses característic al barret."
    }
  ],
  "cyclocybe-cylindracea": [
    {
      id: "wikimedia-cyclocybe-cylindracea",
      localPath: "/media/wikimedia/cyclocybe-cylindracea.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/e/ea/Poplar_Fieldcap_%28Cyclocybe_cylindracea%29_%2835207347644%29.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Poplar_Fieldcap_(Cyclocybe_cylindracea)_(35207347644).jpg",
      attribution: "gailhampshire",
      license: "CC BY 2.0",
      identificationReference: true,
      alt: "Feix de Cyclocybe cylindracea sobre fusta de pollancre, amb barrets bruns i peus anellats."
    }
  ],
  "coprinus-comatus": [
    {
      id: "wikimedia-coprinus-comatus",
      localPath: "/media/wikimedia/coprinus-comatus.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/3/30/Coprinus_comatus_%2849264153071%29.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Coprinus_comatus_(49264153071).jpg",
      attribution: "Lukas from London, England",
      license: "CC BY-SA 2.0",
      identificationReference: true,
      alt: "Coprinus comatus madur amb barret blanc escamós i marge inferior començant a ennegrir-se."
    }
  ],
  "suillus-granulatus": [
    {
      id: "wikimedia-suillus-granulatus",
      localPath: "/media/wikimedia/suillus-granulatus.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/6/6c/2017-08-09_Suillus_granulatus_%28L.%29_Roussel_776585.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:2017-08-09_Suillus_granulatus_(L.)_Roussel_776585.jpg",
      attribution: "weed lady (Sylvia)",
      license: "CC BY-SA 3.0",
      identificationReference: true,
      alt: "Diversos Suillus granulatus amb barrets viscosos color canyella en una pineda."
    }
  ],
  "pleurotus-eryngii": [
    {
      id: "wikimedia-pleurotus-eryngii",
      localPath: "/media/wikimedia/pleurotus-eryngii.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1c/Pleurotus_eryngii_-_Do%C4%9Fal_Ortam%C4%B1nda_%C3%87a%C5%9F%C4%B1r_Mantar%C4%B1.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Pleurotus_eryngii_-_Do%C4%9Fal_Ortam%C4%B1nda_%C3%87a%C5%9F%C4%B1r_Mantar%C4%B1.jpg",
      attribution: "Ferit BAYCUMAN",
      license: "CC BY-SA 4.0",
      identificationReference: true,
      alt: "Pleurotus eryngii silvestre al costat de la planta hoste, amb barret bru i peu blanc gruixut."
    }
  ],
  "lactarius-chrysorrheus": [
    {
      id: "wikimedia-lactarius-chrysorrheus",
      localPath: "/media/wikimedia/lactarius-chrysorrheus.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/9/92/Lactarius_chrysorrheus_1139526.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Lactarius_chrysorrheus_1139526.jpg",
      attribution: "Richard Daniel (RichardDaniel)",
      license: "CC BY-SA 3.0",
      identificationReference: true,
      alt: "Lactarius chrysorrheus amb el barret salmó deprimit, làmines decurrents i gotes de làtex groc visibles."
    }
  ],
  "lactarius-torminosus": [
    {
      id: "wikimedia-lactarius-torminosus",
      localPath: "/media/wikimedia/lactarius-torminosus.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/8/87/Lactarius_torminosus_041031w.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Lactarius_torminosus_041031w.jpg",
      attribution: "Strobilomyces",
      license: "CC BY-SA 3.0",
      identificationReference: true,
      alt: "Lactarius torminosus amb barret rosat zonat, marge densament pelut i un exemplar mostrant les làmines clares."
    }
  ],
  "ramaria-formosa": [
    {
      id: "wikimedia-ramaria-formosa",
      localPath: "/media/wikimedia/ramaria-formosa.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/7/70/Ramaria_formosa_2.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Ramaria_formosa_2.jpg",
      attribution: "Jose Angel Urquia Goitia",
      license: "CC BY-SA 4.0",
      identificationReference: true,
      alt: "Ramaria formosa al bosc amb base carnosa rosada, branques salmó i puntes groguenques densament dividides."
    }
  ],
  "lactifluus-rugatus": [
    {
      id: "inaturalist-lactifluus-rugatus-cap",
      localPath: "/media/wikimedia/lactifluus-rugatus.webp",
      imageUrl: "https://inaturalist-open-data.s3.amazonaws.com/photos/457279762/original.jpg",
      sourceUrl: "https://inaturalist-open-data.s3.amazonaws.com/photos/457279762/original.jpg",
      attribution: "Andrea Monsalve",
      license: "CC BY 4.0",
      identificationReference: true,
      alt: "Lactifluus rugatus vist de dalt, amb barret irregular de color vermell rajola i superfície finament rugosa."
    },
    {
      id: "inaturalist-lactifluus-rugatus-underside",
      localPath: "/media/wikimedia/lactifluus-rugatus-underside.webp",
      imageUrl: "https://inaturalist-open-data.s3.amazonaws.com/photos/457279760/original.jpg",
      sourceUrl: "https://inaturalist-open-data.s3.amazonaws.com/photos/457279760/original.jpg",
      attribution: "Andrea Monsalve",
      license: "CC BY 4.0",
      identificationReference: false,
      alt: "Lactifluus rugatus vist per sota, amb làmines clares espaiades, gotes de làtex blanc i peu robust rogenc."
    }
  ],
  "leccinellum-lepidum": [
    {
      id: "wikimedia-leccinellum-lepidum",
      localPath: "/media/wikimedia/leccinellum-lepidum.webp",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Leccinellum_lepidum_2.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Leccinellum_lepidum_2.jpg",
      attribution: "Davide Puddu",
      license: "CC BY 4.0",
      identificationReference: true,
      alt: "Diversos Leccinellum lepidum d’alzinar amb barrets bruns, porus grocs i una secció que mostra la carn pàl·lida."
    }
  ]
};
