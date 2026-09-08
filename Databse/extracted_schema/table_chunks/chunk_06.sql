CREATE TABLE public.lab_test_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    report_category text,
    method text,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    price numeric DEFAULT 0 NOT NULL,
    column_headings jsonb
);

CREATE TABLE public.lab_tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    price numeric NOT NULL,
    category text,
    normal_range text,
    preparation_instructions text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    panel_price numeric
);

CREATE TABLE public.medical_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    doctor_id uuid NOT NULL,
    visit_date timestamp with time zone DEFAULT now(),
    diagnosis text,
    treatment text,
    prescription text,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.medicines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    formula text,
    company_name text,
    batch_number text,
    manufacturing_date date,
    expiry_date date NOT NULL,
    purchase_price numeric(10,2) NOT NULL,
    selling_price numeric(10,2) NOT NULL,
    stock_quantity integer DEFAULT 0 NOT NULL,
    minimum_stock_level integer DEFAULT 10,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.medicines REPLICA IDENTITY FULL;

CREATE TABLE public.miscellaneous_income (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    amount numeric NOT NULL,
    description text NOT NULL,
    income_date date DEFAULT CURRENT_DATE NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.ot_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operation_id uuid NOT NULL,
    expense_name text NOT NULL,
    cost numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.ot_operations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operation_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.ot_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_name text NOT NULL,
    is_available boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.ot_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    doctor_id uuid,
    doctor_name text,
    doctor_expense numeric DEFAULT 0,
    operation_id uuid,
    room_id uuid,
    operation_date date NOT NULL,
    queue_position integer NOT NULL,
    status text DEFAULT 'pending'::text,
    notes text,
    total_cost numeric DEFAULT 0,
    ot_notes jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);