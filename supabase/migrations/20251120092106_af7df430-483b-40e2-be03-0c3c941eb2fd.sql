-- Use a different approach: start from P-10000 for these orphaned profiles to avoid conflicts
ALTER TABLE patients DISABLE TRIGGER set_patient_defaults_trigger;

DO $$
DECLARE
  profile_rec RECORD;
  next_num INTEGER := 10000; -- Start from a safe high number
  new_patient_num TEXT;
BEGIN
  FOR profile_rec IN 
    SELECT p.id
    FROM profiles p
    WHERE p.role = 'patient' 
      AND NOT EXISTS (SELECT 1 FROM patients pat WHERE pat.id = p.id)
    ORDER BY p.created_at
  LOOP
    new_patient_num := 'P-' || next_num::TEXT;
    
    INSERT INTO patients (id, cnic, patient_number)
    VALUES (profile_rec.id, '', new_patient_num);
    
    next_num := next_num + 1;
  END LOOP;
END $$;

ALTER TABLE patients ENABLE TRIGGER set_patient_defaults_trigger;