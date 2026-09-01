-- App authorization lives in Auth app metadata, which users cannot edit.
-- getUser() returns the current server-validated metadata, so admin access does
-- not depend on a client-decoded or potentially stale custom claim.
update auth.users
set
  raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('app_role', 'admin'),
  updated_at = now()
where lower(email) = 'aleix@ventayol.cat';
