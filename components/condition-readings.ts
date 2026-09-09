import {
  Cloud,
  CloudRain,
  Droplets,
  ThermometerSun,
  Wind,
} from "lucide-react";
import {
  effectiveRainfallMm,
  rainfallWindow,
  terrainLapseDeltaC,
} from "@/src/lib/hydrothermal-v2";
import {
  rainResponseState,
  rainWindowPhrase,
  scoredRainWindow,
} from "@/src/lib/rain-response-summary";
import type { ConditionSnapshot, SpeciesProfile } from "@/src/lib/types";

type ConditionStat = {
  label: string;
  value: string;
  explanation?: string;
};
type ConditionContext = { note: string };

const temperature = (value: number | undefined) =>
  value === undefined ? "—" : `${value.toFixed(1)} °C`;
const percentage = (value: number | undefined, ratio = false) =>
  value === undefined ? "—" : `${Math.round(value * (ratio ? 100 : 1))}%`;
const speed = (value: number | undefined) =>
  value === undefined ? "—" : `${Math.round(value)} km/h`;
const millimetres = (value: number | undefined) =>
  value === undefined ? "—" : `${Math.round(value * 10) / 10} mm`;
const days = (value: number | undefined) =>
  value === undefined ? "—" : `${Math.round(value * 10) / 10} dies`;
const dayCount = (value: number | undefined) =>
  value === undefined ? "—" : `${Math.round(value)} dies`;
const moistureTrend = (value: number | undefined) =>
  value === undefined
    ? "—"
    : `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)} punts`;

export function conditionReadings(
  species: SpeciesProfile,
  v: ConditionSnapshot["values"],
) {
  const supportedModel = species.modelConfig.status === "supported"
    ? species.modelConfig
    : null;
const temperatureWindowDays = supportedModel?.temperature.windowDays;
const temperatureWindowAverage = temperatureWindowDays === 14
  ? v.temperatureAvg14dC
  : temperatureWindowDays === 20
    ? v.temperatureAvg20dC
    : undefined;
const frostHours = temperatureWindowDays === 14
  ? v.frostHours14d
  : temperatureWindowDays === 20
    ? v.frostHours20d
    : undefined;
const heatHours = temperatureWindowDays === 14
  ? v.heatHours14d
  : temperatureWindowDays === 20
    ? v.heatHours20d
    : undefined;
const frostState =
  frostHours === undefined
    ? "unknown"
    : frostHours > 0
      ? "warning"
      : "clear";
const rainfallWindowDays = supportedModel?.water.rainfallWindowDays;
const rainfallWindowAmount = rainfallWindowDays === 14
  ? v.rainfall14dMm
  : rainfallWindowDays === 21
    ? v.rainfall21dMm
    : rainfallWindowDays === 26
      ? v.rainfall26dMm
      : v.rainfall7dMm;
const rainfallWindowWetDays = rainfallWindowDays === 14
  ? v.rainfallDays14d
  : rainfallWindowDays === 21
    ? v.rainfallDays21d
    : rainfallWindowDays === 26
      ? v.rainfallDays26d
      : undefined;
const rainfallWindowEt0 = rainfallWindowDays === 14
  ? v.evapotranspiration14dMm
  : rainfallWindowDays === 21
    ? v.evapotranspiration21dMm
    : rainfallWindowDays === 26
      ? v.evapotranspiration26dMm
      : v.evapotranspiration7dMm;
// hydrothermal-v2 scores matured rain: for slow guilds the fresh week or
// fortnight is left out of the window. Show the reader the same window and
// the same net total the model responds to, and where that total sits on the
// species' response curve.
const v2Water = supportedModel?.model === "hydrothermal-v2" ? supportedModel.water : null;
const scoredWindow = v2Water ? scoredRainWindow(v2Water) : null;
const scoredRain = v2Water ? rainfallWindow(v, v2Water) : null;
const scoredRainComplete = scoredRain !== null &&
  scoredRain.rainfall !== undefined &&
  scoredRain.rainyDays !== undefined &&
  scoredRain.evapotranspiration !== undefined;
const netRainMm = scoredRainComplete
  ? effectiveRainfallMm({
      rainfall: scoredRain.rainfall!,
      rainyDays: scoredRain.rainyDays!,
      evapotranspiration: scoredRain.evapotranspiration!,
    })
  : undefined;
const rainResponse = v2Water && netRainMm !== undefined
  ? rainResponseState(netRainMm, v2Water)
  : undefined;
const rainWindowLabel = scoredWindow
  ? scoredWindow.excludesRecent
    ? `pluja caiguda ${rainWindowPhrase(scoredWindow)}`
    : rainWindowPhrase(scoredWindow)
  : rainfallWindowDays
    ? `últims ${rainfallWindowDays} dies`
    : "últims 7 dies";
// All air temperatures in this card are read at the provider grid's
// representative elevation; display them corrected to the cell's altitude,
// matching what the model scores.
const lapseDeltaC = terrainLapseDeltaC(v) ?? 0;
const atCellAltitude = (value: number | undefined) =>
  value === undefined ? undefined : value + lapseDeltaC;
const lapseNote = Math.abs(lapseDeltaC) >= 0.05
  ? " Temperatures ajustades a l’altitud del sector."
  : "";
const data: Array<{
  label: string;
  period: string;
  current: string;
  context: ConditionContext;
  stats: ConditionStat[];
  icon: typeof ThermometerSun;
}> = [
  {
    label: "Temperatura",
    period: v.temperatureMin24hC !== undefined && v.temperatureMax24hC !== undefined
      ? "mín – màx · 24 h"
      : "darrera lectura",
    // An instantaneous reading says little about a day in the forest; the
    // daily range and mean describe the thermal environment fungi live in.
    current: v.temperatureMin24hC !== undefined && v.temperatureMax24hC !== undefined
      ? `${temperature(atCellAltitude(v.temperatureMin24hC))} – ${temperature(atCellAltitude(v.temperatureMax24hC))}`
      : temperature(atCellAltitude(v.temperatureC)),
    context: {
      note: supportedModel
        ? `Compara la temperatura recent amb el rang preferit de l’espècie; també té en compte les gelades i la calor extrema.${lapseNote}`
        : `Context tèrmic recent per a aquesta espècie.${lapseNote}`,
    },
    stats: [
      {
        label: "Mitjana · 24 h",
        value: temperature(atCellAltitude(v.temperatureAvg24hC)),
        explanation:
          "Temperatura mitjana de les últimes 24 hores, nits incloses, ajustada a l’altitud del sector.",
      },
      {
        label: `Mitjana · ${temperatureWindowDays ?? "—"} dies`,
        value: temperature(atCellAltitude(temperatureWindowAverage)),
        explanation:
          "Temperatura mitjana del període que fa servir aquesta espècie.",
      },
      {
        label: "Hores ≤ 0 °C",
        value: frostHours === undefined ? "—" : `${Math.round(frostHours)} h`,
        explanation:
          "Hores de gelada durant el mateix període.",
      },
      {
        label: "Hores ≥ 27 °C",
        value: heatHours === undefined ? "—" : `${Math.round(heatHours)} h`,
        explanation:
          "Hores de calor extrema durant el mateix període.",
      },
    ],
    icon: ThermometerSun,
  },
  {
    label: "Humitat del sòl",
    period: "darrera lectura",
    current: percentage(v.soilMoisture, true),
    context: {
      note: "Aigua disponible a la capa superficial del sòl, ajustada segons el tipus de terra",
    },
    stats: [
      {
        label: "Mín. · 24 h",
        value: percentage(v.soilMoistureMin24h, true),
        explanation:
          "Humitat més baixa estimada prop de la superfície durant les últimes 24 hores. Indica el moment més sec del dia.",
      },
      {
        label: "Mitj. · 24 h",
        value: percentage(v.soilMoistureAvg24h, true),
        explanation:
          "Humitat mitjana estimada prop de la superfície durant les últimes 24 hores. Orienta sobre l’aigua disponible al sòl.",
      },
      {
        label: "Màx. · 24 h",
        value: percentage(v.soilMoistureMax24h, true),
        explanation:
          "Humitat més alta estimada prop de la superfície durant les últimes 24 hores. Pot reflectir la pluja, la rosada o una menor evaporació.",
      },
      {
        label: "Mín. · 7 dies",
        value: percentage(v.soilMoistureMin7d, true),
        explanation:
          "Humitat més baixa estimada prop de la superfície durant la darrera setmana. Ajuda a detectar una fase seca recent.",
      },
      {
        label: "Mitj. · 7 dies",
        value: percentage(v.soilMoistureAvg7d, true),
        explanation:
          "Humitat mitjana estimada prop de la superfície durant la darrera setmana. Resumeix l’aigua disponible recent, no només la lectura actual.",
      },
      {
        label: "Tendència · 7 dies",
        value: moistureTrend(v.soilMoistureTrend7d),
        explanation:
          "Canvi estimat de la humitat del sòl durant set dies. Un valor positiu indica que el sòl s’ha anat humitejant; un de negatiu, que s’ha anat assecant.",
      },
    ],
    icon: Droplets,
  },
  {
    label: "Humitat de l’aire",
    period: "darrera lectura",
    current: percentage(v.relativeHumidity),
    context: {
      note: "Ajuda a entendre si l’ambient manté la humitat o asseca el bosc",
    },
    stats: [
      {
        label: "Mín. · 24 h",
        value: percentage(v.relativeHumidityMin24h),
        explanation:
          "Humitat relativa més baixa estimada durant les últimes 24 h. Els mínims baixos afavoreixen l’evaporació i poden assecar la superfície.",
      },
      {
        label: "Mitj. · 24 h",
        value: percentage(v.relativeHumidityAvg24h),
        explanation:
          "Humitat relativa mitjana estimada durant les últimes 24 h. Una humitat ambiental alta redueix la pèrdua d’aigua i afavoreix un microclima més humit.",
      },
      {
        label: "Màx. · 24 h",
        value: percentage(v.relativeHumidityMax24h),
        explanation:
          "Humitat relativa més alta estimada durant les últimes 24 h. Indica els períodes més favorables per mantenir la superfície humida, sovint de nit o a primera hora.",
      },
      {
        label: "Mitj. · 7 dies",
        value: percentage(v.relativeHumidityAvg7d),
        explanation:
          "Humitat relativa mitjana dels últims set dies. Juntament amb la temperatura, ajuda a entendre com l’aire pot assecar el bosc.",
      },
    ],
    icon: Cloud,
  },
  {
    label: "Pluja acumulada",
    period: rainWindowLabel,
    current: millimetres(scoredRainComplete ? scoredRain.rainfall : rainfallWindowAmount),
    context: scoredWindow
      ? {
          note: scoredWindow.excludesRecent
            ? `El mapa compta la pluja caiguda ${rainWindowPhrase(scoredWindow)}. La dels últims ${scoredWindow.startDaysAgo - 1} dies encara no hi entra: el miceli triga.`
            : `El mapa compta la pluja d${rainWindowPhrase(scoredWindow).slice(1)}, amb el repartiment dels dies plujosos i el temps que fa que el sòl s’asseca.`,
        }
      : rainfallWindowDays
        ? { note: `Pluja recent, repartiment dels dies plujosos i temps que fa que el sòl s’asseca` }
        : { note: "Pluja recent disponible per a aquesta espècie" },
    stats: [
      ...(scoredWindow && v2Water
        ? [
            {
              label: "Pluja neta · finestra",
              value: millimetres(netRainMm),
              explanation:
                `Pluja de la finestra un cop descomptats 1 mm per dia plujós i la meitat de l’evaporació. Per a aquesta espècie, uns ${Math.round(scoredWindow.halfResponseNetMm)} mm nets donen mitja resposta i uns ${Math.round(scoredWindow.nearFullNetMm)} mm la resposta gairebé plena.`,
            },
            {
              label: "Resposta a la pluja",
              value: rainResponse ? `${rainResponse.label} · ${Math.round(rainResponse.response * 100)}%` : "—",
              explanation:
                "On cau la pluja neta de la finestra dins la corba de resposta de l’espècie. És el terme de pluja del model; els dies humits, la ratxa seca i l’aire sec l’ajusten després.",
            },
          ]
        : []),
      {
        label: "Pluja · 24 h",
        value: millimetres(v.rainfall24hMm),
        explanation:
          "Pluja acumulada durant les últimes 24 hores. Mostra si el sòl ha rebut aigua molt recentment.",
      },
      {
        label: "Pluja · 3 dies",
        value: millimetres(v.rainfall3dMm),
        explanation:
          "Pluja dels últims tres dies. Pot millorar ràpidament les condicions, però la superfície també es pot assecar de pressa.",
      },
      {
        label: "Pluja · 7 dies",
        value: millimetres(v.rainfall7dMm),
        explanation:
          "Pluja acumulada durant la darrera setmana.",
      },
      {
        label: scoredWindow ? "Dies amb ≥ 1 mm · finestra" : `Dies amb ≥ 1 mm · ${rainfallWindowDays ?? "—"} dies`,
        value: dayCount(scoredRainComplete ? scoredRain.rainyDays : rainfallWindowWetDays),
        explanation:
          "Dies amb pluja apreciable dins la finestra que compta. Ajuda a distingir un xàfec d’un episodi més repartit.",
      },
      {
        label: scoredWindow ? "Aigua perduda · finestra" : `Aigua perduda · ${rainfallWindowDays ?? 7} dies`,
        value: millimetres(scoredRainComplete ? scoredRain.evapotranspiration : rainfallWindowEt0),
        explanation:
          "Estimació de l’aigua que el sòl i la vegetació poden haver perdut per evaporació durant la mateixa finestra.",
      },
      {
        label: "Ratxa seca",
        value: days(v.drySpellDays),
        explanation:
          "Dies consecutius sense una pluja significativa. Com més llarga és la ratxa, més probable és que el sòl perdi humitat, fins i tot si havia plogut abans.",
      },
    ],
    icon: CloudRain,
  },
  {
    label: "Vent",
    period: "darrera lectura",
    current: speed(v.windKmh),
    context: {
      note: `${species.ecologicalConfig.climate.wind} · el vent ajuda a entendre l’assecament`,
    },
    stats: [
      {
        label: "Mitj. · 24 h",
        value: speed(v.windAvg24hKmh),
        explanation:
          "Velocitat mitjana del vent durant les últimes 24 h. El vent constant augmenta la pèrdua d’aigua de la vegetació i de la capa superficial del sòl.",
      },
      {
        label: "Màx. · 24 h",
        value: speed(v.windMax24hKmh),
        explanation:
          "Velocitat màxima sostinguda estimada durant les últimes 24 h. Episodis de vent intens poden assecar ràpidament ambients exposats.",
      },
      {
        label: "Ratxa · 24 h",
        value: speed(v.windGustMax24hKmh),
        explanation:
          "Ratxa de vent més forta estimada durant les últimes 24 h. És un indicador d’episodis puntuals d’assecament, especialment en terreny obert.",
      },
    ],
    icon: Wind,
  },
];


  return {
    frostHours,
    frostState,
    readings: data,
    temperatureWindowDays,
  };
}
