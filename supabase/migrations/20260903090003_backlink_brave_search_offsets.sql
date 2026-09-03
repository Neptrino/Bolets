alter table public.backlink_automation_settings
  add column search_offsets jsonb not null default '{}'::jsonb
  check (jsonb_typeof(search_offsets) = 'object');

comment on column public.backlink_automation_settings.search_offsets is
  'Next Brave result-page offset for each version-controlled backlink campaign; each value is bounded by the application to 0 through 9.';
