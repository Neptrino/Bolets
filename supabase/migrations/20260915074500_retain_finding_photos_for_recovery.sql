-- Finding photos used to be deleted the moment a publish step finished or
-- failed. A lost race between two finalize requests then destroyed the only
-- copies of a photo (staging removed by the winner, final removed by the
-- loser). The application no longer deletes photos on the publish path; the
-- nightly sweep removes leftovers only once they are three days old, which
-- leaves a recovery window. Owner-initiated deletions still remove files
-- immediately for privacy.

create or replace function public.read_stale_finding_photo_staging(p_limit integer default 500)
returns table (storage_path text)
language sql
stable
security invoker
set search_path = ''
as $$
  select objects.name as storage_path
  from storage.objects objects
  where objects.bucket_id = 'finding-photo-staging'
    and objects.created_at < now() - interval '72 hours'
  order by objects.created_at
  limit least(greatest(p_limit, 1), 1000)
$$;

-- Final-bucket objects without a photo row belong to a failed or superseded
-- publish attempt. They are kept for three days, then swept.
create or replace function public.read_orphaned_finding_photos(p_limit integer default 500)
returns table (storage_path text)
language sql
stable
security invoker
set search_path = ''
as $$
  select objects.name as storage_path
  from storage.objects objects
  where objects.bucket_id = 'finding-photos'
    and objects.created_at < now() - interval '72 hours'
    and not exists (
      select 1 from public.user_finding_photos photos where photos.storage_path = objects.name
    )
  order by objects.created_at
  limit least(greatest(p_limit, 1), 1000)
$$;

revoke all on function public.read_stale_finding_photo_staging(integer) from public, anon, authenticated;
revoke all on function public.read_orphaned_finding_photos(integer) from public, anon, authenticated;
grant execute on function public.read_stale_finding_photo_staging(integer) to service_role;
grant execute on function public.read_orphaned_finding_photos(integer) to service_role;

comment on function public.read_orphaned_finding_photos(integer) is
  'Final finding-photo objects older than 72 hours with no user_finding_photos row; swept nightly by cleanup-finding-photo-staging.';
