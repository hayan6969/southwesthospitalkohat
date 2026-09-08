ALTER TABLE ONLY public.ot_schedules REPLICA IDENTITY FULL;

CREATE TABLE public.overtime_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    employee_name text NOT NULL,
    overtime_hours numeric DEFAULT 0 NOT NULL,
    overtime_rate numeric DEFAULT 0 NOT NULL,
    overtime_amount numeric DEFAULT 0 NOT NULL,
    overtime_date date DEFAULT CURRENT_DATE NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    created_by uuid,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.patient_discounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    discount_type text DEFAULT 'percentage'::text NOT NULL,
    discount_value numeric DEFAULT 0 NOT NULL,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    used_at timestamp with time zone,
    service_type text DEFAULT 'consultation'::text NOT NULL,
    CONSTRAINT patient_discounts_discount_type_check CHECK ((discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text])))
);

CREATE TABLE public.patient_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    document_name text NOT NULL,
    document_label text NOT NULL,
    file_url text NOT NULL,
    file_size integer,
    file_type text,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.patients (
    id uuid NOT NULL,
    date_of_birth date,
    address text,
    emergency_contact_name text,
    emergency_contact_phone text,
    blood_type text,
    allergies text,
    cnic text DEFAULT ''::text,
    patient_number text,
    city text,
    province text,
    guardian_id uuid,
    relation text,
    age integer,
    guardian_name text,
    guardian_relation text
);

ALTER TABLE ONLY public.patients REPLICA IDENTITY FULL;

CREATE TABLE public.payroll (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id text NOT NULL,
    employee_name text NOT NULL,
    role text NOT NULL,
    base_salary numeric(10,2) NOT NULL,
    allowances numeric(10,2) DEFAULT 0,
    deductions numeric(10,2) DEFAULT 0,
    net_salary numeric(10,2) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    pay_period text NOT NULL,
    paid_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payroll_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text])))
);

CREATE TABLE public.payroll_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id text NOT NULL,
    employee_name text NOT NULL,
    role text NOT NULL,
    base_salary numeric(10,2) NOT NULL,
    allowances numeric(10,2) DEFAULT 0,
    deductions numeric(10,2) DEFAULT 0,
    net_salary numeric(10,2) NOT NULL,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.pharmacy_account (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    starting_balance numeric DEFAULT 0,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.pharmacy_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    amount numeric NOT NULL,
    expense_type text DEFAULT 'profit_withdrawal'::text NOT NULL,
    description text,
    bill_number text,
    expense_date date DEFAULT CURRENT_DATE NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);