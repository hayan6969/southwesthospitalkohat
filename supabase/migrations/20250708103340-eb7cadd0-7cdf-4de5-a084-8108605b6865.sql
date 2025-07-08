-- Add CNIC field to patients table
ALTER TABLE public.patients ADD COLUMN cnic TEXT UNIQUE;

-- Add consultation fee to doctors table  
ALTER TABLE public.doctors ADD COLUMN consultation_fee NUMERIC DEFAULT 0;

-- Update profiles table to support phone-based login
-- Add constraint to ensure phone is unique for patients
ALTER TABLE public.profiles ADD CONSTRAINT unique_phone_for_patients 
  UNIQUE (phone) DEFERRABLE INITIALLY DEFERRED;

-- Create index on CNIC for faster lookups
CREATE INDEX idx_patients_cnic ON public.patients(cnic);

-- Update patients table to make CNIC not null for new records
-- (existing records can have null CNIC during transition)
ALTER TABLE public.patients ALTER COLUMN cnic SET DEFAULT '';

-- Add trigger to auto-generate patient ID format
CREATE OR REPLACE FUNCTION generate_patient_display_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate a display ID like P-0001, P-0002, etc.
  NEW.id = COALESCE(NEW.id, gen_random_uuid());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to patients table
CREATE TRIGGER generate_patient_id_trigger
  BEFORE INSERT ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION generate_patient_display_id();