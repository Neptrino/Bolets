create table public.instagram_species_publication_overrides (
  publication_date date primary key,
  species_id text,
  caption_override text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'cancelled')),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint instagram_species_caption_length
    check (caption_override is null or char_length(caption_override) <= 2100)
);

comment on table public.instagram_species_publication_overrides is
  'Admin-only changes to future automated Instagram species posts. Species IDs remain version-controlled catalogue identifiers.';

alter table public.instagram_species_publication_overrides enable row level security;
revoke all on table public.instagram_species_publication_overrides from public, anon, authenticated;
grant select, insert, update, delete on table public.instagram_species_publication_overrides to service_role;
