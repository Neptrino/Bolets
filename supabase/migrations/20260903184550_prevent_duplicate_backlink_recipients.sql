update public.backlink_outbox
set recipient = lower(btrim(recipient)),
    updated_at = now()
where recipient is distinct from lower(btrim(recipient));

create unique index backlink_outbox_recipient_once_idx
  on public.backlink_outbox (lower(btrim(recipient)))
  where message_kind = 'initial'
    and status <> 'cancelled';

comment on index public.backlink_outbox_recipient_once_idx is
  'Allows at most one non-cancelled backlink outreach message per normalized recipient across all opportunities.';
