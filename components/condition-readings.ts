import {
  Cloud,
  CloudRain,
  Droplets,
  ThermometerSun,
  Wind,
} from "lucide-react";
import { terrainLapseDeltaC } from "@/src/lib/hydrothermal-v2";
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
// All air temperatures in this card are read at the provider grid's
// representative elevation; display them corrected to the cell's altitude,
// matching what the model scores.
const lapseDeltaC = terrainLapseDeltaC(v) ?? 0;
const atCellAltitude = (value: number | undefined) =>
  value === undefined ? undefined : value + lapseDeltaC;
const lapseNote = Math.abs(lapseDeltaC) >= 0.05
  ? ` Temperatures corregides ${lapseDeltaC > 0 ? "+" : "−"}${Math.abs(lapseDeltaC).toFixed(1)} °C del punt de malla (${Math.round(v.weatherElevationM ?? 0)} m) a l’altitud de la cel·la (${Math.round(v.altitudeM ?? 0)} m).`
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
        ? `El rang diari és context. El model compara la temperatura mitjana de ${temperatureWindowDays} dies amb l’òptim inicial de l’espècie (${supportedModel.temperature.optimumC} °C); les gelades i la calor extrema s’apliquen per separat.${lapseNote}`
        : `Sense model hidrotermal de curt termini per a aquesta espècie.${lapseNote}`,
    },
    stats: [
      {
        label: "Mitj · 24 h",
        value: temperature(atCellAltitude(v.temperatureAvg24hC)),
        explanation:
          "Mitjana tèrmica de les últimes 24 hores, nits incloses, a l’altitud de la cel·la.",
      },
      {
        label: `Mitj · ${temperatureWindowDays ?? "—"} dies`,
        value: temperature(atCellAltitude(temperatureWindowAverage)),
        explanation:
          "Mitjana tèrmica de la finestra configurada per al gremi o l’espècie. La resposta té un òptim i decau suaument tant per fred com per calor.",
      },
      {
        label: "Hores ≤ 0 °C",
        value: frostHours === undefined ? "—" : `${Math.round(frostHours)} h`,
        explanation:
          "Hores de gelada dins la mateixa finestra. Actuen com un multiplicador de dany segons la semivida configurada, no com un tall arbitrari.",
      },
      {
        label: "Hores ≥ 27 °C",
        value: heatHours === undefined ? "—" : `${Math.round(heatHours)} h`,
        explanation:
          "Hores de calor dins la mateixa finestra. L’exposició acumulada redueix gradualment la resposta, amb tolerància pròpia del gremi.",
      },
    ],
    icon: ThermometerSun,
  },
  {
    label: "Humitat del sòl",
    period: "darrera lectura · profunditat 3–9 cm",
    current: percentage(v.soilMoisture, true),
    context: {
      note: "Normalitzada per textura entre punt de marciment i capacitat de camp; forma part d’un únic estat hídric",
    },
    stats: [
      {
        label: "Mín. · 24 h",
        value: percentage(v.soilMoistureMin24h, true),
        explanation:
          "Humitat més baixa estimada a 3–9 cm de profunditat durant les últimes 24 h. Indica el moment més sec del dia, que pot limitar l’activitat si és massa baix.",
      },
      {
        label: "Mitj. · 24 h",
        value: percentage(v.soilMoistureAvg24h, true),
        explanation:
          "Humitat mitjana estimada a 3–9 cm durant les últimes 24 h. És una referència de l’aigua disponible a la capa superficial del sòl.",
      },
      {
        label: "Màx. · 24 h",
        value: percentage(v.soilMoistureMax24h, true),
        explanation:
          "Humitat més alta estimada a 3–9 cm durant les últimes 24 h. Pot reflectir la resposta del sòl a la pluja, la rosada o una menor evaporació.",
      },
      {
        label: "Mín. · 7 dies",
        value: percentage(v.soilMoistureMin7d, true),
        explanation:
          "Humitat més baixa estimada a 3–9 cm durant la darrera setmana. Ajuda a detectar si hi ha hagut una fase seca recent, encara que ara el sòl sembli humit.",
      },
      {
        label: "Mitj. · 7 dies",
        value: percentage(v.soilMoistureAvg7d, true),
        explanation:
          "Humitat mitjana estimada a 3–9 cm durant la darrera setmana. Resumeix la disponibilitat d’aigua recent, no només la lectura actual.",
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
      note: "S’utilitza amb la temperatura per estimar el dèficit de pressió de vapor dins l’estat hídric; no puntua per separat",
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
          "Humitat relativa mitjana dels últims set dies. Combinada amb la temperatura, estima la demanda atmosfèrica que pot accelerar l’assecament.",
      },
    ],
    icon: Cloud,
  },
  {
    label: "Pluja acumulada",
    period: rainfallWindowDays ? `finestra del model · ${rainfallWindowDays} dies` : "últimes 168 h",
    current: millimetres(rainfallWindowAmount),
    context: rainfallWindowDays
      ? { note: `Finestra de ${rainfallWindowDays} dies amb nombre de dies plujosos, ET₀, ratxa seca i humitat del sòl` }
      : { note: "Context hídric; no hi ha model de curt termini per a aquesta espècie" },
    stats: [
      {
        label: "Pluja · 24 h",
        value: millimetres(v.rainfall24hMm),
        explanation:
          "Precipitació acumulada durant les últimes 24 h. Mostra si hi ha hagut un pols de pluja molt recent que pugui començar a rehidratar la capa superficial del sòl.",
      },
      {
        label: "Pluja · 3 dies",
        value: millimetres(v.rainfall3dMm),
        explanation:
          "Precipitació de les últimes 72 h. Mulla la capa superficial i pot reactivar ràpidament la fructificació; si és baixa, el sòl superficial pot assecar-se de pressa.",
      },
      {
        label: "Pluja · 7 dies",
        value: millimetres(v.rainfall7dMm),
        explanation:
          "Precipitació de la darrera setmana. Es mostra com a context recent, però el model utilitza la finestra hídrica configurada completa.",
      },
      {
        label: `Dies amb ≥ 1 mm · ${rainfallWindowDays ?? "—"} dies`,
        value: dayCount(rainfallWindowWetDays),
        explanation:
          "Nombre de dies amb almenys un mil·límetre de pluja dins la finestra configurada. Distingeix un pols concentrat d’una rehidratació distribuïda.",
      },
      {
        label: `ET₀ · ${rainfallWindowDays ?? 7} dies`,
        value: millimetres(rainfallWindowEt0),
        explanation:
          "Evapotranspiració de referència acumulada a la mateixa finestra que la pluja. Entra en la pluja efectiva i no es puntua per separat.",
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
      note: `${species.ecologicalConfig.climate.wind} · es mostra com a context i no puntua separadament`,
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
