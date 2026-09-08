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

CREATE TABLE public.lab_stock_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    batch_number text,
    manufacturing_date date,
    expiry_date date,
    units_received integer DEFAULT 1 NOT NULL,
    tests_per_unit integer DEFAULT 1 NOT NULL,
    tests_total integer DEFAULT 0 NOT NULL,
    tests_remaining integer DEFAULT 0 NOT NULL,
    received_by uuid,
    request_id uuid,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.lab_stock_consumption (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid,
    item_id uuid,
    test_type_id uuid,
    report_id uuid,
    tests_consumed integer DEFAULT 1 NOT NULL,
    consumed_by uuid,
    consumed_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text
);

CREATE TABLE public.lab_stock_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_name text NOT NULL,
    quantity_used integer DEFAULT 1 NOT NULL,
    used_by uuid NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.lab_store_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    batch_number text,
    manufacturing_date date,
    expiry_date date,
    units_received integer DEFAULT 1 NOT NULL,
    units_remaining integer DEFAULT 0 NOT NULL,
    tests_per_unit integer DEFAULT 1 NOT NULL,
    received_by uuid,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.lab_test_consumables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_type_id uuid NOT NULL,
    item_id uuid NOT NULL,
    tests_per_run integer DEFAULT 1 NOT NULL,
    is_default boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.lab_test_parameters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_type_id uuid NOT NULL,
    category_heading text,
    parameter_name text NOT NULL,
    unit text,
    ref_display text,
    ref_min numeric,
    ref_max numeric,
    has_subranges boolean DEFAULT false NOT NULL,
    is_optional boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    display_all_subranges boolean DEFAULT false NOT NULL
);