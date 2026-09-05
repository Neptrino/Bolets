update public.backlink_automation_runs
set status = 'failed',
    detail = 'The worker stopped before completing the cycle; saved progress was retained.',
    completed_at = now()
where status = 'running'
  and started_at < now() - interval '30 minutes';

update public.backlink_prospects
set contact_email = lower(btrim(contact_email)),
    updated_at = now()
where contact_email is not null
  and contact_email is distinct from lower(btrim(contact_email));

update public.backlink_prospects as prospect
set status = 'suppressed',
    status_reason = 'recipient-already-contacted',
    next_action_at = null,
    updated_at = now()
where prospect.send_count = 0
  and prospect.status in ('discovered', 'ready', 'failed')
  and prospect.contact_email is not null
  and exists (
    select 1
    from public.backlink_outbox as delivery
    where delivery.message_kind = 'initial'
      and delivery.status <> 'cancelled'
      and lower(btrim(delivery.recipient)) = prospect.contact_email
  );
