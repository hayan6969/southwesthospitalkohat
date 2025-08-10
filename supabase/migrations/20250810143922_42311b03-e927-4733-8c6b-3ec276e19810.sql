-- First create the profile for the emergency patient
INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    is_active
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'emergency@hospital.local',
    'Emergency',
    'Patient',
    'patient',
    true
) ON CONFLICT (id) DO NOTHING;

-- Then create the emergency patient record
INSERT INTO public.patients (
    id,
    patient_number,
    cnic,
    address,
    emergency_contact_name,
    emergency_contact_phone
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'EMERGENCY-001',
    'EMERGENCY',
    'Emergency Department',
    'Hospital Staff',
    'Emergency Line'
) ON CONFLICT (id) DO NOTHING;