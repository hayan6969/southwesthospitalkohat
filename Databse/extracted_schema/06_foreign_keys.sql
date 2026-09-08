ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id);

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.beds
    ADD CONSTRAINT beds_ward_id_fkey FOREIGN KEY (ward_id) REFERENCES public.wards(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.doctor_payments
    ADD CONSTRAINT doctor_payments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.doctor_payments
    ADD CONSTRAINT doctor_payments_paid_by_fkey FOREIGN KEY (paid_by) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.doctor_specific_schedules
    ADD CONSTRAINT doctor_specific_schedules_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.doctor_working_hours
    ADD CONSTRAINT doctor_working_hours_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_fee_updated_by_fkey FOREIGN KEY (fee_updated_by) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.emergency_expenses
    ADD CONSTRAINT emergency_expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.lab_pathology_reports
    ADD CONSTRAINT fk_lab_pathology_reports_invoice FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.hospital_closing_balance
    ADD CONSTRAINT hospital_closing_balance_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.invoice_audit_log
    ADD CONSTRAINT invoice_audit_log_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);

ALTER TABLE ONLY public.ipd_admissions
    ADD CONSTRAINT ipd_admissions_anesthesiologist_id_fkey FOREIGN KEY (anesthesiologist_id) REFERENCES public.doctors(id);

ALTER TABLE ONLY public.ipd_admissions
    ADD CONSTRAINT ipd_admissions_bed_id_fkey FOREIGN KEY (bed_id) REFERENCES public.beds(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.ipd_admissions
    ADD CONSTRAINT ipd_admissions_ota_id_fkey FOREIGN KEY (ota_id) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.ipd_admissions
    ADD CONSTRAINT ipd_admissions_ward_id_fkey FOREIGN KEY (ward_id) REFERENCES public.wards(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.ipd_charges
    ADD CONSTRAINT ipd_charges_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES public.ipd_admissions(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.ipd_charges
    ADD CONSTRAINT ipd_charges_anesthesiologist_id_fkey FOREIGN KEY (anesthesiologist_id) REFERENCES public.doctors(id);

ALTER TABLE ONLY public.ipd_charges
    ADD CONSTRAINT ipd_charges_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id);

ALTER TABLE ONLY public.ipd_charges
    ADD CONSTRAINT ipd_charges_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.ipd_invoices(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.ipd_doctor_payments
    ADD CONSTRAINT ipd_doctor_payments_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES public.ipd_admissions(id);

ALTER TABLE ONLY public.ipd_doctor_payments
    ADD CONSTRAINT ipd_doctor_payments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id);

ALTER TABLE ONLY public.ipd_doctor_payments
    ADD CONSTRAINT ipd_doctor_payments_ota_id_fkey FOREIGN KEY (ota_id) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.ipd_doctor_payments
    ADD CONSTRAINT ipd_doctor_payments_paid_by_fkey FOREIGN KEY (paid_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.ipd_invoices
    ADD CONSTRAINT ipd_invoices_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES public.ipd_admissions(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.ipd_lab_orders
    ADD CONSTRAINT ipd_lab_orders_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES public.ipd_admissions(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.ipd_medicine_orders
    ADD CONSTRAINT ipd_medicine_orders_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES public.ipd_admissions(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.ipd_medicine_orders
    ADD CONSTRAINT ipd_medicine_orders_received_by_fkey FOREIGN KEY (received_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.ipd_treatment_chart
    ADD CONSTRAINT ipd_treatment_chart_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES public.ipd_admissions(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.lab_parameter_subranges
    ADD CONSTRAINT lab_parameter_subranges_parameter_id_fkey FOREIGN KEY (parameter_id) REFERENCES public.lab_test_parameters(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.lab_pathology_order_items
    ADD CONSTRAINT lab_pathology_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.lab_pathology_orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.lab_pathology_order_items
    ADD CONSTRAINT lab_pathology_order_items_test_type_id_fkey FOREIGN KEY (test_type_id) REFERENCES public.lab_test_types(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.lab_pathology_report_results
    ADD CONSTRAINT lab_pathology_report_results_parameter_id_fkey FOREIGN KEY (parameter_id) REFERENCES public.lab_test_parameters(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.lab_pathology_report_results
    ADD CONSTRAINT lab_pathology_report_results_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.lab_pathology_reports(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.lab_pathology_report_results
    ADD CONSTRAINT lab_pathology_report_results_subrange_id_fkey FOREIGN KEY (subrange_id) REFERENCES public.lab_parameter_subranges(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.lab_pathology_report_test_types
    ADD CONSTRAINT lab_pathology_report_test_types_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.lab_pathology_reports(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.lab_pathology_report_test_types
    ADD CONSTRAINT lab_pathology_report_test_types_test_type_id_fkey FOREIGN KEY (test_type_id) REFERENCES public.lab_test_types(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.lab_reports
    ADD CONSTRAINT lab_reports_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id);

ALTER TABLE ONLY public.lab_reports
    ADD CONSTRAINT lab_reports_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);

ALTER TABLE ONLY public.lab_reports
    ADD CONSTRAINT lab_reports_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.lab_tests(id);

ALTER TABLE ONLY public.lab_stock_batches
    ADD CONSTRAINT lab_stock_batches_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.lab_inventory_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.lab_stock_consumption
    ADD CONSTRAINT lab_stock_consumption_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.lab_stock_batches(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.lab_stock_consumption
    ADD CONSTRAINT lab_stock_consumption_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.lab_inventory_items(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.lab_stock_consumption
    ADD CONSTRAINT lab_stock_consumption_test_type_id_fkey FOREIGN KEY (test_type_id) REFERENCES public.lab_test_types(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.lab_store_batches
    ADD CONSTRAINT lab_store_batches_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.lab_inventory_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.lab_test_consumables
    ADD CONSTRAINT lab_test_consumables_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.lab_inventory_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.lab_test_consumables
    ADD CONSTRAINT lab_test_consumables_test_type_id_fkey FOREIGN KEY (test_type_id) REFERENCES public.lab_test_types(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.lab_test_parameters
    ADD CONSTRAINT lab_test_parameters_test_type_id_fkey FOREIGN KEY (test_type_id) REFERENCES public.lab_test_types(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id);

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);

ALTER TABLE ONLY public.miscellaneous_income
    ADD CONSTRAINT miscellaneous_income_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.ot_expenses
    ADD CONSTRAINT ot_expenses_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.ot_operations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.ot_schedules
    ADD CONSTRAINT ot_schedules_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id);

ALTER TABLE ONLY public.ot_schedules
    ADD CONSTRAINT ot_schedules_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.ot_operations(id);

ALTER TABLE ONLY public.ot_schedules
    ADD CONSTRAINT ot_schedules_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);

ALTER TABLE ONLY public.ot_schedules
    ADD CONSTRAINT ot_schedules_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.ot_rooms(id);

ALTER TABLE ONLY public.patient_discounts
    ADD CONSTRAINT patient_discounts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.patient_discounts
    ADD CONSTRAINT patient_discounts_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.patient_documents
    ADD CONSTRAINT patient_documents_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.patient_documents
    ADD CONSTRAINT patient_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_guardian_id_fkey FOREIGN KEY (guardian_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.payroll
    ADD CONSTRAINT payroll_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.payroll_templates
    ADD CONSTRAINT payroll_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.pharmacy_account
    ADD CONSTRAINT pharmacy_account_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.pharmacy_expenses
    ADD CONSTRAINT pharmacy_expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.pharmacy_invoice_items
    ADD CONSTRAINT pharmacy_invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.pharmacy_invoices(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.pharmacy_invoice_items
    ADD CONSTRAINT pharmacy_invoice_items_medicine_id_fkey FOREIGN KEY (medicine_id) REFERENCES public.medicines(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.postop_progress_entries
    ADD CONSTRAINT postop_progress_entries_ot_schedule_id_fkey FOREIGN KEY (ot_schedule_id) REFERENCES public.ot_schedules(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.queue_positions
    ADD CONSTRAINT queue_positions_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.queue_positions
    ADD CONSTRAINT queue_positions_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id);

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.staff_shift_closings
    ADD CONSTRAINT staff_shift_closings_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.staff_shift_closings
    ADD CONSTRAINT staff_shift_closings_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);

ALTER TABLE ONLY public.xray_reports
    ADD CONSTRAINT xray_reports_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.xray_reports
    ADD CONSTRAINT xray_reports_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.xray_reports
    ADD CONSTRAINT xray_reports_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.xray_tests(id);
