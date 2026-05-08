CREATE OR REPLACE FUNCTION public.verify_pathology_report_full(p_report_number text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_report RECORD;
  v_result jsonb;
  v_test_types jsonb;
BEGIN
  SELECT r.*, pt.patient_number, pr.first_name, pr.last_name, pr.phone
  INTO v_report
  FROM public.lab_pathology_reports r
  LEFT JOIN public.patients pt ON pt.id = r.patient_id
  LEFT JOIN public.profiles pr ON pr.id = r.patient_id
  WHERE r.report_number = p_report_number
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(tt_data ORDER BY sort_order), '[]'::jsonb)
  INTO v_test_types
  FROM (
    SELECT
      rtt.sort_order,
      jsonb_build_object(
        'name', tt.name,
        'report_category', tt.report_category,
        'method', tt.method,
        'notes', tt.notes,
        'parameters', (
          SELECT COALESCE(jsonb_agg(p_data ORDER BY p_sort), '[]'::jsonb)
          FROM (
            SELECT
              p.sort_order AS p_sort,
              jsonb_build_object(
                'parameter_name', p.parameter_name,
                'category_heading', p.category_heading,
                'unit', p.unit,
                'ref_display', p.ref_display,
                'ref_min', p.ref_min,
                'ref_max', p.ref_max,
                'display_all_subranges', p.display_all_subranges,
                'result_value', res.result_value,
                'flag', res.flag,
                'subrange_used', res.subrange_used,
                'subrange_id', res.subrange_id,
                'subranges', (
                  SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'id', sr.id,
                    'label', sr.label,
                    'ref_min', sr.ref_min,
                    'ref_max', sr.ref_max,
                    'ref_display', sr.ref_display
                  ) ORDER BY sr.sort_order), '[]'::jsonb)
                  FROM public.lab_parameter_subranges sr
                  WHERE sr.parameter_id = p.id
                )
              ) AS p_data
            FROM public.lab_test_parameters p
            LEFT JOIN public.lab_pathology_report_results res
              ON res.parameter_id = p.id AND res.report_id = v_report.id
            WHERE p.test_type_id = tt.id
          ) sub_p
        )
      ) AS tt_data
    FROM public.lab_pathology_report_test_types rtt
    JOIN public.lab_test_types tt ON tt.id = rtt.test_type_id
    WHERE rtt.report_id = v_report.id
  ) sub_tt;

  v_result := jsonb_build_object(
    'report_number', v_report.report_number,
    'status', v_report.status,
    'reported_at', v_report.reported_at,
    'collected_at', v_report.collected_at,
    'registered_at', v_report.registered_at,
    'created_at', v_report.created_at,
    'sample_type', v_report.sample_type,
    'instrument', v_report.instrument,
    'referred_by', v_report.referred_by,
    'collection_address', v_report.collection_address,
    'interpretation', v_report.interpretation,
    'patient_name', COALESCE(v_report.patient_name_snapshot, concat_ws(' ', v_report.first_name, v_report.last_name)),
    'patient_age', v_report.patient_age_snapshot,
    'patient_sex', v_report.patient_sex_snapshot,
    'patient_number', v_report.patient_number,
    'phone', v_report.phone,
    'test_types', v_test_types
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_pathology_report_full(text) TO anon, authenticated;