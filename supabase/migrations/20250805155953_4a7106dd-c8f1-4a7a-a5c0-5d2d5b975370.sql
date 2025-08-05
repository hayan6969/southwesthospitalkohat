-- Update the August 5th closing with the correct OT data
UPDATE daily_closings 
SET 
  transactions_data = jsonb_set(
    transactions_data,
    '{otSchedules}',
    '[
      {"id": "5138fb88-c399-49ee-a431-716e9879b1b3", "total_cost": 15000, "doctor_expense": 0, "status": "scheduled", "created_at": "2025-08-05T01:45:06.135588+00:00", "operation_date": "2025-08-05", "patient_id": "cc466d02-cebb-44ad-9189-ddba653aec37"},
      {"id": "a2e6fe2a-fa2b-44d9-b6d6-d3b984b5cdce", "total_cost": 16000, "doctor_expense": 1000, "status": "scheduled", "created_at": "2025-08-05T01:55:09.397213+00:00", "operation_date": "2025-08-05", "patient_id": "cc466d02-cebb-44ad-9189-ddba653aec37"},
      {"id": "3eacde1a-c3f2-49a5-a5fe-2d8458e8a732", "total_cost": 17600, "doctor_expense": 100, "status": "scheduled", "created_at": "2025-08-05T01:59:12.439995+00:00", "operation_date": "2025-08-05", "patient_id": "cc466d02-cebb-44ad-9189-ddba653aec37"},
      {"id": "95307dc5-0ddc-43db-8053-a3502879bf50", "total_cost": 15100, "doctor_expense": 100, "status": "scheduled", "created_at": "2025-08-05T02:01:39.018813+00:00", "operation_date": "2025-08-05", "patient_id": "cc466d02-cebb-44ad-9189-ddba653aec37"},
      {"id": "570e6697-4af7-4464-b34f-e17b9fa71370", "total_cost": 46000, "doctor_expense": 31500, "status": "scheduled", "created_at": "2025-08-05T05:36:16.489022+00:00", "operation_date": "2025-08-05", "patient_id": "3818fcb2-04c6-4a20-a183-6461096ae4e4"},
      {"id": "ca617e0d-907b-4355-ab39-a9de9d75e1d7", "total_cost": 46000, "doctor_expense": 31500, "status": "scheduled", "created_at": "2025-08-05T05:38:42.7392+00:00", "operation_date": "2025-08-05", "patient_id": "31402442-3d5e-421e-875d-2653033e87ea"},
      {"id": "23e845b8-8844-4a60-915e-6ba522660201", "total_cost": 46000, "doctor_expense": 31500, "status": "scheduled", "created_at": "2025-08-05T05:40:29.259937+00:00", "operation_date": "2025-08-05", "patient_id": "58559d19-7853-485b-8e48-b563f8e666d6"},
      {"id": "e1961c23-5043-45bf-a0ca-7920a5404688", "total_cost": 46000, "doctor_expense": 31500, "status": "scheduled", "created_at": "2025-08-05T09:51:28.411019+00:00", "operation_date": "2025-08-05", "patient_id": "c6a36fab-f84d-46a4-8a97-38d5782d6b26"},
      {"id": "5058090e-8710-4925-a4ad-8f9841b8a2bd", "total_cost": 55000, "doctor_expense": 41000, "status": "scheduled", "created_at": "2025-08-05T11:41:29.875034+00:00", "operation_date": "2025-08-05", "patient_id": "73b2cd7c-416e-43a4-8910-625b159dbd67"}
    ]'::jsonb
  ),
  -- Also update the hospital revenue to include the missing OT revenue (Rs. 134,500)
  hospital_revenue = hospital_revenue + 134500,
  updated_at = now()
WHERE closing_date = '2025-08-05';

-- Verify the update
SELECT 
  closing_date,
  hospital_revenue,
  jsonb_array_length(transactions_data->'otSchedules') as ot_count,
  (
    SELECT SUM(((value->>'total_cost')::numeric - COALESCE((value->>'doctor_expense')::numeric, 0))) 
    FROM jsonb_array_elements(transactions_data->'otSchedules') as value
  ) as total_ot_hospital_revenue
FROM daily_closings 
WHERE closing_date = '2025-08-05';