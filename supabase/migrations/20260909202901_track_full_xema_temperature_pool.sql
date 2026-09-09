-- A full-network publication must never freeze an old eight-station bootstrap.
alter table public.xema_temperature_days add column station_pool_version text;
comment on column public.xema_temperature_days.station_pool_version is
  'Completeness contract for the imported station pool; null denotes the historical eight-station import. Only full network days may seed xema-arome-blend-v3.';
