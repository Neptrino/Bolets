export const MAP_PRICE_SURVEY_VERSION = "map-price-v8";
export const MAP_PRICE_SURVEY_PATH = "/enquesta-mapa";
export const MAP_PRICE_SURVEY_API = "/api/map-price-survey";
export const MAP_PRICE_SURVEY_ANSWERS = [
  { value: "299", label: "2,99 € / any" },
  { value: "499", label: "4,99 € / any" },
  { value: "999", label: "9,99 € / any" },
  { value: "contribute", label: "Prefereixo col·laborar" },
  { value: "no", label: "No m’interessa" },
] as const;

export type MapPriceSurveyAnswer = (typeof MAP_PRICE_SURVEY_ANSWERS)[number]["value"];

export function isMapPriceSurveyAnswer(value: unknown): value is MapPriceSurveyAnswer {
  return MAP_PRICE_SURVEY_ANSWERS.some((option) => option.value === value);
}
