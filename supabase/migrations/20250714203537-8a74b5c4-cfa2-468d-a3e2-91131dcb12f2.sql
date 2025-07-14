-- Fix RLS policies for doctor availability and daily status tables to prevent 406 errors
-- and handle patient CNIC uniqueness properly

-- First, drop existing policies and recreate them
DROP POLICY IF EXISTS "Allow all users to view doctor availability" ON doctor_availability;
DROP POLICY IF EXISTS "Allow all users to view doctor daily status" ON doctor_daily_status;

-- Create new policies that explicitly allow authenticated users to view
CREATE POLICY "Allow authenticated users to view doctor availability" 
ON doctor_availability FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to view doctor daily status" 
ON doctor_daily_status FOR SELECT 
TO authenticated
USING (true);

-- Fix the CNIC uniqueness issue by making CNIC field non-required in patients table
-- and handle the constraint properly
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_cnic_key;

-- Add a conditional unique constraint only for non-empty CNIC values
CREATE UNIQUE INDEX patients_cnic_unique_idx ON patients (cnic) WHERE cnic IS NOT NULL AND cnic != '';

-- Update the hook to use maybeSingle() instead of single() to avoid errors when no records exist
-- This will be handled in the code changes