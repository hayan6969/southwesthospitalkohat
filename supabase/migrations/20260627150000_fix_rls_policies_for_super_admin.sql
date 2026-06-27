-- =============================================
-- Fix all RLS policies to include super_admin
-- wherever admin was allowed.
-- We drop the existing policy and recreate it
-- with 'super_admin' added to the role list.
-- =============================================

-- 1. profiles
DROP POLICY IF EXISTS "Admin users can update any profile" ON public.profiles;
CREATE POLICY "Admin users can update any profile" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Admin users can delete non-admin profiles" ON public.profiles;
CREATE POLICY "Admin users can delete non-admin profiles" ON public.profiles
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    AND role != 'admin'
  );

-- 2. appointments
DROP POLICY IF EXISTS "Staff and admins can view all appointments" ON public.appointments;
CREATE POLICY "Staff and admins can view all appointments" ON public.appointments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'staff'))
  );

DROP POLICY IF EXISTS "Staff and admins can manage all appointments" ON public.appointments;
CREATE POLICY "Staff and admins can manage all appointments" ON public.appointments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'staff'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'staff'))
  );

-- 3. lab_tests
DROP POLICY IF EXISTS "Only admins can manage lab tests" ON public.lab_tests;
CREATE POLICY "Only admins can manage lab tests" ON public.lab_tests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- 4. prescriptions
DROP POLICY IF EXISTS "Staff and admins can view all prescriptions" ON public.prescriptions;
CREATE POLICY "Staff and admins can view all prescriptions" ON public.prescriptions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'staff'))
  );

-- 5. pharmacy_account
DROP POLICY IF EXISTS "Finance users can view pharmacy account" ON public.pharmacy_account;
CREATE POLICY "Finance users can view pharmacy account" ON public.pharmacy_account
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin', 'pharmacy'))
  );

DROP POLICY IF EXISTS "Finance users can create pharmacy account" ON public.pharmacy_account;
CREATE POLICY "Finance users can create pharmacy account" ON public.pharmacy_account
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Finance users can update pharmacy account" ON public.pharmacy_account;
CREATE POLICY "Finance users can update pharmacy account" ON public.pharmacy_account
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

-- 6. pharmacy_expenses
DROP POLICY IF EXISTS "Finance users can view pharmacy expenses" ON public.pharmacy_expenses;
CREATE POLICY "Finance users can view pharmacy expenses" ON public.pharmacy_expenses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin', 'pharmacy'))
  );

DROP POLICY IF EXISTS "Finance users can create pharmacy expenses" ON public.pharmacy_expenses;
CREATE POLICY "Finance users can create pharmacy expenses" ON public.pharmacy_expenses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin', 'pharmacy'))
  );

DROP POLICY IF EXISTS "Finance users can update pharmacy expenses" ON public.pharmacy_expenses;
CREATE POLICY "Finance users can update pharmacy expenses" ON public.pharmacy_expenses
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Finance users can delete pharmacy expenses" ON public.pharmacy_expenses;
CREATE POLICY "Finance users can delete pharmacy expenses" ON public.pharmacy_expenses
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

-- 7. ot_operations
DROP POLICY IF EXISTS "Only admins can manage OT operations" ON public.ot_operations;
CREATE POLICY "Only admins can manage OT operations" ON public.ot_operations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
  );

-- 8. ot_expenses
DROP POLICY IF EXISTS "Only admins can manage OT expenses" ON public.ot_expenses;
CREATE POLICY "Only admins can manage OT expenses" ON public.ot_expenses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
  );

-- 9. ot_rooms
DROP POLICY IF EXISTS "Only admins can manage OT rooms" ON public.ot_rooms;
CREATE POLICY "Only admins can manage OT rooms" ON public.ot_rooms
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
  );

-- 10. ot_schedules
DROP POLICY IF EXISTS "Staff and admins can manage OT schedules" ON public.ot_schedules;
CREATE POLICY "Staff and admins can manage OT schedules" ON public.ot_schedules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'staff'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'staff'))
  );

-- 11. xray_tests
DROP POLICY IF EXISTS "Only admins can manage xray tests" ON public.xray_tests;
CREATE POLICY "Only admins can manage xray tests" ON public.xray_tests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin'))
  );

-- 12. expenses
DROP POLICY IF EXISTS "Finance users can view all expenses" ON public.expenses;
CREATE POLICY "Finance users can view all expenses" ON public.expenses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Finance and pharmacy users can create expenses" ON public.expenses;
CREATE POLICY "Finance and pharmacy users can create expenses" ON public.expenses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text, 'pharmacy'::text]))
  );

DROP POLICY IF EXISTS "Finance users can create expenses" ON public.expenses;
CREATE POLICY "Finance users can create expenses" ON public.expenses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Finance users can update expenses" ON public.expenses;
CREATE POLICY "Finance users can update expenses" ON public.expenses
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Finance users can delete expenses" ON public.expenses;
CREATE POLICY "Finance users can delete expenses" ON public.expenses
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

-- 13. refunds
DROP POLICY IF EXISTS "Finance users can view all refunds" ON public.refunds;
CREATE POLICY "Finance users can view all refunds" ON public.refunds
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Finance users can create refunds" ON public.refunds;
CREATE POLICY "Finance users can create refunds" ON public.refunds
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Finance users can update refunds" ON public.refunds;
CREATE POLICY "Finance users can update refunds" ON public.refunds
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

-- 14. payroll
DROP POLICY IF EXISTS "Finance users can view all payroll records" ON public.payroll;
CREATE POLICY "Finance users can view all payroll records" ON public.payroll
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Finance users can create payroll records" ON public.payroll;
CREATE POLICY "Finance users can create payroll records" ON public.payroll
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Finance users can update payroll records" ON public.payroll;
CREATE POLICY "Finance users can update payroll records" ON public.payroll
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Finance users can delete payroll records" ON public.payroll;
CREATE POLICY "Finance users can delete payroll records" ON public.payroll
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

-- 15. payroll_templates
DROP POLICY IF EXISTS "Finance users can view all payroll templates" ON public.payroll_templates;
CREATE POLICY "Finance users can view all payroll templates" ON public.payroll_templates
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Finance users can create payroll templates" ON public.payroll_templates;
CREATE POLICY "Finance users can create payroll templates" ON public.payroll_templates
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Finance users can update payroll templates" ON public.payroll_templates;
CREATE POLICY "Finance users can update payroll templates" ON public.payroll_templates
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Finance users can delete payroll templates" ON public.payroll_templates;
CREATE POLICY "Finance users can delete payroll templates" ON public.payroll_templates
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

-- 16. doctor_payments
DROP POLICY IF EXISTS "Finance users can view all doctor payments" ON public.doctor_payments;
CREATE POLICY "Finance users can view all doctor payments" ON public.doctor_payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Finance users can create doctor payments" ON public.doctor_payments;
CREATE POLICY "Finance users can create doctor payments" ON public.doctor_payments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Finance users can update doctor payments" ON public.doctor_payments;
CREATE POLICY "Finance users can update doctor payments" ON public.doctor_payments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

-- 17. daily_closings
DROP POLICY IF EXISTS "Finance users can view all daily closings" ON public.daily_closings;
CREATE POLICY "Finance users can view all daily closings" ON public.daily_closings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role = ANY(ARRAY['finance', 'admin', 'super_admin']))
  );

DROP POLICY IF EXISTS "Finance users can create daily closings" ON public.daily_closings;
CREATE POLICY "Finance users can create daily closings" ON public.daily_closings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role = ANY(ARRAY['finance', 'admin', 'super_admin']))
  );

-- 18. hospital_closing_balance
DROP POLICY IF EXISTS "Finance users can view hospital closing balance" ON public.hospital_closing_balance;
CREATE POLICY "Finance users can view hospital closing balance" ON public.hospital_closing_balance
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Finance users can create hospital closing balance" ON public.hospital_closing_balance;
CREATE POLICY "Finance users can create hospital closing balance" ON public.hospital_closing_balance
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Finance users can update hospital closing balance" ON public.hospital_closing_balance;
CREATE POLICY "Finance users can update hospital closing balance" ON public.hospital_closing_balance
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

-- 19. miscellaneous_income
DROP POLICY IF EXISTS "Finance users can view all miscellaneous income" ON public.miscellaneous_income;
CREATE POLICY "Finance users can view all miscellaneous income" ON public.miscellaneous_income
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
      AND role IN ('finance', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Finance users can create miscellaneous income" ON public.miscellaneous_income;
CREATE POLICY "Finance users can create miscellaneous income" ON public.miscellaneous_income
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
      AND role IN ('finance', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Finance users can update miscellaneous income" ON public.miscellaneous_income;
CREATE POLICY "Finance users can update miscellaneous income" ON public.miscellaneous_income
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
      AND role IN ('finance', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Finance users can delete miscellaneous income" ON public.miscellaneous_income;
CREATE POLICY "Finance users can delete miscellaneous income" ON public.miscellaneous_income
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
      AND role IN ('finance', 'admin', 'super_admin'))
  );

-- 20. emergency_expenses
DROP POLICY IF EXISTS "Finance and admin users can view all emergency expenses" ON public.emergency_expenses;
CREATE POLICY "Finance and admin users can view all emergency expenses" ON public.emergency_expenses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
      AND role IN ('finance', 'admin', 'super_admin', 'staff'))
  );

DROP POLICY IF EXISTS "Admin users can create emergency expenses" ON public.emergency_expenses;
CREATE POLICY "Admin users can create emergency expenses" ON public.emergency_expenses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Admin users can update emergency expenses" ON public.emergency_expenses;
CREATE POLICY "Admin users can update emergency expenses" ON public.emergency_expenses
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Admin users can delete emergency expenses" ON public.emergency_expenses;
CREATE POLICY "Admin users can delete emergency expenses" ON public.emergency_expenses
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- 21. hospital_settings
DROP POLICY IF EXISTS "Only admins can modify hospital settings" ON public.hospital_settings;
CREATE POLICY "Only admins can modify hospital settings" ON public.hospital_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- 22. patient_documents
DROP POLICY IF EXISTS "Staff can view all patient documents" ON public.patient_documents;
CREATE POLICY "Staff can view all patient documents" ON public.patient_documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('staff', 'admin', 'super_admin', 'doctor'))
  );

-- 23. treatment_chart_entries
DROP POLICY IF EXISTS "Doctors can create treatment chart entries" ON public.treatment_chart_entries;
CREATE POLICY "Doctors can create treatment chart entries" ON public.treatment_chart_entries
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('doctor', 'admin', 'super_admin', 'ota', 'staff'))
  );

DROP POLICY IF EXISTS "Doctors can update treatment chart entries" ON public.treatment_chart_entries;
CREATE POLICY "Doctors can update treatment chart entries" ON public.treatment_chart_entries
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('doctor', 'admin', 'super_admin', 'ota', 'staff'))
  );

DROP POLICY IF EXISTS "Doctors can delete treatment chart entries" ON public.treatment_chart_entries;
CREATE POLICY "Doctors can delete treatment chart entries" ON public.treatment_chart_entries
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('doctor', 'admin', 'super_admin', 'ota', 'staff'))
  );

DROP POLICY IF EXISTS "Medical staff can update treatment chart entries" ON public.treatment_chart_entries;
CREATE POLICY "Medical staff can update treatment chart entries" ON public.treatment_chart_entries
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
      AND role IN ('staff','nursing','doctor','ota','admin','super_admin'))
  );

DROP POLICY IF EXISTS "Medical staff can delete treatment chart entries" ON public.treatment_chart_entries;
CREATE POLICY "Medical staff can delete treatment chart entries" ON public.treatment_chart_entries
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
      AND role IN ('staff','nursing','doctor','ota','admin','super_admin'))
  );

-- 24. postop_progress_entries
DROP POLICY IF EXISTS "Medical staff can update postop progress entries" ON public.postop_progress_entries;
CREATE POLICY "Medical staff can update postop progress entries" ON public.postop_progress_entries
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
      AND role IN ('staff','nursing','doctor','ota','admin','super_admin'))
  );

DROP POLICY IF EXISTS "Medical staff can delete postop progress entries" ON public.postop_progress_entries;
CREATE POLICY "Medical staff can delete postop progress entries" ON public.postop_progress_entries
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
      AND role IN ('staff','nursing','doctor','ota','admin','super_admin'))
  );

-- 25. assessment_entries
DROP POLICY IF EXISTS "Nursing staff can create assessment entries" ON public.assessment_entries;
CREATE POLICY "Nursing staff can create assessment entries" ON public.assessment_entries
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'nursing'))
  );

DROP POLICY IF EXISTS "Medical staff can update assessment entries" ON public.assessment_entries;
CREATE POLICY "Medical staff can update assessment entries" ON public.assessment_entries
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
      AND role IN ('staff','doctor','ota','admin','super_admin'))
  );

DROP POLICY IF EXISTS "Medical staff can delete assessment entries" ON public.assessment_entries;
CREATE POLICY "Medical staff can delete assessment entries" ON public.assessment_entries
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
      AND role IN ('staff','doctor','ota','admin','super_admin'))
  );

-- 26. hospital_services
DROP POLICY IF EXISTS "Admins can manage hospital services" ON public.hospital_services;
CREATE POLICY "Admins can manage hospital services" ON public.hospital_services
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- 27. shifts
DROP POLICY IF EXISTS "Only admins can manage shifts" ON public.shifts;
CREATE POLICY "Only admins can manage shifts" ON public.shifts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
  );

-- 28. finance_settings
DROP POLICY IF EXISTS "Finance and admin can view finance settings" ON public.finance_settings;
CREATE POLICY "Finance and admin can view finance settings" ON public.finance_settings
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))
  );

DROP POLICY IF EXISTS "Finance and admin can update finance settings" ON public.finance_settings;
CREATE POLICY "Finance and admin can update finance settings" ON public.finance_settings
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))
  );

DROP POLICY IF EXISTS "Finance and admin can insert finance settings" ON public.finance_settings;
CREATE POLICY "Finance and admin can insert finance settings" ON public.finance_settings
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))
  );

-- 29. staff_shift_closings
DROP POLICY IF EXISTS "Finance and admin can view all shift closings" ON public.staff_shift_closings;
CREATE POLICY "Finance and admin can view all shift closings" ON public.staff_shift_closings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Finance and admin can update shift closings" ON public.staff_shift_closings;
CREATE POLICY "Finance and admin can update shift closings" ON public.staff_shift_closings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Admin can delete shift closings" ON public.staff_shift_closings;
CREATE POLICY "Admin can delete shift closings" ON public.staff_shift_closings
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
  );

-- 30. overtime_records
DROP POLICY IF EXISTS "Finance users can view overtime records" ON public.overtime_records;
CREATE POLICY "Finance users can view overtime records" ON public.overtime_records
  FOR SELECT TO public USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Finance users can create overtime records" ON public.overtime_records;
CREATE POLICY "Finance users can create overtime records" ON public.overtime_records
  FOR INSERT TO public WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Finance users can update overtime records" ON public.overtime_records;
CREATE POLICY "Finance users can update overtime records" ON public.overtime_records
  FOR UPDATE TO public USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Finance users can delete overtime records" ON public.overtime_records;
CREATE POLICY "Finance users can delete overtime records" ON public.overtime_records
  FOR DELETE TO public USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

-- 31. patient_discounts
DROP POLICY IF EXISTS "Finance and admin can manage patient discounts" ON public.patient_discounts;
CREATE POLICY "Finance and admin can manage patient discounts" ON public.patient_discounts
  FOR ALL TO public USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin'))
  );

-- 32. lab_reports
DROP POLICY IF EXISTS "Staff admin lab can insert lab reports" ON public.lab_reports;
CREATE POLICY "Staff admin lab can insert lab reports" ON public.lab_reports
  FOR INSERT TO public WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'staff', 'lab', 'doctor'))
  );

DROP POLICY IF EXISTS "Staff admin lab can update lab reports" ON public.lab_reports;
CREATE POLICY "Staff admin lab can update lab reports" ON public.lab_reports
  FOR UPDATE TO public USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'staff', 'lab', 'doctor'))
  );

DROP POLICY IF EXISTS "Admin can delete lab reports" ON public.lab_reports;
CREATE POLICY "Admin can delete lab reports" ON public.lab_reports
  FOR DELETE TO public USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'staff'))
  );

-- 33. lab_test_types
DROP POLICY IF EXISTS "Staff can manage lab test types" ON public.lab_test_types;
CREATE POLICY "Staff can manage lab test types" ON public.lab_test_types
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'lab_technician'::text, 'staff'::text, 'doctor'::text]))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'lab_technician'::text, 'staff'::text, 'doctor'::text]))
  );

-- 34. lab_test_parameters
DROP POLICY IF EXISTS "Staff can manage lab test parameters" ON public.lab_test_parameters;
CREATE POLICY "Staff can manage lab test parameters" ON public.lab_test_parameters
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'lab_technician'::text, 'staff'::text, 'doctor'::text]))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'lab_technician'::text, 'staff'::text, 'doctor'::text]))
  );

-- 35. lab_parameter_subranges
DROP POLICY IF EXISTS "Staff can manage parameter subranges" ON public.lab_parameter_subranges;
CREATE POLICY "Staff can manage parameter subranges" ON public.lab_parameter_subranges
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'lab_technician'::text, 'staff'::text, 'doctor'::text]))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'lab_technician'::text, 'staff'::text, 'doctor'::text]))
  );

-- 36. lab_pathology_reports
DROP POLICY IF EXISTS "Authenticated users can view pathology reports" ON public.lab_pathology_reports;
CREATE POLICY "Authenticated users can view pathology reports" ON public.lab_pathology_reports
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','super_admin','lab','staff','doctor','finance'))
    OR patient_id = auth.uid()
  );

DROP POLICY IF EXISTS "Lab and admin can manage pathology reports" ON public.lab_pathology_reports;
CREATE POLICY "Lab and admin can manage pathology reports" ON public.lab_pathology_reports
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','super_admin','lab'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','super_admin','lab'))
  );

-- 37. lab_pathology_report_test_types
DROP POLICY IF EXISTS "Lab and admin manage report test types" ON public.lab_pathology_report_test_types;
CREATE POLICY "Lab and admin manage report test types" ON public.lab_pathology_report_test_types
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','super_admin','lab'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','super_admin','lab'))
  );

-- 38. lab_pathology_report_results
DROP POLICY IF EXISTS "Lab and admin manage pathology results" ON public.lab_pathology_report_results;
CREATE POLICY "Lab and admin manage pathology results" ON public.lab_pathology_report_results
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','super_admin','lab'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','super_admin','lab'))
  );

-- 39. lab_pathology_orders
DROP POLICY IF EXISTS "View pathology orders" ON public.lab_pathology_orders;
CREATE POLICY "View pathology orders" ON public.lab_pathology_orders
  FOR SELECT TO authenticated USING (
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
      AND role = ANY (ARRAY['admin','super_admin','lab','staff','finance','doctor'])))
    OR patient_id = auth.uid()
  );

DROP POLICY IF EXISTS "Manage pathology orders" ON public.lab_pathology_orders;
CREATE POLICY "Manage pathology orders" ON public.lab_pathology_orders
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
      AND role = ANY (ARRAY['admin','super_admin','staff','lab']))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
      AND role = ANY (ARRAY['admin','super_admin','staff','lab']))
  );

-- 40. lab_pathology_order_items
DROP POLICY IF EXISTS "Manage pathology order items" ON public.lab_pathology_order_items;
CREATE POLICY "Manage pathology order items" ON public.lab_pathology_order_items
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
      AND role = ANY (ARRAY['admin','super_admin','staff','lab']))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
      AND role = ANY (ARRAY['admin','super_admin','staff','lab']))
  );

-- 41. storage.objects – hospital-logos bucket
DROP POLICY IF EXISTS "Admins can upload hospital logos" ON storage.objects;
CREATE POLICY "Admins can upload hospital logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'hospital-logos' AND (EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin')
    ))
  );

DROP POLICY IF EXISTS "Admins can update hospital logos" ON storage.objects;
CREATE POLICY "Admins can update hospital logos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'hospital-logos' AND (EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin')
    ))
  );

DROP POLICY IF EXISTS "Admins can delete hospital logos" ON storage.objects;
CREATE POLICY "Admins can delete hospital logos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'hospital-logos' AND (EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin')
    ))
  );

-- 42. storage.objects – finance-proofs bucket
DROP POLICY IF EXISTS "Finance users can upload proofs" ON storage.objects;
CREATE POLICY "Finance users can upload proofs" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'finance-proofs' AND (EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin', 'staff')
    ))
  );

DROP POLICY IF EXISTS "Finance users can delete proofs" ON storage.objects;
CREATE POLICY "Finance users can delete proofs" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'finance-proofs' AND (EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'super_admin')
    ))
  );

-- 43. inventory_items
DROP POLICY IF EXISTS "Inventory manager and admin can manage inventory items" ON public.inventory_items;
CREATE POLICY "Inventory manager and admin can manage inventory items" ON public.inventory_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('inventory_manager', 'admin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('inventory_manager', 'admin', 'super_admin'))
  );

-- 44. lab_inventory_items
DROP POLICY IF EXISTS "Inventory manager and admin can manage lab inventory items" ON public.lab_inventory_items;
CREATE POLICY "Inventory manager and admin can manage lab inventory items" ON public.lab_inventory_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('inventory_manager', 'admin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('inventory_manager', 'admin', 'super_admin'))
  );

-- 45. inventory_requests
DROP POLICY IF EXISTS "Inventory manager can view all requests" ON public.inventory_requests;
CREATE POLICY "Inventory manager can view all requests" ON public.inventory_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('inventory_manager', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Inventory manager can update requests" ON public.inventory_requests;
CREATE POLICY "Inventory manager can update requests" ON public.inventory_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('inventory_manager', 'admin', 'super_admin'))
  );

-- 46. lab_stock_usage
DROP POLICY IF EXISTS "Managers can view all usage" ON public.lab_stock_usage;
CREATE POLICY "Managers can view all usage" ON public.lab_stock_usage
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('inventory_manager', 'admin', 'super_admin', 'store'))
  );

-- 47. anesthesia_notes
DROP POLICY IF EXISTS "Clinical staff manage anesthesia_notes" ON public.anesthesia_notes;
CREATE POLICY "Clinical staff manage anesthesia_notes" ON public.anesthesia_notes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'doctor', 'ota', 'staff'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'doctor', 'ota', 'staff'))
  );
