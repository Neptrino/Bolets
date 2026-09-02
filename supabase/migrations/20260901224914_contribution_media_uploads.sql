-- Reusable-media contributions use the existing owner-scoped private staging
-- bucket. The application downloads each staged WebP, re-encodes it to remove
-- metadata, and moves the protected result into this private review bucket.

alter table public.contribution_requests
  add column media_credit text,
  add column media_rights_confirmed_at timestamptz,
  add constraint contribution_requests_media_credit_check check (
    media_credit is null
    or (
      media_credit = btrim(media_credit)
      and char_length(media_credit) between 2 and 80
    )
  ),
  add constraint contribution_requests_media_rights_check check (
    (kind = 'reusable_media' and media_rights_confirmed_at is not null)
    or (kind <> 'reusable_media' and media_rights_confirmed_at is null and media_credit is null)
  );

create table public.contribution_request_media (
  id uuid primary key,
  request_id uuid not null references public.contribution_requests(id) on delete cascade,
  storage_path text not null unique
    check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'),
  position smallint not null check (position between 0 and 3),
  width integer not null check (width between 1 and 2400),
  height integer not null check (height between 1 and 2400),
  byte_size integer not null check (byte_size between 1 and 4194304),
  created_at timestamptz not null default now(),
  unique (request_id, position)
);

create index contribution_request_media_request_idx
  on public.contribution_request_media (request_id, position);

alter table public.contribution_request_media enable row level security;
revoke all on table public.contribution_request_media from public, anon, authenticated;
grant select, insert, update, delete on table public.contribution_request_media to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contribution-media', 'contribution-media', false, 4194304, array['image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on column public.contribution_requests.media_rights_confirmed_at is
  'Records the contributor confirmation that submitted media is theirs or reusable with permission. It is not publication approval.';

comment on table public.contribution_request_media is
  'Private, metadata-stripped media attached to a contribution request for human review.';
