-- Clear existing CBC parameters so we can rebuild them
DELETE FROM public.lab_test_parameters
WHERE test_type_id = 'fd0afbd7-aa45-4930-ab72-e7756985c09f';

-- Remove non-kept tests (cascades to their parameters and subranges)
DELETE FROM public.lab_test_types
WHERE id NOT IN (
  'fd0afbd7-aa45-4930-ab72-e7756985c09f', -- CBC
  '4721ef14-6eaf-496f-95fa-8cf7d1f5d51c', -- Beta HCG
  'b02ddfb3-6d4e-430e-9de7-d46714cc5229', -- FSH
  '3231c1c0-66b1-48d7-8f18-0f0563880f06', -- LH
  '816916d3-a33e-4d0e-b41c-d5b614c7f131', -- TSH
  '979b9d9a-0599-4947-ae73-8e809a25f950', -- HbA1C
  'dd6cb20f-e49e-4487-97db-f8b120360570', -- Testosterone
  '603d2d29-5035-42ce-91de-177da5f0bf62', -- Progesterone
  '6fe06c6f-3ece-4a30-bac4-8fe2ce6bab59', -- Free T3 / Free T4 / TSH
  '90081c6e-297d-427f-93f1-2558f2f9fbab'  -- Serum Ferritin
);

-- Insert CBC parameters matching the picture layout
INSERT INTO public.lab_test_parameters
  (test_type_id, category_heading, parameter_name, unit, ref_display, ref_min, ref_max, has_subranges, is_optional, sort_order)
VALUES
  ('fd0afbd7-aa45-4930-ab72-e7756985c09f', 'CBC', 'WBC',         '/Cumm',     '4000 — 11000',           4000,   11000,  false, false, 1),
  ('fd0afbd7-aa45-4930-ab72-e7756985c09f', 'CBC', 'RBC',         'mill/Cumm', '3.5 — 5.5',              3.5,    5.5,    false, false, 2),
  ('fd0afbd7-aa45-4930-ab72-e7756985c09f', 'CBC', 'HB%',         'g/dl',      'M: 12 — 18, F: 12 — 16', NULL,   NULL,   false, false, 3),
  ('fd0afbd7-aa45-4930-ab72-e7756985c09f', 'CBC', 'HCT',         '%',         '37 — 47',                37,     47,     false, false, 4),
  ('fd0afbd7-aa45-4930-ab72-e7756985c09f', 'CBC', 'MCV',         'fl',        '80 — 97',                80,     97,     false, false, 5),
  ('fd0afbd7-aa45-4930-ab72-e7756985c09f', 'CBC', 'MCH',         'pg',        '26 — 32',                26,     32,     false, false, 6),
  ('fd0afbd7-aa45-4930-ab72-e7756985c09f', 'CBC', 'MCHC',        'g/dl',      '32 — 36',                32,     36,     false, false, 7),
  ('fd0afbd7-aa45-4930-ab72-e7756985c09f', 'CBC', 'PLT',         '/Cumm',     '150000 — 450000',        150000, 450000, false, false, 8),
  ('fd0afbd7-aa45-4930-ab72-e7756985c09f', 'DLC', 'Neutrophils', '%',         '45 — 75',                45,     75,     false, false, 9),
  ('fd0afbd7-aa45-4930-ab72-e7756985c09f', 'DLC', 'Lymphocytes', '%',         '15 — 45',                15,     45,     false, false, 10),
  ('fd0afbd7-aa45-4930-ab72-e7756985c09f', 'DLC', 'Eosinophil',  '%',         '06 — 10',                6,      10,     false, false, 11),
  ('fd0afbd7-aa45-4930-ab72-e7756985c09f', 'DLC', 'Monocyte',    '%',         '02 — 06',                2,      6,      false, false, 12),
  ('fd0afbd7-aa45-4930-ab72-e7756985c09f', 'DLC', 'Basophiles',  '%',         '00 — 01',                0,      1,      false, false, 13);

-- Reset CBC test metadata
UPDATE public.lab_test_types
SET report_category = 'HEMATOLOGY',
    method = NULL,
    sort_order = 1,
    is_active = true
WHERE id = 'fd0afbd7-aa45-4930-ab72-e7756985c09f';
