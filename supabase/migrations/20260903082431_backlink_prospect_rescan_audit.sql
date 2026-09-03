alter table public.backlink_prospect_actions
  drop constraint if exists backlink_prospect_actions_action_check;

alter table public.backlink_prospect_actions
  add constraint backlink_prospect_actions_action_check check (
    action in ('manual_approve', 'manual_exclude', 'restore_automatic', 'contact_update', 'rescan')
  ),
  add column previous_score smallint
    check (previous_score is null or previous_score between 0 and 100),
  add column next_score smallint
    check (next_score is null or next_score between 0 and 100);

comment on column public.backlink_prospect_actions.previous_score is
  'Score before a manual rescan; null for actions that do not recalculate the candidate.';
comment on column public.backlink_prospect_actions.next_score is
  'Score after a manual rescan; null for actions that do not recalculate the candidate.';
