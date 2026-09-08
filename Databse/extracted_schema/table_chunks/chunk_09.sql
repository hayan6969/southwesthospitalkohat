CREATE TABLE public.refunds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    amount numeric NOT NULL,
    refund_type text NOT NULL,
    description text NOT NULL,
    doctor_id uuid,
    patient_id uuid,
    related_record_id uuid,
    processed_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    proof_url text
);

CREATE TABLE public.shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.staff_shift_closings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    shift text NOT NULL,
    closing_date date NOT NULL,
    shift_start_time timestamp with time zone,
    shift_end_time timestamp with time zone,
    total_revenue numeric DEFAULT 0,
    opd_revenue numeric DEFAULT 0,
    lab_revenue numeric DEFAULT 0,
    xray_revenue numeric DEFAULT 0,
    ot_revenue numeric DEFAULT 0,
    emergency_revenue numeric DEFAULT 0,
    misc_revenue numeric DEFAULT 0,
    total_invoices integer DEFAULT 0,
    overtime_hours numeric DEFAULT 0,
    overtime_amount numeric DEFAULT 0,
    status text DEFAULT 'pending'::text,
    approved_by uuid,
    approved_at timestamp with time zone,
    notes text,
    summary_data jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_overtime boolean DEFAULT false NOT NULL
);

CREATE TABLE public.treatment_chart_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ot_schedule_id uuid NOT NULL,
    entry_date date NOT NULL,
    medicine text,
    investigation text,
    user_email text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone text,
    role text NOT NULL,
    department_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.wards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    ward_type text DEFAULT 'general'::text NOT NULL,
    floor text,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.xray_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    doctor_id uuid,
    test_id uuid,
    test_name text NOT NULL,
    xray_date timestamp with time zone DEFAULT now(),
    status text DEFAULT 'pending'::text,
    price numeric DEFAULT 0,
    invoice_id uuid,
    notes text,
    external_doctor_name text,
    results text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.xray_tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    category text,
    price numeric NOT NULL,
    preparation_instructions text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    panel_price numeric
);;