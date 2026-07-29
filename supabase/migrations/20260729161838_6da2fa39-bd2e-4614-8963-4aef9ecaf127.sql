CREATE OR REPLACE FUNCTION public.__export_auth_users()
RETURNS TABLE(
  id uuid,
  email text,
  encrypted_password text,
  email_confirmed_at timestamptz,
  phone text,
  phone_confirmed_at timestamptz,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  last_sign_in_at timestamptz,
  is_sso_user boolean,
  aud text,
  role text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT u.id, u.email::text, u.encrypted_password::text, u.email_confirmed_at,
         u.phone::text, u.phone_confirmed_at, u.raw_app_meta_data, u.raw_user_meta_data,
         u.created_at, u.updated_at, u.last_sign_in_at, u.is_sso_user,
         u.aud::text, u.role::text
  FROM auth.users u
  ORDER BY u.created_at;
$$;

REVOKE ALL ON FUNCTION public.__export_auth_users() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.__export_auth_users() TO service_role;

CREATE OR REPLACE FUNCTION public.__export_auth_identities()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  provider_id text,
  provider text,
  identity_data jsonb,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT i.id, i.user_id, i.provider_id::text, i.provider::text, i.identity_data,
         i.last_sign_in_at, i.created_at, i.updated_at
  FROM auth.identities i
  ORDER BY i.created_at;
$$;

REVOKE ALL ON FUNCTION public.__export_auth_identities() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.__export_auth_identities() TO service_role;