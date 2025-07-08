-- First, delete appointments that reference dummy doctors
DELETE FROM public.appointments 
WHERE doctor_id IN (
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002', 
    '550e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440004',
    '5de615ab-c8fc-46d8-92fa-f7e7316dc0f1'
);

-- Delete medical records that reference dummy doctors
DELETE FROM public.medical_records 
WHERE doctor_id IN (
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002', 
    '550e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440004',
    '5de615ab-c8fc-46d8-92fa-f7e7316dc0f1'
);

-- Delete lab reports that reference dummy doctors
DELETE FROM public.lab_reports 
WHERE doctor_id IN (
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002', 
    '550e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440004',
    '5de615ab-c8fc-46d8-92fa-f7e7316dc0f1'
);

-- Now remove dummy doctor data
DELETE FROM public.doctors 
WHERE id IN (
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002', 
    '550e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440004',
    '5de615ab-c8fc-46d8-92fa-f7e7316dc0f1'
);

-- Remove corresponding dummy profiles
DELETE FROM public.profiles 
WHERE id IN (
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002', 
    '550e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440004',
    '5de615ab-c8fc-46d8-92fa-f7e7316dc0f1'
) AND email LIKE '%@doctor.local';