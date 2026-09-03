do $test$
declare
  first_prospect_id uuid;
  second_prospect_id uuid;
  first_message_id uuid;
begin
  insert into public.backlink_prospects (
    campaign_id, search_query, page_url, domain, page_title,
    organization, target_url, target_title
  ) values (
    'recipient-test', 'recipient uniqueness test',
    'https://first.example.test/bolets', 'first.example.test', 'First test page',
    'First test organization', 'https://bolets.app/', 'Bolets Atles'
  ) returning id into first_prospect_id;

  insert into public.backlink_prospects (
    campaign_id, search_query, page_url, domain, page_title,
    organization, target_url, target_title
  ) values (
    'recipient-test', 'recipient uniqueness test',
    'https://second.example.test/bolets', 'second.example.test', 'Second test page',
    'Second test organization', 'https://bolets.app/', 'Bolets Atles'
  ) returning id into second_prospect_id;

  insert into public.backlink_outbox (
    prospect_id, message_kind, recipient, subject, body_text, dedupe_key
  ) values (
    first_prospect_id, 'initial', 'editorial@example.test',
    'First message', 'First test message body long enough.', 'recipient-test-first'
  ) returning id into first_message_id;

  begin
    insert into public.backlink_outbox (
      prospect_id, message_kind, recipient, subject, body_text, dedupe_key
    ) values (
      second_prospect_id, 'initial', 'EDITORIAL@example.test',
      'Duplicate message', 'Duplicate test message body long enough.', 'recipient-test-duplicate'
    );
    raise check_violation using message = 'Duplicate normalized recipient was accepted';
  exception
    when unique_violation then null;
  end;

  update public.backlink_outbox
  set status = 'cancelled'
  where id = first_message_id;

  insert into public.backlink_outbox (
    prospect_id, message_kind, recipient, subject, body_text, dedupe_key
  ) values (
    second_prospect_id, 'initial', 'EDITORIAL@example.test',
    'Replacement message', 'Replacement test message body long enough.', 'recipient-test-replacement'
  );

  delete from public.backlink_outbox
  where prospect_id in (first_prospect_id, second_prospect_id);

  delete from public.backlink_prospects
  where id in (first_prospect_id, second_prospect_id);
end
$test$;
