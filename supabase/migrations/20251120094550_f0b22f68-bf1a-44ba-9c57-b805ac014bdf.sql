
-- Fix orphaned profiles with 5-digit patient numbers to handle 10,000+ patients
WITH orphaned_profiles AS (
  SELECT 
    pr.id,
    ROW_NUMBER() OVER (ORDER BY pr.created_at) as row_num
  FROM profiles pr
  LEFT JOIN patients p ON p.id = pr.id
  WHERE pr.role = 'patient' AND p.id IS NULL
),
max_patient_num AS (
  SELECT COALESCE(MAX(CAST(SUBSTRING(patient_number FROM 'P-(.*)') AS INTEGER)), 0) as max_num
  FROM patients
  WHERE patient_number ~ '^P-[0-9]+$'
)
INSERT INTO patients (id, cnic, patient_number)
SELECT 
  op.id,
  '',
  'P-' || LPAD((mpn.max_num + op.row_num)::TEXT, 5, '0')  -- Changed from 4 to 5 digits
FROM orphaned_profiles op
CROSS JOIN max_patient_num mpn
ON CONFLICT (id) DO NOTHING;

-- Also update the generate_patient_number function to use 5 digits
CREATE OR REPLACE FUNCTION public.generate_patient_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
DECLARE
    next_num INTEGER;
    formatted_num TEXT;
BEGIN
    -- Get the next patient number
    SELECT COALESCE(MAX(CAST(SUBSTRING(patient_number FROM 'P-(.*)') AS INTEGER)), 0) + 1
    INTO next_num
    FROM public.patients 
    WHERE patient_number ~ '^P-[0-9]+$';
    
    -- Format as P-00001, P-00002, etc. (5 digits to support 10,000+ patients)
    formatted_num := 'P-' || LPAD(next_num::TEXT, 5, '0');
    
    RETURN formatted_num;
END;
$function$;
