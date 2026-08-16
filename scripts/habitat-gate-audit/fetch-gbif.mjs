import { readFileSync, writeFileSync } from "node:fs";
const species = JSON.parse(readFileSync("/tmp/species-gates.json", "utf8"));
// Catalonia bbox in WGS84 (matches the builder's EPSG:25831 SOURCE_BOUNDS extent)
const POLY = "POLYGON((0.15 40.50,3.35 40.50,3.35 42.90,0.15 42.90,0.15 40.50))";
const out = [];
for (const s of species) {
  const url = new URL("https://api.gbif.org/v1/occurrence/search");
  url.searchParams.set("scientificName", s.scientificName);
  url.searchParams.set("geometry", POLY);
  url.searchParams.set("hasCoordinate", "true");
  url.searchParams.set("hasGeospatialIssue", "false");
  url.searchParams.set("limit", "300");
  const res = await fetch(url, { headers: { "User-Agent": "bolets-gate-audit/1.0" } });
  if (!res.ok) { console.error(`${s.scientificName}: HTTP ${res.status}`); continue; }
  const body = await res.json();
  const recs = (body.results ?? [])
    .filter((r) => Number.isFinite(r.decimalLatitude) && Number.isFinite(r.decimalLongitude))
    // Keep only points precise enough to be attributed to a 250 m cell.
    .filter((r) => r.coordinateUncertaintyInMeters === undefined || r.coordinateUncertaintyInMeters <= 1000)
    .map((r) => ({
      speciesId: s.speciesId,
      key: r.key,
      lat: r.decimalLatitude,
      lon: r.decimalLongitude,
      uncertainty: r.coordinateUncertaintyInMeters ?? null,
      year: r.year ?? null,
      elevation: r.elevation ?? null,
      dataset: r.datasetKey,
    }));
  out.push(...recs);
  console.error(`${s.scientificName.padEnd(30)} total=${String(body.count).padEnd(6)} kept=${recs.length}`);
}
writeFileSync("/tmp/gatework/gbif-points.json", JSON.stringify(out));
console.error(`\nTOTAL POINTS: ${out.length}`);
