type ProviderBudgetClient = {
  rpc(
    functionName: string,
    parameters: Record<string, string | number>,
  ): PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
};

function commaValues(value: string | null) {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
}

/**
 * Mirrors Open-Meteo's published fractional accounting conservatively: one
 * unit per location for at most ten variables and fourteen days, multiplied
 * by longer time windows, extra variables and explicit model count. The five
 * percent margin absorbs boundary-hour and provider-calculator differences.
 */
export function estimateOpenMeteoRequestUnits(url: URL, locations: number) {
  if (!Number.isInteger(locations) || locations <= 0) {
    throw new RangeError("Open-Meteo location count must be a positive integer");
  }
  const variables = new Set([
    ...commaValues(url.searchParams.get("current")),
    ...commaValues(url.searchParams.get("hourly")),
    ...commaValues(url.searchParams.get("daily")),
  ]);
  const pastHours = Number(url.searchParams.get("past_hours") ?? 0);
  const forecastHours = Number(url.searchParams.get("forecast_hours") ?? 0);
  const totalHours = Math.max(1, pastHours + forecastHours);
  const timeWeight = Math.max(1, totalHours / (14 * 24));
  const variableWeight = Math.max(1, variables.size / 10);
  const modelWeight = Math.max(1, commaValues(url.searchParams.get("models")).length);
  return Math.ceil(locations * timeWeight * variableWeight * modelWeight * 1.05);
}

export async function recordOpenMeteoUsage(
  supabase: ProviderBudgetClient,
  consumer: string,
  estimatedUnits: number,
) {
  const { error } = await supabase.rpc("record_provider_usage", {
    p_provider: "open-meteo",
    p_consumer: consumer,
    p_estimated_units: estimatedUnits,
  });
  if (error) throw error;
}
