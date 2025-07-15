-- Add RLS policies to allow admin users to manage other user profiles

-- Allow admin users to update any profile
CREATE POLICY "Admin users can update any profile" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow admin users to delete any profile (except other admins)
CREATE POLICY "Admin users can delete non-admin profiles" 
ON public.profiles 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) 
  AND role != 'admin'
);

-- Allow admin users to delete any profile including other admins (if needed)
-- Uncomment this if admins should be able to delete other admin accounts
-- CREATE POLICY "Admin users can delete any profile" 
-- ON public.profiles 
-- FOR DELETE 
-- USING (
--   EXISTS (
--     SELECT 1 FROM public.profiles 
--     WHERE id = auth.uid() AND role = 'admin'
--   )
-- );