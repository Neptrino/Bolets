export const OPEN_METEO_GLOBAL_MINUTE_LIMIT = 550;
export const OPEN_METEO_GLOBAL_HOURLY_LIMIT = 4_500;
// Estimates already include a five-percent safety multiplier. A 10,300-unit
// ledger ceiling therefore represents at most roughly 9,810 provider units
// before per-batch rounding. It fits the measured 9,579-unit normal workload
// plus one complete 500-point fallback realignment at a provider-hour seam.
export const OPEN_METEO_GLOBAL_DAILY_LIMIT = 10_300;

export class ProviderBudgetDeferredError extends Error {
  constructor(
    readonly scope: string,
    readonly estimatedUnits: number,
  ) {
    super(`Open-Meteo ${scope} budget is exhausted`);
    this.name = "ProviderBudgetDeferredError";
  }
}

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

export async function reserveOpenMeteoBudget(
  supabase: ProviderBudgetClient,
  consumer: string,
  estimatedUnits: number,
  consumerDailyLimit: number,
) {
  const { data, error } = await supabase.rpc("reserve_provider_budget", {
    p_provider: "open-meteo",
    p_consumer: consumer,
    p_estimated_units: estimatedUnits,
    p_minute_limit: OPEN_METEO_GLOBAL_MINUTE_LIMIT,
    p_hour_limit: OPEN_METEO_GLOBAL_HOURLY_LIMIT,
    p_day_limit: OPEN_METEO_GLOBAL_DAILY_LIMIT,
    p_consumer_day_limit: consumerDailyLimit,
  });
  if (error) throw error;
  if (data !== "reserved") {
    throw new ProviderBudgetDeferredError(
      typeof data === "string" ? data : "unknown",
      estimatedUnits,
    );
  }
}
