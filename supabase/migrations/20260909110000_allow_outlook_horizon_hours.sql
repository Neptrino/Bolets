-- The outlook extension stores four best-effort horizons past the five-day
-- core, but the original horizon check still pinned the allowed set to the
-- core hours, so every batch upsert carrying outlook rows failed wholesale
-- and no forecast rows could store at all. Widen the check to the outlook
-- hours; the valid-time and completion contracts are unchanged.
alter table public.weather_grid_forecasts
  drop constraint weather_grid_forecasts_horizon_hours_check;
alter table public.weather_grid_forecasts
  add constraint weather_grid_forecasts_horizon_hours_check
  check (horizon_hours in (0, 24, 48, 72, 96, 120, 168, 240, 288, 336));
