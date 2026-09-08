);

CREATE TABLE IF NOT EXISTS public.lab_pathology_report_results (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "report_id" uuid NOT NULL,
  "parameter_id" uuid NOT NULL,
  "result_value" text,
  "flag" text,
  "subrange_used" text,
  "subrange_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lab_pathology_report_test_types (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "report_id" uuid NOT NULL,
  "test_type_id" uuid NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "price_snapshot" numeric
);

CREATE TABLE IF NOT EXISTS public.lab_pathology_reports (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "patient_id" uuid NOT NULL,
  "report_number" text NOT NULL,
  "patient_name_snapshot" text,
  "patient_age_snapshot" integer,
  "patient_sex_snapshot" text,
  "referred_by" text,
  "collection_address" text,
  "sample_type" text,
  "instrument" text,
  "interpretation" text,
  "registered_at" timestamp with time zone,
  "collected_at" timestamp with time zone,
  "reported_at" timestamp with time zone,
  "status" text DEFAULT 'draft'::text NOT NULL,
  "invoice_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "amount" numeric
);

CREATE TABLE IF NOT EXISTS public.lab_reports (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "patient_id" uuid NOT NULL,
  "doctor_id" uuid,
  "external_doctor_name" text,
  "test_name" text NOT NULL,
  "test_id" uuid,
  "test_date" timestamp with time zone DEFAULT now(),
  "results" text,
  "status" text DEFAULT 'pending'::text,
  "notes" text,
  "price" numeric DEFAULT 0,
  "result_file_url" text,
  "invoice_id" uuid,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lab_stock_batches (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "item_id" uuid NOT NULL,
  "batch_number" text,
  "manufacturing_date" date,
  "expiry_date" date,
  "units_received" integer DEFAULT 1 NOT NULL,
  "tests_per_unit" integer DEFAULT 1 NOT NULL,
  "tests_total" integer DEFAULT 0 NOT NULL,
  "tests_remaining" integer DEFAULT 0 NOT NULL,
  "received_by" uuid,
  "request_id" uuid,
  "notes" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lab_stock_consumption (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "batch_id" uuid,
  "item_id" uuid,
  "test_type_id" uuid,
  "report_id" uuid,
  "tests_consumed" integer DEFAULT 1 NOT NULL,
  "consumed_by" uuid,
  "consumed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "notes" text
);

CREATE TABLE IF NOT EXISTS public.lab_stock_usage (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "item_name" text NOT NULL,
  "quantity_used" integer DEFAULT 1 NOT NULL,
  "used_by" uuid NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lab_store_batches (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "item_id" uuid NOT NULL,
  "batch_number" text,
  "manufacturing_date" date,
  "expiry_date" date,
  "units_received" integer DEFAULT 1 NOT NULL,
  "units_remaining" integer DEFAULT 0 NOT NULL,
  "tests_per_unit" integer DEFAULT 1 NOT NULL,
  "received_by" uuid,
  "notes" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lab_test_consumables (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "test_type_id" uuid NOT NULL,
  "item_id" uuid NOT NULL,
  "tests_per_run" integer DEFAULT 1 NOT NULL,
  "is_default" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lab_test_parameters (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "test_type_id" uuid NOT NULL,
  "category_heading" text,
  "parameter_name" text NOT NULL,
  "unit" text,
  "ref_display" text,
  "ref_min" numeric,
  "ref_max" numeric,
  "has_subranges" boolean DEFAULT false NOT NULL,
  "is_optional" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "display_all_subranges" boolean DEFAULT false NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lab_test_types (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "report_category" text,
  "method" text,
  "notes" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "price" numeric DEFAULT 0 NOT NULL,
  "column_headings" jsonb
);

CREATE TABLE IF NOT EXISTS public.lab_tests (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "price" numeric NOT NULL,
  "category" text,
  "normal_range" text,
  "preparation_instructions" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "panel_price" numeric
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

CREATE TABLE IF NOT EXISTS public.medicines (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "formula" text,
  "company_name" text,
  "batch_number" text,
  "manufacturing_date" date,
  "expiry_date" date NOT NULL,
  "purchase_price" numeric(10,2) NOT NULL,
  "selling_price" numeric(10,2) NOT NULL,
  "stock_quantity" integer DEFAULT 0 NOT NULL,
  "minimum_stock_level" integer DEFAULT 10,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
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

CREATE TABLE IF NOT EXISTS public.ot_expenses (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "operation_id" uuid NOT NULL,
  "expense_name" text NOT NULL,
  "cost" numeric NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ot_operations (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "operation_name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ot_rooms (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "room_name" text NOT NULL,
  "is_available" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ot_schedules (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "patient_id" uuid NOT NULL,
  "doctor_id" uuid,
  "doctor_name" text,
  "doctor_expense" numeric DEFAULT 0,
  "operation_id" uuid,
  "room_id" uuid,
  "operation_date" date NOT NULL,
  "queue_position" integer NOT NULL,
  "status" text DEFAULT 'pending'::text,
  "notes" text,
  "total_cost" numeric DEFAULT 0,
  "ot_notes" jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.overtime_records (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL,
  "employee_name" text NOT NULL,
  "overtime_hours" numeric DEFAULT 0 NOT NULL,
  "overtime_rate" numeric DEFAULT 0 NOT NULL,
  "overtime_amount" numeric DEFAULT 0 NOT NULL,
  "overtime_date" date DEFAULT CURRENT_DATE NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "notes" text,
  "created_by" uuid,
  "paid_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.patient_discounts (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "patient_id" uuid NOT NULL,
  "discount_type" text DEFAULT 'percentage'::text NOT NULL,
  "discount_value" numeric DEFAULT 0 NOT NULL,
  "notes" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "expires_at" timestamp with time zone,
  "used_at" timestamp with time zone,
  "service_type" text DEFAULT 'consultation'::text NOT NULL
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

CREATE TABLE IF NOT EXISTS public.patients (
  "id" uuid NOT NULL,
  "date_of_birth" date,
  "address" text,
  "emergency_contact_name" text,
  "emergency_contact_phone" text,
  "blood_type" text,
  "allergies" text,
  "cnic" text DEFAULT ''::text,
  "patient_number" text,
  "city" text,
  "province" text,
  "guardian_id" uuid,
  "relation" text,
  "age" integer,
  "guardian_name" text,
  "guardian_relation" text
);

CREATE TABLE IF NOT EXISTS public.payroll (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" text NOT NULL,
  "employee_name" text NOT NULL,
  "role" text NOT NULL,
  "base_salary" numeric(10,2) NOT NULL,
  "allowances" numeric(10,2) DEFAULT 0,
  "deductions" numeric(10,2) DEFAULT 0,
  "net_salary" numeric(10,2) NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "pay_period" text NOT NULL,
  "paid_at" timestamp with time zone,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payroll_templates (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" text NOT NULL,
  "employee_name" text NOT NULL,
  "role" text NOT NULL,
  "base_salary" numeric(10,2) NOT NULL,
  "allowances" numeric(10,2) DEFAULT 0,
  "deductions" numeric(10,2) DEFAULT 0,
  "net_salary" numeric(10,2) NOT NULL,
  "is_active" boolean DEFAULT true,
  "created_by" uuid,
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

CREATE TABLE IF NOT EXISTS public.pharmacy_invoice_items (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "invoice_id" uuid,
  "medicine_id" uuid,
  "quantity" integer NOT NULL,
  "unit_price" numeric(10,2) NOT NULL,
  "total_price" numeric(10,2) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pharmacy_invoices (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "invoice_number" text NOT NULL,
  "customer_name" text,
  "customer_phone" text,
  "total_amount" numeric(10,2) NOT NULL,
  "discount_amount" numeric(10,2) DEFAULT 0,
  "final_amount" numeric(10,2) NOT NULL,
  "status" text DEFAULT 'completed'::text,
  "created_at" timestamp with time zone DEFAULT now()
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

CREATE TABLE IF NOT EXISTS public.prescriptions (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "appointment_id" uuid NOT NULL,
  "patient_id" uuid NOT NULL,
  "doctor_id" uuid NOT NULL,
  "prescription_text" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  "id" uuid NOT NULL,
  "email" text NOT NULL,
  "first_name" text NOT NULL,
  "last_name" text NOT NULL,
  "phone" text,
  "role" text NOT NULL,
  "department_id" uuid,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "shift" text
);

CREATE TABLE IF NOT EXISTS public.queue_positions (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "appointment_id" uuid NOT NULL,
  "doctor_id" uuid NOT NULL,
  "appointment_date" date NOT NULL,
  "queue_position" integer NOT NULL,
  "status" text DEFAULT 'waiting'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.refunds (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "amount" numeric NOT NULL,
  "refund_type" text NOT NULL,
  "description" text NOT NULL,
  "doctor_id" uuid,
  "patient_id" uuid,
  "related_record_id" uuid,
  "processed_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "proof_url" text
);

CREATE TABLE IF NOT EXISTS public.shifts (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "start_time" time without time zone NOT NULL,
  "end_time" time without time zone NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff_shift_closings (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "staff_id" uuid NOT NULL,
  "shift" text NOT NULL,
  "closing_date" date NOT NULL,
  "shift_start_time" timestamp with time zone,
  "shift_end_time" timestamp with time zone,
  "total_revenue" numeric DEFAULT 0,
  "opd_revenue" numeric DEFAULT 0,
  "lab_revenue" numeric DEFAULT 0,
  "xray_revenue" numeric DEFAULT 0,
  "ot_revenue" numeric DEFAULT 0,
  "emergency_revenue" numeric DEFAULT 0,
  "misc_revenue" numeric DEFAULT 0,
  "total_invoices" integer DEFAULT 0,
  "overtime_hours" numeric DEFAULT 0,
  "overtime_amount" numeric DEFAULT 0,
  "status" text DEFAULT 'pending'::text,
  "approved_by" uuid,
  "approved_at" timestamp with time zone,
  "notes" text,
  "summary_data" jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "is_overtime" boolean DEFAULT false NOT NULL
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

CREATE TABLE IF NOT EXISTS public.wards (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "ward_type" text DEFAULT 'general'::text NOT NULL,
  "floor" text,
  "description" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.xray_reports (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "patient_id" uuid NOT NULL,
  "doctor_id" uuid,
  "test_id" uuid,
  "test_name" text NOT NULL,
  "xray_date" timestamp with time zone DEFAULT now(),
  "status" text DEFAULT 'pending'::text,
  "price" numeric DEFAULT 0,
  "invoice_id" uuid,
  "notes" text,
  "external_doctor_name" text,
  "results" text,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.xray_tests (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "category" text,
  "price" numeric NOT NULL,
  "preparation_instructions" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "panel_price" numeric
);
