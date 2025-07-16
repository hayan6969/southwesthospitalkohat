-- Update Hayan Khan's email to patient login format and set CNIC as password
UPDATE auth.users 
SET 
  email = '03145958017@patient.local',
  encrypted_password = crypt('1310105136507', gen_salt('bf'))
WHERE id = 'e7fdd964-6695-4b3c-8562-1f576f8aac64';