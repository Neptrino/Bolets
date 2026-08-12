import { createServer } from "vite";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRole) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const root = process.cwd();
const loader = await createServer({
  root,
  logLevel: "error",
  appType: "custom",
  server: { middlewareMode: true },
  resolve: { alias: { "@": root } },
});

let profiles;
try {
  const { speciesProfiles } = await loader.ssrLoadModule("/data/species.ts");
  const { habitatForestTerms, habitatProfileKey } = await loader.ssrLoadModule("/src/lib/habitat.ts");
  profiles = speciesProfiles.map((species, index) => {
    const phRange = species.ecologicalConfig.soil.phRange;
    return {
      speciesId: species.speciesId,
      slot: index + 1,
      profileKey: habitatProfileKey(species),
      forestTerms: habitatForestTerms(species),
      altitudeMin: species.ecologicalConfig.habitat.altitude[0],
      altitudeMax: species.ecologicalConfig.habitat.altitude[1],
      phMin: phRange?.[0] ?? "",
      phMax: phRange?.[1] ?? "",
    };
  });
} finally {
  await loader.close();
}

async function buildBatch(minY, maxY, reset, complete) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/build_coarse_species_habitat_cache`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRole}`,
      apikey: serviceRole,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_profiles: profiles,
      p_min_y: minY,
      p_max_y: maxY,
      p_reset: reset,
      p_complete: complete,
    }),
  });
  if (!response.ok) throw new Error(`Habitat cache batch ${minY}–${maxY} failed: ${await response.text()}`);
  return Number(await response.json());
}

const firstY = 17_960;
const finalY = 19_000;
for (let minY = firstY; minY < finalY; minY += 40) {
  const maxY = Math.min(minY + 40, finalY);
  const updated = await buildBatch(minY, maxY, minY === firstY, maxY === finalY);
  console.log(`Habitat cache ${minY}–${maxY}: ${updated} display cells`);
}
