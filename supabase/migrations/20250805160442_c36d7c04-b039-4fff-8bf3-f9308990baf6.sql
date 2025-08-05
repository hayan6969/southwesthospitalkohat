-- Update all current "scheduled" OTs to "pending" status
UPDATE ot_schedules 
SET status = 'pending'
WHERE status = 'scheduled';

-- Verify the update
SELECT 
  status,
  COUNT(*) as count,
  SUM(total_cost - COALESCE(doctor_expense, 0)) as hospital_revenue
FROM ot_schedules 
GROUP BY status;