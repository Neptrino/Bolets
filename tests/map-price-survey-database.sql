-- Run against the local database with psql -v ON_ERROR_STOP=1. Always rolls back.
begin;
do $$
declare
  subject text := repeat('a', 64);
begin
  if not (select relrowsecurity from pg_class where oid = 'public.map_price_survey_responses'::regclass) then
    raise exception 'Survey RLS must be enabled';
  end if;
  if has_table_privilege('anon', 'public.map_price_survey_responses', 'select,insert,update,delete')
     or has_table_privilege('authenticated', 'public.map_price_survey_responses', 'select,insert,update,delete') then
    raise exception 'Client roles must not access survey receipts';
  end if;
  if has_table_privilege('service_role', 'public.map_price_survey_responses', 'update,delete') then
    raise exception 'Server receipts must be immutable';
  end if;
  set local role service_role;
  insert into public.map_price_survey_responses (survey_version, respondent_hash, answer)
    values ('map-price-v8', subject, '499');
  begin
    insert into public.map_price_survey_responses (survey_version, respondent_hash, answer)
      values ('map-price-v8', subject, '999');
    raise exception 'Duplicate response accepted';
  exception when unique_violation then null;
  end;
  if (select count(*) from public.map_price_survey_responses where respondent_hash = subject) <> 1
     or (select answer from public.map_price_survey_responses where respondent_hash = subject) <> '499' then
    raise exception 'First receipt was not preserved';
  end if;
  begin
    insert into public.map_price_survey_responses (survey_version, respondent_hash, answer)
      values ('map-price-v8', repeat('b', 64), 'invalid');
    raise exception 'Invalid answer accepted';
  exception when check_violation then null;
  end;
  reset role;
end $$;
rollback;
