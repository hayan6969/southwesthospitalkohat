-- First, let's see what users we have for this phone number
SELECT u.id, u.email, u.created_at, p.first_name, p.last_name 
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = '03145958017@patient.local';

-- Delete the patient auth.users record (keeping only Hayan Khan)
-- We'll identify which one to delete by checking if it has a profiles record
DELETE FROM auth.users 
WHERE email = '03145958017@patient.local' 
AND id NOT IN (
  SELECT u.id FROM auth.users u
  JOIN profiles p ON u.id = p.id
  WHERE u.email = '03145958017@patient.local'
  AND p.first_name = 'Hayan'
  AND p.last_name = 'Khan'
);

-- Add unique constraint on email in auth.users to prevent duplicates
-- (This constraint should already exist but let's make sure)
-- We can't directly alter auth.users, but we can create a function to check for duplicates

-- Create a function to prevent duplicate patient registrations
CREATE OR REPLACE FUNCTION prevent_duplicate_patient_emails()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if email already exists for patient accounts
  IF NEW.email LIKE '%@patient.local' THEN
    IF EXISTS (
      SELECT 1 FROM auth.users 
      WHERE email = NEW.email AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Patient with this phone number already exists';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent duplicate patient emails
DROP TRIGGER IF EXISTS prevent_duplicate_patient_emails_trigger ON auth.users;
CREATE TRIGGER prevent_duplicate_patient_emails_trigger
  BEFORE INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_patient_emails();