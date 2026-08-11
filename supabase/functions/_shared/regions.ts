export type Region = { id: string; latitude: number; longitude: number; altitudeM: number };

export const regions: Region[] = [
  { id: "pirineus", latitude: 42.55, longitude: 1.35, altitudeM: 1500 },
  { id: "prepirineus", latitude: 42.2, longitude: 1.35, altitudeM: 900 },
  { id: "catalunya-central", latitude: 41.8, longitude: 1.65, altitudeM: 550 },
  { id: "serralades-costeres", latitude: 41.75, longitude: 2.55, altitudeM: 280 },
  { id: "serralades-prelitorals", latitude: 41.35, longitude: 1.85, altitudeM: 460 },
  { id: "emporda", latitude: 42.1, longitude: 3.0, altitudeM: 160 },
  { id: "montseny", latitude: 41.78, longitude: 2.38, altitudeM: 950 },
  { id: "ports", latitude: 40.8, longitude: 0.32, altitudeM: 720 },
  { id: "muntanyes-interiors", latitude: 41.55, longitude: 0.85, altitudeM: 820 },
  { id: "altres", latitude: 41.6, longitude: 1.9, altitudeM: 400 }
];

export const regionIds = new Set(regions.map((region) => region.id));
