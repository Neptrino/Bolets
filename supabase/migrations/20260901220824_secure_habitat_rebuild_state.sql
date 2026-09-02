-- An ad-hoc rebuild cursor was restored from the managed project with the
-- default public API grants. Keep any retained state private without creating
-- the scratch table on databases that never needed it.
do $$
begin
  if to_regclass('public.bolets_tmp_habitat_rebuild') is not null then
    alter table public.bolets_tmp_habitat_rebuild enable row level security;
    revoke all on table public.bolets_tmp_habitat_rebuild from public, anon, authenticated;
    grant all on table public.bolets_tmp_habitat_rebuild to service_role;
  end if;
end;
$$;
