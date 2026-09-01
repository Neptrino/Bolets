-- Run against the local development database with psql -v ON_ERROR_STOP=1.
-- The fixture and all privilege changes are rolled back.
begin;

do $$
begin
  if to_regclass('public.bolets_tmp_habitat_rebuild') is not null then
    raise exception 'This test requires a database without the legacy scratch table';
  end if;
end;
$$;

\ir ../../supabase/migrations/20260901220824_secure_habitat_rebuild_state.sql

do $$
begin
  if to_regclass('public.bolets_tmp_habitat_rebuild') is not null then
    raise exception 'The migration must not create the scratch table';
  end if;
end;
$$;

create table public.bolets_tmp_habitat_rebuild (next_y integer);
insert into public.bolets_tmp_habitat_rebuild values (42);
grant all on table public.bolets_tmp_habitat_rebuild to public, anon, authenticated, service_role;

\ir ../../supabase/migrations/20260901220824_secure_habitat_rebuild_state.sql
\ir ../../supabase/migrations/20260901220824_secure_habitat_rebuild_state.sql

do $$
declare
  role_name text;
  privilege_name text;
begin
  if not (select relrowsecurity from pg_class where oid = 'public.bolets_tmp_habitat_rebuild'::regclass) then
    raise exception 'RLS must be enabled';
  end if;
  foreach role_name in array array['anon', 'authenticated'] loop
    foreach privilege_name in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
      if has_table_privilege(role_name, 'public.bolets_tmp_habitat_rebuild', privilege_name) then
        raise exception 'Unexpected % privilege for %', privilege_name, role_name;
      end if;
    end loop;
    execute format('set local role %I', role_name);
    begin
      perform next_y from public.bolets_tmp_habitat_rebuild;
      raise exception 'Public reads must fail for %', role_name;
    exception when insufficient_privilege then
      null;
    end;
    begin
      insert into public.bolets_tmp_habitat_rebuild values (99);
      raise exception 'Public writes must fail for %', role_name;
    exception when insufficient_privilege then
      null;
    end;
    reset role;
  end loop;
end;
$$;

set local role service_role;
do $$
begin
  if (select count(*) from public.bolets_tmp_habitat_rebuild) <> 1
    or (select next_y from public.bolets_tmp_habitat_rebuild) <> 42 then
    raise exception 'The existing cursor must remain readable by the backend';
  end if;
  update public.bolets_tmp_habitat_rebuild set next_y = 43;
  if not found then
    raise exception 'The backend must retain write access';
  end if;
end;
$$;
reset role;

rollback;
