-- Update the expenses table RLS policy to allow pharmacy users to create expenses for returns
DROP POLICY IF EXISTS "Finance users can create expenses" ON public.expenses;

CREATE POLICY "Finance and pharmacy users can create expenses" 
ON public.expenses 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'pharmacy'::text])
  )
);