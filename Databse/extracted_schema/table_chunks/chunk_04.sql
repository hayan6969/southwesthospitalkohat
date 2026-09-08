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