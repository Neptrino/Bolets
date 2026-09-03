alter table public.backlink_automation_runs
  add column campaign_id text check (campaign_id is null or char_length(campaign_id) between 2 and 80),
  add column search_query text check (search_query is null or char_length(search_query) between 2 and 400),
  add column search_offset smallint check (search_offset is null or search_offset between 0 and 9);

comment on column public.backlink_automation_runs.campaign_id is
  'Version-controlled backlink campaign selected for this run.';
comment on column public.backlink_automation_runs.search_query is
  'Exact Brave query executed by this run; null for legacy, disabled, or pre-search runs.';
comment on column public.backlink_automation_runs.search_offset is
  'Zero-based Brave result-page offset executed by this run.';
