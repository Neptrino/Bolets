alter table public.backlink_prospects
  add column score_explanation jsonb
  check (score_explanation is null or jsonb_typeof(score_explanation) = 'object');

comment on column public.backlink_prospects.score_explanation is
  'Versioned factor snapshot produced with the score so administrators can audit the exact calculation; null means the record predates score explanations and must be rescanned.';
