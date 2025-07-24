-- Fix infinite recursion in profiles RLS policies

-- First, create a security definer function to get current user role safely
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Drop the problematic OTA policy that's causing recursion
DROP POLICY IF EXISTS "OTA can view profiles" ON public.profiles;

-- Recreate the OTA policy using the security definer function instead
CREATE POLICY "OTA can view profiles" 
ON public.profiles 
FOR SELECT
USING (public.get_current_user_role() = 'ota');

-- Also fix any other policies that might be causing recursion by checking if they reference profiles table
-- Update existing problematic policies if they exist

-- Check and fix the profiles viewing policies to prevent recursion
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT
USING (auth.uid() = id);

-- Ensure other role-based policies use the function
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view all profiles" 
ON public.profiles 
FOR SELECT
USING (auth.role() = 'authenticated');