
-- Create emergency placeholder user in auth.users
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'emergency@placeholder.local', crypt('emergency-placeholder-not-login', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Emergency","last_name":"Patient","role":"patient"}', now(), now(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- Create emergency placeholder profile
INSERT INTO public.profiles (id, email, first_name, last_name, role, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'emergency@placeholder.local', 'Emergency', 'Patient', 'patient', true)
ON CONFLICT (id) DO NOTHING;

-- Create emergency placeholder patient
INSERT INTO public.patients (id, patient_number)
VALUES ('00000000-0000-0000-0000-000000000001', 'EMERGENCY')
ON CONFLICT (id) DO NOTHING;
