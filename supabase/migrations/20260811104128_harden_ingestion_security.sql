-- Supabase ships pg_net in public and this managed extension does not support
-- ALTER EXTENSION ... SET SCHEMA. No application table or policy is public.

create policy "service role manages environment snapshots"
on public.environment_snapshots
for all
to service_role
using (true)
with check (true);

create policy "service role manages prediction cells"
on public.prediction_cells
for all
to service_role
using (true)
with check (true);
