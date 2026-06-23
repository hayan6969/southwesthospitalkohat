-- Fix: accounts created with a mixed-case email (e.g. "Admin@gmail.com") are
-- impossible to log into. Supabase/GoTrue lowercases the email on sign-in
-- before looking the user up, so a stored "Admin@gmail.com" never matches the
-- "admin@gmail.com" the lookup uses -> 400 "Invalid login credentials".

-- 1) Normalize the email at creation time so this can't recur. Also guard
--    against creating a case-insensitive duplicate with a clear error.
CREATE OR REPLACE FUNCTION public.create_user_account(p_email text, p_password text, p_first_name text, p_last_name text, p_role text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions, auth
AS $function$
DECLARE
  new_user_id uuid;
  v_email text := lower(trim(p_email));
BEGIN
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'EMAIL_REQUIRED';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email) THEN
    RAISE EXCEPTION 'EMAIL_ALREADY_EXISTS';
  END IF;

  new_user_id := gen_random_uuid();
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  VALUES ('00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated', v_email, extensions.crypt(p_password, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'role', p_role), now(), now(), '', '', '', '');
  RETURN new_user_id;
END; $function$;

-- 2) Repair existing rows: lowercase any mixed-case email that does NOT collide
--    with an already-lowercase row. Collisions (the same address stored in two
--    case variants) are intentionally left untouched for manual cleanup, so
--    this migration can never violate the unique-email index or drop data.
UPDATE auth.users u
SET email = lower(u.email), updated_at = now()
WHERE u.email <> lower(u.email)
  AND NOT EXISTS (
    SELECT 1 FROM auth.users u2
    WHERE u2.id <> u.id AND u2.email = lower(u.email)
  );

UPDATE public.profiles p
SET email = lower(p.email)
WHERE p.email <> lower(p.email)
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p2
    WHERE p2.id <> p.id AND p2.email = lower(p.email)
  );
