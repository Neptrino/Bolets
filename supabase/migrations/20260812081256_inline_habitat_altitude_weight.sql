-- This helper contains arithmetic only and resolves no database objects. It
-- deliberately has no per-call SET clause so PostgreSQL can inline it across
-- hundreds of thousands of static cells during a country-wide aggregation.
create or replace function public.habitat_altitude_weight(
  p_altitude_m double precision,
  p_core_min_m double precision,
  p_core_max_m double precision
)
returns double precision
language sql
immutable
strict
parallel safe
security invoker
as $$
  select case
    when p_core_max_m <= p_core_min_m then 0::double precision
    when p_altitude_m <= p_core_min_m - 100 or p_altitude_m >= p_core_max_m + 100 then 0::double precision
    when p_altitude_m < p_core_min_m then
      0.75 * ((p_altitude_m - (p_core_min_m - 100)) / 100)
    when p_altitude_m < p_core_min_m + least(100::double precision, (p_core_max_m - p_core_min_m) / 2) then
      0.75 + 0.25 * (
        (p_altitude_m - p_core_min_m) /
        least(100::double precision, (p_core_max_m - p_core_min_m) / 2)
      )
    when p_altitude_m <= p_core_max_m - least(100::double precision, (p_core_max_m - p_core_min_m) / 2) then
      1::double precision
    when p_altitude_m <= p_core_max_m then
      0.75 + 0.25 * (
        (p_core_max_m - p_altitude_m) /
        least(100::double precision, (p_core_max_m - p_core_min_m) / 2)
      )
    else 0.75 * (((p_core_max_m + 100) - p_altitude_m) / 100)
  end;
$$;

revoke all on function public.habitat_altitude_weight(
  double precision, double precision, double precision
) from public, anon, authenticated;
grant execute on function public.habitat_altitude_weight(
  double precision, double precision, double precision
) to service_role;

comment on function public.habitat_altitude_weight(
  double precision, double precision, double precision
) is 'Pure arithmetic altitude taper kept inlineable for large static habitat aggregations; it references no schema objects.';
