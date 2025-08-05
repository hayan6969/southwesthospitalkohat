-- Update the August 5th closing with the correct X-ray data
UPDATE daily_closings 
SET 
  transactions_data = jsonb_set(
    transactions_data,
    '{xrayReports}',
    '[
      {"id": "7ae0d345-03c4-44f1-8c86-1a04dacec837", "price": 1000, "status": "completed", "created_at": "2025-08-05T10:08:35.976502+00:00", "test_name": "HSG", "patient_id": "054c57da-d3ff-4317-abe2-ba4a36963172"},
      {"id": "09356440-2218-4576-95ad-d26c6d037556", "price": 1000, "status": "completed", "created_at": "2025-08-05T10:24:21.197993+00:00", "test_name": "HSG", "patient_id": "cc466d02-cebb-44ad-9189-ddba653aec37"},
      {"id": "02e1f40a-85a0-489f-afd2-3de1145f2a55", "price": 600, "status": "completed", "created_at": "2025-08-05T10:26:52.5827+00:00", "test_name": "Simple X-ray", "patient_id": "cc466d02-cebb-44ad-9189-ddba653aec37"},
      {"id": "179cd46a-9e24-41c9-88a4-ba41c76a931c", "price": 1000, "status": "completed", "created_at": "2025-08-05T14:50:03.993142+00:00", "test_name": "HSG", "patient_id": "4ae8e96a-bdb3-4974-aa66-17ad51a53716"},
      {"id": "71ffa063-257a-48af-857a-c842bd0e404d", "price": 1000, "status": "completed", "created_at": "2025-08-05T14:50:33.930004+00:00", "test_name": "HSG", "patient_id": "054c57da-d3ff-4317-abe2-ba4a36963172"},
      {"id": "79dd4b76-8f58-41e1-bba4-fa38a613ceb8", "price": 1000, "status": "completed", "created_at": "2025-08-05T14:50:49.998375+00:00", "test_name": "HSG", "patient_id": "3666c820-c0fb-4429-b9bc-935b51d723e5"},
      {"id": "dd2e5632-99d6-4b25-9443-55c8248cc7bd", "price": 800, "status": "completed", "created_at": "2025-08-05T14:53:17.278686+00:00", "test_name": "Spinal X-ray", "patient_id": "474982e1-6c38-40f5-96b8-bde0ea1d4015"},
      {"id": "bc60fd04-2355-431c-873e-326ec0aeee20", "price": 1000, "status": "completed", "created_at": "2025-08-05T14:53:17.56396+00:00", "test_name": "HSG", "patient_id": "474982e1-6c38-40f5-96b8-bde0ea1d4015"},
      {"id": "a33bbbf5-69e2-4976-9596-d72ea8c53a3e", "price": 600, "status": "completed", "created_at": "2025-08-05T14:53:17.82726+00:00", "test_name": "Simple X-ray", "patient_id": "474982e1-6c38-40f5-96b8-bde0ea1d4015"}
    ]'::jsonb
  ),
  -- Also update the hospital revenue to include the missing X-ray revenue
  hospital_revenue = hospital_revenue + 8000,
  updated_at = now()
WHERE closing_date = '2025-08-05';

-- Verify the update
SELECT 
  closing_date,
  hospital_revenue,
  jsonb_array_length(transactions_data->'xrayReports') as xray_count,
  (
    SELECT SUM((value->>'price')::numeric) 
    FROM jsonb_array_elements(transactions_data->'xrayReports') as value
  ) as total_xray_revenue
FROM daily_closings 
WHERE closing_date = '2025-08-05';