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