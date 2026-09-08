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