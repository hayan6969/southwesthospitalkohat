CREATE TABLE public.pharmacy_invoice_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid,
    medicine_id uuid,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.pharmacy_invoice_items REPLICA IDENTITY FULL;

CREATE TABLE public.pharmacy_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_number text NOT NULL,
    customer_name text,
    customer_phone text,
    total_amount numeric(10,2) NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0,
    final_amount numeric(10,2) NOT NULL,
    status text DEFAULT 'completed'::text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.pharmacy_invoices REPLICA IDENTITY FULL;

CREATE TABLE public.postop_progress_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ot_schedule_id uuid NOT NULL,
    entry_date date NOT NULL,
    blood_pressure text,
    pulses text,
    temperature text,
    input_data text,
    output_data text,
    remarks text,
    user_email text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.prescriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    appointment_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    doctor_id uuid NOT NULL,
    prescription_text text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone text,
    role text NOT NULL,
    department_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    shift text,
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'doctor'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'head_pharmacist'::text, 'assistant_pharmacist'::text, 'salesman_pharmacist'::text, 'patient'::text, 'finance'::text, 'nursing'::text, 'inventory_manager'::text, 'store'::text, 'lab'::text, 'super_admin'::text])))
);

ALTER TABLE ONLY public.profiles REPLICA IDENTITY FULL;

CREATE TABLE public.queue_positions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    appointment_id uuid NOT NULL,
    doctor_id uuid NOT NULL,
    appointment_date date NOT NULL,
    queue_position integer NOT NULL,
    status text DEFAULT 'waiting'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT queue_positions_status_check CHECK ((status = ANY (ARRAY['waiting'::text, 'in_progress'::text, 'completed'::text, 'skipped'::text])))
);

ALTER TABLE ONLY public.queue_positions REPLICA IDENTITY FULL;