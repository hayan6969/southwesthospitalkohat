
-- Add 'ipd' role to IPD-related RLS policies so IPD staff can view/manage IPD data

-- ipd_admissions
DROP POLICY IF EXISTS "Staff view admissions" ON public.ipd_admissions;
CREATE POLICY "Staff view admissions" ON public.ipd_admissions FOR SELECT TO authenticated
USING ((get_current_user_role() = ANY (ARRAY['admin','doctor','nurse','receptionist','staff','ota','ipd','finance','pharmacist','head_pharmacist','assistant_pharmacist','salesman_pharmacist','lab','lab_staff'])) OR (patient_id = auth.uid()));

DROP POLICY IF EXISTS "Staff create admissions" ON public.ipd_admissions;
CREATE POLICY "Staff create admissions" ON public.ipd_admissions FOR INSERT TO authenticated
WITH CHECK (get_current_user_role() = ANY (ARRAY['admin','doctor','nurse','receptionist','staff','ota','ipd']));

DROP POLICY IF EXISTS "Staff update admissions" ON public.ipd_admissions;
CREATE POLICY "Staff update admissions" ON public.ipd_admissions FOR UPDATE TO authenticated
USING (get_current_user_role() = ANY (ARRAY['admin','doctor','nurse','receptionist','staff','ota','ipd','finance']))
WITH CHECK (get_current_user_role() = ANY (ARRAY['admin','doctor','nurse','receptionist','staff','ota','ipd','finance']));

-- beds
DROP POLICY IF EXISTS "Staff update bed status" ON public.beds;
CREATE POLICY "Staff update bed status" ON public.beds FOR UPDATE TO authenticated
USING (get_current_user_role() = ANY (ARRAY['admin','doctor','nurse','receptionist','staff','ota','ipd','finance']))
WITH CHECK (get_current_user_role() = ANY (ARRAY['admin','doctor','nurse','receptionist','staff','ota','ipd','finance']));

-- ipd_charges
DROP POLICY IF EXISTS "Staff view ipd charges" ON public.ipd_charges;
CREATE POLICY "Staff view ipd charges" ON public.ipd_charges FOR SELECT TO authenticated
USING ((get_current_user_role() = ANY (ARRAY['admin','doctor','nurse','receptionist','staff','ota','ipd','finance'])) OR (EXISTS (SELECT 1 FROM ipd_admissions a WHERE a.id = ipd_charges.admission_id AND a.patient_id = auth.uid())));

DROP POLICY IF EXISTS "Staff manage ipd charges" ON public.ipd_charges;
CREATE POLICY "Staff manage ipd charges" ON public.ipd_charges FOR ALL TO authenticated
USING (get_current_user_role() = ANY (ARRAY['admin','finance','receptionist','staff','doctor','nurse','ota','ipd']))
WITH CHECK (get_current_user_role() = ANY (ARRAY['admin','finance','receptionist','staff','doctor','nurse','ota','ipd']));

-- ipd_invoices
DROP POLICY IF EXISTS "Staff view ipd invoices" ON public.ipd_invoices;
CREATE POLICY "Staff view ipd invoices" ON public.ipd_invoices FOR SELECT TO authenticated
USING ((get_current_user_role() = ANY (ARRAY['admin','doctor','nurse','receptionist','staff','ota','ipd','finance'])) OR (patient_id = auth.uid()));

DROP POLICY IF EXISTS "Finance manage ipd invoices" ON public.ipd_invoices;
CREATE POLICY "Finance manage ipd invoices" ON public.ipd_invoices FOR ALL TO authenticated
USING (get_current_user_role() = ANY (ARRAY['admin','finance','receptionist','staff','ipd']))
WITH CHECK (get_current_user_role() = ANY (ARRAY['admin','finance','receptionist','staff','ipd']));

-- ipd_lab_orders
DROP POLICY IF EXISTS "Staff view ipd labs" ON public.ipd_lab_orders;
CREATE POLICY "Staff view ipd labs" ON public.ipd_lab_orders FOR SELECT TO authenticated
USING ((get_current_user_role() = ANY (ARRAY['admin','doctor','nurse','receptionist','staff','ota','ipd','finance','lab','lab_staff'])) OR (EXISTS (SELECT 1 FROM ipd_admissions a WHERE a.id = ipd_lab_orders.admission_id AND a.patient_id = auth.uid())));

DROP POLICY IF EXISTS "Clinical create ipd labs" ON public.ipd_lab_orders;
CREATE POLICY "Clinical create ipd labs" ON public.ipd_lab_orders FOR INSERT TO authenticated
WITH CHECK (get_current_user_role() = ANY (ARRAY['admin','doctor','nurse','ota','staff','ipd','lab','lab_staff']));

DROP POLICY IF EXISTS "Lab update ipd labs" ON public.ipd_lab_orders;
CREATE POLICY "Lab update ipd labs" ON public.ipd_lab_orders FOR UPDATE TO authenticated
USING (get_current_user_role() = ANY (ARRAY['admin','doctor','lab','lab_staff','nurse','ota','ipd']))
WITH CHECK (get_current_user_role() = ANY (ARRAY['admin','doctor','lab','lab_staff','nurse','ota','ipd']));

-- ipd_medicine_orders
DROP POLICY IF EXISTS "Staff view ipd meds" ON public.ipd_medicine_orders;
CREATE POLICY "Staff view ipd meds" ON public.ipd_medicine_orders FOR SELECT TO authenticated
USING ((get_current_user_role() = ANY (ARRAY['admin','doctor','nurse','receptionist','staff','ota','ipd','finance','pharmacist','head_pharmacist','assistant_pharmacist','salesman_pharmacist'])) OR (EXISTS (SELECT 1 FROM ipd_admissions a WHERE a.id = ipd_medicine_orders.admission_id AND a.patient_id = auth.uid())));

DROP POLICY IF EXISTS "Clinical create ipd meds" ON public.ipd_medicine_orders;
CREATE POLICY "Clinical create ipd meds" ON public.ipd_medicine_orders FOR INSERT TO authenticated
WITH CHECK (get_current_user_role() = ANY (ARRAY['admin','doctor','nurse','ota','staff','ipd']));

DROP POLICY IF EXISTS "Pharmacy update ipd meds" ON public.ipd_medicine_orders;
CREATE POLICY "Pharmacy update ipd meds" ON public.ipd_medicine_orders FOR UPDATE TO authenticated
USING (get_current_user_role() = ANY (ARRAY['admin','doctor','nurse','ota','ipd','pharmacist','head_pharmacist','assistant_pharmacist','salesman_pharmacist']))
WITH CHECK (get_current_user_role() = ANY (ARRAY['admin','doctor','nurse','ota','ipd','pharmacist','head_pharmacist','assistant_pharmacist','salesman_pharmacist']));

-- ipd_treatment_chart
DROP POLICY IF EXISTS "Staff view chart" ON public.ipd_treatment_chart;
CREATE POLICY "Staff view chart" ON public.ipd_treatment_chart FOR SELECT TO authenticated
USING ((get_current_user_role() = ANY (ARRAY['admin','doctor','nurse','receptionist','staff','ota','ipd','finance'])) OR (EXISTS (SELECT 1 FROM ipd_admissions a WHERE a.id = ipd_treatment_chart.admission_id AND a.patient_id = auth.uid())));

DROP POLICY IF EXISTS "Clinical write chart" ON public.ipd_treatment_chart;
CREATE POLICY "Clinical write chart" ON public.ipd_treatment_chart FOR INSERT TO authenticated
WITH CHECK (get_current_user_role() = ANY (ARRAY['admin','doctor','nurse','ota','staff','ipd']));

DROP POLICY IF EXISTS "Clinical update chart" ON public.ipd_treatment_chart;
CREATE POLICY "Clinical update chart" ON public.ipd_treatment_chart FOR UPDATE TO authenticated
USING (get_current_user_role() = ANY (ARRAY['admin','doctor','nurse','ota','staff','ipd']))
WITH CHECK (get_current_user_role() = ANY (ARRAY['admin','doctor','nurse','ota','staff','ipd']));
