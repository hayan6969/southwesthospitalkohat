CREATE TABLE public.anesthesia_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid,
    admission_id uuid,
    ot_booking_id uuid,
    surgical_procedure text,
    brief_history text,
    preop_hr numeric,
    preop_bp text,
    preop_spo2 numeric,
    preop_medication text,
    anesthesia_type text,
    anesthesia_drugs text,
    intraop_assessment jsonb DEFAULT '[]'::jsonb,
    input_output_notes text,
    recovery_status text,
    postop_orders jsonb DEFAULT '[]'::jsonb,
    postop_notes text,
    status text DEFAULT 'draft'::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    doctor_id uuid NOT NULL,
    appointment_date timestamp with time zone NOT NULL,
    status public.appointment_status DEFAULT 'scheduled'::public.appointment_status,
    type text NOT NULL,
    notes text,
    booking_type text DEFAULT 'online'::text,
    payment_status text DEFAULT 'pending'::text,
    payment_due_time timestamp with time zone,
    invoice_generated_at timestamp with time zone,
    consultation_fee_at_time numeric DEFAULT 0,
    cleared_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.appointments REPLICA IDENTITY FULL;

CREATE TABLE public.assessment_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ot_schedule_id uuid NOT NULL,
    entry_date date DEFAULT CURRENT_DATE,
    entry_time time without time zone DEFAULT CURRENT_TIME,
    assessment text,
    plan text,
    user_email text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    details text,
    ip_address text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.audit_logs REPLICA IDENTITY FULL;

CREATE TABLE public.beds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ward_id uuid NOT NULL,
    bed_number text NOT NULL,
    daily_charge numeric DEFAULT 0 NOT NULL,
    status text DEFAULT 'available'::text NOT NULL,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.client_error_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    user_email text,
    user_role text,
    level text NOT NULL,
    message text NOT NULL,
    route text,
    user_agent text,
    url text,
    extra jsonb,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.daily_closings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    closing_date date NOT NULL,
    closing_time timestamp with time zone NOT NULL,
    day_name text NOT NULL,
    hospital_revenue numeric DEFAULT 0,
    pharmacy_revenue numeric DEFAULT 0,
    pharmacy_profit numeric DEFAULT 0,
    total_expenses numeric DEFAULT 0,
    total_refunds numeric DEFAULT 0,
    net_profit numeric DEFAULT 0,
    transactions_data jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.doctor_availability (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doctor_id uuid NOT NULL,
    availability_date date NOT NULL,
    is_available boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.doctor_daily_status (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doctor_id uuid NOT NULL,
    status_date date NOT NULL,
    accepting_appointments boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.doctor_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doctor_id uuid NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    appointment_count integer DEFAULT 0,
    ot_count integer DEFAULT 0,
    consultation_earnings numeric DEFAULT 0,
    ot_earnings numeric DEFAULT 0,
    total_earnings numeric DEFAULT 0,
    payment_status text DEFAULT 'pending'::text,
    paid_at timestamp with time zone,
    paid_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    hospital_share numeric(12,2) DEFAULT 0 NOT NULL,
    doctor_share numeric(12,2) DEFAULT 0 NOT NULL,
    hospital_share_percentage numeric(5,2) DEFAULT 30 NOT NULL,
    CONSTRAINT doctor_payments_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'processing'::text])))
);

CREATE TABLE public.doctor_specific_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doctor_id uuid NOT NULL,
    specific_date date NOT NULL,
    start_time time without time zone DEFAULT '09:00:00'::time without time zone,
    end_time time without time zone DEFAULT '17:00:00'::time without time zone,
    is_working boolean DEFAULT true,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.doctor_working_hours (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doctor_id uuid NOT NULL,
    day_of_week integer NOT NULL,
    start_time time without time zone DEFAULT '09:00:00'::time without time zone,
    end_time time without time zone DEFAULT '17:00:00'::time without time zone,
    is_working boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT doctor_working_hours_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);

CREATE TABLE public.doctors (
    id uuid NOT NULL,
    specialization text,
    license_number text,
    experience_years integer DEFAULT 0,
    consultation_fee numeric DEFAULT 0,
    avatar_url text,
    hospital_share_percentage numeric(5,2) DEFAULT 30 NOT NULL,
    fee_set_by_finance boolean DEFAULT false NOT NULL,
    fee_updated_by uuid,
    fee_updated_at timestamp with time zone,
    prescription_template jsonb,
    signature_url text,
    stamp_url text,
    header_logo text,
    clinic_name text,
    clinic_short_name text,
    phone text,
    address text,
    qualifications text,
    title text,
    doctor_details text[],
    urdu_doctor_name text,
    urdu_details text[],
    is_eye_specialist boolean DEFAULT false NOT NULL
);

ALTER TABLE ONLY public.doctors REPLICA IDENTITY FULL;

CREATE TABLE public.emergency_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    cost numeric DEFAULT 0,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    amount numeric NOT NULL,
    expense_date date DEFAULT CURRENT_DATE NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    proof_url text,
    CONSTRAINT expenses_amount_check CHECK ((amount > (0)::numeric))
);

CREATE TABLE public.finance_settings (
    id integer DEFAULT 1 NOT NULL,
    overtime_hourly_rate numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT finance_settings_singleton CHECK ((id = 1))
);

CREATE TABLE public.hospital_closing_balance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    closing_date date NOT NULL,
    closing_balance numeric DEFAULT 0,
    created_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.hospital_services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alias_no integer,
    name text NOT NULL,
    price numeric NOT NULL,
    panel_price numeric,
    category text,
    application text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.hospital_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    opening_time time without time zone DEFAULT '08:00:00'::time without time zone,
    closing_time time without time zone DEFAULT '20:00:00'::time without time zone,
    working_days text[] DEFAULT ARRAY['Monday'::text, 'Tuesday'::text, 'Wednesday'::text, 'Thursday'::text, 'Friday'::text, 'Saturday'::text],
    max_appointments_per_doctor integer DEFAULT 50,
    booking_lead_time_hours integer DEFAULT 2,
    emergency_slots_percentage integer DEFAULT 20,
    hospital_name text DEFAULT 'City General Hospital'::text,
    contact_number text DEFAULT '+92-XXX-XXXXXXX'::text,
    hospital_address text DEFAULT '123 Main Street, City Center'::text,
    logo_url text,
    payroll_payment_date integer DEFAULT 1,
    emergency_consultation_fee numeric DEFAULT 10000,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    morning_shift_start time without time zone DEFAULT '08:00:00'::time without time zone,
    morning_shift_end time without time zone DEFAULT '14:00:00'::time without time zone,
    evening_shift_start time without time zone DEFAULT '14:00:00'::time without time zone,
    evening_shift_end time without time zone DEFAULT '22:00:00'::time without time zone,
    email text,
    website text,
    footer_text text DEFAULT 'NOT VALID FOR COURT'::text
);

CREATE TABLE public.inventory_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    description text,
    stock_quantity integer DEFAULT 0 NOT NULL,
    minimum_stock_level integer DEFAULT 5 NOT NULL,
    unit text DEFAULT 'pieces'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    manufacturing_date date,
    expiry_date date
);

CREATE TABLE public.inventory_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requested_by uuid NOT NULL,
    item_name text NOT NULL,
    item_type text DEFAULT 'general'::text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    reason text,
    status text DEFAULT 'pending'::text NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    provided_by uuid,
    provided_at timestamp with time zone,
    rejection_reason text,
    expense_amount numeric,
    expense_bill_number text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    location text
);

CREATE TABLE public.invoice_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid,
    invoice_number text,
    operation text NOT NULL,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    old_amount numeric,
    new_amount numeric,
    old_status text,
    new_status text,
    old_row jsonb,
    new_row jsonb,
    changed_fields text[]
);

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    doctor_id uuid,
    invoice_number text NOT NULL,
    amount numeric(10,2) NOT NULL,
    status text DEFAULT 'pending'::text,
    due_date date,
    description text,
    emergency_patient_data jsonb,
    created_at timestamp with time zone DEFAULT now(),
    paid_at timestamp with time zone,
    created_by uuid
);

ALTER TABLE ONLY public.invoices REPLICA IDENTITY FULL;

CREATE TABLE public.ipd_admissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admission_number text NOT NULL,
    patient_id uuid NOT NULL,
    doctor_id uuid,
    bed_id uuid,
    ward_id uuid,
    source text DEFAULT 'direct'::text NOT NULL,
    referring_appointment_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    admission_date timestamp with time zone DEFAULT now() NOT NULL,
    discharge_date timestamp with time zone,
    chief_complaint text,
    provisional_diagnosis text,
    final_diagnosis text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    investigation text,
    pa_exam text,
    ua_exam text,
    procedure_performed text,
    treatment_given text,
    complication text,
    condition_of_discharge text,
    advice_for_home text,
    ota_id uuid,
    anesthesiologist_id uuid
);

CREATE TABLE public.ipd_charges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admission_id uuid NOT NULL,
    invoice_id uuid,
    charge_type text NOT NULL,
    description text NOT NULL,
    quantity numeric DEFAULT 1 NOT NULL,
    unit_price numeric DEFAULT 0 NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    charge_date date DEFAULT CURRENT_DATE NOT NULL,
    source_table text,
    source_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    assigned_to text,
    doctor_id uuid,
    anesthesiologist_id uuid
);

CREATE TABLE public.ipd_doctor_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doctor_id uuid NOT NULL,
    admission_id uuid,
    charge_type text DEFAULT 'aggregate'::text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    paid_at timestamp with time zone,
    paid_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ota_id uuid,
    CONSTRAINT ipd_doctor_payments_charge_type_check CHECK ((charge_type = ANY (ARRAY['doctor'::text, 'anesthesia'::text, 'ota'::text]))),
    CONSTRAINT ipd_doctor_payments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text])))
);

CREATE TABLE public.ipd_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_number text NOT NULL,
    admission_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    bed_charges_total numeric DEFAULT 0 NOT NULL,
    medicine_charges_total numeric DEFAULT 0 NOT NULL,
    lab_charges_total numeric DEFAULT 0 NOT NULL,
    nursing_charges_total numeric DEFAULT 0 NOT NULL,
    doctor_charges_total numeric DEFAULT 0 NOT NULL,
    other_charges_total numeric DEFAULT 0 NOT NULL,
    discount numeric DEFAULT 0 NOT NULL,
    total_amount numeric DEFAULT 0 NOT NULL,
    paid_amount numeric DEFAULT 0 NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    finalized_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    anesthesia_charges_total numeric DEFAULT 0,
    ota_charges_total numeric DEFAULT 0,
    ot_charges_total numeric DEFAULT 0
);

CREATE TABLE public.ipd_lab_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admission_id uuid NOT NULL,
    test_name text NOT NULL,
    test_type_id uuid,
    charge numeric DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    result_notes text,
    ordered_by uuid,
    completed_by uuid,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.ipd_medicine_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admission_id uuid NOT NULL,
    medicine_name text NOT NULL,
    dosage text,
    frequency text,
    route text,
    quantity numeric DEFAULT 1 NOT NULL,
    unit_price numeric DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    ordered_by uuid,
    dispensed_by uuid,
    dispensed_at timestamp with time zone,
    administered_by uuid,
    administered_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    received_at timestamp with time zone,
    received_by uuid
);

CREATE TABLE public.ipd_treatment_chart (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admission_id uuid NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    entry_type text NOT NULL,
    bp_systolic integer,
    bp_diastolic integer,
    pulse integer,
    temperature numeric,
    oxygen_saturation numeric,
    respiratory_rate integer,
    notes text,
    fluid_type text,
    fluid_volume_ml numeric,
    fluid_rate text,
    intake_ml numeric,
    output_ml numeric,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.lab_inventory_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category text DEFAULT 'consumable'::text NOT NULL,
    description text,
    stock_quantity integer DEFAULT 0 NOT NULL,
    minimum_stock_level integer DEFAULT 10 NOT NULL,
    unit text DEFAULT 'pieces'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    manufacturing_date date,
    expiry_date date,
    default_tests_per_unit integer,
    track_by_tests boolean DEFAULT false NOT NULL,
    minimum_tests_level integer DEFAULT 0 NOT NULL
);

CREATE TABLE public.lab_parameter_subranges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parameter_id uuid NOT NULL,
    label text NOT NULL,
    ref_min numeric,
    ref_max numeric,
    ref_display text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_result_row boolean DEFAULT false NOT NULL
);

CREATE TABLE public.lab_pathology_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    test_type_id uuid NOT NULL,
    test_name_snapshot text NOT NULL,
    price numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.lab_pathology_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number text NOT NULL,
    patient_id uuid NOT NULL,
    invoice_id uuid,
    referred_by text,
    sample_type text,
    total_amount numeric DEFAULT 0 NOT NULL,
    payment_status text DEFAULT 'pending'::text NOT NULL,
    lab_status text DEFAULT 'awaiting_payment'::text NOT NULL,
    report_id uuid,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.lab_pathology_report_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    parameter_id uuid NOT NULL,
    result_value text,
    flag text,
    subrange_used text,
    subrange_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lab_pathology_report_results_flag_check CHECK (((flag IS NULL) OR (flag = ANY (ARRAY['Low'::text, 'High'::text, 'Borderline'::text]))))
);

CREATE TABLE public.lab_pathology_report_test_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    test_type_id uuid NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    price_snapshot numeric
);

CREATE TABLE public.lab_pathology_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    report_number text NOT NULL,
    patient_name_snapshot text,
    patient_age_snapshot integer,
    patient_sex_snapshot text,
    referred_by text,
    collection_address text,
    sample_type text,
    instrument text,
    interpretation text,
    registered_at timestamp with time zone,
    collected_at timestamp with time zone,
    reported_at timestamp with time zone,
    status text DEFAULT 'draft'::text NOT NULL,
    invoice_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    amount numeric,
    CONSTRAINT lab_pathology_reports_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'partial'::text, 'final'::text])))
);

CREATE TABLE public.lab_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    doctor_id uuid,
    external_doctor_name text,
    test_name text NOT NULL,
    test_id uuid,
    test_date timestamp with time zone DEFAULT now(),
    results text,
    status text DEFAULT 'pending'::text,
    notes text,
    price numeric DEFAULT 0,
    result_file_url text,
    invoice_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT lab_reports_doctor_check CHECK ((((doctor_id IS NOT NULL) AND (external_doctor_name IS NULL)) OR ((doctor_id IS NULL) AND (external_doctor_name IS NOT NULL))))
);

ALTER TABLE ONLY public.lab_reports REPLICA IDENTITY FULL;