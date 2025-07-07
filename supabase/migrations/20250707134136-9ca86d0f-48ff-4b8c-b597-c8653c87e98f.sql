
-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Drop the problematic function
DROP FUNCTION IF EXISTS public.get_current_user_role();

-- Create simple, non-recursive policies
-- Users can always view their own profile
CREATE POLICY "Users can view own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- For admin operations, we'll handle them through the application layer
-- This policy allows authenticated users to insert (we'll control this in the app)
CREATE POLICY "Authenticated users can insert profiles" 
  ON public.profiles 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to view all profiles (we'll control access in the app)
CREATE POLICY "Authenticated users can view all profiles" 
  ON public.profiles 
  FOR SELECT 
  TO authenticated
  USING (true);
