-- A finding now has one publication decision. All of its photos follow the
-- parent finding visibility; the legacy photo flag remains constrained to true
-- for compatibility with the original schema and older local data.
update public.user_finding_photos
set is_public = true
where not is_public;

alter table public.user_finding_photos
  add constraint user_finding_photos_follow_finding_visibility
  check (is_public) not valid;

alter table public.user_finding_photos
  validate constraint user_finding_photos_follow_finding_visibility;

comment on column public.user_finding_photos.is_public is
  'Legacy compatibility flag constrained to true. Publication is controlled by user_findings.visibility.';

create or replace function public.recompute_user_finding_consensus(p_finding_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_revision integer;
  total_votes integer;
  leading_votes integer;
  leading_species text;
  photo_count integer;
begin
  select findings.revision into current_revision
  from public.user_findings findings
  where findings.id = p_finding_id;
  if current_revision is null then return; end if;

  select count(*)::integer into photo_count
  from public.user_finding_photos photos
  where photos.finding_id = p_finding_id;

  select count(*)::integer into total_votes
  from public.user_finding_votes votes
  where votes.finding_id = p_finding_id and votes.revision = current_revision;

  select grouped.species_id, grouped.vote_count
    into leading_species, leading_votes
  from (
    select votes.species_id, count(*)::integer as vote_count
    from public.user_finding_votes votes
    where votes.finding_id = p_finding_id and votes.revision = current_revision
    group by votes.species_id
    order by count(*) desc, votes.species_id
    limit 1
  ) grouped;

  update public.user_findings findings
  set
    vote_count = coalesce(total_votes, 0),
    consensus_vote_count = coalesce(leading_votes, 0),
    consensus_species_id = case
      when coalesce(total_votes, 0) >= 3
        and coalesce(leading_votes, 0)::numeric / total_votes >= 0.75
      then leading_species else null end,
    verification_status = case
      when photo_count = 0 then 'not_verifiable'
      when coalesce(total_votes, 0) < 3 then 'pending'
      when coalesce(leading_votes, 0)::numeric / total_votes >= 0.75 then 'community_supported'
      else 'contested' end,
    updated_at = now()
  where findings.id = p_finding_id;
end;
$$;

create or replace function public.validate_user_finding_vote()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  finding public.user_findings%rowtype;
begin
  select findings.* into finding
  from public.user_findings findings
  where findings.id = new.finding_id;
  if finding.id is null or finding.publication_state <> 'published' or finding.visibility <> 'public' then
    raise exception 'Finding is not open for validation';
  end if;
  if finding.owner_id = new.voter_id then
    raise exception 'Reporters cannot validate their own findings';
  end if;
  if new.revision <> finding.revision then
    raise exception 'Vote revision is stale';
  end if;
  if not exists (
    select 1 from public.user_finding_photos photos
    where photos.finding_id = finding.id
  ) then
    raise exception 'A photo is required for validation';
  end if;
  if tg_op = 'INSERT' and (
    select count(*) from public.user_finding_votes votes
    where votes.voter_id = new.voter_id
      and votes.created_at >= now() - interval '24 hours'
  ) >= 300 then
    raise exception 'Daily validation limit reached';
  end if;
  return new;
end;
$$;
