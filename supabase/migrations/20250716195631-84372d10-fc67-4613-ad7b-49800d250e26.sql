-- Check if auth.users has the correct record for this patient
SELECT u.id, u.email, u.created_at, p.cnic 
FROM auth.users u
JOIN patients p ON u.id = p.id
WHERE u.email = '03145958017@patient.local';