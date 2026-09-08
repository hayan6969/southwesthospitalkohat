-- ============ POLICIES ============
CREATE POLICY "Clinical staff manage anesthesia_notes" ON public.anesthesia_notes AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'doctor'::text, 'ota'::text, 'staff'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'doctor'::text, 'ota'::text, 'staff'::text]))))));
CREATE POLICY "Nurses view anesthesia_notes" ON public.anesthesia_notes AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['nursing'::text, 'nurse'::text, 'finance'::text]))))));
CREATE POLICY "Allow staff to manage appointment payments" ON public.appointments AS PERMISSIVE FOR UPDATE TO public
  USING (true);
CREATE POLICY "Doctors can update their own appointments" ON public.appointments AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'doctor'::text) AND (appointments.doctor_id = auth.uid())))));
CREATE POLICY "Doctors can view their own appointments" ON public.appointments AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'doctor'::text) AND (appointments.doctor_id = auth.uid())))));
CREATE POLICY "Patients can create their own appointments" ON public.appointments AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'patient'::text) AND (appointments.patient_id = auth.uid())))));
CREATE POLICY "Patients can view their own appointments" ON public.appointments AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'patient'::text) AND (appointments.patient_id = auth.uid())))));
CREATE POLICY "Staff and admins can manage all appointments" ON public.appointments AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text]))))));
CREATE POLICY "Staff and admins can view all appointments" ON public.appointments AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text]))))));
CREATE POLICY "Everyone can view assessment entries" ON public.assessment_entries AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Medical staff can delete assessment entries" ON public.assessment_entries AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'doctor'::text, 'ota'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Medical staff can update assessment entries" ON public.assessment_entries AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'doctor'::text, 'ota'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Nursing staff can create assessment entries" ON public.assessment_entries AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'nursing'::text]))))));
CREATE POLICY "Allow all operations" ON public.audit_logs AS PERMISSIVE FOR ALL TO public
  USING (true);
CREATE POLICY "Admins manage beds" ON public.beds AS PERMISSIVE FOR ALL TO authenticated
  USING ((get_current_user_role() = 'admin'::text))
  WITH CHECK ((get_current_user_role() = 'admin'::text));
CREATE POLICY "Anyone authenticated can view beds" ON public.beds AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Staff update bed status" ON public.beds AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text])))
  WITH CHECK ((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text])));
CREATE POLICY "Admins can read client error logs" ON public.client_error_logs AS PERMISSIVE FOR SELECT TO authenticated
  USING ((get_current_user_role() = 'admin'::text));
CREATE POLICY "Anyone can insert client error logs" ON public.client_error_logs AS PERMISSIVE FOR INSERT TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY "Finance users can create daily closings" ON public.daily_closings AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can view all daily closings" ON public.daily_closings AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Allow all operations" ON public.departments AS PERMISSIVE FOR ALL TO public
  USING (true);
CREATE POLICY "Allow authenticated users to view doctor availability" ON public.doctor_availability AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Doctors can manage their own availability" ON public.doctor_availability AS PERMISSIVE FOR ALL TO public
  USING ((auth.uid() = doctor_id))
  WITH CHECK ((auth.uid() = doctor_id));
CREATE POLICY "Allow authenticated users to view doctor daily status" ON public.doctor_daily_status AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Authenticated users can read doctor_daily_status" ON public.doctor_daily_status AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Doctors can manage their own daily status" ON public.doctor_daily_status AS PERMISSIVE FOR ALL TO public
  USING ((auth.uid() = doctor_id))
  WITH CHECK ((auth.uid() = doctor_id));
CREATE POLICY "Doctors can update their own status" ON public.doctor_daily_status AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((doctor_id = auth.uid()));
CREATE POLICY "Doctors can upsert their own status" ON public.doctor_daily_status AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((doctor_id = auth.uid()));
CREATE POLICY "Doctors can view their own payments" ON public.doctor_payments AS PERMISSIVE FOR SELECT TO public
  USING ((doctor_id = auth.uid()));
CREATE POLICY "Finance users can create doctor payments" ON public.doctor_payments AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can update doctor payments" ON public.doctor_payments AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can view all doctor payments" ON public.doctor_payments AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Anyone can view doctor specific schedules" ON public.doctor_specific_schedules AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Doctors can manage their own specific schedules" ON public.doctor_specific_schedules AS PERMISSIVE FOR ALL TO public
  USING ((auth.uid() = doctor_id))
  WITH CHECK ((auth.uid() = doctor_id));
CREATE POLICY "Anyone can view doctor working hours" ON public.doctor_working_hours AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Doctors can manage their own working hours" ON public.doctor_working_hours AS PERMISSIVE FOR ALL TO public
  USING ((auth.uid() = doctor_id))
  WITH CHECK ((auth.uid() = doctor_id));
CREATE POLICY "Allow all operations" ON public.doctors AS PERMISSIVE FOR ALL TO public
  USING (true);
CREATE POLICY "Admin users can create emergency expenses" ON public.emergency_expenses AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Admin users can delete emergency expenses" ON public.emergency_expenses AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Admin users can update emergency expenses" ON public.emergency_expenses AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance and admin users can view all emergency expenses" ON public.emergency_expenses AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text, 'staff'::text]))))));
CREATE POLICY "Finance and pharmacy users can create expenses" ON public.expenses AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text, 'pharmacy'::text]))))));
CREATE POLICY "Finance users can create expenses" ON public.expenses AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can delete expenses" ON public.expenses AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can update expenses" ON public.expenses AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can view all expenses" ON public.expenses AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance and admin can insert finance settings" ON public.finance_settings AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance and admin can update finance settings" ON public.finance_settings AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance and admin can view finance settings" ON public.finance_settings AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can create hospital closing balance" ON public.hospital_closing_balance AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can update hospital closing balance" ON public.hospital_closing_balance AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can view hospital closing balance" ON public.hospital_closing_balance AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Admins can manage hospital services" ON public.hospital_services AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Everyone can view hospital services" ON public.hospital_services AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Anyone can view hospital settings" ON public.hospital_settings AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Only admins can modify hospital settings" ON public.hospital_settings AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Everyone can view inventory items" ON public.inventory_items AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Inventory manager and admin can manage inventory items" ON public.inventory_items AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['inventory_manager'::text, 'admin'::text, 'super_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['inventory_manager'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Store can manage inventory items" ON public.inventory_items AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'store'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'store'::text)))));
CREATE POLICY "Inventory manager can update requests" ON public.inventory_requests AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['inventory_manager'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Inventory manager can view all requests" ON public.inventory_requests AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['inventory_manager'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Store can update approved requests" ON public.inventory_requests AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'store'::text)))));
CREATE POLICY "Store can view approved requests" ON public.inventory_requests AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'store'::text)))));
CREATE POLICY "Users can create requests" ON public.inventory_requests AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((requested_by = auth.uid()));
CREATE POLICY "Users can view their own requests" ON public.inventory_requests AS PERMISSIVE FOR SELECT TO public
  USING ((requested_by = auth.uid()));
CREATE POLICY "super_admin reads invoice audit" ON public.invoice_audit_log AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'super_admin'::text));
CREATE POLICY "Allow all operations" ON public.invoices AS PERMISSIVE FOR ALL TO public
  USING (true);
CREATE POLICY "Admin delete admissions" ON public.ipd_admissions AS PERMISSIVE FOR DELETE TO authenticated
  USING ((get_current_user_role() = 'admin'::text));
CREATE POLICY "Staff create admissions" ON public.ipd_admissions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text])));
CREATE POLICY "Staff update admissions" ON public.ipd_admissions AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text])))
  WITH CHECK ((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text])));
CREATE POLICY "Staff view admissions" ON public.ipd_admissions AS PERMISSIVE FOR SELECT TO authenticated
  USING (((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text, 'pharmacist'::text, 'head_pharmacist'::text, 'assistant_pharmacist'::text, 'salesman_pharmacist'::text, 'lab'::text, 'lab_staff'::text])) OR (patient_id = auth.uid())));
CREATE POLICY "Staff manage ipd charges" ON public.ipd_charges AS PERMISSIVE FOR ALL TO authenticated
  USING ((get_current_user_role() = ANY (ARRAY['admin'::text, 'finance'::text, 'receptionist'::text, 'staff'::text, 'doctor'::text, 'nurse'::text, 'ota'::text, 'ipd'::text])))
  WITH CHECK ((get_current_user_role() = ANY (ARRAY['admin'::text, 'finance'::text, 'receptionist'::text, 'staff'::text, 'doctor'::text, 'nurse'::text, 'ota'::text, 'ipd'::text])));
CREATE POLICY "Staff view ipd charges" ON public.ipd_charges AS PERMISSIVE FOR SELECT TO authenticated
  USING (((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text])) OR (EXISTS ( SELECT 1
   FROM ipd_admissions a
  WHERE ((a.id = ipd_charges.admission_id) AND (a.patient_id = auth.uid()))))));
CREATE POLICY "Allow authenticated users to insert ipd_doctor_payments" ON public.ipd_doctor_payments AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "Allow authenticated users to read ipd_doctor_payments" ON public.ipd_doctor_payments AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Allow authenticated users to update ipd_doctor_payments" ON public.ipd_doctor_payments AS PERMISSIVE FOR UPDATE TO authenticated
  USING (true);
CREATE POLICY "Finance manage ipd invoices" ON public.ipd_invoices AS PERMISSIVE FOR ALL TO authenticated
  USING ((get_current_user_role() = ANY (ARRAY['admin'::text, 'finance'::text, 'receptionist'::text, 'staff'::text, 'ipd'::text])))
  WITH CHECK ((get_current_user_role() = ANY (ARRAY['admin'::text, 'finance'::text, 'receptionist'::text, 'staff'::text, 'ipd'::text])));
CREATE POLICY "Staff view ipd invoices" ON public.ipd_invoices AS PERMISSIVE FOR SELECT TO authenticated
  USING (((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text])) OR (patient_id = auth.uid())));
CREATE POLICY "Admin delete ipd labs" ON public.ipd_lab_orders AS PERMISSIVE FOR DELETE TO authenticated
  USING ((get_current_user_role() = 'admin'::text));
CREATE POLICY "Clinical create ipd labs" ON public.ipd_lab_orders AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'ota'::text, 'staff'::text, 'ipd'::text, 'lab'::text, 'lab_staff'::text])));
CREATE POLICY "Lab update ipd labs" ON public.ipd_lab_orders AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'lab'::text, 'lab_staff'::text, 'nurse'::text, 'ota'::text, 'ipd'::text])))
  WITH CHECK ((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'lab'::text, 'lab_staff'::text, 'nurse'::text, 'ota'::text, 'ipd'::text])));
CREATE POLICY "Staff view ipd labs" ON public.ipd_lab_orders AS PERMISSIVE FOR SELECT TO authenticated
  USING (((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text, 'lab'::text, 'lab_staff'::text])) OR (EXISTS ( SELECT 1
   FROM ipd_admissions a
  WHERE ((a.id = ipd_lab_orders.admission_id) AND (a.patient_id = auth.uid()))))));
CREATE POLICY "Admin delete ipd meds" ON public.ipd_medicine_orders AS PERMISSIVE FOR DELETE TO authenticated
  USING ((get_current_user_role() = 'admin'::text));
CREATE POLICY "Clinical create ipd meds" ON public.ipd_medicine_orders AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'ota'::text, 'staff'::text, 'ipd'::text])));
CREATE POLICY "Pharmacy update ipd meds" ON public.ipd_medicine_orders AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'ota'::text, 'ipd'::text, 'pharmacist'::text, 'head_pharmacist'::text, 'assistant_pharmacist'::text, 'salesman_pharmacist'::text])))
  WITH CHECK ((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'ota'::text, 'ipd'::text, 'pharmacist'::text, 'head_pharmacist'::text, 'assistant_pharmacist'::text, 'salesman_pharmacist'::text])));
CREATE POLICY "Staff view ipd meds" ON public.ipd_medicine_orders AS PERMISSIVE FOR SELECT TO authenticated
  USING (((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text, 'pharmacist'::text, 'head_pharmacist'::text, 'assistant_pharmacist'::text, 'salesman_pharmacist'::text])) OR (EXISTS ( SELECT 1
   FROM ipd_admissions a
  WHERE ((a.id = ipd_medicine_orders.admission_id) AND (a.patient_id = auth.uid()))))));
CREATE POLICY "Admin delete chart" ON public.ipd_treatment_chart AS PERMISSIVE FOR DELETE TO authenticated
  USING ((get_current_user_role() = 'admin'::text));
CREATE POLICY "Clinical update chart" ON public.ipd_treatment_chart AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'ota'::text, 'staff'::text, 'ipd'::text])))
  WITH CHECK ((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'ota'::text, 'staff'::text, 'ipd'::text])));
CREATE POLICY "Clinical write chart" ON public.ipd_treatment_chart AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'ota'::text, 'staff'::text, 'ipd'::text])));
CREATE POLICY "Staff view chart" ON public.ipd_treatment_chart AS PERMISSIVE FOR SELECT TO authenticated
  USING (((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text])) OR (EXISTS ( SELECT 1
   FROM ipd_admissions a
  WHERE ((a.id = ipd_treatment_chart.admission_id) AND (a.patient_id = auth.uid()))))));
CREATE POLICY "Everyone can view lab inventory items" ON public.lab_inventory_items AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Inventory manager and admin can manage lab inventory items" ON public.lab_inventory_items AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['inventory_manager'::text, 'admin'::text, 'super_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['inventory_manager'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Lab can manage lab inventory items" ON public.lab_inventory_items AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'lab'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'lab'::text)))));
CREATE POLICY "Store can manage lab inventory items" ON public.lab_inventory_items AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'store'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'store'::text)))));
CREATE POLICY "Anyone authenticated can view parameter subranges" ON public.lab_parameter_subranges AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Staff can manage parameter subranges" ON public.lab_parameter_subranges AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'lab_technician'::text, 'staff'::text, 'doctor'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'lab_technician'::text, 'staff'::text, 'doctor'::text]))))));
CREATE POLICY "Manage pathology order items" ON public.lab_pathology_order_items AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text, 'lab'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text, 'lab'::text]))))));
CREATE POLICY "View pathology order items" ON public.lab_pathology_order_items AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Manage pathology orders" ON public.lab_pathology_orders AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text, 'lab'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text, 'lab'::text]))))));
CREATE POLICY "View pathology orders" ON public.lab_pathology_orders AS PERMISSIVE FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'staff'::text, 'finance'::text, 'doctor'::text]))))) OR (patient_id = auth.uid())));
CREATE POLICY "Lab and admin manage pathology results" ON public.lab_pathology_report_results AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text]))))));
CREATE POLICY "View pathology results follows reports" ON public.lab_pathology_report_results AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Lab and admin manage report test types" ON public.lab_pathology_report_test_types AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text]))))));
CREATE POLICY "View report test types follows reports" ON public.lab_pathology_report_test_types AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Authenticated users can view pathology reports" ON public.lab_pathology_reports AS PERMISSIVE FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'staff'::text, 'doctor'::text, 'finance'::text]))))) OR (patient_id = auth.uid())));
CREATE POLICY "Lab and admin can manage pathology reports" ON public.lab_pathology_reports AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text]))))));
CREATE POLICY "Admin can delete lab reports" ON public.lab_reports AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text]))))));
CREATE POLICY "Everyone can view lab reports" ON public.lab_reports AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Staff admin lab can insert lab reports" ON public.lab_reports AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text, 'lab'::text, 'doctor'::text]))))));
CREATE POLICY "Staff admin lab can update lab reports" ON public.lab_reports AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text, 'lab'::text, 'doctor'::text]))))));