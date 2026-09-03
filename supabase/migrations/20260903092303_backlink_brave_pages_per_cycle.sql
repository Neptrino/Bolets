alter table public.backlink_automation_runs
  add column if not exists search_page_count smallint,
  add column if not exists searches jsonb not null default '[]'::jsonb;

alter table public.backlink_automation_runs
  add constraint backlink_automation_runs_search_page_count_check
  check (search_page_count is null or search_page_count between 0 and 10);

alter table public.backlink_automation_runs
  add constraint backlink_automation_runs_searches_check
  check (jsonb_typeof(searches) = 'array');

update public.backlink_automation_runs
set search_page_count = 1
where search_query is not null
  and search_page_count is null;

comment on column public.backlink_automation_runs.search_page_count is
  'Number of Brave result pages completed during this automation run; zero means the search failed before a page completed.';

comment on column public.backlink_automation_runs.searches is
  'Exact ordered Brave campaign queries, offsets and completion counts attempted during the run.';
