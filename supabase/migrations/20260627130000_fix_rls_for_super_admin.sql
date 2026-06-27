-- =============================================
-- Fix RLS policies & constraints for super_admin
-- =============================================
-- 1. Allow super_admin in profiles CHECK constraint
-- 2. Update get_current_user_role() to return 'admin'
--    for super_admin so every existing RLS policy
--    that checks role = 'admin' automatically passes.
-- =============================================

-- 1. Profiles CHECK constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role = ANY (ARRAY[
  'admin'::text, 'doctor'::text, 'staff'::text, 'ota'::text, 'ipd'::text,
  'head_pharmacist'::text, 'assistant_pharmacist'::text, 'salesman_pharmacist'::text,
  'patient'::text, 'finance'::text, 'nursing'::text, 'inventory_manager'::text,
  'store'::text, 'lab'::text, 'super_admin'::text
]));

-- 2. get_current_user_role returns 'admin' for super_admin
--    so all existing RLS policies that check = 'admin' pass.
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT CASE WHEN role = 'super_admin' THEN 'admin' ELSE role END
  FROM public.profiles WHERE id = auth.uid();
$$;
