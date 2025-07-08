-- First, let's remove foreign key constraints without adding new ones yet
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS patients_id_fkey;
ALTER TABLE public.doctors DROP CONSTRAINT IF EXISTS doctors_id_fkey;
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

-- Add a patient_number field for easy identification
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS patient_number TEXT UNIQUE;

-- Create a function to generate patient numbers
CREATE OR REPLACE FUNCTION generate_patient_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    formatted_num TEXT;
BEGIN
    -- Get the next patient number
    SELECT COALESCE(MAX(CAST(SUBSTRING(patient_number FROM 'P-(.*)') AS INTEGER)), 0) + 1
    INTO next_num
    FROM public.patients 
    WHERE patient_number ~ '^P-[0-9]+$';
    
    -- Format as P-0001, P-0002, etc.
    formatted_num := 'P-' || LPAD(next_num::TEXT, 4, '0');
    
    RETURN formatted_num;
END;
$$ LANGUAGE plpgsql;

-- Update the trigger to generate patient numbers
DROP TRIGGER IF EXISTS generate_patient_id_trigger ON public.patients;

CREATE OR REPLACE FUNCTION set_patient_defaults()
RETURNS TRIGGER AS $$
BEGIN
    -- Set ID if not provided
    NEW.id = COALESCE(NEW.id, gen_random_uuid());
    
    -- Set patient number if not provided
    IF NEW.patient_number IS NULL THEN
        NEW.patient_number = generate_patient_number();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_patient_defaults_trigger
    BEFORE INSERT ON public.patients
    FOR EACH ROW
    EXECUTE FUNCTION set_patient_defaults();