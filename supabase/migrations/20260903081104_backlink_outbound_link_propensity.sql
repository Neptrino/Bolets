alter table public.backlink_prospects
  add column outbound_link_count smallint
  check (outbound_link_count between 0 and 500);

comment on column public.backlink_prospects.outbound_link_count is
  'Unique editorial HTTP(S) links from the inspected page to unrelated, non-social hosts; null means not yet measured.';
