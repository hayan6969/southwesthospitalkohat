-- Use a DO block to update patients without patient_number sequentially
DO $$
DECLARE
    patient_record RECORD;
    next_number INTEGER := 1;
BEGIN
    -- Get the highest existing patient number to continue from
    SELECT COALESCE(MAX(CAST(SUBSTRING(patient_number FROM 'P-(.*)') AS INTEGER)), 0) + 1
    INTO next_number
    FROM public.patients 
    WHERE patient_number ~ '^P-[0-9]+$';
    
    -- Update each patient without a patient_number
    FOR patient_record IN 
        SELECT id FROM public.patients 
        WHERE patient_number IS NULL OR patient_number = ''
        ORDER BY created_at NULLS LAST
    LOOP
        UPDATE public.patients 
        SET patient_number = 'P-' || LPAD(next_number::TEXT, 4, '0')
        WHERE id = patient_record.id;
        
        next_number := next_number + 1;
    END LOOP;
END $$;