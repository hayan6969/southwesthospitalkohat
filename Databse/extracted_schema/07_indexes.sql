CREATE UNIQUE INDEX hospital_services_name_lower_uidx ON public.hospital_services USING btree (lower(name));

CREATE INDEX idx_anesthesia_notes_admission ON public.anesthesia_notes USING btree (admission_id);

CREATE INDEX idx_anesthesia_notes_ot_booking ON public.anesthesia_notes USING btree (ot_booking_id);

CREATE INDEX idx_anesthesia_notes_patient ON public.anesthesia_notes USING btree (patient_id);

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);

CREATE INDEX idx_beds_status ON public.beds USING btree (status);

CREATE INDEX idx_beds_ward ON public.beds USING btree (ward_id);

CREATE INDEX idx_chart_admission ON public.ipd_treatment_chart USING btree (admission_id);

CREATE INDEX idx_chart_recorded_at ON public.ipd_treatment_chart USING btree (recorded_at);

CREATE INDEX idx_client_error_logs_level ON public.client_error_logs USING btree (level);

CREATE INDEX idx_client_error_logs_occurred_at ON public.client_error_logs USING btree (occurred_at DESC);

CREATE INDEX idx_client_error_logs_user_id ON public.client_error_logs USING btree (user_id);

CREATE INDEX idx_daily_closings_date ON public.daily_closings USING btree (closing_date);

CREATE INDEX idx_expenses_category ON public.expenses USING btree (category);

CREATE INDEX idx_expenses_created_by ON public.expenses USING btree (created_by);

CREATE INDEX idx_expenses_date ON public.expenses USING btree (expense_date);

CREATE INDEX idx_invoices_created_at ON public.invoices USING btree (created_at DESC);

CREATE INDEX idx_invoices_status_created_at ON public.invoices USING btree (status, created_at DESC);

CREATE INDEX idx_ipd_admissions_anesthesiologist_id ON public.ipd_admissions USING btree (anesthesiologist_id);

CREATE INDEX idx_ipd_admissions_bed ON public.ipd_admissions USING btree (bed_id);

CREATE INDEX idx_ipd_admissions_doctor ON public.ipd_admissions USING btree (doctor_id);

CREATE INDEX idx_ipd_admissions_ota_id ON public.ipd_admissions USING btree (ota_id);

CREATE INDEX idx_ipd_admissions_patient ON public.ipd_admissions USING btree (patient_id);

CREATE INDEX idx_ipd_admissions_status ON public.ipd_admissions USING btree (status);

CREATE INDEX idx_ipd_charges_admission ON public.ipd_charges USING btree (admission_id);

CREATE INDEX idx_ipd_charges_assigned_to ON public.ipd_charges USING btree (assigned_to);

CREATE INDEX idx_ipd_charges_doctor_id ON public.ipd_charges USING btree (doctor_id);

CREATE INDEX idx_ipd_charges_invoice ON public.ipd_charges USING btree (invoice_id);

CREATE INDEX idx_ipd_charges_type ON public.ipd_charges USING btree (charge_type);

CREATE INDEX idx_ipd_doctor_payments_admission_id ON public.ipd_doctor_payments USING btree (admission_id);

CREATE INDEX idx_ipd_doctor_payments_doctor_id ON public.ipd_doctor_payments USING btree (doctor_id);

CREATE INDEX idx_ipd_doctor_payments_ota_id ON public.ipd_doctor_payments USING btree (ota_id);

CREATE INDEX idx_ipd_doctor_payments_status ON public.ipd_doctor_payments USING btree (status);

CREATE INDEX idx_ipd_lab_admission ON public.ipd_lab_orders USING btree (admission_id);

CREATE INDEX idx_lab_parameter_subranges_param ON public.lab_parameter_subranges USING btree (parameter_id);

CREATE INDEX idx_lab_pathology_reports_created ON public.lab_pathology_reports USING btree (created_at DESC);

CREATE INDEX idx_lab_pathology_reports_patient ON public.lab_pathology_reports USING btree (patient_id);

CREATE INDEX idx_lab_pathology_reports_status ON public.lab_pathology_reports USING btree (status);

CREATE INDEX idx_lab_stock_batches_expiry ON public.lab_stock_batches USING btree (expiry_date);

CREATE INDEX idx_lab_stock_batches_item ON public.lab_stock_batches USING btree (item_id);

CREATE INDEX idx_lab_stock_consumption_item ON public.lab_stock_consumption USING btree (item_id);

CREATE INDEX idx_lab_stock_consumption_report ON public.lab_stock_consumption USING btree (report_id);

CREATE INDEX idx_lab_store_batches_expiry ON public.lab_store_batches USING btree (expiry_date);

CREATE INDEX idx_lab_store_batches_item ON public.lab_store_batches USING btree (item_id);

CREATE INDEX idx_lab_test_consumables_test ON public.lab_test_consumables USING btree (test_type_id);

CREATE INDEX idx_lab_test_parameters_test_type ON public.lab_test_parameters USING btree (test_type_id);

CREATE INDEX idx_med_orders_admission ON public.ipd_medicine_orders USING btree (admission_id);

CREATE INDEX idx_med_orders_status ON public.ipd_medicine_orders USING btree (status);

CREATE INDEX idx_pathology_order_items_order ON public.lab_pathology_order_items USING btree (order_id);

CREATE INDEX idx_pathology_orders_lab_status ON public.lab_pathology_orders USING btree (lab_status);

CREATE INDEX idx_pathology_orders_patient ON public.lab_pathology_orders USING btree (patient_id);

CREATE INDEX idx_pathology_orders_payment ON public.lab_pathology_orders USING btree (payment_status);

CREATE INDEX idx_pathology_results_report ON public.lab_pathology_report_results USING btree (report_id);

CREATE INDEX idx_pathology_rtt_report ON public.lab_pathology_report_test_types USING btree (report_id);

CREATE INDEX idx_patients_cnic ON public.patients USING btree (cnic);

CREATE INDEX idx_patients_guardian_id ON public.patients USING btree (guardian_id);

CREATE INDEX idx_payroll_employee_id ON public.payroll USING btree (employee_id);

CREATE INDEX idx_payroll_pay_period ON public.payroll USING btree (pay_period);

CREATE INDEX idx_payroll_status ON public.payroll USING btree (status);

CREATE INDEX idx_payroll_templates_employee_id ON public.payroll_templates USING btree (employee_id);

CREATE INDEX idx_payroll_templates_is_active ON public.payroll_templates USING btree (is_active);

CREATE INDEX idx_profiles_created_at ON public.profiles USING btree (created_at DESC);

CREATE INDEX invoice_audit_changed_at ON public.invoice_audit_log USING btree (changed_at DESC);

CREATE INDEX invoice_audit_invoice ON public.invoice_audit_log USING btree (invoice_id);

CREATE UNIQUE INDEX lab_tests_name_lower_uidx ON public.lab_tests USING btree (lower(name));

CREATE UNIQUE INDEX patient_discounts_patient_service_unique ON public.patient_discounts USING btree (patient_id, service_type) WHERE ((is_active = true) AND (used_at IS NULL));

CREATE UNIQUE INDEX xray_tests_name_lower_uidx ON public.xray_tests USING btree (lower(name));
