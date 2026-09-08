CREATE TABLE IF NOT EXISTS public.doctor_specific_schedules (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "doctor_id" uuid NOT NULL,
  "specific_date" date NOT NULL,
  "start_time" time without time zone DEFAULT '09:00:00'::time without time zone,
  "end_time" time without time zone DEFAULT '17:00:00'::time without time zone,
  "is_working" boolean DEFAULT true,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.doctor_working_hours (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "doctor_id" uuid NOT NULL,
  "day_of_week" integer NOT NULL,
  "start_time" time without time zone DEFAULT '09:00:00'::time without time zone,
  "end_time" time without time zone DEFAULT '17:00:00'::time without time zone,
  "is_working" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ipd_doctor_payments (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "doctor_id" uuid NOT NULL,
  "admission_id" uuid,
  "charge_type" text DEFAULT 'aggregate'::text NOT NULL,
  "amount" numeric DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "paid_at" timestamp with time zone,
  "paid_by" uuid,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "ota_id" uuid
);

CREATE TABLE IF NOT EXISTS public.ipd_lab_orders (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "admission_id" uuid NOT NULL,
  "test_name" text NOT NULL,
  "test_type_id" uuid,
  "charge" numeric DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "result_notes" text,
  "ordered_by" uuid,
  "completed_by" uuid,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lab_pathology_orders (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "order_number" text NOT NULL,
  "patient_id" uuid NOT NULL,
  "invoice_id" uuid,
  "referred_by" text,
  "sample_type" text,
  "total_amount" numeric DEFAULT 0 NOT NULL,
  "payment_status" text DEFAULT 'pending'::text NOT NULL,
  "lab_status" text DEFAULT 'awaiting_payment'::text NOT NULL,
  "report_id" uuid,
  "notes" text,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lab_stock_usage (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "item_name" text NOT NULL,
  "quantity_used" integer DEFAULT 1 NOT NULL,
  "used_by" uuid NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.medical_records (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "patient_id" uuid NOT NULL,
  "doctor_id" uuid NOT NULL,
  "visit_date" timestamp with time zone DEFAULT now(),
  "diagnosis" text,
  "treatment" text,
  "prescription" text,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.miscellaneous_income (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "amount" numeric NOT NULL,
  "description" text NOT NULL,
  "income_date" date DEFAULT CURRENT_DATE NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.patient_documents (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "patient_id" uuid NOT NULL,
  "document_name" text NOT NULL,
  "document_label" text NOT NULL,
  "file_url" text NOT NULL,
  "file_size" integer,
  "file_type" text,
  "uploaded_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pharmacy_account (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "starting_balance" numeric DEFAULT 0,
  "notes" text,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pharmacy_expenses (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "amount" numeric NOT NULL,
  "expense_type" text DEFAULT 'profit_withdrawal'::text NOT NULL,
  "description" text,
  "bill_number" text,
  "expense_date" date DEFAULT CURRENT_DATE NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.postop_progress_entries (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "ot_schedule_id" uuid NOT NULL,
  "entry_date" date NOT NULL,
  "blood_pressure" text,
  "pulses" text,
  "temperature" text,
  "input_data" text,
  "output_data" text,
  "remarks" text,
  "user_email" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.treatment_chart_entries (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "ot_schedule_id" uuid NOT NULL,
  "entry_date" date NOT NULL,
  "medicine" text,
  "investigation" text,
  "user_email" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.users (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL,
  "first_name" text NOT NULL,
  "last_name" text NOT NULL,
  "phone" text,
  "role" text NOT NULL,
  "department_id" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);