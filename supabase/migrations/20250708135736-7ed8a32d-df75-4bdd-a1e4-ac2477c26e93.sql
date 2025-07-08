-- Remove dummy doctor data that was created during migration
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