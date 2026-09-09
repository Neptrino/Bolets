/** Offline provider requests must record usage with the live pipeline owner. */
export function providerAccountingConfig(env: Record<string, string | undefined>) {
  const usesSpatialSource = Boolean(env.BOLETS_DEV_SPATIAL_DATA_URL || env.BOLETS_DEV_SPATIAL_SERVICE_ROLE_KEY);
  const url = usesSpatialSource ? env.BOLETS_DEV_SPATIAL_DATA_URL : env.SUPABASE_URL;
  const key = usesSpatialSource ? env.BOLETS_DEV_SPATIAL_SERVICE_ROLE_KEY : env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("The shared provider usage ledger requires a complete server credential pair");
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)) {
    throw new Error("Uncached provider requests require the shared hosted usage ledger, not a local development database");
  }
  return { url, key };
}
