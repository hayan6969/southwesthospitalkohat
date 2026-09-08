ALTER TABLE ONLY public.anesthesia_notes
    ADD CONSTRAINT anesthesia_notes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.assessment_entries
    ADD CONSTRAINT assessment_entries_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.beds
    ADD CONSTRAINT beds_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.beds
    ADD CONSTRAINT beds_ward_id_bed_number_key UNIQUE (ward_id, bed_number);

ALTER TABLE ONLY public.client_error_logs
    ADD CONSTRAINT client_error_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.daily_closings
    ADD CONSTRAINT daily_closings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.doctor_availability
    ADD CONSTRAINT doctor_availability_doctor_id_availability_date_key UNIQUE (doctor_id, availability_date);

ALTER TABLE ONLY public.doctor_availability
    ADD CONSTRAINT doctor_availability_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.doctor_daily_status
    ADD CONSTRAINT doctor_daily_status_doctor_id_status_date_key UNIQUE (doctor_id, status_date);

ALTER TABLE ONLY public.doctor_daily_status
    ADD CONSTRAINT doctor_daily_status_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.doctor_payments
    ADD CONSTRAINT doctor_payments_doctor_id_period_start_period_end_key UNIQUE (doctor_id, period_start, period_end);

ALTER TABLE ONLY public.doctor_payments
    ADD CONSTRAINT doctor_payments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.doctor_specific_schedules
    ADD CONSTRAINT doctor_specific_schedules_doctor_id_specific_date_key UNIQUE (doctor_id, specific_date);

ALTER TABLE ONLY public.doctor_specific_schedules
    ADD CONSTRAINT doctor_specific_schedules_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.doctor_working_hours
    ADD CONSTRAINT doctor_working_hours_doctor_id_day_of_week_key UNIQUE (doctor_id, day_of_week);

ALTER TABLE ONLY public.doctor_working_hours
    ADD CONSTRAINT doctor_working_hours_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_license_number_key UNIQUE (license_number);

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.emergency_expenses
    ADD CONSTRAINT emergency_expenses_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.finance_settings
    ADD CONSTRAINT finance_settings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.hospital_closing_balance
    ADD CONSTRAINT hospital_closing_balance_closing_date_key UNIQUE (closing_date);

ALTER TABLE ONLY public.hospital_closing_balance
    ADD CONSTRAINT hospital_closing_balance_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.hospital_services
    ADD CONSTRAINT hospital_services_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.hospital_settings
    ADD CONSTRAINT hospital_settings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.inventory_requests
    ADD CONSTRAINT inventory_requests_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.invoice_audit_log
    ADD CONSTRAINT invoice_audit_log_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ipd_admissions
    ADD CONSTRAINT ipd_admissions_admission_number_key UNIQUE (admission_number);

ALTER TABLE ONLY public.ipd_admissions
    ADD CONSTRAINT ipd_admissions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ipd_charges
    ADD CONSTRAINT ipd_charges_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ipd_doctor_payments
    ADD CONSTRAINT ipd_doctor_payments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ipd_invoices
    ADD CONSTRAINT ipd_invoices_admission_id_key UNIQUE (admission_id);

ALTER TABLE ONLY public.ipd_invoices
    ADD CONSTRAINT ipd_invoices_invoice_number_key UNIQUE (invoice_number);

ALTER TABLE ONLY public.ipd_invoices
    ADD CONSTRAINT ipd_invoices_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ipd_lab_orders
    ADD CONSTRAINT ipd_lab_orders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ipd_medicine_orders
    ADD CONSTRAINT ipd_medicine_orders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ipd_treatment_chart
    ADD CONSTRAINT ipd_treatment_chart_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.lab_inventory_items
    ADD CONSTRAINT lab_inventory_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.lab_parameter_subranges
    ADD CONSTRAINT lab_parameter_subranges_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.lab_pathology_order_items
    ADD CONSTRAINT lab_pathology_order_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.lab_pathology_orders
    ADD CONSTRAINT lab_pathology_orders_order_number_key UNIQUE (order_number);

ALTER TABLE ONLY public.lab_pathology_orders
    ADD CONSTRAINT lab_pathology_orders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.lab_pathology_report_results
    ADD CONSTRAINT lab_pathology_report_results_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.lab_pathology_report_results
    ADD CONSTRAINT lab_pathology_report_results_report_id_parameter_id_key UNIQUE (report_id, parameter_id);

ALTER TABLE ONLY public.lab_pathology_report_test_types
    ADD CONSTRAINT lab_pathology_report_test_types_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.lab_pathology_report_test_types
    ADD CONSTRAINT lab_pathology_report_test_types_report_id_test_type_id_key UNIQUE (report_id, test_type_id);

ALTER TABLE ONLY public.lab_pathology_reports
    ADD CONSTRAINT lab_pathology_reports_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.lab_pathology_reports
    ADD CONSTRAINT lab_pathology_reports_report_number_key UNIQUE (report_number);

ALTER TABLE ONLY public.lab_reports
    ADD CONSTRAINT lab_reports_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.lab_stock_batches
    ADD CONSTRAINT lab_stock_batches_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.lab_stock_consumption
    ADD CONSTRAINT lab_stock_consumption_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.lab_stock_usage
    ADD CONSTRAINT lab_stock_usage_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.lab_store_batches
    ADD CONSTRAINT lab_store_batches_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.lab_test_consumables
    ADD CONSTRAINT lab_test_consumables_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.lab_test_consumables
    ADD CONSTRAINT lab_test_consumables_test_type_id_item_id_key UNIQUE (test_type_id, item_id);

ALTER TABLE ONLY public.lab_test_parameters
    ADD CONSTRAINT lab_test_parameters_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.lab_test_types
    ADD CONSTRAINT lab_test_types_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.lab_tests
    ADD CONSTRAINT lab_tests_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.medicines
    ADD CONSTRAINT medicines_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.miscellaneous_income
    ADD CONSTRAINT miscellaneous_income_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ot_expenses
    ADD CONSTRAINT ot_expenses_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ot_operations
    ADD CONSTRAINT ot_operations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ot_rooms
    ADD CONSTRAINT ot_rooms_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ot_schedules
    ADD CONSTRAINT ot_schedules_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.overtime_records
    ADD CONSTRAINT overtime_records_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.patient_discounts
    ADD CONSTRAINT patient_discounts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.patient_documents
    ADD CONSTRAINT patient_documents_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_patient_number_key UNIQUE (patient_number);

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payroll
    ADD CONSTRAINT payroll_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payroll_templates
    ADD CONSTRAINT payroll_templates_employee_id_key UNIQUE (employee_id);

ALTER TABLE ONLY public.payroll_templates
    ADD CONSTRAINT payroll_templates_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.pharmacy_account
    ADD CONSTRAINT pharmacy_account_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.pharmacy_expenses
    ADD CONSTRAINT pharmacy_expenses_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.pharmacy_invoice_items
    ADD CONSTRAINT pharmacy_invoice_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.pharmacy_invoices
    ADD CONSTRAINT pharmacy_invoices_invoice_number_key UNIQUE (invoice_number);

ALTER TABLE ONLY public.pharmacy_invoices
    ADD CONSTRAINT pharmacy_invoices_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.postop_progress_entries
    ADD CONSTRAINT postop_progress_entries_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.queue_positions
    ADD CONSTRAINT queue_positions_doctor_id_appointment_date_queue_position_key UNIQUE (doctor_id, appointment_date, queue_position);

ALTER TABLE ONLY public.queue_positions
    ADD CONSTRAINT queue_positions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_name_key UNIQUE (name);

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.staff_shift_closings
    ADD CONSTRAINT staff_shift_closings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.treatment_chart_entries
    ADD CONSTRAINT treatment_chart_entries_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT unique_phone_for_patients UNIQUE (phone) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.wards
    ADD CONSTRAINT wards_name_key UNIQUE (name);

ALTER TABLE ONLY public.wards
    ADD CONSTRAINT wards_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.xray_reports
    ADD CONSTRAINT xray_reports_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.xray_tests
    ADD CONSTRAINT xray_tests_pkey PRIMARY KEY (id);
