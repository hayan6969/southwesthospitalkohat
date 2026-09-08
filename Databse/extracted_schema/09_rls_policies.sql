CREATE POLICY "Admin can delete lab reports" ON public.lab_reports FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text]))))));

CREATE POLICY "Admin can delete shift closings" ON public.staff_shift_closings FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Admin delete admissions" ON public.ipd_admissions FOR DELETE TO authenticated USING ((public.get_current_user_role() = 'admin'::text));

CREATE POLICY "Admin delete chart" ON public.ipd_treatment_chart FOR DELETE TO authenticated USING ((public.get_current_user_role() = 'admin'::text));

CREATE POLICY "Admin delete ipd labs" ON public.ipd_lab_orders FOR DELETE TO authenticated USING ((public.get_current_user_role() = 'admin'::text));

CREATE POLICY "Admin delete ipd meds" ON public.ipd_medicine_orders FOR DELETE TO authenticated USING ((public.get_current_user_role() = 'admin'::text));

CREATE POLICY "Admin users can create emergency expenses" ON public.emergency_expenses FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Admin users can delete emergency expenses" ON public.emergency_expenses FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Admin users can delete non-admin profiles" ON public.profiles FOR DELETE USING (((EXISTS ( SELECT 1
   FROM public.profiles profiles_1
  WHERE ((profiles_1.id = auth.uid()) AND (profiles_1.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))) AND (role <> 'admin'::text)));

CREATE POLICY "Admin users can update any profile" ON public.profiles FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles profiles_1
  WHERE ((profiles_1.id = auth.uid()) AND (profiles_1.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Admin users can update emergency expenses" ON public.emergency_expenses FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Admins can manage hospital services" ON public.hospital_services USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Admins can read client error logs" ON public.client_error_logs FOR SELECT TO authenticated USING ((public.get_current_user_role() = 'admin'::text));

CREATE POLICY "Admins manage beds" ON public.beds TO authenticated USING ((public.get_current_user_role() = 'admin'::text)) WITH CHECK ((public.get_current_user_role() = 'admin'::text));

CREATE POLICY "Admins manage wards" ON public.wards TO authenticated USING ((public.get_current_user_role() = 'admin'::text)) WITH CHECK ((public.get_current_user_role() = 'admin'::text));

CREATE POLICY "Allow all operations" ON public.audit_logs USING (true);

CREATE POLICY "Allow all operations" ON public.departments USING (true);

CREATE POLICY "Allow all operations" ON public.doctors USING (true);

CREATE POLICY "Allow all operations" ON public.invoices USING (true);

CREATE POLICY "Allow all operations" ON public.medical_records USING (true);

CREATE POLICY "Allow all operations" ON public.pharmacy_invoice_items USING (true);

CREATE POLICY "Allow all operations" ON public.pharmacy_invoices USING (true);

CREATE POLICY "Allow all operations" ON public.users USING (true);

CREATE POLICY "Allow all operations on medicines" ON public.medicines USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on xray reports" ON public.xray_reports USING (true);

CREATE POLICY "Allow authenticated users all operations on patients" ON public.patients TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert ipd_doctor_payments" ON public.ipd_doctor_payments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage queue positions" ON public.queue_positions TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read ipd_doctor_payments" ON public.ipd_doctor_payments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to update ipd_doctor_payments" ON public.ipd_doctor_payments FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to view doctor availability" ON public.doctor_availability FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to view doctor daily status" ON public.doctor_daily_status FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow staff to manage appointment payments" ON public.appointments FOR UPDATE USING (true);

CREATE POLICY "Anyone authenticated can view beds" ON public.beds FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone authenticated can view lab test parameters" ON public.lab_test_parameters FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone authenticated can view lab test types" ON public.lab_test_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone authenticated can view parameter subranges" ON public.lab_parameter_subranges FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone authenticated can view wards" ON public.wards FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone can insert client error logs" ON public.client_error_logs FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "Anyone can view doctor specific schedules" ON public.doctor_specific_schedules FOR SELECT USING (true);

CREATE POLICY "Anyone can view doctor working hours" ON public.doctor_working_hours FOR SELECT USING (true);

CREATE POLICY "Anyone can view hospital settings" ON public.hospital_settings FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read doctor_daily_status" ON public.doctor_daily_status FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view pathology reports" ON public.lab_pathology_reports FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'staff'::text, 'doctor'::text, 'finance'::text]))))) OR (patient_id = auth.uid())));

CREATE POLICY "Clinical create ipd labs" ON public.ipd_lab_orders FOR INSERT TO authenticated WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'ota'::text, 'staff'::text, 'ipd'::text, 'lab'::text, 'lab_staff'::text])));

CREATE POLICY "Clinical create ipd meds" ON public.ipd_medicine_orders FOR INSERT TO authenticated WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'ota'::text, 'staff'::text, 'ipd'::text])));

CREATE POLICY "Clinical staff manage anesthesia_notes" ON public.anesthesia_notes USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'doctor'::text, 'ota'::text, 'staff'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'doctor'::text, 'ota'::text, 'staff'::text]))))));

CREATE POLICY "Clinical update chart" ON public.ipd_treatment_chart FOR UPDATE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'ota'::text, 'staff'::text, 'ipd'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'ota'::text, 'staff'::text, 'ipd'::text])));

CREATE POLICY "Clinical write chart" ON public.ipd_treatment_chart FOR INSERT TO authenticated WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'ota'::text, 'staff'::text, 'ipd'::text])));

CREATE POLICY "Doctors can create prescriptions" ON public.prescriptions FOR INSERT WITH CHECK ((auth.uid() = doctor_id));

CREATE POLICY "Doctors can create treatment chart entries" ON public.treatment_chart_entries FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['doctor'::text, 'admin'::text, 'super_admin'::text, 'ota'::text, 'staff'::text]))))));

CREATE POLICY "Doctors can delete treatment chart entries" ON public.treatment_chart_entries FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['doctor'::text, 'admin'::text, 'super_admin'::text, 'ota'::text, 'staff'::text]))))));

CREATE POLICY "Doctors can manage their own availability" ON public.doctor_availability USING ((auth.uid() = doctor_id)) WITH CHECK ((auth.uid() = doctor_id));

CREATE POLICY "Doctors can manage their own daily status" ON public.doctor_daily_status USING ((auth.uid() = doctor_id)) WITH CHECK ((auth.uid() = doctor_id));

CREATE POLICY "Doctors can manage their own specific schedules" ON public.doctor_specific_schedules USING ((auth.uid() = doctor_id)) WITH CHECK ((auth.uid() = doctor_id));

CREATE POLICY "Doctors can manage their own working hours" ON public.doctor_working_hours USING ((auth.uid() = doctor_id)) WITH CHECK ((auth.uid() = doctor_id));

CREATE POLICY "Doctors can update their own OT schedules" ON public.ot_schedules FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'doctor'::text) AND (ot_schedules.doctor_id = auth.uid())))));

CREATE POLICY "Doctors can update their own appointments" ON public.appointments FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'doctor'::text) AND (appointments.doctor_id = auth.uid())))));

CREATE POLICY "Doctors can update their own status" ON public.doctor_daily_status FOR UPDATE TO authenticated USING ((doctor_id = auth.uid()));

CREATE POLICY "Doctors can update their prescriptions" ON public.prescriptions FOR UPDATE USING ((auth.uid() = doctor_id));

CREATE POLICY "Doctors can update treatment chart entries" ON public.treatment_chart_entries FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['doctor'::text, 'admin'::text, 'super_admin'::text, 'ota'::text, 'staff'::text]))))));

CREATE POLICY "Doctors can upsert their own status" ON public.doctor_daily_status FOR INSERT TO authenticated WITH CHECK ((doctor_id = auth.uid()));

CREATE POLICY "Doctors can view their own OT schedules" ON public.ot_schedules FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'doctor'::text) AND (ot_schedules.doctor_id = auth.uid())))));

CREATE POLICY "Doctors can view their own appointments" ON public.appointments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'doctor'::text) AND (appointments.doctor_id = auth.uid())))));

CREATE POLICY "Doctors can view their own payments" ON public.doctor_payments FOR SELECT USING ((doctor_id = auth.uid()));

CREATE POLICY "Doctors can view their prescriptions" ON public.prescriptions FOR SELECT USING ((auth.uid() = doctor_id));

CREATE POLICY "Everyone can view OT expenses" ON public.ot_expenses FOR SELECT USING (true);

CREATE POLICY "Everyone can view OT operations" ON public.ot_operations FOR SELECT USING (true);

CREATE POLICY "Everyone can view OT rooms" ON public.ot_rooms FOR SELECT USING (true);

CREATE POLICY "Everyone can view OT schedules" ON public.ot_schedules FOR SELECT USING (true);

CREATE POLICY "Everyone can view assessment entries" ON public.assessment_entries FOR SELECT USING (true);

CREATE POLICY "Everyone can view hospital services" ON public.hospital_services FOR SELECT USING (true);

CREATE POLICY "Everyone can view inventory items" ON public.inventory_items FOR SELECT USING (true);

CREATE POLICY "Everyone can view lab inventory items" ON public.lab_inventory_items FOR SELECT USING (true);

CREATE POLICY "Everyone can view lab reports" ON public.lab_reports FOR SELECT USING (true);

CREATE POLICY "Everyone can view lab tests" ON public.lab_tests FOR SELECT USING (true);

CREATE POLICY "Everyone can view postop progress entries" ON public.postop_progress_entries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Everyone can view shifts" ON public.shifts FOR SELECT USING (true);

CREATE POLICY "Everyone can view treatment chart entries" ON public.treatment_chart_entries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Everyone can view xray tests" ON public.xray_tests FOR SELECT USING (true);

CREATE POLICY "Finance and admin can insert finance settings" ON public.finance_settings FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance and admin can manage patient discounts" ON public.patient_discounts USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance and admin can update finance settings" ON public.finance_settings FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance and admin can update shift closings" ON public.staff_shift_closings FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance and admin can view all shift closings" ON public.staff_shift_closings FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance and admin can view finance settings" ON public.finance_settings FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance and admin users can view all emergency expenses" ON public.emergency_expenses FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text, 'staff'::text]))))));

CREATE POLICY "Finance and pharmacy users can create expenses" ON public.expenses FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text, 'pharmacy'::text]))))));

CREATE POLICY "Finance manage ipd invoices" ON public.ipd_invoices TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'finance'::text, 'receptionist'::text, 'staff'::text, 'ipd'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'finance'::text, 'receptionist'::text, 'staff'::text, 'ipd'::text])));

CREATE POLICY "Finance users can create daily closings" ON public.daily_closings FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can create doctor payments" ON public.doctor_payments FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can create expenses" ON public.expenses FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can create hospital closing balance" ON public.hospital_closing_balance FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can create miscellaneous income" ON public.miscellaneous_income FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can create overtime records" ON public.overtime_records FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can create payroll records" ON public.payroll FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can create payroll templates" ON public.payroll_templates FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can create pharmacy account" ON public.pharmacy_account FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can create pharmacy expenses" ON public.pharmacy_expenses FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text, 'pharmacy'::text]))))));

CREATE POLICY "Finance users can create refunds" ON public.refunds FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can delete expenses" ON public.expenses FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can delete miscellaneous income" ON public.miscellaneous_income FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can delete overtime records" ON public.overtime_records FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can delete payroll records" ON public.payroll FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can delete payroll templates" ON public.payroll_templates FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can delete pharmacy expenses" ON public.pharmacy_expenses FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can update daily closings" ON public.daily_closings FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can update doctor payments" ON public.doctor_payments FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can update expenses" ON public.expenses FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can update hospital closing balance" ON public.hospital_closing_balance FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can update miscellaneous income" ON public.miscellaneous_income FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can update overtime records" ON public.overtime_records FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can update payroll records" ON public.payroll FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can update payroll templates" ON public.payroll_templates FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can update pharmacy account" ON public.pharmacy_account FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can update pharmacy expenses" ON public.pharmacy_expenses FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can update refunds" ON public.refunds FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can view all daily closings" ON public.daily_closings FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can view all doctor payments" ON public.doctor_payments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can view all expenses" ON public.expenses FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can view all miscellaneous income" ON public.miscellaneous_income FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can view all payroll records" ON public.payroll FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can view all payroll templates" ON public.payroll_templates FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can view all refunds" ON public.refunds FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can view hospital closing balance" ON public.hospital_closing_balance FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can view overtime records" ON public.overtime_records FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Finance users can view pharmacy account" ON public.pharmacy_account FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text, 'pharmacy'::text]))))));

CREATE POLICY "Finance users can view pharmacy expenses" ON public.pharmacy_expenses FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text, 'pharmacy'::text]))))));

CREATE POLICY "Inventory manager and admin can manage inventory items" ON public.inventory_items USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['inventory_manager'::text, 'admin'::text, 'super_admin'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['inventory_manager'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Inventory manager and admin can manage lab inventory items" ON public.lab_inventory_items USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['inventory_manager'::text, 'admin'::text, 'super_admin'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['inventory_manager'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Inventory manager can update requests" ON public.inventory_requests FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['inventory_manager'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Inventory manager can view all requests" ON public.inventory_requests FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['inventory_manager'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Lab and admin can manage pathology reports" ON public.lab_pathology_reports TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text]))))));

CREATE POLICY "Lab and admin manage pathology results" ON public.lab_pathology_report_results TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text]))))));

CREATE POLICY "Lab and admin manage report test types" ON public.lab_pathology_report_test_types TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text]))))));

CREATE POLICY "Lab can manage lab inventory items" ON public.lab_inventory_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'lab'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'lab'::text)))));

CREATE POLICY "Lab can read patient discounts" ON public.patient_discounts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['lab'::text, 'finance'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Lab update ipd labs" ON public.ipd_lab_orders FOR UPDATE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'lab'::text, 'lab_staff'::text, 'nurse'::text, 'ota'::text, 'ipd'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'lab'::text, 'lab_staff'::text, 'nurse'::text, 'ota'::text, 'ipd'::text])));

CREATE POLICY "Manage pathology order items" ON public.lab_pathology_order_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text, 'lab'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text, 'lab'::text]))))));

CREATE POLICY "Manage pathology orders" ON public.lab_pathology_orders TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text, 'lab'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text, 'lab'::text]))))));

CREATE POLICY "Managers can view all usage" ON public.lab_stock_usage FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['inventory_manager'::text, 'admin'::text, 'super_admin'::text, 'store'::text]))))));

CREATE POLICY "Medical staff can create treatment chart entries" ON public.treatment_chart_entries FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'nursing'::text, 'doctor'::text, 'ota'::text, 'admin'::text]))))));

CREATE POLICY "Medical staff can delete assessment entries" ON public.assessment_entries FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'doctor'::text, 'ota'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Medical staff can delete postop progress entries" ON public.postop_progress_entries FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'nursing'::text, 'doctor'::text, 'ota'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Medical staff can delete treatment chart entries" ON public.treatment_chart_entries FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'nursing'::text, 'doctor'::text, 'ota'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Medical staff can update assessment entries" ON public.assessment_entries FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'doctor'::text, 'ota'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Medical staff can update postop progress entries" ON public.postop_progress_entries FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'nursing'::text, 'doctor'::text, 'ota'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Medical staff can update treatment chart entries" ON public.treatment_chart_entries FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'nursing'::text, 'doctor'::text, 'ota'::text, 'admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Nurses view anesthesia_notes" ON public.anesthesia_notes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['nursing'::text, 'nurse'::text, 'finance'::text]))))));

CREATE POLICY "Nursing staff can create assessment entries" ON public.assessment_entries FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'nursing'::text]))))));

CREATE POLICY "OTA users can view and update OT schedules" ON public.ot_schedules USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'ota'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'ota'::text)))));

CREATE POLICY "Only admins can manage OT expenses" ON public.ot_expenses USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Only admins can manage OT operations" ON public.ot_operations USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Only admins can manage OT rooms" ON public.ot_rooms USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Only admins can manage lab tests" ON public.lab_tests USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Only admins can manage shifts" ON public.shifts USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Only admins can manage xray tests" ON public.xray_tests USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Only admins can modify hospital settings" ON public.hospital_settings USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Patients can create their own appointments" ON public.appointments FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'patient'::text) AND (appointments.patient_id = auth.uid())))));

CREATE POLICY "Patients can upload their own documents" ON public.patient_documents FOR INSERT WITH CHECK ((patient_id IN ( SELECT patients.id
   FROM public.patients
  WHERE (patients.id = auth.uid()))));

CREATE POLICY "Patients can view their own appointments" ON public.appointments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'patient'::text) AND (appointments.patient_id = auth.uid())))));

CREATE POLICY "Patients can view their own documents" ON public.patient_documents FOR SELECT USING ((patient_id IN ( SELECT patients.id
   FROM public.patients
  WHERE (patients.id = auth.uid()))));

CREATE POLICY "Patients can view their prescriptions" ON public.prescriptions FOR SELECT USING ((auth.uid() = patient_id));

CREATE POLICY "Pharmacy update ipd meds" ON public.ipd_medicine_orders FOR UPDATE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'ota'::text, 'ipd'::text, 'pharmacist'::text, 'head_pharmacist'::text, 'assistant_pharmacist'::text, 'salesman_pharmacist'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'ota'::text, 'ipd'::text, 'pharmacist'::text, 'head_pharmacist'::text, 'assistant_pharmacist'::text, 'salesman_pharmacist'::text])));

CREATE POLICY "Prevent deletion of offline patient" ON public.patients FOR DELETE USING ((id <> '00000000-0000-0000-0000-000000000001'::uuid));

CREATE POLICY "Prevent deletion of offline profile" ON public.profiles FOR DELETE USING ((id <> '00000000-0000-0000-0000-000000000001'::uuid));

CREATE POLICY "Staff admin lab can insert lab reports" ON public.lab_reports FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text, 'lab'::text, 'doctor'::text]))))));

CREATE POLICY "Staff admin lab can update lab reports" ON public.lab_reports FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text, 'lab'::text, 'doctor'::text]))))));

CREATE POLICY "Staff and admins can manage OT schedules" ON public.ot_schedules USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text]))))));

CREATE POLICY "Staff and admins can manage all appointments" ON public.appointments USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text]))))));

CREATE POLICY "Staff and admins can view all appointments" ON public.appointments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text]))))));

CREATE POLICY "Staff and admins can view all prescriptions" ON public.prescriptions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text]))))));

CREATE POLICY "Staff and nursing can create postop progress entries" ON public.postop_progress_entries FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'nursing'::text]))))));

CREATE POLICY "Staff can consume patient discounts" ON public.patient_discounts FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'lab'::text, 'ota'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'lab'::text, 'ota'::text]))))));

CREATE POLICY "Staff can create their own shift closings" ON public.staff_shift_closings FOR INSERT WITH CHECK ((staff_id = auth.uid()));

CREATE POLICY "Staff can manage lab test parameters" ON public.lab_test_parameters TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'lab_technician'::text, 'staff'::text, 'doctor'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'lab_technician'::text, 'staff'::text, 'doctor'::text]))))));

CREATE POLICY "Staff can manage lab test types" ON public.lab_test_types TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'lab_technician'::text, 'staff'::text, 'doctor'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'lab_technician'::text, 'staff'::text, 'doctor'::text]))))));

CREATE POLICY "Staff can manage parameter subranges" ON public.lab_parameter_subranges TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'lab_technician'::text, 'staff'::text, 'doctor'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'lab_technician'::text, 'staff'::text, 'doctor'::text]))))));

CREATE POLICY "Staff can view all patient documents" ON public.patient_documents FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'admin'::text, 'super_admin'::text, 'doctor'::text]))))));

CREATE POLICY "Staff can view patient discounts" ON public.patient_discounts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'doctor'::text]))))));

CREATE POLICY "Staff can view their own shift closings" ON public.staff_shift_closings FOR SELECT USING ((staff_id = auth.uid()));

CREATE POLICY "Staff create admissions" ON public.ipd_admissions FOR INSERT TO authenticated WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text])));

CREATE POLICY "Staff manage ipd charges" ON public.ipd_charges TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'finance'::text, 'receptionist'::text, 'staff'::text, 'doctor'::text, 'nurse'::text, 'ota'::text, 'ipd'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'finance'::text, 'receptionist'::text, 'staff'::text, 'doctor'::text, 'nurse'::text, 'ota'::text, 'ipd'::text])));

CREATE POLICY "Staff update admissions" ON public.ipd_admissions FOR UPDATE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text])));

CREATE POLICY "Staff update bed status" ON public.beds FOR UPDATE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text])));

CREATE POLICY "Staff view admissions" ON public.ipd_admissions FOR SELECT TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text, 'pharmacist'::text, 'head_pharmacist'::text, 'assistant_pharmacist'::text, 'salesman_pharmacist'::text, 'lab'::text, 'lab_staff'::text])) OR (patient_id = auth.uid())));

CREATE POLICY "Staff view chart" ON public.ipd_treatment_chart FOR SELECT TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text])) OR (EXISTS ( SELECT 1
   FROM public.ipd_admissions a
  WHERE ((a.id = ipd_treatment_chart.admission_id) AND (a.patient_id = auth.uid()))))));

CREATE POLICY "Staff view ipd charges" ON public.ipd_charges FOR SELECT TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text])) OR (EXISTS ( SELECT 1
   FROM public.ipd_admissions a
  WHERE ((a.id = ipd_charges.admission_id) AND (a.patient_id = auth.uid()))))));

CREATE POLICY "Staff view ipd invoices" ON public.ipd_invoices FOR SELECT TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text])) OR (patient_id = auth.uid())));

CREATE POLICY "Staff view ipd labs" ON public.ipd_lab_orders FOR SELECT TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text, 'lab'::text, 'lab_staff'::text])) OR (EXISTS ( SELECT 1
   FROM public.ipd_admissions a
  WHERE ((a.id = ipd_lab_orders.admission_id) AND (a.patient_id = auth.uid()))))));

CREATE POLICY "Staff view ipd meds" ON public.ipd_medicine_orders FOR SELECT TO authenticated USING (((public.get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text, 'pharmacist'::text, 'head_pharmacist'::text, 'assistant_pharmacist'::text, 'salesman_pharmacist'::text])) OR (EXISTS ( SELECT 1
   FROM public.ipd_admissions a
  WHERE ((a.id = ipd_medicine_orders.admission_id) AND (a.patient_id = auth.uid()))))));

CREATE POLICY "Store can manage inventory items" ON public.inventory_items USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'store'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'store'::text)))));

CREATE POLICY "Store can manage lab inventory items" ON public.lab_inventory_items USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'store'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'store'::text)))));

CREATE POLICY "Store can update approved requests" ON public.inventory_requests FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'store'::text)))));

CREATE POLICY "Store can view approved requests" ON public.inventory_requests FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'store'::text)))));

CREATE POLICY "Users can create requests" ON public.inventory_requests FOR INSERT WITH CHECK ((requested_by = auth.uid()));

CREATE POLICY "Users can record their own usage" ON public.lab_stock_usage FOR INSERT TO authenticated WITH CHECK ((used_by = auth.uid()));

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));

CREATE POLICY "Users can view their own requests" ON public.inventory_requests FOR SELECT USING ((requested_by = auth.uid()));

CREATE POLICY "Users can view their own usage" ON public.lab_stock_usage FOR SELECT TO authenticated USING ((used_by = auth.uid()));

CREATE POLICY "View pathology order items" ON public.lab_pathology_order_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "View pathology orders" ON public.lab_pathology_orders FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'staff'::text, 'finance'::text, 'doctor'::text]))))) OR (patient_id = auth.uid())));

CREATE POLICY "View pathology results follows reports" ON public.lab_pathology_report_results FOR SELECT TO authenticated USING (true);

CREATE POLICY "View report test types follows reports" ON public.lab_pathology_report_test_types FOR SELECT TO authenticated USING (true);

ALTER TABLE public.anesthesia_notes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.assessment_entries ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.beds ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.client_error_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.daily_closings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.doctor_daily_status ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.doctor_payments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.doctor_specific_schedules ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.doctor_working_hours ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.emergency_expenses ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.finance_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.hospital_closing_balance ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.hospital_services ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.hospital_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insert lab consumption" ON public.lab_stock_consumption FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.inventory_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.invoice_audit_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ipd_admissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ipd_charges ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ipd_doctor_payments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ipd_invoices ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ipd_lab_orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ipd_medicine_orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ipd_treatment_chart ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lab_inventory_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lab_parameter_subranges ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lab_pathology_order_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lab_pathology_orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lab_pathology_report_results ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lab_pathology_report_test_types ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lab_pathology_reports ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lab_reports ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lab_stock_batches ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lab_stock_consumption ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lab_stock_usage ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lab_store_batches ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lab_test_consumables ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lab_test_parameters ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lab_test_types ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "manage lab batches" ON public.lab_stock_batches TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['lab'::text, 'inventory_manager'::text, 'store'::text, 'admin'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['lab'::text, 'inventory_manager'::text, 'store'::text, 'admin'::text]))))));

CREATE POLICY "manage lab store batches" ON public.lab_store_batches TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['store'::text, 'inventory_manager'::text, 'admin'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['store'::text, 'inventory_manager'::text, 'admin'::text]))))));

CREATE POLICY "manage test consumables" ON public.lab_test_consumables TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['lab'::text, 'inventory_manager'::text, 'admin'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['lab'::text, 'inventory_manager'::text, 'admin'::text]))))));

ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.miscellaneous_income ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ot_expenses ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ot_operations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ot_rooms ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ot_schedules ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.overtime_records ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.patient_discounts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payroll_templates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.pharmacy_account ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.pharmacy_expenses ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.pharmacy_invoice_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.pharmacy_invoices ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.postop_progress_entries ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.queue_positions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.staff_shift_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin reads invoice audit" ON public.invoice_audit_log FOR SELECT TO authenticated USING ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'super_admin'::text));

ALTER TABLE public.treatment_chart_entries ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view lab batches" ON public.lab_stock_batches FOR SELECT TO authenticated USING (true);

CREATE POLICY "view lab consumption" ON public.lab_stock_consumption FOR SELECT TO authenticated USING (true);

CREATE POLICY "view lab store batches" ON public.lab_store_batches FOR SELECT TO authenticated USING (true);

CREATE POLICY "view test consumables" ON public.lab_test_consumables FOR SELECT TO authenticated USING (true);

ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.xray_reports ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.xray_tests ENABLE ROW LEVEL SECURITY;
