alter table public.backlink_automation_settings
  alter column auto_send set default false;

update public.backlink_automation_settings
set auto_send = false,
    updated_at = now()
where singleton = true;

update public.backlink_outbox
set status = 'cancelled',
    last_error = 'follow-up-disabled',
    updated_at = now()
where message_kind = 'follow_up'
  and status in ('pending', 'sending');

update public.backlink_prospects
set next_action_at = null,
    updated_at = now()
where send_count >= 1
  and next_action_at is not null;

alter table public.backlink_outbox
  add constraint backlink_outbox_single_message_kind
  check (message_kind = 'initial') not valid;

comment on column public.backlink_automation_settings.auto_send is
  'Explicit opt-in for sending the single permitted outreach email; defaults off so discovery and review remain manual.';

comment on column public.backlink_automation_settings.follow_up_delay_days is
  'Retained for historical schema compatibility; follow-ups are disabled and this value is ignored.';
