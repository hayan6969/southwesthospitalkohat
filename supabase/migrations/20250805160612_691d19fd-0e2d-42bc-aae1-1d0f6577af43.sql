-- Update August 5th closing OT data to use "pending" status
UPDATE daily_closings 
SET 
  transactions_data = jsonb_set(
    transactions_data,
    '{otSchedules}',
    (
      SELECT jsonb_agg(
        jsonb_set(elem, '{status}', '"pending"')
      )
      FROM jsonb_array_elements(transactions_data->'otSchedules') as elem
    )
  ),
  updated_at = now()
WHERE closing_date = '2025-08-05';

-- Verify the update
SELECT 
  closing_date,
  jsonb_array_length(transactions_data->'otSchedules') as ot_count,
  (transactions_data->'otSchedules'->0->>'status') as first_ot_status
FROM daily_closings 
WHERE closing_date = '2025-08-05';