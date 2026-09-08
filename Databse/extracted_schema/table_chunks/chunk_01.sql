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