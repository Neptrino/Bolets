export declare const AEMET_API_ORIGIN: string;
export declare const AEMET_STATION_INVENTORY_PATH: string;

export declare function parseAemetDegrees(value: unknown): number | undefined;
export declare function parseAemetMillimetres(value: unknown): number | undefined;
export declare function aemetDailyClimatologyPath(startDate: string, endDate: string): string;

export declare function fetchAemetJson(
  path: string,
  apiKey: string,
  fetchImplementation?: typeof fetch,
): Promise<unknown[]>;

export declare function normalizeAemetDailyRain(rows: unknown[]): Array<{
  stationId: string;
  date: string;
  precipitationMm: number;
}>;

export declare function normalizeAemetStations(rows: unknown[]): Array<{
  stationId: string;
  name: string;
  latitude: number;
  longitude: number;
}>;
