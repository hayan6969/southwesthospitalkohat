CREATE OR REPLACE FUNCTION public.verify_pathology_report(p_report_number text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'report_number', r.report_number,
    'status', r.status,
    'reported_at', r.reported_at,
    'created_at', r.created_at,
    'patient_number', pt.patient_number,
    'first_name', pr.first_name,
    'last_name', pr.last_name
  )
  INTO result
  FROM public.lab_pathology_reports r
  LEFT JOIN public.patients pt ON pt.id = r.patient_id
  LEFT JOIN public.profiles pr ON pr.id = r.patient_id
  WHERE r.report_number = p_report_number
  LIMIT 1;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_pathology_report(text) TO anon, authenticated;