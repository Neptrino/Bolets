-- User-owned field findings. Exact positions and private notes remain in a
-- separate table, all base tables stay service-role-only, and public reads are
-- emitted through bounded server routes at the canonical 10 km lattice.

create table public.finding_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  public_alias text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finding_profiles_alias_check check (
    public_alias is null or (
      char_length(public_alias) between 3 and 30
      and public_alias = btrim(public_alias)
      and public_alias ~ '^[[:alnum:]][[:alnum:] _.-]*$'
    )
  )
);

create unique index finding_profiles_alias_unique_idx
  on public.finding_profiles (lower(public_alias))
  where public_alias is not null;

create table public.user_findings (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  client_report_id uuid not null,
  reported_species_id text not null check (reported_species_id ~ '^[a-z0-9-]{3,80}$'),
  observed_at timestamptz not null,
  observed_on date not null,
  public_cell_id text not null references public.spatial_cell_levels(cell_id) on delete restrict,
  visibility text not null default 'public' check (visibility in ('private', 'public')),
  publication_state text not null default 'draft' check (publication_state in ('draft', 'published', 'hidden')),
  show_alias boolean not null default false,
  revision integer not null default 1 check (revision > 0),
  verification_status text not null default 'not_verifiable'
    check (verification_status in ('not_verifiable', 'pending', 'community_supported', 'contested')),
  consensus_species_id text check (consensus_species_id is null or consensus_species_id ~ '^[a-z0-9-]{3,80}$'),
  vote_count integer not null default 0 check (vote_count >= 0),
  consensus_vote_count integer not null default 0 check (consensus_vote_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_findings_owner_for_draft_check check (
    owner_id is not null or (visibility = 'public' and publication_state = 'published')
  ),
  unique (owner_id, client_report_id)
);

create index user_findings_public_cell_idx
  on public.user_findings (public_cell_id, observed_on desc)
  where visibility = 'public' and publication_state = 'published';

create index user_findings_owner_observed_idx
  on public.user_findings (owner_id, observed_at desc)
  where owner_id is not null;

create table public.user_finding_private_details (
  finding_id uuid primary key references public.user_findings(id) on delete cascade,
  exact_location extensions.geography(Point, 4326),
  location_accuracy_m double precision check (location_accuracy_m is null or location_accuracy_m between 0 and 10000),
  quantity_band text check (quantity_band is null or quantity_band in ('one', 'two-five', 'six-twenty', 'twenty-one-plus')),
  private_notes text check (private_notes is null or char_length(private_notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_finding_private_location_idx
  on public.user_finding_private_details using gist (exact_location)
  where exact_location is not null;

create table public.user_finding_photos (
  id uuid primary key,
  finding_id uuid not null references public.user_findings(id) on delete cascade,
  storage_path text not null unique check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'),
  is_public boolean not null default true,
  position smallint not null check (position between 0 and 3),
  width integer not null check (width between 1 and 2400),
  height integer not null check (height between 1 and 2400),
  byte_size integer not null check (byte_size between 1 and 4194304),
  created_at timestamptz not null default now(),
  unique (finding_id, position)
);

create index user_finding_photos_finding_idx
  on public.user_finding_photos (finding_id, position);

create table public.user_finding_votes (
  finding_id uuid not null references public.user_findings(id) on delete cascade,
  revision integer not null check (revision > 0),
  voter_id uuid not null references auth.users(id) on delete cascade,
  species_id text not null check (species_id ~ '^[a-z0-9-]{3,80}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (finding_id, revision, voter_id)
);

create index user_finding_votes_consensus_idx
  on public.user_finding_votes (finding_id, revision, species_id);

create table public.user_finding_flags (
  id uuid primary key default extensions.gen_random_uuid(),
  finding_id uuid not null references public.user_findings(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('spam', 'privacy', 'unsafe', 'other')),
  detail text check (detail is null or char_length(detail) <= 500),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (finding_id, reporter_id)
);

create index user_finding_flags_status_idx
  on public.user_finding_flags (status, created_at)
  where status = 'open';

create table public.finding_moderators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.finding_profiles enable row level security;
alter table public.user_findings enable row level security;
alter table public.user_finding_private_details enable row level security;
alter table public.user_finding_photos enable row level security;
alter table public.user_finding_votes enable row level security;
alter table public.user_finding_flags enable row level security;
alter table public.finding_moderators enable row level security;

revoke all on table public.finding_profiles from public, anon, authenticated;
revoke all on table public.user_findings from public, anon, authenticated;
revoke all on table public.user_finding_private_details from public, anon, authenticated;
revoke all on table public.user_finding_photos from public, anon, authenticated;
revoke all on table public.user_finding_votes from public, anon, authenticated;
revoke all on table public.user_finding_flags from public, anon, authenticated;
revoke all on table public.finding_moderators from public, anon, authenticated;

grant select, insert, update, delete on table public.finding_profiles to service_role;
grant select, insert, update, delete on table public.user_findings to service_role;
grant select, insert, update, delete on table public.user_finding_private_details to service_role;
grant select, insert, update, delete on table public.user_finding_photos to service_role;
grant select, insert, update, delete on table public.user_finding_votes to service_role;
grant select, insert, update, delete on table public.user_finding_flags to service_role;
grant select, insert, update, delete on table public.finding_moderators to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('finding-photo-staging', 'finding-photo-staging', false, 4194304, array['image/webp']),
  ('finding-photos', 'finding-photos', false, 4194304, array['image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "finding owners upload staged photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'finding-photo-staging'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "finding owners read staged photos"
on storage.objects for select to authenticated
using (
  bucket_id = 'finding-photo-staging'
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "finding owners update staged photos"
on storage.objects for update to authenticated
using (
  bucket_id = 'finding-photo-staging'
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'finding-photo-staging'
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "finding owners delete staged photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'finding-photo-staging'
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create or replace function public.begin_user_finding(
  p_owner_id uuid,
  p_client_report_id uuid,
  p_species_id text,
  p_observed_at timestamptz,
  p_longitude double precision,
  p_latitude double precision,
  p_keep_exact boolean,
  p_accuracy_m double precision,
  p_quantity_band text,
  p_private_notes text,
  p_visibility text,
  p_show_alias boolean
)
returns table (finding_id uuid, public_cell_id text, publication_state text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  existing public.user_findings%rowtype;
  matched_cell_id text;
  new_finding_id uuid;
  point_geom extensions.geometry(Point, 4326);
begin
  if p_owner_id is null or p_client_report_id is null then
    raise exception 'Owner and client report identifiers are required';
  end if;
  if p_species_id !~ '^[a-z0-9-]{3,80}$' then
    raise exception 'Invalid species identifier';
  end if;
  if p_observed_at < now() - interval '20 years' or p_observed_at > now() + interval '1 day' then
    raise exception 'Observation time is outside the accepted range';
  end if;
  if p_longitude not between 0.05 and 3.35 or p_latitude not between 40.45 and 42.95 then
    raise exception 'Finding is outside Catalonia';
  end if;
  if p_visibility not in ('private', 'public') then
    raise exception 'Invalid finding visibility';
  end if;
  if p_quantity_band is not null and p_quantity_band not in ('one', 'two-five', 'six-twenty', 'twenty-one-plus') then
    raise exception 'Invalid quantity band';
  end if;
  if p_private_notes is not null and char_length(p_private_notes) > 1000 then
    raise exception 'Private notes are too long';
  end if;
  if p_accuracy_m is not null and (p_accuracy_m < 0 or p_accuracy_m > 10000) then
    raise exception 'Invalid location accuracy';
  end if;
  if (
    select count(*) from public.user_findings findings
    where findings.owner_id = p_owner_id
      and findings.created_at >= now() - interval '24 hours'
  ) >= 100 then
    raise exception 'Daily finding limit reached';
  end if;

  select findings.* into existing
  from public.user_findings findings
  where findings.owner_id = p_owner_id
    and findings.client_report_id = p_client_report_id;
  if found then
    return query select existing.id, existing.public_cell_id, existing.publication_state;
    return;
  end if;

  point_geom := extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326);
  select levels.cell_id into matched_cell_id
  from public.spatial_cell_levels levels
  where levels.grid_size_m = 10000
    and levels.geom operator(extensions.&&) point_geom
    and extensions.st_covers(levels.geom, point_geom)
  order by levels.cell_id
  limit 1;
  if matched_cell_id is null then
    raise exception 'No canonical 10 km land cell covers the finding';
  end if;

  insert into public.user_findings (
    owner_id, client_report_id, reported_species_id, observed_at, observed_on,
    public_cell_id, visibility, publication_state, show_alias
  ) values (
    p_owner_id, p_client_report_id, p_species_id, p_observed_at,
    (p_observed_at at time zone 'Europe/Madrid')::date,
    matched_cell_id, p_visibility, 'draft', p_show_alias
  ) returning id into new_finding_id;

  insert into public.user_finding_private_details (
    finding_id, exact_location, location_accuracy_m, quantity_band, private_notes
  ) values (
    new_finding_id,
    case when p_keep_exact then point_geom::extensions.geography else null end,
    case when p_keep_exact then p_accuracy_m else null end,
    p_quantity_band,
    nullif(btrim(p_private_notes), '')
  );

  return query select new_finding_id, matched_cell_id, 'draft'::text;
end;
$$;

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
  public_photo_count integer;
begin
  select findings.revision into current_revision
  from public.user_findings findings
  where findings.id = p_finding_id;
  if current_revision is null then return; end if;

  select count(*)::integer into public_photo_count
  from public.user_finding_photos photos
  where photos.finding_id = p_finding_id and photos.is_public;

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
      when public_photo_count = 0 then 'not_verifiable'
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
    where photos.finding_id = finding.id and photos.is_public
  ) then
    raise exception 'A public photo is required for validation';
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

create trigger validate_user_finding_vote_trigger
before insert or update on public.user_finding_votes
for each row execute function public.validate_user_finding_vote();

create or replace function public.refresh_user_finding_consensus_after_vote()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform public.recompute_user_finding_consensus(coalesce(new.finding_id, old.finding_id));
  return coalesce(new, old);
end;
$$;

create trigger refresh_user_finding_consensus_trigger
after insert or update or delete on public.user_finding_votes
for each row execute function public.refresh_user_finding_consensus_after_vote();

create or replace function public.read_public_finding_cells(
  p_west double precision,
  p_south double precision,
  p_east double precision,
  p_north double precision,
  p_species_id text default null,
  p_limit integer default 1000
)
returns table (
  cell_id text,
  west double precision,
  south double precision,
  east double precision,
  north double precision,
  finding_count integer,
  supported_count integer,
  latest_observed_on date,
  species_counts jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    levels.cell_id,
    levels.west,
    levels.south,
    levels.east,
    levels.north,
    count(*)::integer as finding_count,
    count(*) filter (where findings.verification_status = 'community_supported')::integer as supported_count,
    max(findings.observed_on) as latest_observed_on,
    (
      select jsonb_object_agg(counts.reported_species_id, counts.species_count order by counts.reported_species_id)
      from (
        select coalesce(grouped.consensus_species_id, grouped.reported_species_id) as reported_species_id, count(*)::integer as species_count
        from public.user_findings grouped
        where grouped.public_cell_id = levels.cell_id
          and grouped.visibility = 'public'
          and grouped.publication_state = 'published'
          and (p_species_id is null or coalesce(grouped.consensus_species_id, grouped.reported_species_id) = p_species_id)
        group by coalesce(grouped.consensus_species_id, grouped.reported_species_id)
      ) counts
    ) as species_counts
  from public.spatial_cell_levels levels
  join (
    select
      raw.public_cell_id,
      coalesce(raw.consensus_species_id, raw.reported_species_id) as reported_species_id,
      raw.verification_status,
      raw.observed_on,
      1 as species_count
    from public.user_findings raw
    where raw.visibility = 'public'
      and raw.publication_state = 'published'
      and (p_species_id is null or coalesce(raw.consensus_species_id, raw.reported_species_id) = p_species_id)
  ) findings on findings.public_cell_id = levels.cell_id
  where levels.grid_size_m = 10000
    and levels.west < p_east and levels.east > p_west
    and levels.south < p_north and levels.north > p_south
  group by levels.cell_id, levels.west, levels.south, levels.east, levels.north
  order by levels.cell_id
  limit least(greatest(p_limit, 1), 1000)
$$;

create or replace function public.read_stale_finding_photo_staging(p_limit integer default 500)
returns table (storage_path text)
language sql
stable
security invoker
set search_path = ''
as $$
  select objects.name as storage_path
  from storage.objects objects
  where objects.bucket_id = 'finding-photo-staging'
    and objects.created_at < now() - interval '24 hours'
  order by objects.created_at
  limit least(greatest(p_limit, 1), 1000)
$$;

revoke all on function public.begin_user_finding(uuid, uuid, text, timestamptz, double precision, double precision, boolean, double precision, text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.recompute_user_finding_consensus(uuid) from public, anon, authenticated;
revoke all on function public.validate_user_finding_vote() from public, anon, authenticated;
revoke all on function public.refresh_user_finding_consensus_after_vote() from public, anon, authenticated;
revoke all on function public.read_public_finding_cells(double precision, double precision, double precision, double precision, text, integer) from public, anon, authenticated;
revoke all on function public.read_stale_finding_photo_staging(integer) from public, anon, authenticated;

grant execute on function public.begin_user_finding(uuid, uuid, text, timestamptz, double precision, double precision, boolean, double precision, text, text, text, boolean) to service_role;
grant execute on function public.recompute_user_finding_consensus(uuid) to service_role;
grant execute on function public.read_public_finding_cells(double precision, double precision, double precision, double precision, text, integer) to service_role;
grant execute on function public.read_stale_finding_photo_staging(integer) to service_role;

comment on table public.user_findings is
  'User-submitted presence-only findings generalized to the canonical 10 km lattice for publication; never a prediction input.';
comment on table public.user_finding_private_details is
  'Owner-only exact coordinates, accuracy, quantity and notes. Exact positions must never enter public DTOs, URLs, logs or analytics.';
