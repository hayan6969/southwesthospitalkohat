-- Fix missing lab_report for patient P-6119 (invoice LAB-1759844481336)
-- This invoice was created without a corresponding lab_report record
-- Adding external_doctor_name to satisfy the doctor_check constraint

INSERT INTO lab_reports (
  patient_id, 
  test_name, 
  price, 
  invoice_id, 
  status,
  test_date,
  created_at,
  external_doctor_name
)
VALUES (
  'b081226a-5a88-43de-afdd-f141a092eae1',  -- P-6119 patient_id
  'CBC',  -- Test name from invoice description
  500.00,  -- Amount from invoice
  '5d328bc0-d8bf-4f8f-b613-0739b8f30301',  -- Invoice ID
  'pending',  -- Status
  '2025-10-07 13:41:22.242443+00',  -- Use invoice created_at as test_date
  '2025-10-07 13:41:22.242443+00',  -- Use invoice created_at
  'Walk-in Patient'  -- External doctor name to satisfy constraint
);