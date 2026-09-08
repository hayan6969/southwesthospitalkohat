CREATE POLICY "manage lab batches" ON public.lab_stock_batches AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['lab'::text, 'inventory_manager'::text, 'store'::text, 'admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['lab'::text, 'inventory_manager'::text, 'store'::text, 'admin'::text]))))));
CREATE POLICY "view lab batches" ON public.lab_stock_batches AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "insert lab consumption" ON public.lab_stock_consumption AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "view lab consumption" ON public.lab_stock_consumption AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Managers can view all usage" ON public.lab_stock_usage AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['inventory_manager'::text, 'admin'::text, 'super_admin'::text, 'store'::text]))))));
CREATE POLICY "Users can record their own usage" ON public.lab_stock_usage AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((used_by = auth.uid()));
CREATE POLICY "Users can view their own usage" ON public.lab_stock_usage AS PERMISSIVE FOR SELECT TO authenticated
  USING ((used_by = auth.uid()));
CREATE POLICY "manage lab store batches" ON public.lab_store_batches AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['store'::text, 'inventory_manager'::text, 'admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['store'::text, 'inventory_manager'::text, 'admin'::text]))))));
CREATE POLICY "view lab store batches" ON public.lab_store_batches AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "manage test consumables" ON public.lab_test_consumables AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['lab'::text, 'inventory_manager'::text, 'admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['lab'::text, 'inventory_manager'::text, 'admin'::text]))))));
CREATE POLICY "view test consumables" ON public.lab_test_consumables AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Anyone authenticated can view lab test parameters" ON public.lab_test_parameters AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Staff can manage lab test parameters" ON public.lab_test_parameters AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'lab_technician'::text, 'staff'::text, 'doctor'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'lab_technician'::text, 'staff'::text, 'doctor'::text]))))));
CREATE POLICY "Anyone authenticated can view lab test types" ON public.lab_test_types AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Staff can manage lab test types" ON public.lab_test_types AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'lab_technician'::text, 'staff'::text, 'doctor'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'lab_technician'::text, 'staff'::text, 'doctor'::text]))))));
CREATE POLICY "Everyone can view lab tests" ON public.lab_tests AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Only admins can manage lab tests" ON public.lab_tests AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Allow all operations" ON public.medical_records AS PERMISSIVE FOR ALL TO public
  USING (true);
CREATE POLICY "Allow all operations on medicines" ON public.medicines AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Finance users can create miscellaneous income" ON public.miscellaneous_income AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can delete miscellaneous income" ON public.miscellaneous_income AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can update miscellaneous income" ON public.miscellaneous_income AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can view all miscellaneous income" ON public.miscellaneous_income AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Everyone can view OT expenses" ON public.ot_expenses AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Only admins can manage OT expenses" ON public.ot_expenses AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Everyone can view OT operations" ON public.ot_operations AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Only admins can manage OT operations" ON public.ot_operations AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Everyone can view OT rooms" ON public.ot_rooms AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Only admins can manage OT rooms" ON public.ot_rooms AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Doctors can update their own OT schedules" ON public.ot_schedules AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'doctor'::text) AND (ot_schedules.doctor_id = auth.uid())))));
CREATE POLICY "Doctors can view their own OT schedules" ON public.ot_schedules AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'doctor'::text) AND (ot_schedules.doctor_id = auth.uid())))));
CREATE POLICY "Everyone can view OT schedules" ON public.ot_schedules AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "OTA users can view and update OT schedules" ON public.ot_schedules AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'ota'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'ota'::text)))));
CREATE POLICY "Staff and admins can manage OT schedules" ON public.ot_schedules AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text]))))));
CREATE POLICY "Finance users can create overtime records" ON public.overtime_records AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can delete overtime records" ON public.overtime_records AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can update overtime records" ON public.overtime_records AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can view overtime records" ON public.overtime_records AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance and admin can manage patient discounts" ON public.patient_discounts AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Lab can read patient discounts" ON public.patient_discounts AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['lab'::text, 'finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Staff can consume patient discounts" ON public.patient_discounts AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'lab'::text, 'ota'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'lab'::text, 'ota'::text]))))));
CREATE POLICY "Staff can view patient discounts" ON public.patient_discounts AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'doctor'::text]))))));
CREATE POLICY "Patients can upload their own documents" ON public.patient_documents AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((patient_id IN ( SELECT patients.id
   FROM patients
  WHERE (patients.id = auth.uid()))));
CREATE POLICY "Patients can view their own documents" ON public.patient_documents AS PERMISSIVE FOR SELECT TO public
  USING ((patient_id IN ( SELECT patients.id
   FROM patients
  WHERE (patients.id = auth.uid()))));
CREATE POLICY "Staff can view all patient documents" ON public.patient_documents AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'admin'::text, 'super_admin'::text, 'doctor'::text]))))));
CREATE POLICY "Allow authenticated users all operations on patients" ON public.patients AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Prevent deletion of offline patient" ON public.patients AS PERMISSIVE FOR DELETE TO public
  USING ((id <> '00000000-0000-0000-0000-000000000001'::uuid));
CREATE POLICY "Finance users can create payroll records" ON public.payroll AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can delete payroll records" ON public.payroll AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can update payroll records" ON public.payroll AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can view all payroll records" ON public.payroll AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can create payroll templates" ON public.payroll_templates AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can delete payroll templates" ON public.payroll_templates AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can update payroll templates" ON public.payroll_templates AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can view all payroll templates" ON public.payroll_templates AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can create pharmacy account" ON public.pharmacy_account AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can update pharmacy account" ON public.pharmacy_account AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can view pharmacy account" ON public.pharmacy_account AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text, 'pharmacy'::text]))))));
CREATE POLICY "Finance users can create pharmacy expenses" ON public.pharmacy_expenses AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text, 'pharmacy'::text]))))));
CREATE POLICY "Finance users can delete pharmacy expenses" ON public.pharmacy_expenses AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can update pharmacy expenses" ON public.pharmacy_expenses AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can view pharmacy expenses" ON public.pharmacy_expenses AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text, 'pharmacy'::text]))))));
CREATE POLICY "Allow all operations" ON public.pharmacy_invoice_items AS PERMISSIVE FOR ALL TO public
  USING (true);
CREATE POLICY "Allow all operations" ON public.pharmacy_invoices AS PERMISSIVE FOR ALL TO public
  USING (true);
CREATE POLICY "Everyone can view postop progress entries" ON public.postop_progress_entries AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Medical staff can delete postop progress entries" ON public.postop_progress_entries AS PERMISSIVE FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'nursing'::text, 'doctor'::text, 'ota'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Medical staff can update postop progress entries" ON public.postop_progress_entries AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'nursing'::text, 'doctor'::text, 'ota'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Staff and nursing can create postop progress entries" ON public.postop_progress_entries AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'nursing'::text]))))));
CREATE POLICY "Doctors can create prescriptions" ON public.prescriptions AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = doctor_id));
CREATE POLICY "Doctors can update their prescriptions" ON public.prescriptions AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = doctor_id));
CREATE POLICY "Doctors can view their prescriptions" ON public.prescriptions AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = doctor_id));
CREATE POLICY "Patients can view their prescriptions" ON public.prescriptions AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = patient_id));
CREATE POLICY "Staff and admins can view all prescriptions" ON public.prescriptions AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text]))))));
CREATE POLICY "Admin users can delete non-admin profiles" ON public.profiles AS PERMISSIVE FOR DELETE TO public
  USING (((EXISTS ( SELECT 1
   FROM profiles profiles_1
  WHERE ((profiles_1.id = auth.uid()) AND (profiles_1.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))) AND (role <> 'admin'::text)));
CREATE POLICY "Admin users can update any profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles profiles_1
  WHERE ((profiles_1.id = auth.uid()) AND (profiles_1.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Authenticated users can insert profiles" ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "Authenticated users can view all profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Prevent deletion of offline profile" ON public.profiles AS PERMISSIVE FOR DELETE TO public
  USING ((id <> '00000000-0000-0000-0000-000000000001'::uuid));
CREATE POLICY "Users can update own profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = id));
CREATE POLICY "Users can view own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = id));
CREATE POLICY "Allow authenticated users to manage queue positions" ON public.queue_positions AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Finance users can create refunds" ON public.refunds AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can update refunds" ON public.refunds AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can view all refunds" ON public.refunds AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Everyone can view shifts" ON public.shifts AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Only admins can manage shifts" ON public.shifts AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Admin can delete shift closings" ON public.staff_shift_closings AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance and admin can update shift closings" ON public.staff_shift_closings AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance and admin can view all shift closings" ON public.staff_shift_closings AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Staff can create their own shift closings" ON public.staff_shift_closings AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((staff_id = auth.uid()));
CREATE POLICY "Staff can view their own shift closings" ON public.staff_shift_closings AS PERMISSIVE FOR SELECT TO public
  USING ((staff_id = auth.uid()));
CREATE POLICY "Doctors can create treatment chart entries" ON public.treatment_chart_entries AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['doctor'::text, 'admin'::text, 'super_admin'::text, 'ota'::text, 'staff'::text]))))));
CREATE POLICY "Doctors can delete treatment chart entries" ON public.treatment_chart_entries AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['doctor'::text, 'admin'::text, 'super_admin'::text, 'ota'::text, 'staff'::text]))))));
CREATE POLICY "Doctors can update treatment chart entries" ON public.treatment_chart_entries AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['doctor'::text, 'admin'::text, 'super_admin'::text, 'ota'::text, 'staff'::text]))))));
CREATE POLICY "Everyone can view treatment chart entries" ON public.treatment_chart_entries AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Medical staff can create treatment chart entries" ON public.treatment_chart_entries AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'nursing'::text, 'doctor'::text, 'ota'::text, 'admin'::text]))))));
CREATE POLICY "Medical staff can delete treatment chart entries" ON public.treatment_chart_entries AS PERMISSIVE FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'nursing'::text, 'doctor'::text, 'ota'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Medical staff can update treatment chart entries" ON public.treatment_chart_entries AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'nursing'::text, 'doctor'::text, 'ota'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Allow all operations" ON public.users AS PERMISSIVE FOR ALL TO public
  USING (true);
CREATE POLICY "Admins manage wards" ON public.wards AS PERMISSIVE FOR ALL TO authenticated
  USING ((get_current_user_role() = 'admin'::text))
  WITH CHECK ((get_current_user_role() = 'admin'::text));
CREATE POLICY "Anyone authenticated can view wards" ON public.wards AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Allow all operations on xray reports" ON public.xray_reports AS PERMISSIVE FOR ALL TO public
  USING (true);
CREATE POLICY "Everyone can view xray tests" ON public.xray_tests AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Only admins can manage xray tests" ON public.xray_tests AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));
