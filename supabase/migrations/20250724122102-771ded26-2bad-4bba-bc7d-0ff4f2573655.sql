-- Check existing constraints on the profiles table
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass 
AND contype = 'c';