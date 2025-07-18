-- Remove all patients and their associated records
DO $$
DECLARE
    patient_record RECORD;
BEGIN
    -- Get all patient profile IDs
    FOR patient_record IN 
        SELECT id FROM public.profiles WHERE role = 'patient'
    LOOP
        -- Use the existing delete_user_safely function for each patient
        PERFORM public.delete_user_safely(patient_record.id);
        RAISE NOTICE 'Deleted patient with ID: %', patient_record.id;
    END LOOP;
    
    -- Clean up any remaining orphaned auth.users records for patients
    DELETE FROM auth.users WHERE email LIKE '%@patient.local';
    
    -- Clean up any remaining orphaned patient records
    DELETE FROM public.patients WHERE id NOT IN (SELECT id FROM public.profiles);
    
    RAISE NOTICE 'All patient records have been removed successfully';
END $$;