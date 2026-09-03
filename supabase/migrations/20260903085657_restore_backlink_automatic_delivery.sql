alter table public.backlink_automation_settings
  alter column auto_send set default true;

update public.backlink_automation_settings
set auto_send = true,
    updated_at = now()
where singleton = true;

comment on column public.backlink_automation_settings.auto_send is
  'When enabled, each eligible opportunity may receive its single permitted outreach email automatically; follow-ups remain disabled.';
