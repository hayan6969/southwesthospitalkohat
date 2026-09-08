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
    ADD CONSTRAINT xray_tests_pkey PRIMARY KEY (id);;