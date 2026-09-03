alter table public.backlink_prospects
  add column if not exists content_published_at timestamptz,
  add column if not exists content_modified_at timestamptz;

comment on column public.backlink_prospects.content_published_at is
  'Reliable publication timestamp extracted from page metadata or Article/WebPage structured data.';

comment on column public.backlink_prospects.content_modified_at is
  'Reliable last-modified timestamp extracted from page metadata or Article/WebPage structured data.';
