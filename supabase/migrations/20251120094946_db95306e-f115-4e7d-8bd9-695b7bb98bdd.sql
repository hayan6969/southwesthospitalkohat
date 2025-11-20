
-- Fix the orphaned profile for 03005958013
INSERT INTO patients (id, cnic, patient_number)
SELECT 
  pr.id,
  '',
  generate_patient_number()
FROM profiles pr
LEFT JOIN patients p ON p.id = pr.id
WHERE pr.phone = '03005958013' AND p.id IS NULL;
