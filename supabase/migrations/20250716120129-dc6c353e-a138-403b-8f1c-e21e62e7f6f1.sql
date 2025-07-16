-- Create a function to create user accounts without auto-signin
CREATE OR REPLACE FUNCTION public.create_user_account(
  p_email text,
  p_password text,
  p_first_name text,
  p_last_name text,
  p_role text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Generate new UUID for the user
  new_user_id := gen_random_uuid();
  
  -- Insert into auth.users using the auth schema
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object(
      'first_name', p_first_name,
      'last_name', p_last_name,
      'role', p_role
    ),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );
  
  RETURN new_user_id;
END;
$$;