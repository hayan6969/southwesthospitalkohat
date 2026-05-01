
-- =====================================================
-- PATHOLOGY LAB MODULE - PHASE 1
-- =====================================================

-- 1) TEST TYPES
CREATE TABLE public.lab_test_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  report_category text,
  method text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lab_test_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view lab test types"
  ON public.lab_test_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage lab test types"
  ON public.lab_test_types FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE TRIGGER trg_lab_test_types_updated BEFORE UPDATE ON public.lab_test_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 2) TEST PARAMETERS
CREATE TABLE public.lab_test_parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_type_id uuid NOT NULL REFERENCES public.lab_test_types(id) ON DELETE CASCADE,
  category_heading text,
  parameter_name text NOT NULL,
  unit text,
  ref_display text,
  ref_min numeric,
  ref_max numeric,
  has_subranges boolean NOT NULL DEFAULT false,
  is_optional boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lab_test_parameters_test_type ON public.lab_test_parameters(test_type_id);
ALTER TABLE public.lab_test_parameters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view lab test parameters"
  ON public.lab_test_parameters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage lab test parameters"
  ON public.lab_test_parameters FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE TRIGGER trg_lab_test_parameters_updated BEFORE UPDATE ON public.lab_test_parameters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 3) PARAMETER SUBRANGES
CREATE TABLE public.lab_parameter_subranges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parameter_id uuid NOT NULL REFERENCES public.lab_test_parameters(id) ON DELETE CASCADE,
  label text NOT NULL,
  ref_min numeric,
  ref_max numeric,
  ref_display text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lab_parameter_subranges_param ON public.lab_parameter_subranges(parameter_id);
ALTER TABLE public.lab_parameter_subranges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view parameter subranges"
  ON public.lab_parameter_subranges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage parameter subranges"
  ON public.lab_parameter_subranges FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));


-- 4) PATHOLOGY REPORTS
CREATE TABLE public.lab_pathology_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  report_number text NOT NULL UNIQUE,
  -- Snapshot fields (so report doesn't change if patient profile changes)
  patient_name_snapshot text,
  patient_age_snapshot integer,
  patient_sex_snapshot text,
  referred_by text,
  collection_address text,
  sample_type text,
  instrument text,
  interpretation text,
  registered_at timestamptz,
  collected_at timestamptz,
  reported_at timestamptz,
  status text NOT NULL DEFAULT 'draft',
  invoice_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lab_pathology_reports_status_check CHECK (status IN ('draft','final'))
);
CREATE INDEX idx_lab_pathology_reports_patient ON public.lab_pathology_reports(patient_id);
CREATE INDEX idx_lab_pathology_reports_status ON public.lab_pathology_reports(status);
CREATE INDEX idx_lab_pathology_reports_created ON public.lab_pathology_reports(created_at DESC);
ALTER TABLE public.lab_pathology_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view pathology reports"
  ON public.lab_pathology_reports FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin','lab','staff','doctor','finance'))
    OR patient_id = auth.uid()
  );
CREATE POLICY "Lab and admin can manage pathology reports"
  ON public.lab_pathology_reports FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','lab')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','lab')));

CREATE TRIGGER trg_lab_pathology_reports_updated BEFORE UPDATE ON public.lab_pathology_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 5) REPORT <-> TEST TYPES (multi-test reports)
CREATE TABLE public.lab_pathology_report_test_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.lab_pathology_reports(id) ON DELETE CASCADE,
  test_type_id uuid NOT NULL REFERENCES public.lab_test_types(id),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(report_id, test_type_id)
);
CREATE INDEX idx_pathology_rtt_report ON public.lab_pathology_report_test_types(report_id);
ALTER TABLE public.lab_pathology_report_test_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View report test types follows reports"
  ON public.lab_pathology_report_test_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lab and admin manage report test types"
  ON public.lab_pathology_report_test_types FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','lab')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','lab')));


-- 6) REPORT RESULTS
CREATE TABLE public.lab_pathology_report_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.lab_pathology_reports(id) ON DELETE CASCADE,
  parameter_id uuid NOT NULL REFERENCES public.lab_test_parameters(id),
  result_value text,
  flag text,
  subrange_used text,
  subrange_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lab_pathology_report_results_flag_check CHECK (flag IS NULL OR flag IN ('Low','High','Borderline')),
  UNIQUE(report_id, parameter_id)
);
CREATE INDEX idx_pathology_results_report ON public.lab_pathology_report_results(report_id);
ALTER TABLE public.lab_pathology_report_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View pathology results follows reports"
  ON public.lab_pathology_report_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lab and admin manage pathology results"
  ON public.lab_pathology_report_results FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','lab')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','lab')));

CREATE TRIGGER trg_lab_pathology_results_updated BEFORE UPDATE ON public.lab_pathology_report_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- =====================================================
-- SEED: 11 TEST TYPES + PARAMETERS + SUBRANGES
-- =====================================================
DO $$
DECLARE
  tt uuid;
  p uuid;
BEGIN

-- 1. TSH
INSERT INTO public.lab_test_types(name, report_category, method, sort_order)
VALUES ('TSH', 'ENDOCRINOLOGY REPORT', 'TOSOH AIA-600 JAPAN.(Chemiluminescence)', 1) RETURNING id INTO tt;
INSERT INTO public.lab_test_parameters(test_type_id, parameter_name, unit, ref_display, ref_min, ref_max, sort_order)
VALUES (tt, 'TSH', 'ulU/ml', '0.4 --- 6.2', 0.4, 6.2, 1);

-- 2. LH
INSERT INTO public.lab_test_types(name, report_category, method, sort_order)
VALUES ('LH', 'ENDOCRINOLOGY REPORT', 'TOSOH AIA-600 JAPAN.(Chemiluminescence)', 2) RETURNING id INTO tt;
INSERT INTO public.lab_test_parameters(test_type_id, parameter_name, unit, ref_display, has_subranges, sort_order)
VALUES (tt, 'LH', 'mIU/ml', '( See Below )', true, 1) RETURNING id INTO p;
INSERT INTO public.lab_parameter_subranges(parameter_id, label, ref_min, ref_max, ref_display, sort_order) VALUES
(p, 'Female (Mid-cycle Surge)', 9.6, 80.0, '9.6 - 80.0', 1),
(p, 'Female (Follicular Phase)', 1.5, 8.0, '1.5 - 8.0', 2),
(p, 'Female (First Half)', 1.5, 8.0, '1.5 - 8.0', 3),
(p, 'Female (Second Half)', 2.0, 8.0, '2.0 - 8.0', 4),
(p, 'Female (Luteal Phase)', 0.2, 6.5, '0.2 - 6.5', 5),
(p, 'Female (Menopausal)', 8.0, 33.0, '8.0 - 33.0', 6);

-- 3. FSH
INSERT INTO public.lab_test_types(name, report_category, method, sort_order)
VALUES ('FSH', 'ENDOCRINOLOGY REPORT', 'TOSOH AIA-600 JAPAN.(Chemiluminescence)', 3) RETURNING id INTO tt;
INSERT INTO public.lab_test_parameters(test_type_id, parameter_name, unit, ref_display, has_subranges, sort_order)
VALUES (tt, 'FSH', 'mIU/ml', '( See Below )', true, 1) RETURNING id INTO p;
INSERT INTO public.lab_parameter_subranges(parameter_id, label, ref_min, ref_max, ref_display, sort_order) VALUES
(p, 'Male', 1.7, 12.0, '1.7 - 12.0', 1),
(p, 'Female (Mid-cycle Surge)', 6.3, 24.0, '6.3 - 24.0', 2),
(p, 'Female (Follicular Phase)', 3.9, 12.0, '3.9 - 12.0', 3),
(p, 'Female (First Half)', 3.9, 12.0, '3.9 - 12.0', 4),
(p, 'Female (Second Half)', 2.9, 9.0, '2.9 - 9.0', 5),
(p, 'Female (Luteal Phase)', 1.5, 7.0, '1.5 - 7.0', 6),
(p, 'Female (Menopausal)', 17.0, 95.0, '17.0 - 95.0', 7);

-- 4. Prolactin
INSERT INTO public.lab_test_types(name, report_category, method, sort_order)
VALUES ('Prolactin', 'ENDOCRINOLOGY REPORT', 'TOSOH AIA-600 JAPAN.(Chemiluminescence)', 4) RETURNING id INTO tt;
INSERT INTO public.lab_test_parameters(test_type_id, parameter_name, unit, ref_display, has_subranges, sort_order)
VALUES (tt, 'PROLACTIN', 'ng/ml', '( See Below )', true, 1) RETURNING id INTO p;
INSERT INTO public.lab_parameter_subranges(parameter_id, label, ref_min, ref_max, ref_display, sort_order) VALUES
(p, 'Male', 1.0, 18.0, '1.0 - 18.0', 1),
(p, 'Female', 1.0, 18.0, '1.0 - 18.0', 2),
(p, 'Cyclic', 1.0, 27.0, '1.0 - 27.0', 3),
(p, 'Postmenopausal', 1.0, 13.0, '1.0 - 13.0', 4);

-- 5. Beta HCG
INSERT INTO public.lab_test_types(name, report_category, method, sort_order)
VALUES ('Beta HCG', 'ENDOCRINOLOGY REPORT', 'TOSOH AIA-600 JAPAN.(Chemiluminescence)', 5) RETURNING id INTO tt;
INSERT INTO public.lab_test_parameters(test_type_id, parameter_name, unit, ref_display, has_subranges, sort_order)
VALUES (tt, 'BETA HCG', 'mIU/ml', '( See Below )', true, 1) RETURNING id INTO p;
INSERT INTO public.lab_parameter_subranges(parameter_id, label, ref_min, ref_max, ref_display, sort_order) VALUES
(p, 'Non-pregnant Female', 0, 5, '< 5', 1),
(p, 'Pregnant (4-5 wks)', 200, 7000, '200 - 7000', 2),
(p, 'Pregnant (6-10 wks)', 9000, 210000, '9000 - 210000', 3),
(p, 'Post delivery', 0, 5, '< 5', 4);

-- 6. HbA1C
INSERT INTO public.lab_test_types(name, report_category, method, notes, sort_order)
VALUES ('HbA1C (Glycocylated Hb)', 'FINAL REPORT', 'HPLC', 'HbA1C Interpretation:
< 5.7%  : Normal
5.7 - 6.4% : Pre-diabetes
>= 6.5% : Diabetes', 6) RETURNING id INTO tt;
INSERT INTO public.lab_test_parameters(test_type_id, parameter_name, unit, ref_display, ref_min, ref_max, sort_order)
VALUES (tt, 'HbA1C', '%', '4.5 --- 6.5', 4.5, 6.5, 1);

-- 7. Testosterone
INSERT INTO public.lab_test_types(name, report_category, method, sort_order)
VALUES ('Testosterone', 'BIOCHEMISTRY / ENDOCRINOLOGY REPORT', 'TOSOH AIA-600 JAPAN.(Chemiluminescence)', 7) RETURNING id INTO tt;
INSERT INTO public.lab_test_parameters(test_type_id, parameter_name, unit, ref_display, has_subranges, sort_order)
VALUES (tt, 'TESTOSTERONE', 'ng/dl', '( See Below )', true, 1) RETURNING id INTO p;
INSERT INTO public.lab_parameter_subranges(parameter_id, label, ref_min, ref_max, ref_display, sort_order) VALUES
(p, 'Male', 262, 870, '262 - 870', 1),
(p, 'Female', 9, 56, '9 - 56', 2);

-- 8. Progesterone
INSERT INTO public.lab_test_types(name, report_category, method, sort_order)
VALUES ('Progesterone', 'ENDOCRINOLOGY REPORT', 'TOSOH AIA-600 JAPAN.(Chemiluminescence)', 8) RETURNING id INTO tt;
INSERT INTO public.lab_test_parameters(test_type_id, parameter_name, unit, ref_display, has_subranges, sort_order)
VALUES (tt, 'PROGESTERONE', 'ng/dl', '( See Below )', true, 1) RETURNING id INTO p;
INSERT INTO public.lab_parameter_subranges(parameter_id, label, ref_min, ref_max, ref_display, sort_order) VALUES
(p, 'Follicular', 0.15, 0.70, '0.15 - 0.70', 1),
(p, 'Luteal', 2.0, 25.0, '2.0 - 25.0', 2),
(p, 'Pregnancy (7-13 wks)', 10.2, 44.0, '10.2 - 44.0', 3),
(p, 'Pregnancy (14-37 wks)', 9.5, 82.5, '9.5 - 82.5', 4),
(p, 'Pregnancy (30-40 wks)', 65.0, 229.0, '65.0 - 229.0', 5);

-- 9. Free T3 / Free T4 / TSH (combined)
INSERT INTO public.lab_test_types(name, report_category, method, sort_order)
VALUES ('Free T3 / Free T4 / TSH', 'ENDOCRINOLOGY REPORT', 'TOSOH AIA-600 JAPAN.(Chemiluminescence)', 9) RETURNING id INTO tt;
INSERT INTO public.lab_test_parameters(test_type_id, parameter_name, unit, ref_display, ref_min, ref_max, sort_order) VALUES
(tt, 'Free T3', 'pg/ml', '2.10 --- 4.9', 2.10, 4.9, 1),
(tt, 'Free T4', 'ng/dl', '0.75 --- 1.54', 0.75, 1.54, 2),
(tt, 'TSH', 'ulU/ml', '0.4 --- 5.8', 0.4, 5.8, 3);

-- 10. Serum Ferritin
INSERT INTO public.lab_test_types(name, report_category, method, sort_order)
VALUES ('Serum Ferritin', 'FINAL REPORT', 'TOSOH AIA-600 JAPAN.(Chemiluminescence)', 10) RETURNING id INTO tt;
INSERT INTO public.lab_test_parameters(test_type_id, parameter_name, unit, ref_display, has_subranges, sort_order)
VALUES (tt, 'SERUM FERRITIN', 'ng/ml', '( See Below )', true, 1) RETURNING id INTO p;
INSERT INTO public.lab_parameter_subranges(parameter_id, label, ref_min, ref_max, ref_display, sort_order) VALUES
(p, 'Male', 38, 457, '38 - 457', 1),
(p, 'Female (Menopausal)', 14, 165, '14 - 165', 2),
(p, 'Female (Premenopausal)', 7.4, 73.0, '7.4 - 73.0', 3);

-- 11. CBC
INSERT INTO public.lab_test_types(name, report_category, method, sort_order)
VALUES ('CBC (Complete Blood Count)', 'HEMATOLOGY', 'Sysmex Automated Hematology Analyzer', 11) RETURNING id INTO tt;
INSERT INTO public.lab_test_parameters(test_type_id, category_heading, parameter_name, unit, ref_display, ref_min, ref_max, sort_order) VALUES
(tt, 'HEMOGLOBIN', 'Hemoglobin (Hb)', 'g/dL', '13.0 - 17.0', 13.0, 17.0, 1),
(tt, 'BLOOD INDICES', 'Packed Cell Volume (PCV)', 'mn/dl', '40 - 50', 40, 50, 2),
(tt, NULL, 'Mean Corpuscular Volume (MCV)', 'fL', '83 - 101', 83, 101, 3),
(tt, NULL, 'MCH', 'pg', '27 - 32', 27, 32, 4),
(tt, NULL, 'MCHC', 'g/dL', '32.5 - 34.5', 32.5, 34.5, 5),
(tt, NULL, 'RDW', '%', '11.6 - 14.0', 11.6, 14.0, 6),
(tt, 'BLOOD COUNT', 'Whole Blood', 'mg/dl', '6 - 20', 6, 20, 7),
(tt, 'DIFFERENTIAL WBC COUNT', 'Sodium', '%', '50 - 62', 50, 62, 8),
(tt, NULL, 'Potassium', '%', '20 - 40', 20, 40, 9),
(tt, NULL, 'Calcium', '%', '1 - 6', 1, 6, 10),
(tt, NULL, 'Vitamin B12', '%', '0 - 10', 0, 10, 11),
(tt, NULL, 'Chloride', '%', '0 - 2', 0, 2, 12),
(tt, NULL, 'Total Protein', '%', '5.7 - 8.2', 5.7, 8.2, 13),
(tt, 'PLATELET COUNT', 'Platelet Count', 'cumm', '150000 - 410000', 150000, 410000, 14);

END $$;
