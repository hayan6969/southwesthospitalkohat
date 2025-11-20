
-- Remove the unique constraint on CNIC since multiple family members can share one CNIC
-- Only phone numbers need to be unique
DROP INDEX IF EXISTS patients_cnic_unique_idx;
