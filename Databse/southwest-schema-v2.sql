-- South West HIMS — schema export (public schema)
-- Run in your new Supabase project's SQL editor.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- ============ ENUM TYPES ============
DO $$ BEGIN CREATE TYPE public.appointment_status AS ENUM ('scheduled', 'completed', 'cancelled', 'rescheduled'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============ TABLES ============
CREATE TABLE IF NOT EXISTS public.anesthesia_notes (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "patient_id" uuid,
  "admission_id" uuid,
  "ot_booking_id" uuid,
  "surgical_procedure" text,
  "brief_history" text,
  "preop_hr" numeric,
  "preop_bp" text,
  "preop_spo2" numeric,
  "preop_medication" text,
  "anesthesia_type" text,
  "anesthesia_drugs" text,
  "intraop_assessment" jsonb DEFAULT '[]'::jsonb,
  "input_output_notes" text,
  "recovery_status" text,
  "postop_orders" jsonb DEFAULT '[]'::jsonb,
  "postop_notes" text,
  "status" text DEFAULT 'draft'::text,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.appointments (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "patient_id" uuid NOT NULL,
  "doctor_id" uuid NOT NULL,
  "appointment_date" timestamp with time zone NOT NULL,
  "status" appointment_status DEFAULT 'scheduled'::appointment_status,
  "type" text NOT NULL,
  "notes" text,
  "booking_type" text DEFAULT 'online'::text,
  "payment_status" text DEFAULT 'pending'::text,
  "payment_due_time" timestamp with time zone,
  "invoice_generated_at" timestamp with time zone,
  "consultation_fee_at_time" numeric DEFAULT 0,
  "cleared_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assessment_entries (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "ot_schedule_id" uuid NOT NULL,
  "entry_date" date DEFAULT CURRENT_DATE,
  "entry_time" time without time zone DEFAULT CURRENT_TIME,
  "assessment" text,
  "plan" text,
  "user_email" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "action" text NOT NULL,
  "details" text,
  "ip_address" text,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.beds (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "ward_id" uuid NOT NULL,
  "bed_number" text NOT NULL,
  "daily_charge" numeric DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'available'::text NOT NULL,
  "notes" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.client_error_logs (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "user_email" text,
  "user_role" text,
  "level" text NOT NULL,
  "message" text NOT NULL,
  "route" text,
  "user_agent" text,
  "url" text,
  "extra" jsonb,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.daily_closings (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "closing_date" date NOT NULL,
  "closing_time" timestamp with time zone NOT NULL,
  "day_name" text NOT NULL,
  "hospital_revenue" numeric DEFAULT 0,
  "pharmacy_revenue" numeric DEFAULT 0,
  "pharmacy_profit" numeric DEFAULT 0,
  "total_expenses" numeric DEFAULT 0,
  "total_refunds" numeric DEFAULT 0,
  "net_profit" numeric DEFAULT 0,
  "transactions_data" jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.departments (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.doctor_availability (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "doctor_id" uuid NOT NULL,
  "availability_date" date NOT NULL,
  "is_available" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.doctor_daily_status (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "doctor_id" uuid NOT NULL,
  "status_date" date NOT NULL,
  "accepting_appointments" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.doctor_payments (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "doctor_id" uuid NOT NULL,
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "appointment_count" integer DEFAULT 0,
  "ot_count" integer DEFAULT 0,
  "consultation_earnings" numeric DEFAULT 0,
  "ot_earnings" numeric DEFAULT 0,
  "total_earnings" numeric DEFAULT 0,
  "payment_status" text DEFAULT 'pending'::text,
  "paid_at" timestamp with time zone,
  "paid_by" uuid,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "hospital_share" numeric(12,2) DEFAULT 0 NOT NULL,
  "doctor_share" numeric(12,2) DEFAULT 0 NOT NULL,
  "hospital_share_percentage" numeric(5,2) DEFAULT 30 NOT NULL
);

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

CREATE TABLE IF NOT EXISTS public.doctors (
  "id" uuid NOT NULL,
  "specialization" text,
  "license_number" text,
  "experience_years" integer DEFAULT 0,
  "consultation_fee" numeric DEFAULT 0,
  "avatar_url" text,
  "hospital_share_percentage" numeric(5,2) DEFAULT 30 NOT NULL,
  "fee_set_by_finance" boolean DEFAULT false NOT NULL,
  "fee_updated_by" uuid,
  "fee_updated_at" timestamp with time zone,
  "prescription_template" jsonb,
  "signature_url" text,
  "stamp_url" text,
  "header_logo" text,
  "clinic_name" text,
  "clinic_short_name" text,
  "phone" text,
  "address" text,
  "qualifications" text,
  "title" text,
  "doctor_details" text[],
  "urdu_doctor_name" text,
  "urdu_details" text[]
);

CREATE TABLE IF NOT EXISTS public.emergency_expenses (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "cost" numeric DEFAULT 0,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "category" text NOT NULL,
  "description" text NOT NULL,
  "amount" numeric NOT NULL,
  "expense_date" date DEFAULT CURRENT_DATE NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "proof_url" text
);

CREATE TABLE IF NOT EXISTS public.finance_settings (
  "id" integer DEFAULT 1 NOT NULL,
  "overtime_hourly_rate" numeric DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.hospital_closing_balance (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "closing_date" date NOT NULL,
  "closing_balance" numeric DEFAULT 0,
  "created_by" uuid,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hospital_services (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "alias_no" integer,
  "name" text NOT NULL,
  "price" numeric NOT NULL,
  "panel_price" numeric,
  "category" text,
  "application" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.hospital_settings (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "opening_time" time without time zone DEFAULT '08:00:00'::time without time zone,
  "closing_time" time without time zone DEFAULT '20:00:00'::time without time zone,
  "working_days" text[] DEFAULT ARRAY['Monday'::text, 'Tuesday'::text, 'Wednesday'::text, 'Thursday'::text, 'Friday'::text, 'Saturday'::text],
  "max_appointments_per_doctor" integer DEFAULT 50,
  "booking_lead_time_hours" integer DEFAULT 2,
  "emergency_slots_percentage" integer DEFAULT 20,
  "hospital_name" text DEFAULT 'City General Hospital'::text,
  "contact_number" text DEFAULT '+92-XXX-XXXXXXX'::text,
  "hospital_address" text DEFAULT '123 Main Street, City Center'::text,
  "logo_url" text,
  "payroll_payment_date" integer DEFAULT 1,
  "emergency_consultation_fee" numeric DEFAULT 10000,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "morning_shift_start" time without time zone DEFAULT '08:00:00'::time without time zone,
  "morning_shift_end" time without time zone DEFAULT '14:00:00'::time without time zone,
  "evening_shift_start" time without time zone DEFAULT '14:00:00'::time without time zone,
  "evening_shift_end" time without time zone DEFAULT '22:00:00'::time without time zone,
  "email" text,
  "website" text,
  "footer_text" text DEFAULT 'NOT VALID FOR COURT'::text
);

CREATE TABLE IF NOT EXISTS public.inventory_items (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "category" text DEFAULT 'general'::text NOT NULL,
  "description" text,
  "stock_quantity" integer DEFAULT 0 NOT NULL,
  "minimum_stock_level" integer DEFAULT 5 NOT NULL,
  "unit" text DEFAULT 'pieces'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "manufacturing_date" date,
  "expiry_date" date
);

CREATE TABLE IF NOT EXISTS public.inventory_requests (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "requested_by" uuid NOT NULL,
  "item_name" text NOT NULL,
  "item_type" text DEFAULT 'general'::text NOT NULL,
  "quantity" integer DEFAULT 1 NOT NULL,
  "reason" text,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "approved_by" uuid,
  "approved_at" timestamp with time zone,
  "provided_by" uuid,
  "provided_at" timestamp with time zone,
  "rejection_reason" text,
  "expense_amount" numeric,
  "expense_bill_number" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "location" text
);

CREATE TABLE IF NOT EXISTS public.invoice_audit_log (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "invoice_id" uuid,
  "invoice_number" text,
  "operation" text NOT NULL,
  "changed_by" uuid,
  "changed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "old_amount" numeric,
  "new_amount" numeric,
  "old_status" text,
  "new_status" text,
  "old_row" jsonb,
  "new_row" jsonb,
  "changed_fields" text[]
);

CREATE TABLE IF NOT EXISTS public.invoices (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "patient_id" uuid NOT NULL,
  "doctor_id" uuid,
  "invoice_number" text NOT NULL,
  "amount" numeric(10,2) NOT NULL,
  "status" text DEFAULT 'pending'::text,
  "due_date" date,
  "description" text,
  "emergency_patient_data" jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "paid_at" timestamp with time zone,
  "created_by" uuid
);

CREATE TABLE IF NOT EXISTS public.ipd_admissions (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "admission_number" text NOT NULL,
  "patient_id" uuid NOT NULL,
  "doctor_id" uuid,
  "bed_id" uuid,
  "ward_id" uuid,
  "source" text DEFAULT 'direct'::text NOT NULL,
  "referring_appointment_id" uuid,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "admission_date" timestamp with time zone DEFAULT now() NOT NULL,
  "discharge_date" timestamp with time zone,
  "chief_complaint" text,
  "provisional_diagnosis" text,
  "final_diagnosis" text,
  "notes" text,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "investigation" text,
  "pa_exam" text,
  "ua_exam" text,
  "procedure_performed" text,
  "treatment_given" text,
  "complication" text,
  "condition_of_discharge" text,
  "advice_for_home" text,
  "ota_id" uuid,
  "anesthesiologist_id" uuid
);

CREATE TABLE IF NOT EXISTS public.ipd_charges (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "admission_id" uuid NOT NULL,
  "invoice_id" uuid,
  "charge_type" text NOT NULL,
  "description" text NOT NULL,
  "quantity" numeric DEFAULT 1 NOT NULL,
  "unit_price" numeric DEFAULT 0 NOT NULL,
  "amount" numeric DEFAULT 0 NOT NULL,
  "charge_date" date DEFAULT CURRENT_DATE NOT NULL,
  "source_table" text,
  "source_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "assigned_to" text,
  "doctor_id" uuid,
  "anesthesiologist_id" uuid
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

CREATE TABLE IF NOT EXISTS public.ipd_invoices (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "invoice_number" text NOT NULL,
  "admission_id" uuid NOT NULL,
  "patient_id" uuid NOT NULL,
  "bed_charges_total" numeric DEFAULT 0 NOT NULL,
  "medicine_charges_total" numeric DEFAULT 0 NOT NULL,
  "lab_charges_total" numeric DEFAULT 0 NOT NULL,
  "nursing_charges_total" numeric DEFAULT 0 NOT NULL,
  "doctor_charges_total" numeric DEFAULT 0 NOT NULL,
  "other_charges_total" numeric DEFAULT 0 NOT NULL,
  "discount" numeric DEFAULT 0 NOT NULL,
  "total_amount" numeric DEFAULT 0 NOT NULL,
  "paid_amount" numeric DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'open'::text NOT NULL,
  "finalized_at" timestamp with time zone,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "anesthesia_charges_total" numeric DEFAULT 0,
  "ota_charges_total" numeric DEFAULT 0,
  "ot_charges_total" numeric DEFAULT 0
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

CREATE TABLE IF NOT EXISTS public.ipd_medicine_orders (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "admission_id" uuid NOT NULL,
  "medicine_name" text NOT NULL,
  "dosage" text,
  "frequency" text,
  "route" text,
  "quantity" numeric DEFAULT 1 NOT NULL,
  "unit_price" numeric DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "ordered_by" uuid,
  "dispensed_by" uuid,
  "dispensed_at" timestamp with time zone,
  "administered_by" uuid,
  "administered_at" timestamp with time zone,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "received_at" timestamp with time zone,
  "received_by" uuid
);

CREATE TABLE IF NOT EXISTS public.ipd_treatment_chart (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "admission_id" uuid NOT NULL,
  "recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
  "entry_type" text NOT NULL,
  "bp_systolic" integer,
  "bp_diastolic" integer,
  "pulse" integer,
  "temperature" numeric,
  "oxygen_saturation" numeric,
  "respiratory_rate" integer,
  "notes" text,
  "fluid_type" text,
  "fluid_volume_ml" numeric,
  "fluid_rate" text,
  "intake_ml" numeric,
  "output_ml" numeric,
  "recorded_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lab_inventory_items (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "category" text DEFAULT 'consumable'::text NOT NULL,
  "description" text,
  "stock_quantity" integer DEFAULT 0 NOT NULL,
  "minimum_stock_level" integer DEFAULT 10 NOT NULL,
  "unit" text DEFAULT 'pieces'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "manufacturing_date" date,
  "expiry_date" date,
  "default_tests_per_unit" integer,
  "track_by_tests" boolean DEFAULT false NOT NULL,
  "minimum_tests_level" integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lab_parameter_subranges (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "parameter_id" uuid NOT NULL,
  "label" text NOT NULL,
  "ref_min" numeric,
  "ref_max" numeric,
  "ref_display" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "is_result_row" boolean DEFAULT false NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lab_pathology_order_items (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL,
  "test_type_id" uuid NOT NULL,
  "test_name_snapshot" text NOT NULL,
  "price" numeric DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
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

-- ============ CONSTRAINTS (PK / UNIQUE / CHECK / FK) ============
ALTER TABLE anesthesia_notes ADD CONSTRAINT anesthesia_notes_pkey PRIMARY KEY (id);
ALTER TABLE appointments ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);
ALTER TABLE assessment_entries ADD CONSTRAINT assessment_entries_pkey PRIMARY KEY (id);
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE beds ADD CONSTRAINT beds_pkey PRIMARY KEY (id);
ALTER TABLE client_error_logs ADD CONSTRAINT client_error_logs_pkey PRIMARY KEY (id);
ALTER TABLE daily_closings ADD CONSTRAINT daily_closings_pkey PRIMARY KEY (id);
ALTER TABLE departments ADD CONSTRAINT departments_pkey PRIMARY KEY (id);
ALTER TABLE doctor_availability ADD CONSTRAINT doctor_availability_pkey PRIMARY KEY (id);
ALTER TABLE doctor_daily_status ADD CONSTRAINT doctor_daily_status_pkey PRIMARY KEY (id);
ALTER TABLE doctor_payments ADD CONSTRAINT doctor_payments_pkey PRIMARY KEY (id);
ALTER TABLE doctor_specific_schedules ADD CONSTRAINT doctor_specific_schedules_pkey PRIMARY KEY (id);
ALTER TABLE doctor_working_hours ADD CONSTRAINT doctor_working_hours_pkey PRIMARY KEY (id);
ALTER TABLE doctors ADD CONSTRAINT doctors_pkey PRIMARY KEY (id);
ALTER TABLE emergency_expenses ADD CONSTRAINT emergency_expenses_pkey PRIMARY KEY (id);
ALTER TABLE expenses ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);
ALTER TABLE finance_settings ADD CONSTRAINT finance_settings_pkey PRIMARY KEY (id);
ALTER TABLE hospital_closing_balance ADD CONSTRAINT hospital_closing_balance_pkey PRIMARY KEY (id);
ALTER TABLE hospital_services ADD CONSTRAINT hospital_services_pkey PRIMARY KEY (id);
ALTER TABLE hospital_settings ADD CONSTRAINT hospital_settings_pkey PRIMARY KEY (id);
ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);
ALTER TABLE inventory_requests ADD CONSTRAINT inventory_requests_pkey PRIMARY KEY (id);
ALTER TABLE invoice_audit_log ADD CONSTRAINT invoice_audit_log_pkey PRIMARY KEY (id);
ALTER TABLE invoices ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);
ALTER TABLE ipd_admissions ADD CONSTRAINT ipd_admissions_pkey PRIMARY KEY (id);
ALTER TABLE ipd_charges ADD CONSTRAINT ipd_charges_pkey PRIMARY KEY (id);
ALTER TABLE ipd_doctor_payments ADD CONSTRAINT ipd_doctor_payments_pkey PRIMARY KEY (id);
ALTER TABLE ipd_invoices ADD CONSTRAINT ipd_invoices_pkey PRIMARY KEY (id);
ALTER TABLE ipd_lab_orders ADD CONSTRAINT ipd_lab_orders_pkey PRIMARY KEY (id);
ALTER TABLE ipd_medicine_orders ADD CONSTRAINT ipd_medicine_orders_pkey PRIMARY KEY (id);
ALTER TABLE ipd_treatment_chart ADD CONSTRAINT ipd_treatment_chart_pkey PRIMARY KEY (id);
ALTER TABLE lab_inventory_items ADD CONSTRAINT lab_inventory_items_pkey PRIMARY KEY (id);
ALTER TABLE lab_parameter_subranges ADD CONSTRAINT lab_parameter_subranges_pkey PRIMARY KEY (id);
ALTER TABLE lab_pathology_order_items ADD CONSTRAINT lab_pathology_order_items_pkey PRIMARY KEY (id);
ALTER TABLE lab_pathology_orders ADD CONSTRAINT lab_pathology_orders_pkey PRIMARY KEY (id);
ALTER TABLE lab_pathology_report_results ADD CONSTRAINT lab_pathology_report_results_pkey PRIMARY KEY (id);
ALTER TABLE lab_pathology_report_test_types ADD CONSTRAINT lab_pathology_report_test_types_pkey PRIMARY KEY (id);
ALTER TABLE lab_pathology_reports ADD CONSTRAINT lab_pathology_reports_pkey PRIMARY KEY (id);
ALTER TABLE lab_reports ADD CONSTRAINT lab_reports_pkey PRIMARY KEY (id);
ALTER TABLE lab_stock_batches ADD CONSTRAINT lab_stock_batches_pkey PRIMARY KEY (id);
ALTER TABLE lab_stock_consumption ADD CONSTRAINT lab_stock_consumption_pkey PRIMARY KEY (id);
ALTER TABLE lab_stock_usage ADD CONSTRAINT lab_stock_usage_pkey PRIMARY KEY (id);
ALTER TABLE lab_store_batches ADD CONSTRAINT lab_store_batches_pkey PRIMARY KEY (id);
ALTER TABLE lab_test_consumables ADD CONSTRAINT lab_test_consumables_pkey PRIMARY KEY (id);
ALTER TABLE lab_test_parameters ADD CONSTRAINT lab_test_parameters_pkey PRIMARY KEY (id);
ALTER TABLE lab_test_types ADD CONSTRAINT lab_test_types_pkey PRIMARY KEY (id);
ALTER TABLE lab_tests ADD CONSTRAINT lab_tests_pkey PRIMARY KEY (id);
ALTER TABLE medical_records ADD CONSTRAINT medical_records_pkey PRIMARY KEY (id);
ALTER TABLE medicines ADD CONSTRAINT medicines_pkey PRIMARY KEY (id);
ALTER TABLE miscellaneous_income ADD CONSTRAINT miscellaneous_income_pkey PRIMARY KEY (id);
ALTER TABLE ot_expenses ADD CONSTRAINT ot_expenses_pkey PRIMARY KEY (id);
ALTER TABLE ot_operations ADD CONSTRAINT ot_operations_pkey PRIMARY KEY (id);
ALTER TABLE ot_rooms ADD CONSTRAINT ot_rooms_pkey PRIMARY KEY (id);
ALTER TABLE ot_schedules ADD CONSTRAINT ot_schedules_pkey PRIMARY KEY (id);
ALTER TABLE overtime_records ADD CONSTRAINT overtime_records_pkey PRIMARY KEY (id);
ALTER TABLE patient_discounts ADD CONSTRAINT patient_discounts_pkey PRIMARY KEY (id);
ALTER TABLE patient_documents ADD CONSTRAINT patient_documents_pkey PRIMARY KEY (id);
ALTER TABLE patients ADD CONSTRAINT patients_pkey PRIMARY KEY (id);
ALTER TABLE payroll ADD CONSTRAINT payroll_pkey PRIMARY KEY (id);
ALTER TABLE payroll_templates ADD CONSTRAINT payroll_templates_pkey PRIMARY KEY (id);
ALTER TABLE pharmacy_account ADD CONSTRAINT pharmacy_account_pkey PRIMARY KEY (id);
ALTER TABLE pharmacy_expenses ADD CONSTRAINT pharmacy_expenses_pkey PRIMARY KEY (id);
ALTER TABLE pharmacy_invoice_items ADD CONSTRAINT pharmacy_invoice_items_pkey PRIMARY KEY (id);
ALTER TABLE pharmacy_invoices ADD CONSTRAINT pharmacy_invoices_pkey PRIMARY KEY (id);
ALTER TABLE postop_progress_entries ADD CONSTRAINT postop_progress_entries_pkey PRIMARY KEY (id);
ALTER TABLE prescriptions ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (id);
ALTER TABLE profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE queue_positions ADD CONSTRAINT queue_positions_pkey PRIMARY KEY (id);
ALTER TABLE refunds ADD CONSTRAINT refunds_pkey PRIMARY KEY (id);
ALTER TABLE shifts ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);
ALTER TABLE staff_shift_closings ADD CONSTRAINT staff_shift_closings_pkey PRIMARY KEY (id);
ALTER TABLE treatment_chart_entries ADD CONSTRAINT treatment_chart_entries_pkey PRIMARY KEY (id);
ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE wards ADD CONSTRAINT wards_pkey PRIMARY KEY (id);
ALTER TABLE xray_reports ADD CONSTRAINT xray_reports_pkey PRIMARY KEY (id);
ALTER TABLE xray_tests ADD CONSTRAINT xray_tests_pkey PRIMARY KEY (id);

ALTER TABLE beds ADD CONSTRAINT beds_ward_id_bed_number_key UNIQUE (ward_id, bed_number);
ALTER TABLE doctor_availability ADD CONSTRAINT doctor_availability_doctor_id_availability_date_key UNIQUE (doctor_id, availability_date);
ALTER TABLE doctor_daily_status ADD CONSTRAINT doctor_daily_status_doctor_id_status_date_key UNIQUE (doctor_id, status_date);
ALTER TABLE doctor_payments ADD CONSTRAINT doctor_payments_doctor_id_period_start_period_end_key UNIQUE (doctor_id, period_start, period_end);
ALTER TABLE doctor_specific_schedules ADD CONSTRAINT doctor_specific_schedules_doctor_id_specific_date_key UNIQUE (doctor_id, specific_date);
ALTER TABLE doctor_working_hours ADD CONSTRAINT doctor_working_hours_doctor_id_day_of_week_key UNIQUE (doctor_id, day_of_week);
ALTER TABLE doctors ADD CONSTRAINT doctors_license_number_key UNIQUE (license_number);
ALTER TABLE hospital_closing_balance ADD CONSTRAINT hospital_closing_balance_closing_date_key UNIQUE (closing_date);
ALTER TABLE invoices ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);
ALTER TABLE ipd_admissions ADD CONSTRAINT ipd_admissions_admission_number_key UNIQUE (admission_number);
ALTER TABLE ipd_invoices ADD CONSTRAINT ipd_invoices_admission_id_key UNIQUE (admission_id);
ALTER TABLE ipd_invoices ADD CONSTRAINT ipd_invoices_invoice_number_key UNIQUE (invoice_number);
ALTER TABLE lab_pathology_orders ADD CONSTRAINT lab_pathology_orders_order_number_key UNIQUE (order_number);
ALTER TABLE lab_pathology_report_results ADD CONSTRAINT lab_pathology_report_results_report_id_parameter_id_key UNIQUE (report_id, parameter_id);
ALTER TABLE lab_pathology_report_test_types ADD CONSTRAINT lab_pathology_report_test_types_report_id_test_type_id_key UNIQUE (report_id, test_type_id);
ALTER TABLE lab_pathology_reports ADD CONSTRAINT lab_pathology_reports_report_number_key UNIQUE (report_number);
ALTER TABLE lab_test_consumables ADD CONSTRAINT lab_test_consumables_test_type_id_item_id_key UNIQUE (test_type_id, item_id);
ALTER TABLE patients ADD CONSTRAINT patients_patient_number_key UNIQUE (patient_number);
ALTER TABLE payroll_templates ADD CONSTRAINT payroll_templates_employee_id_key UNIQUE (employee_id);
ALTER TABLE pharmacy_invoices ADD CONSTRAINT pharmacy_invoices_invoice_number_key UNIQUE (invoice_number);
ALTER TABLE profiles ADD CONSTRAINT unique_phone_for_patients UNIQUE (phone) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE queue_positions ADD CONSTRAINT queue_positions_doctor_id_appointment_date_queue_position_key UNIQUE (doctor_id, appointment_date, queue_position);
ALTER TABLE shifts ADD CONSTRAINT shifts_name_key UNIQUE (name);
ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE wards ADD CONSTRAINT wards_name_key UNIQUE (name);

ALTER TABLE doctor_payments ADD CONSTRAINT doctor_payments_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'processing'::text])));
ALTER TABLE doctor_working_hours ADD CONSTRAINT doctor_working_hours_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)));
ALTER TABLE expenses ADD CONSTRAINT expenses_amount_check CHECK ((amount > (0)::numeric));
ALTER TABLE finance_settings ADD CONSTRAINT finance_settings_singleton CHECK ((id = 1));
ALTER TABLE ipd_doctor_payments ADD CONSTRAINT ipd_doctor_payments_charge_type_check CHECK ((charge_type = ANY (ARRAY['doctor'::text, 'anesthesia'::text, 'ota'::text])));
ALTER TABLE ipd_doctor_payments ADD CONSTRAINT ipd_doctor_payments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text])));
ALTER TABLE lab_pathology_report_results ADD CONSTRAINT lab_pathology_report_results_flag_check CHECK (((flag IS NULL) OR (flag = ANY (ARRAY['Low'::text, 'High'::text, 'Borderline'::text]))));
ALTER TABLE lab_pathology_reports ADD CONSTRAINT lab_pathology_reports_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'partial'::text, 'final'::text])));
ALTER TABLE lab_reports ADD CONSTRAINT lab_reports_doctor_check CHECK ((((doctor_id IS NOT NULL) AND (external_doctor_name IS NULL)) OR ((doctor_id IS NULL) AND (external_doctor_name IS NOT NULL))));
ALTER TABLE patient_discounts ADD CONSTRAINT patient_discounts_discount_type_check CHECK ((discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text])));
ALTER TABLE payroll ADD CONSTRAINT payroll_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text])));
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'doctor'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'head_pharmacist'::text, 'assistant_pharmacist'::text, 'salesman_pharmacist'::text, 'patient'::text, 'finance'::text, 'nursing'::text, 'inventory_manager'::text, 'store'::text, 'lab'::text, 'super_admin'::text])));
ALTER TABLE queue_positions ADD CONSTRAINT queue_positions_status_check CHECK ((status = ANY (ARRAY['waiting'::text, 'in_progress'::text, 'completed'::text, 'skipped'::text])));

ALTER TABLE appointments ADD CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES doctors(id);
ALTER TABLE appointments ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id);
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE beds ADD CONSTRAINT beds_ward_id_fkey FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE CASCADE;
ALTER TABLE doctor_payments ADD CONSTRAINT doctor_payments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE;
ALTER TABLE doctor_payments ADD CONSTRAINT doctor_payments_paid_by_fkey FOREIGN KEY (paid_by) REFERENCES profiles(id);
ALTER TABLE doctor_specific_schedules ADD CONSTRAINT doctor_specific_schedules_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE;
ALTER TABLE doctor_working_hours ADD CONSTRAINT doctor_working_hours_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE;
ALTER TABLE doctors ADD CONSTRAINT doctors_fee_updated_by_fkey FOREIGN KEY (fee_updated_by) REFERENCES profiles(id);
ALTER TABLE doctors ADD CONSTRAINT doctors_id_fkey FOREIGN KEY (id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE emergency_expenses ADD CONSTRAINT emergency_expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE expenses ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE hospital_closing_balance ADD CONSTRAINT hospital_closing_balance_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE invoice_audit_log ADD CONSTRAINT invoice_audit_log_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES profiles(id);
ALTER TABLE invoices ADD CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE invoices ADD CONSTRAINT invoices_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id);
ALTER TABLE ipd_admissions ADD CONSTRAINT ipd_admissions_anesthesiologist_id_fkey FOREIGN KEY (anesthesiologist_id) REFERENCES doctors(id);
ALTER TABLE ipd_admissions ADD CONSTRAINT ipd_admissions_bed_id_fkey FOREIGN KEY (bed_id) REFERENCES beds(id) ON DELETE SET NULL;
ALTER TABLE ipd_admissions ADD CONSTRAINT ipd_admissions_ota_id_fkey FOREIGN KEY (ota_id) REFERENCES profiles(id);
ALTER TABLE ipd_admissions ADD CONSTRAINT ipd_admissions_ward_id_fkey FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE SET NULL;
ALTER TABLE ipd_charges ADD CONSTRAINT ipd_charges_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES ipd_admissions(id) ON DELETE CASCADE;
ALTER TABLE ipd_charges ADD CONSTRAINT ipd_charges_anesthesiologist_id_fkey FOREIGN KEY (anesthesiologist_id) REFERENCES doctors(id);
ALTER TABLE ipd_charges ADD CONSTRAINT ipd_charges_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES doctors(id);
ALTER TABLE ipd_charges ADD CONSTRAINT ipd_charges_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES ipd_invoices(id) ON DELETE SET NULL;
ALTER TABLE ipd_doctor_payments ADD CONSTRAINT ipd_doctor_payments_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES ipd_admissions(id);
ALTER TABLE ipd_doctor_payments ADD CONSTRAINT ipd_doctor_payments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES doctors(id);
ALTER TABLE ipd_doctor_payments ADD CONSTRAINT ipd_doctor_payments_ota_id_fkey FOREIGN KEY (ota_id) REFERENCES profiles(id);
ALTER TABLE ipd_doctor_payments ADD CONSTRAINT ipd_doctor_payments_paid_by_fkey FOREIGN KEY (paid_by) REFERENCES auth.users(id);
ALTER TABLE ipd_invoices ADD CONSTRAINT ipd_invoices_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES ipd_admissions(id) ON DELETE CASCADE;
ALTER TABLE ipd_lab_orders ADD CONSTRAINT ipd_lab_orders_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES ipd_admissions(id) ON DELETE CASCADE;
ALTER TABLE ipd_medicine_orders ADD CONSTRAINT ipd_medicine_orders_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES ipd_admissions(id) ON DELETE CASCADE;
ALTER TABLE ipd_medicine_orders ADD CONSTRAINT ipd_medicine_orders_received_by_fkey FOREIGN KEY (received_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ipd_treatment_chart ADD CONSTRAINT ipd_treatment_chart_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES ipd_admissions(id) ON DELETE CASCADE;
ALTER TABLE lab_parameter_subranges ADD CONSTRAINT lab_parameter_subranges_parameter_id_fkey FOREIGN KEY (parameter_id) REFERENCES lab_test_parameters(id) ON DELETE CASCADE;
ALTER TABLE lab_pathology_order_items ADD CONSTRAINT lab_pathology_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES lab_pathology_orders(id) ON DELETE CASCADE;
ALTER TABLE lab_pathology_order_items ADD CONSTRAINT lab_pathology_order_items_test_type_id_fkey FOREIGN KEY (test_type_id) REFERENCES lab_test_types(id) ON DELETE CASCADE;
ALTER TABLE lab_pathology_report_results ADD CONSTRAINT lab_pathology_report_results_parameter_id_fkey FOREIGN KEY (parameter_id) REFERENCES lab_test_parameters(id) ON DELETE CASCADE;
ALTER TABLE lab_pathology_report_results ADD CONSTRAINT lab_pathology_report_results_report_id_fkey FOREIGN KEY (report_id) REFERENCES lab_pathology_reports(id) ON DELETE CASCADE;
ALTER TABLE lab_pathology_report_results ADD CONSTRAINT lab_pathology_report_results_subrange_id_fkey FOREIGN KEY (subrange_id) REFERENCES lab_parameter_subranges(id) ON DELETE SET NULL;
ALTER TABLE lab_pathology_report_test_types ADD CONSTRAINT lab_pathology_report_test_types_report_id_fkey FOREIGN KEY (report_id) REFERENCES lab_pathology_reports(id) ON DELETE CASCADE;
ALTER TABLE lab_pathology_report_test_types ADD CONSTRAINT lab_pathology_report_test_types_test_type_id_fkey FOREIGN KEY (test_type_id) REFERENCES lab_test_types(id) ON DELETE CASCADE;
ALTER TABLE lab_pathology_reports ADD CONSTRAINT fk_lab_pathology_reports_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
ALTER TABLE lab_reports ADD CONSTRAINT lab_reports_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES doctors(id);
ALTER TABLE lab_reports ADD CONSTRAINT lab_reports_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id);
ALTER TABLE lab_reports ADD CONSTRAINT lab_reports_test_id_fkey FOREIGN KEY (test_id) REFERENCES lab_tests(id);
ALTER TABLE lab_stock_batches ADD CONSTRAINT lab_stock_batches_item_id_fkey FOREIGN KEY (item_id) REFERENCES lab_inventory_items(id) ON DELETE CASCADE;
ALTER TABLE lab_stock_consumption ADD CONSTRAINT lab_stock_consumption_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES lab_stock_batches(id) ON DELETE SET NULL;
ALTER TABLE lab_stock_consumption ADD CONSTRAINT lab_stock_consumption_item_id_fkey FOREIGN KEY (item_id) REFERENCES lab_inventory_items(id) ON DELETE SET NULL;
ALTER TABLE lab_stock_consumption ADD CONSTRAINT lab_stock_consumption_test_type_id_fkey FOREIGN KEY (test_type_id) REFERENCES lab_test_types(id) ON DELETE SET NULL;
ALTER TABLE lab_store_batches ADD CONSTRAINT lab_store_batches_item_id_fkey FOREIGN KEY (item_id) REFERENCES lab_inventory_items(id) ON DELETE CASCADE;
ALTER TABLE lab_test_consumables ADD CONSTRAINT lab_test_consumables_item_id_fkey FOREIGN KEY (item_id) REFERENCES lab_inventory_items(id) ON DELETE CASCADE;
ALTER TABLE lab_test_consumables ADD CONSTRAINT lab_test_consumables_test_type_id_fkey FOREIGN KEY (test_type_id) REFERENCES lab_test_types(id) ON DELETE CASCADE;
ALTER TABLE lab_test_parameters ADD CONSTRAINT lab_test_parameters_test_type_id_fkey FOREIGN KEY (test_type_id) REFERENCES lab_test_types(id) ON DELETE CASCADE;
ALTER TABLE medical_records ADD CONSTRAINT medical_records_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES doctors(id);
ALTER TABLE medical_records ADD CONSTRAINT medical_records_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id);
ALTER TABLE miscellaneous_income ADD CONSTRAINT miscellaneous_income_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE ot_expenses ADD CONSTRAINT ot_expenses_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES ot_operations(id) ON DELETE CASCADE;
ALTER TABLE ot_schedules ADD CONSTRAINT ot_schedules_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES doctors(id);
ALTER TABLE ot_schedules ADD CONSTRAINT ot_schedules_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES ot_operations(id);
ALTER TABLE ot_schedules ADD CONSTRAINT ot_schedules_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id);
ALTER TABLE ot_schedules ADD CONSTRAINT ot_schedules_room_id_fkey FOREIGN KEY (room_id) REFERENCES ot_rooms(id);
ALTER TABLE patient_discounts ADD CONSTRAINT patient_discounts_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE patient_discounts ADD CONSTRAINT patient_discounts_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
ALTER TABLE patient_documents ADD CONSTRAINT patient_documents_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
ALTER TABLE patient_documents ADD CONSTRAINT patient_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES profiles(id);
ALTER TABLE patients ADD CONSTRAINT patients_guardian_id_fkey FOREIGN KEY (guardian_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE patients ADD CONSTRAINT patients_id_fkey FOREIGN KEY (id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE payroll ADD CONSTRAINT payroll_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE payroll_templates ADD CONSTRAINT payroll_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE pharmacy_account ADD CONSTRAINT pharmacy_account_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE pharmacy_expenses ADD CONSTRAINT pharmacy_expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE pharmacy_invoice_items ADD CONSTRAINT pharmacy_invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES pharmacy_invoices(id) ON DELETE CASCADE;
ALTER TABLE pharmacy_invoice_items ADD CONSTRAINT pharmacy_invoice_items_medicine_id_fkey FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE SET NULL;
ALTER TABLE postop_progress_entries ADD CONSTRAINT postop_progress_entries_ot_schedule_id_fkey FOREIGN KEY (ot_schedule_id) REFERENCES ot_schedules(id) ON DELETE CASCADE;
ALTER TABLE profiles ADD CONSTRAINT profiles_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id);
ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE queue_positions ADD CONSTRAINT queue_positions_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE;
ALTER TABLE queue_positions ADD CONSTRAINT queue_positions_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES doctors(id);
ALTER TABLE refunds ADD CONSTRAINT refunds_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES profiles(id);
ALTER TABLE refunds ADD CONSTRAINT refunds_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES profiles(id);
ALTER TABLE staff_shift_closings ADD CONSTRAINT staff_shift_closings_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES profiles(id);
ALTER TABLE staff_shift_closings ADD CONSTRAINT staff_shift_closings_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE users ADD CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id);
ALTER TABLE xray_reports ADD CONSTRAINT xray_reports_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES profiles(id);
ALTER TABLE xray_reports ADD CONSTRAINT xray_reports_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES profiles(id);
ALTER TABLE xray_reports ADD CONSTRAINT xray_reports_test_id_fkey FOREIGN KEY (test_id) REFERENCES xray_tests(id);

-- ============ INDEXES ============
CREATE UNIQUE INDEX IF NOT EXISTS hospital_services_name_lower_uidx ON public.hospital_services USING btree (lower(name));
CREATE INDEX IF NOT EXISTS idx_anesthesia_notes_admission ON public.anesthesia_notes USING btree (admission_id);
CREATE INDEX IF NOT EXISTS idx_anesthesia_notes_ot_booking ON public.anesthesia_notes USING btree (ot_booking_id);
CREATE INDEX IF NOT EXISTS idx_anesthesia_notes_patient ON public.anesthesia_notes USING btree (patient_id);
CREATE INDEX IF NOT EXISTS idx_beds_status ON public.beds USING btree (status);
CREATE INDEX IF NOT EXISTS idx_beds_ward ON public.beds USING btree (ward_id);
CREATE INDEX IF NOT EXISTS idx_chart_admission ON public.ipd_treatment_chart USING btree (admission_id);
CREATE INDEX IF NOT EXISTS idx_chart_recorded_at ON public.ipd_treatment_chart USING btree (recorded_at);
CREATE INDEX IF NOT EXISTS idx_client_error_logs_level ON public.client_error_logs USING btree (level);
CREATE INDEX IF NOT EXISTS idx_client_error_logs_occurred_at ON public.client_error_logs USING btree (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_error_logs_user_id ON public.client_error_logs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_daily_closings_date ON public.daily_closings USING btree (closing_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses USING btree (category);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses USING btree (expense_date);
CREATE INDEX IF NOT EXISTS idx_ipd_admissions_anesthesiologist_id ON public.ipd_admissions USING btree (anesthesiologist_id);
CREATE INDEX IF NOT EXISTS idx_ipd_admissions_bed ON public.ipd_admissions USING btree (bed_id);
CREATE INDEX IF NOT EXISTS idx_ipd_admissions_doctor ON public.ipd_admissions USING btree (doctor_id);
CREATE INDEX IF NOT EXISTS idx_ipd_admissions_ota_id ON public.ipd_admissions USING btree (ota_id);
CREATE INDEX IF NOT EXISTS idx_ipd_admissions_patient ON public.ipd_admissions USING btree (patient_id);
CREATE INDEX IF NOT EXISTS idx_ipd_admissions_status ON public.ipd_admissions USING btree (status);
CREATE INDEX IF NOT EXISTS idx_ipd_charges_admission ON public.ipd_charges USING btree (admission_id);
CREATE INDEX IF NOT EXISTS idx_ipd_charges_assigned_to ON public.ipd_charges USING btree (assigned_to);
CREATE INDEX IF NOT EXISTS idx_ipd_charges_doctor_id ON public.ipd_charges USING btree (doctor_id);
CREATE INDEX IF NOT EXISTS idx_ipd_charges_invoice ON public.ipd_charges USING btree (invoice_id);
CREATE INDEX IF NOT EXISTS idx_ipd_charges_type ON public.ipd_charges USING btree (charge_type);
CREATE INDEX IF NOT EXISTS idx_ipd_doctor_payments_admission_id ON public.ipd_doctor_payments USING btree (admission_id);
CREATE INDEX IF NOT EXISTS idx_ipd_doctor_payments_doctor_id ON public.ipd_doctor_payments USING btree (doctor_id);
CREATE INDEX IF NOT EXISTS idx_ipd_doctor_payments_ota_id ON public.ipd_doctor_payments USING btree (ota_id);
CREATE INDEX IF NOT EXISTS idx_ipd_doctor_payments_status ON public.ipd_doctor_payments USING btree (status);
CREATE INDEX IF NOT EXISTS idx_ipd_lab_admission ON public.ipd_lab_orders USING btree (admission_id);
CREATE INDEX IF NOT EXISTS idx_lab_parameter_subranges_param ON public.lab_parameter_subranges USING btree (parameter_id);
CREATE INDEX IF NOT EXISTS idx_lab_pathology_reports_created ON public.lab_pathology_reports USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lab_pathology_reports_patient ON public.lab_pathology_reports USING btree (patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_pathology_reports_status ON public.lab_pathology_reports USING btree (status);
CREATE INDEX IF NOT EXISTS idx_lab_stock_batches_expiry ON public.lab_stock_batches USING btree (expiry_date);
CREATE INDEX IF NOT EXISTS idx_lab_stock_batches_item ON public.lab_stock_batches USING btree (item_id);
CREATE INDEX IF NOT EXISTS idx_lab_stock_consumption_item ON public.lab_stock_consumption USING btree (item_id);
CREATE INDEX IF NOT EXISTS idx_lab_stock_consumption_report ON public.lab_stock_consumption USING btree (report_id);
CREATE INDEX IF NOT EXISTS idx_lab_store_batches_expiry ON public.lab_store_batches USING btree (expiry_date);
CREATE INDEX IF NOT EXISTS idx_lab_store_batches_item ON public.lab_store_batches USING btree (item_id);
CREATE INDEX IF NOT EXISTS idx_lab_test_consumables_test ON public.lab_test_consumables USING btree (test_type_id);
CREATE INDEX IF NOT EXISTS idx_lab_test_parameters_test_type ON public.lab_test_parameters USING btree (test_type_id);
CREATE INDEX IF NOT EXISTS idx_med_orders_admission ON public.ipd_medicine_orders USING btree (admission_id);
CREATE INDEX IF NOT EXISTS idx_med_orders_status ON public.ipd_medicine_orders USING btree (status);
CREATE INDEX IF NOT EXISTS idx_pathology_order_items_order ON public.lab_pathology_order_items USING btree (order_id);
CREATE INDEX IF NOT EXISTS idx_pathology_orders_lab_status ON public.lab_pathology_orders USING btree (lab_status);
CREATE INDEX IF NOT EXISTS idx_pathology_orders_patient ON public.lab_pathology_orders USING btree (patient_id);
CREATE INDEX IF NOT EXISTS idx_pathology_orders_payment ON public.lab_pathology_orders USING btree (payment_status);
CREATE INDEX IF NOT EXISTS idx_pathology_results_report ON public.lab_pathology_report_results USING btree (report_id);
CREATE INDEX IF NOT EXISTS idx_pathology_rtt_report ON public.lab_pathology_report_test_types USING btree (report_id);
CREATE INDEX IF NOT EXISTS idx_patients_cnic ON public.patients USING btree (cnic);
CREATE INDEX IF NOT EXISTS idx_patients_guardian_id ON public.patients USING btree (guardian_id);
CREATE INDEX IF NOT EXISTS idx_payroll_employee_id ON public.payroll USING btree (employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_pay_period ON public.payroll USING btree (pay_period);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON public.payroll USING btree (status);
CREATE INDEX IF NOT EXISTS idx_payroll_templates_employee_id ON public.payroll_templates USING btree (employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_templates_is_active ON public.payroll_templates USING btree (is_active);
CREATE INDEX IF NOT EXISTS invoice_audit_changed_at ON public.invoice_audit_log USING btree (changed_at DESC);
CREATE INDEX IF NOT EXISTS invoice_audit_invoice ON public.invoice_audit_log USING btree (invoice_id);
CREATE UNIQUE INDEX IF NOT EXISTS lab_tests_name_lower_uidx ON public.lab_tests USING btree (lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS patient_discounts_patient_service_unique ON public.patient_discounts USING btree (patient_id, service_type) WHERE ((is_active = true) AND (used_at IS NULL));
CREATE UNIQUE INDEX IF NOT EXISTS xray_tests_name_lower_uidx ON public.xray_tests USING btree (lower(name));

-- ============ FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.auto_assign_queue_position()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE next_pos INTEGER; appointment_date_only DATE;
BEGIN
  appointment_date_only := NEW.appointment_date::DATE;
  next_pos := get_next_queue_position(NEW.doctor_id, appointment_date_only);
  INSERT INTO public.queue_positions (appointment_id, doctor_id, appointment_date, queue_position) VALUES (NEW.id, NEW.doctor_id, appointment_date_only, next_pos);
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.auto_cancel_overdue_appointments()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE overdue_count INTEGER; check_time TIMESTAMPTZ; rec RECORD;
BEGIN
  check_time := now();
  UPDATE public.appointments SET status = 'cancelled', updated_at = check_time FROM public.queue_positions qp WHERE appointments.id = qp.appointment_id AND appointments.payment_status = 'pending' AND appointments.booking_type = 'online' AND appointments.payment_due_time < check_time AND appointments.status = 'scheduled' AND DATE(appointments.appointment_date) = DATE(check_time) AND qp.queue_position > 1;
  GET DIAGNOSTICS overdue_count = ROW_COUNT;
END; $function$;

CREATE OR REPLACE FUNCTION public.auto_set_xray_paid()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF (NEW.description ILIKE '%xray%' OR NEW.description ILIKE '%x-ray%' OR NEW.description ILIKE '%radiology%' OR NEW.invoice_number LIKE 'XRAY-%') THEN
    NEW.status = 'paid'; NEW.paid_at = now();
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.auto_set_xray_reports_paid()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$ BEGIN NEW.status = 'paid'; RETURN NEW; END; $function$;

CREATE OR REPLACE FUNCTION public.calculate_doctor_earnings(p_doctor_id uuid, p_start_date date, p_end_date date)
 RETURNS TABLE(appointment_count integer, ot_count integer, consultation_earnings numeric, ot_earnings numeric, total_earnings numeric)
 LANGUAGE plpgsql
AS $function$
DECLARE appointment_cnt INTEGER; ot_cnt INTEGER; consult_earnings NUMERIC; ot_earnings_total NUMERIC; total_earn NUMERIC;
BEGIN
  SELECT COUNT(*) INTO appointment_cnt FROM public.appointments a WHERE a.doctor_id = p_doctor_id AND a.status = 'completed' AND a.payment_status = 'paid' AND a.cleared_at IS NULL AND DATE(a.appointment_date) BETWEEN p_start_date AND p_end_date;
  SELECT COUNT(*) INTO ot_cnt FROM public.ot_schedules ots WHERE ots.doctor_id = p_doctor_id AND ots.status = 'completed' AND ots.operation_date BETWEEN p_start_date AND p_end_date;
  SELECT COALESCE(SUM(a.consultation_fee_at_time), 0) INTO consult_earnings FROM public.appointments a WHERE a.doctor_id = p_doctor_id AND a.status = 'completed' AND a.payment_status = 'paid' AND a.cleared_at IS NULL AND DATE(a.appointment_date) BETWEEN p_start_date AND p_end_date;
  SELECT COALESCE(SUM(ots.doctor_expense), 0) INTO ot_earnings_total FROM public.ot_schedules ots WHERE ots.doctor_id = p_doctor_id AND ots.status = 'completed' AND ots.operation_date BETWEEN p_start_date AND p_end_date;
  total_earn := consult_earnings + ot_earnings_total;
  RETURN QUERY SELECT appointment_cnt, ot_cnt, consult_earnings, ot_earnings_total, total_earn;
END; $function$;

CREATE OR REPLACE FUNCTION public.consume_lab_test_stock(p_item_id uuid, p_tests integer, p_test_type_id uuid DEFAULT NULL::uuid, p_report_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_remaining INTEGER := p_tests;
  v_take INTEGER;
  b RECORD;
BEGIN
  IF p_item_id IS NULL OR p_tests IS NULL OR p_tests <= 0 THEN
    RETURN 0;
  END IF;

  FOR b IN
    SELECT id, tests_remaining
    FROM public.lab_stock_batches
    WHERE item_id = p_item_id
      AND is_active
      AND tests_remaining > 0
      AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
    ORDER BY expiry_date NULLS LAST, created_at
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_take := LEAST(b.tests_remaining, v_remaining);
    UPDATE public.lab_stock_batches
      SET tests_remaining = tests_remaining - v_take
      WHERE id = b.id;
    INSERT INTO public.lab_stock_consumption
      (batch_id, item_id, test_type_id, report_id, tests_consumed, consumed_by)
      VALUES (b.id, p_item_id, p_test_type_id, p_report_id, v_take, auth.uid());
    v_remaining := v_remaining - v_take;
  END LOOP;

  RETURN p_tests - v_remaining;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_daily_closing(p_closing_date date, p_closing_time timestamp with time zone, p_day_name text, p_hospital_revenue numeric, p_pharmacy_revenue numeric, p_pharmacy_profit numeric, p_total_expenses numeric, p_total_refunds numeric, p_net_profit numeric, p_transactions_data jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE closing_id UUID;
BEGIN
  INSERT INTO public.daily_closings (closing_date, closing_time, day_name, hospital_revenue, pharmacy_revenue, pharmacy_profit, total_expenses, total_refunds, net_profit, transactions_data) VALUES (p_closing_date, p_closing_time, p_day_name, p_hospital_revenue, p_pharmacy_revenue, p_pharmacy_profit, p_total_expenses, p_total_refunds, p_net_profit, p_transactions_data) RETURNING id INTO closing_id;
  RETURN closing_id;
END; $function$;

CREATE OR REPLACE FUNCTION public.create_family_member(p_guardian_phone text, p_first_name text, p_last_name text, p_relation text, p_cnic text DEFAULT NULL::text, p_date_of_birth date DEFAULT NULL::date, p_province text DEFAULT NULL::text, p_city text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE
  v_phone TEXT := trim(p_guardian_phone);
  v_guardian_id UUID;
  v_new_user_id UUID;
  v_email TEXT;
  v_suffix INT;
  v_patient_number TEXT;
BEGIN
  IF v_phone IS NULL OR v_phone = '' THEN
    RAISE EXCEPTION 'PHONE_REQUIRED';
  END IF;
  IF p_first_name IS NULL OR trim(p_first_name) = '' THEN
    RAISE EXCEPTION 'NAME_REQUIRED';
  END IF;

  -- Find guardian by phone (the patient who owns the phone number)
  SELECT p.id INTO v_guardian_id
  FROM public.profiles p
  JOIN public.patients pt ON pt.id = p.id
  WHERE p.phone = v_phone
    AND p.role = 'patient'
    AND pt.guardian_id IS NULL  -- guardian must not itself be a family member
  ORDER BY p.created_at
  LIMIT 1;

  IF v_guardian_id IS NULL THEN
    RAISE EXCEPTION 'GUARDIAN_NOT_FOUND';
  END IF;

  -- Generate a unique synthetic email for the family member.
  SELECT COALESCE(COUNT(*), 0) + 1 INTO v_suffix
  FROM public.patients WHERE guardian_id = v_guardian_id;
  v_email := v_phone || '+' || v_suffix || '@patient.local';

  WHILE EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) LOOP
    v_suffix := v_suffix + 1;
    v_email := v_phone || '+' || v_suffix || '@patient.local';
  END LOOP;

  v_new_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_new_user_id, 'authenticated', 'authenticated',
    v_email,
    extensions.crypt(COALESCE(NULLIF(p_cnic, ''), v_phone), extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'role', 'patient'),
    now(), now(), '', '', '', ''
  );

  -- Profile: phone stays NULL so the unique_phone_for_patients constraint is not violated
  INSERT INTO public.profiles (id, email, first_name, last_name, role, phone)
  VALUES (v_new_user_id, v_email, p_first_name, p_last_name, 'patient', NULL)
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role;

  INSERT INTO public.patients (
    id, cnic, date_of_birth, province, city,
    patient_number, guardian_id, relation
  )
  VALUES (
    v_new_user_id,
    COALESCE(p_cnic, ''),
    p_date_of_birth,
    p_province,
    p_city,
    public.generate_patient_number(),
    v_guardian_id,
    p_relation
  )
  RETURNING patient_number INTO v_patient_number;

  RETURN jsonb_build_object(
    'user_id', v_new_user_id,
    'patient_number', v_patient_number,
    'guardian_id', v_guardian_id,
    'guardian_phone', v_phone,
    'relation', p_relation
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_patient_account(p_phone text, p_cnic text, p_first_name text, p_last_name text, p_province text DEFAULT NULL::text, p_city text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE
  v_phone text := trim(p_phone);
  v_email text;
  v_user_id uuid;
  v_patient_number text;
BEGIN
  IF v_phone IS NULL OR v_phone = '' THEN
    RAISE EXCEPTION 'PHONE_REQUIRED';
  END IF;

  v_email := v_phone || '@patient.local';

  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE phone = v_phone OR email = v_email
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = v_email
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.patients WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'DUPLICATE_PHONE';
  END IF;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated', v_email,
      extensions.crypt(p_cnic, extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'role', 'patient'),
      now(), now(), '', '', '', ''
    );
  END IF;

  INSERT INTO public.profiles (id, email, first_name, last_name, role, phone)
  VALUES (v_user_id, v_email, p_first_name, p_last_name, 'patient', v_phone)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone;

  INSERT INTO public.patients (id, cnic, province, city, patient_number)
  VALUES (v_user_id, COALESCE(p_cnic, ''), p_province, p_city, public.generate_patient_number())
  ON CONFLICT (id) DO UPDATE SET
    cnic = EXCLUDED.cnic,
    province = EXCLUDED.province,
    city = EXCLUDED.city,
    patient_number = COALESCE(public.patients.patient_number, public.generate_patient_number())
  RETURNING patient_number INTO v_patient_number;

  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'patient_number', v_patient_number,
    'phone', v_phone
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_user_account(p_email text, p_password text, p_first_name text, p_last_name text, p_role text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE
  new_user_id uuid;
  v_email text := lower(trim(p_email));
BEGIN
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'EMAIL_REQUIRED';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email) THEN
    RAISE EXCEPTION 'EMAIL_ALREADY_EXISTS';
  END IF;

  new_user_id := gen_random_uuid();
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  VALUES ('00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated', v_email, extensions.crypt(p_password, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'role', p_role), now(), now(), '', '', '', '');
  RETURN new_user_id;
END; $function$;

CREATE OR REPLACE FUNCTION public.delete_user_safely(user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Never delete the EMERGENCY placeholder patient. Deleting it would remove every
  -- emergency consultation invoice (DELETE FROM public.invoices below) and break
  -- future emergency invoice creation.
  IF user_uuid = '00000000-0000-0000-0000-000000000001' THEN
    RAISE EXCEPTION 'Cannot delete the EMERGENCY placeholder patient';
  END IF;

  -- Delete records where the user is in a required ownership/processor field
  DELETE FROM public.refunds WHERE processed_by = user_uuid;
  DELETE FROM public.staff_shift_closings WHERE staff_id = user_uuid;

  -- Clear optional references that should not block deletion while preserving records
  UPDATE public.expenses SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.miscellaneous_income SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.emergency_expenses SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.hospital_closing_balance SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.invoices SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.doctor_payments SET paid_by = NULL WHERE paid_by = user_uuid;
  UPDATE public.inventory_requests SET approved_by = NULL WHERE approved_by = user_uuid;
  UPDATE public.inventory_requests SET provided_by = NULL WHERE provided_by = user_uuid;
  UPDATE public.overtime_records SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.patient_discounts SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.patient_documents SET uploaded_by = NULL WHERE uploaded_by = user_uuid;
  UPDATE public.payroll SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.payroll_templates SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.pharmacy_account SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.pharmacy_expenses SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.refunds SET doctor_id = NULL WHERE doctor_id = user_uuid;
  UPDATE public.staff_shift_closings SET approved_by = NULL WHERE approved_by = user_uuid;
  UPDATE public.xray_reports SET doctor_id = NULL WHERE doctor_id = user_uuid;

  -- Delete dependent records before deleting appointments/OT schedules/profiles
  DELETE FROM public.queue_positions WHERE appointment_id IN (
    SELECT id FROM public.appointments WHERE patient_id = user_uuid OR doctor_id = user_uuid
  );
  DELETE FROM public.postop_progress_entries WHERE ot_schedule_id IN (
    SELECT id FROM public.ot_schedules WHERE patient_id = user_uuid OR doctor_id = user_uuid
  );

  -- Delete user-owned rows from related tables
  DELETE FROM public.audit_logs WHERE user_id = user_uuid;
  DELETE FROM public.lab_reports WHERE patient_id = user_uuid OR doctor_id = user_uuid;
  DELETE FROM public.lab_stock_usage WHERE used_by = user_uuid;
  DELETE FROM public.medical_records WHERE patient_id = user_uuid OR doctor_id = user_uuid;
  DELETE FROM public.invoices WHERE patient_id = user_uuid;
  DELETE FROM public.patient_documents WHERE patient_id = user_uuid;
  DELETE FROM public.xray_reports WHERE patient_id = user_uuid;
  DELETE FROM public.appointments WHERE patient_id = user_uuid OR doctor_id = user_uuid;
  DELETE FROM public.doctor_availability WHERE doctor_id = user_uuid;
  DELETE FROM public.doctor_daily_status WHERE doctor_id = user_uuid;
  DELETE FROM public.doctor_payments WHERE doctor_id = user_uuid;
  DELETE FROM public.doctor_working_hours WHERE doctor_id = user_uuid;
  DELETE FROM public.doctor_specific_schedules WHERE doctor_id = user_uuid;
  DELETE FROM public.queue_positions WHERE doctor_id = user_uuid;
  DELETE FROM public.ot_schedules WHERE patient_id = user_uuid OR doctor_id = user_uuid;
  DELETE FROM public.payroll WHERE employee_id::text = user_uuid::text;
  DELETE FROM public.payroll_templates WHERE employee_id::text = user_uuid::text;
  DELETE FROM public.overtime_records WHERE employee_id = user_uuid;
  DELETE FROM public.inventory_requests WHERE requested_by = user_uuid;
  DELETE FROM public.patient_discounts WHERE patient_id = user_uuid;
  DELETE FROM public.patients WHERE id = user_uuid;
  DELETE FROM public.doctors WHERE id = user_uuid;
  DELETE FROM public.profiles WHERE id = user_uuid;
  DELETE FROM auth.users WHERE id = user_uuid;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.dispatch_lab_store_to_lab(p_item_id uuid, p_units integer, p_request_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_remaining INTEGER := p_units;
  v_take INTEGER;
  b RECORD;
BEGIN
  IF p_item_id IS NULL OR p_units IS NULL OR p_units <= 0 THEN
    RETURN 0;
  END IF;

  FOR b IN
    SELECT id, units_remaining
    FROM public.lab_store_batches
    WHERE item_id = p_item_id
      AND is_active
      AND units_remaining > 0
      AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
    ORDER BY expiry_date NULLS LAST, created_at
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_take := LEAST(b.units_remaining, v_remaining);
    UPDATE public.lab_store_batches
      SET units_remaining = units_remaining - v_take
      WHERE id = b.id;
    v_remaining := v_remaining - v_take;
  END LOOP;

  RETURN p_units - v_remaining;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_admission_number()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(admission_number FROM 'IPD-([0-9]+)$') AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.ipd_admissions
  WHERE admission_number ~ '^IPD-[0-9]+$';
  RETURN 'IPD-' || LPAD(next_num::TEXT, 6, '0');
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_daily_doctor_payments(target_date date)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  records_count INTEGER;
BEGIN
  WITH doctor_consultations AS (
    SELECT 
      i.doctor_id,
      COUNT(DISTINCT i.id) AS appointment_count,
      COALESCE(SUM(i.amount), 0) AS consultation_earnings
    FROM public.invoices i
    WHERE i.status = 'paid'
      AND i.invoice_number LIKE 'INV-%'
      AND i.created_at::date = target_date
      AND (i.description IS NULL OR LOWER(i.description) NOT LIKE '%emergency%')
      AND i.emergency_patient_data IS NULL
      AND i.doctor_id IS NOT NULL
    GROUP BY i.doctor_id
  ),
  doctor_ot AS (
    SELECT
      o.doctor_id,
      COUNT(DISTINCT o.id) AS ot_count,
      COALESCE(SUM(o.doctor_expense), 0) AS ot_earnings,
      COALESCE(SUM(COALESCE(o.total_cost, 0) - COALESCE(o.doctor_expense, 0)), 0) AS hospital_share
    FROM public.ot_schedules o
    WHERE o.status IN ('completed', 'pending')
      AND o.created_at::date = target_date
      AND o.doctor_id IS NOT NULL
    GROUP BY o.doctor_id
  ),
  ipd_earnings AS (
    SELECT
      a.doctor_id,
      COUNT(DISTINCT inv.admission_id) AS ipd_count,
      COALESCE(SUM(inv.doctor_charges_total), 0) AS ipd_doctor_fees,
      COALESCE(SUM(inv.anesthesia_charges_total), 0) AS ipd_anesthesia_fees
    FROM public.ipd_invoices inv
    JOIN public.ipd_admissions a ON a.id = inv.admission_id
    WHERE inv.finalized_at::date = target_date
      AND a.doctor_id IS NOT NULL
    GROUP BY a.doctor_id
  ),
  combined AS (
    SELECT 
      COALESCE(dc.doctor_id, dot.doctor_id, ie.doctor_id) AS doctor_id,
      COALESCE(dc.appointment_count, 0) AS appointment_count,
      COALESCE(dot.ot_count, 0) AS ot_count,
      COALESCE(dc.consultation_earnings, 0) AS consultation_earnings,
      COALESCE(dot.ot_earnings, 0) AS ot_earnings,
      COALESCE(dot.hospital_share, 0) AS hospital_share,
      COALESCE(ie.ipd_count, 0) AS ipd_count,
      COALESCE(ie.ipd_doctor_fees, 0) AS ipd_doctor_fees,
      COALESCE(ie.ipd_anesthesia_fees, 0) AS ipd_anesthesia_fees
    FROM doctor_consultations dc
    FULL OUTER JOIN doctor_ot dot ON dc.doctor_id = dot.doctor_id
    FULL OUTER JOIN ipd_earnings ie ON COALESCE(dc.doctor_id, dot.doctor_id) = ie.doctor_id
  )
  INSERT INTO public.doctor_payments (
    doctor_id, period_start, period_end,
    appointment_count, ot_count,
    consultation_earnings, ot_earnings, total_earnings,
    hospital_share, doctor_share, hospital_share_percentage, payment_status
  )
  SELECT
    c.doctor_id, target_date, target_date,
    c.appointment_count + c.ipd_count,
    c.ot_count,
    c.consultation_earnings + c.ipd_doctor_fees,
    c.ot_earnings + c.ipd_anesthesia_fees,
    c.consultation_earnings + c.ot_earnings + c.ipd_doctor_fees + c.ipd_anesthesia_fees,
    c.hospital_share,
    c.consultation_earnings + c.ot_earnings + c.ipd_doctor_fees + c.ipd_anesthesia_fees,
    40,
    'pending'
  FROM combined c
  WHERE c.doctor_id IS NOT NULL
  ON CONFLICT (doctor_id, period_start, period_end)
  DO UPDATE SET
    appointment_count = EXCLUDED.appointment_count,
    ot_count = EXCLUDED.ot_count,
    consultation_earnings = EXCLUDED.consultation_earnings,
    ot_earnings = EXCLUDED.ot_earnings,
    total_earnings = EXCLUDED.total_earnings,
    hospital_share = EXCLUDED.hospital_share,
    doctor_share = EXCLUDED.doctor_share,
    payment_status = 'pending',
    updated_at = NOW();

  GET DIAGNOSTICS records_count = ROW_COUNT;
  RETURN records_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_ipd_invoice_number()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'IPDI-([0-9]+)$') AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.ipd_invoices
  WHERE invoice_number ~ '^IPDI-[0-9]+$';
  RETURN 'IPDI-' || LPAD(next_num::TEXT, 6, '0');
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_monthly_payroll(target_month text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  template_record RECORD;
  processed_count INTEGER := 0;
  overtime_total NUMERIC := 0;
  default_overtime_rate NUMERIC := 0;
  fallback_overtime_rate NUMERIC := 0;
  effective_overtime_rate NUMERIC := 0;
  final_allowances NUMERIC;
  final_net NUMERIC;
BEGIN
  SELECT COALESCE(overtime_hourly_rate, 0)
  INTO default_overtime_rate
  FROM public.finance_settings
  WHERE id = 1;

  SELECT COALESCE(overtime_rate, 0)
  INTO fallback_overtime_rate
  FROM public.overtime_records
  WHERE overtime_rate > 0
  ORDER BY created_at DESC
  LIMIT 1;

  effective_overtime_rate := COALESCE(NULLIF(default_overtime_rate, 0), NULLIF(fallback_overtime_rate, 0), 0);

  FOR template_record IN
    SELECT * FROM public.payroll_templates WHERE is_active = true
  LOOP
    SELECT COALESCE(
      SUM(
        CASE
          WHEN COALESCE(overtime_amount, 0) > 0 THEN COALESCE(overtime_amount, 0)
          ELSE COALESCE(overtime_hours, 0) * COALESCE(NULLIF(overtime_rate, 0), effective_overtime_rate, 0)
        END
      ),
      0
    )
    INTO overtime_total
    FROM public.overtime_records
    WHERE (
      employee_id::text = template_record.employee_id::text
      OR LOWER(TRIM(employee_name)) = LOWER(TRIM(template_record.employee_name))
    )
    AND to_char(overtime_date::date, 'YYYY-MM') = target_month;

    final_allowances := COALESCE(template_record.allowances, 0) + overtime_total;
    final_net := COALESCE(template_record.base_salary, 0) + final_allowances - COALESCE(template_record.deductions, 0);

    IF EXISTS (
      SELECT 1
      FROM public.payroll
      WHERE employee_id = template_record.employee_id
        AND pay_period = target_month
        AND status = 'pending'
    ) THEN
      UPDATE public.payroll
      SET
        employee_name = template_record.employee_name,
        role = template_record.role,
        base_salary = template_record.base_salary,
        allowances = final_allowances,
        deductions = template_record.deductions,
        net_salary = final_net,
        updated_at = now()
      WHERE employee_id = template_record.employee_id
        AND pay_period = target_month
        AND status = 'pending';

      processed_count := processed_count + 1;
    ELSIF NOT EXISTS (
      SELECT 1
      FROM public.payroll
      WHERE employee_id = template_record.employee_id
        AND pay_period = target_month
    ) THEN
      INSERT INTO public.payroll (
        employee_id,
        employee_name,
        role,
        base_salary,
        allowances,
        deductions,
        net_salary,
        pay_period,
        status
      ) VALUES (
        template_record.employee_id,
        template_record.employee_name,
        template_record.role,
        template_record.base_salary,
        final_allowances,
        template_record.deductions,
        final_net,
        target_month,
        'pending'
      );

      processed_count := processed_count + 1;
    END IF;
  END LOOP;

  RETURN processed_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_pathology_order_number()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  next_num INTEGER;
  formatted TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 'PATH-([0-9]+)$') AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.lab_pathology_orders
  WHERE order_number ~ '^PATH-[0-9]+$';
  formatted := 'PATH-' || LPAD(next_num::TEXT, 6, '0');
  RETURN formatted;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_patient_number()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE next_num INTEGER; formatted_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(patient_number FROM 'P-(.*)') AS INTEGER)), 0) + 1
  INTO next_num FROM public.patients WHERE patient_number ~ '^P-[0-9]+$';
  formatted_num := 'P-' || LPAD(next_num::TEXT, 5, '0');
  RETURN formatted_num;
END; $function$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT CASE WHEN role = 'super_admin' THEN 'admin' ELSE role END
  FROM public.profiles WHERE id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.get_last_daily_closing()
 RETURNS TABLE(id uuid, closing_date date, closing_time timestamp with time zone, day_name text, hospital_revenue numeric, pharmacy_revenue numeric, pharmacy_profit numeric, total_expenses numeric, total_refunds numeric, net_profit numeric, transactions_data jsonb, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN RETURN QUERY SELECT dc.* FROM public.daily_closings dc ORDER BY dc.closing_date DESC LIMIT 1; END; $function$;

CREATE OR REPLACE FUNCTION public.get_next_ot_queue_position(room_uuid uuid, operation_date_param date)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE next_position INTEGER;
BEGIN
  SELECT COALESCE(MAX(queue_position), 0) + 1 INTO next_position FROM public.ot_schedules WHERE room_id = room_uuid AND operation_date = operation_date_param;
  RETURN next_position;
END; $function$;

CREATE OR REPLACE FUNCTION public.get_next_queue_position(doctor_uuid uuid, appointment_date_param date)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE next_position INTEGER;
BEGIN
  SELECT COALESCE(MAX(queue_position), 0) + 1 INTO next_position FROM public.queue_positions WHERE doctor_id = doctor_uuid AND appointment_date = appointment_date_param;
  RETURN next_position;
END; $function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE extracted_phone TEXT;
BEGIN
  IF NEW.email LIKE '%@patient.local' THEN
    extracted_phone := REPLACE(NEW.email, '@patient.local', '');
    INSERT INTO public.profiles (id, email, first_name, last_name, role, phone)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'first_name', ''), COALESCE(NEW.raw_user_meta_data->>'last_name', ''), COALESCE(NEW.raw_user_meta_data->>'role', 'patient'), extracted_phone);
  ELSE
    INSERT INTO public.profiles (id, email, first_name, last_name, role, phone)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'first_name', ''), COALESCE(NEW.raw_user_meta_data->>'last_name', ''), COALESCE(NEW.raw_user_meta_data->>'role', 'patient'), NEW.raw_user_meta_data->>'phone');
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.log_invoice_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  changed text[]     := ARRAY[]::text[];
  op      text       := 'updated';
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF NEW.amount IS DISTINCT FROM OLD.amount THEN
      changed := array_append(changed, 'amount');
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      changed := array_append(changed, 'status');
    END IF;
    IF NEW.description IS DISTINCT FROM OLD.description THEN
      changed := array_append(changed, 'description');
    END IF;
    IF array_length(changed, 1) IS NULL THEN RETURN NEW; END IF;

    -- Priority 1: cancellation (status → cancelled)
    IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
      op := 'cancelled';
    -- Priority 2: genuine discount (amount ↓ + "[Adjusted:" marker)
    ELSIF (NEW.amount IS NOT NULL AND OLD.amount IS NOT NULL
        AND NEW.amount < OLD.amount
        AND NEW.description LIKE '%[Adjusted:%') THEN
      op := 'discounted';
    END IF;

    BEGIN
      INSERT INTO public.invoice_audit_log(invoice_id, invoice_number, operation, changed_by,
        old_amount, new_amount, old_status, new_status, old_row, new_row, changed_fields)
      VALUES (NEW.id, NEW.invoice_number, op, auth.uid(),
        OLD.amount, NEW.amount, OLD.status, NEW.status, to_jsonb(OLD), to_jsonb(NEW), changed);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'invoice_audit_log insert failed for invoice %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    BEGIN
      INSERT INTO public.invoice_audit_log(invoice_id, invoice_number, operation, changed_by,
        new_amount, new_status, new_row)
      VALUES (NEW.id, NEW.invoice_number, 'created', auth.uid(), NEW.amount, NEW.status, to_jsonb(NEW));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'invoice_audit_log insert failed for invoice %: %', NEW.id, SQLERRM;
    END;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    BEGIN
      INSERT INTO public.invoice_audit_log(invoice_id, invoice_number, operation, changed_by,
        old_amount, old_status, old_row)
      VALUES (OLD.id, OLD.invoice_number, 'deleted', auth.uid(), OLD.amount, OLD.status, to_jsonb(OLD));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'invoice_audit_log insert failed for invoice %: %', OLD.id, SQLERRM;
    END;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $function$;

CREATE OR REPLACE FUNCTION public.lookup_guardian_by_phone(p_phone text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_phone TEXT := trim(p_phone);
  v_result JSONB;
  v_member_count INT;
BEGIN
  SELECT jsonb_build_object(
    'guardian_id', p.id,
    'first_name', p.first_name,
    'last_name', p.last_name,
    'patient_number', pt.patient_number,
    'phone', p.phone
  )
  INTO v_result
  FROM public.profiles p
  JOIN public.patients pt ON pt.id = p.id
  WHERE p.phone = v_phone
    AND p.role = 'patient'
    AND pt.guardian_id IS NULL
  ORDER BY p.created_at
  LIMIT 1;

  IF v_result IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*) INTO v_member_count
  FROM public.patients
  WHERE guardian_id = (v_result->>'guardian_id')::uuid;

  RETURN v_result || jsonb_build_object('family_member_count', v_member_count);
END;
$function$;

CREATE OR REPLACE FUNCTION public.reorder_queue_after_cancellation(p_doctor_id uuid, p_appointment_date date, p_cancelled_position integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE queue_record RECORD; new_position INTEGER;
BEGIN
  new_position := p_cancelled_position;
  FOR queue_record IN SELECT id, queue_position FROM public.queue_positions WHERE doctor_id = p_doctor_id AND appointment_date = p_appointment_date AND queue_position > p_cancelled_position AND status IN ('waiting','in_progress') ORDER BY queue_position ASC
  LOOP
    UPDATE public.queue_positions SET queue_position = new_position, updated_at = now() WHERE id = queue_record.id;
    new_position := new_position + 1;
  END LOOP;
END; $function$;

CREATE OR REPLACE FUNCTION public.set_admission_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.admission_number IS NULL OR NEW.admission_number = '' THEN
    NEW.admission_number := public.generate_admission_number();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_appointment_consultation_fee()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE doctor_fee NUMERIC;
BEGIN
  SELECT COALESCE(consultation_fee, 0) INTO doctor_fee FROM public.doctors WHERE id = NEW.doctor_id;
  NEW.consultation_fee_at_time := doctor_fee;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.set_ipd_invoice_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := public.generate_ipd_invoice_number();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_patient_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.id = COALESCE(NEW.id, gen_random_uuid());
  IF NEW.patient_number IS NULL THEN NEW.patient_number = generate_patient_number(); END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.sync_bed_status_on_admission()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- On INSERT/UPDATE, if admitted with a bed -> mark bed occupied
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.status = 'admitted' AND NEW.bed_id IS NOT NULL THEN
      UPDATE public.beds SET status = 'occupied', updated_at = now() WHERE id = NEW.bed_id;
    END IF;
    -- If discharged/cancelled, free the previously held bed
    IF NEW.status IN ('discharged','cancelled') AND NEW.bed_id IS NOT NULL THEN
      UPDATE public.beds SET status = 'available', updated_at = now() WHERE id = NEW.bed_id;
    END IF;
    -- If bed changed, free the old one
    IF TG_OP = 'UPDATE' AND OLD.bed_id IS NOT NULL AND OLD.bed_id IS DISTINCT FROM NEW.bed_id THEN
      UPDATE public.beds SET status = 'available', updated_at = now() WHERE id = OLD.bed_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_lab_report_amount_from_invoice()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.amount IS DISTINCT FROM OLD.amount THEN
    UPDATE public.lab_pathology_reports
       SET amount = NEW.amount,
           updated_at = now()
     WHERE invoice_id = NEW.id
       AND amount IS DISTINCT FROM NEW.amount;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_pathology_amounts_from_invoice()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.amount IS DISTINCT FROM OLD.amount THEN
    UPDATE public.lab_pathology_orders
       SET total_amount = NEW.amount,
           updated_at = now()
     WHERE invoice_id = NEW.id
       AND total_amount IS DISTINCT FROM NEW.amount;

    UPDATE public.lab_pathology_reports
       SET amount = NEW.amount,
           updated_at = now()
     WHERE invoice_id = NEW.id
       AND amount IS DISTINCT FROM NEW.amount;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_queue_on_completion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.queue_positions SET status = 'completed', updated_at = now() WHERE appointment_id = NEW.id;
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_pathology_report(p_report_number text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'report_number', r.report_number,
    'status', r.status,
    'reported_at', r.reported_at,
    'created_at', r.created_at,
    'patient_number', pt.patient_number,
    'first_name', pr.first_name,
    'last_name', pr.last_name
  )
  INTO result
  FROM public.lab_pathology_reports r
  LEFT JOIN public.patients pt ON pt.id = r.patient_id
  LEFT JOIN public.profiles pr ON pr.id = r.patient_id
  WHERE r.report_number = p_report_number
  LIMIT 1;
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_pathology_report_full(p_report_number text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_report RECORD;
  v_result jsonb;
  v_test_types jsonb;
BEGIN
  SELECT r.*, pt.patient_number, pr.first_name, pr.last_name, pr.phone
  INTO v_report
  FROM public.lab_pathology_reports r
  LEFT JOIN public.patients pt ON pt.id = r.patient_id
  LEFT JOIN public.profiles pr ON pr.id = r.patient_id
  WHERE r.report_number = p_report_number
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(tt_data ORDER BY sort_order), '[]'::jsonb)
  INTO v_test_types
  FROM (
    SELECT
      rtt.sort_order,
      jsonb_build_object(
        'name', tt.name,
        'report_category', tt.report_category,
        'method', tt.method,
        'notes', tt.notes,
        'parameters', (
          SELECT COALESCE(jsonb_agg(p_data ORDER BY p_sort), '[]'::jsonb)
          FROM (
            SELECT
              p.sort_order AS p_sort,
              jsonb_build_object(
                'parameter_name', p.parameter_name,
                'category_heading', p.category_heading,
                'unit', p.unit,
                'ref_display', p.ref_display,
                'ref_min', p.ref_min,
                'ref_max', p.ref_max,
                'display_all_subranges', p.display_all_subranges,
                'result_value', res.result_value,
                'flag', res.flag,
                'subrange_used', res.subrange_used,
                'subrange_id', res.subrange_id,
                'subranges', (
                  SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'id', sr.id,
                    'label', sr.label,
                    'ref_min', sr.ref_min,
                    'ref_max', sr.ref_max,
                    'ref_display', sr.ref_display
                  ) ORDER BY sr.sort_order), '[]'::jsonb)
                  FROM public.lab_parameter_subranges sr
                  WHERE sr.parameter_id = p.id
                )
              ) AS p_data
            FROM public.lab_test_parameters p
            LEFT JOIN public.lab_pathology_report_results res
              ON res.parameter_id = p.id AND res.report_id = v_report.id
            WHERE p.test_type_id = tt.id
          ) sub_p
        )
      ) AS tt_data
    FROM public.lab_pathology_report_test_types rtt
    JOIN public.lab_test_types tt ON tt.id = rtt.test_type_id
    WHERE rtt.report_id = v_report.id
  ) sub_tt;

  v_result := jsonb_build_object(
    'report_number', v_report.report_number,
    'status', v_report.status,
    'reported_at', v_report.reported_at,
    'collected_at', v_report.collected_at,
    'registered_at', v_report.registered_at,
    'created_at', v_report.created_at,
    'sample_type', v_report.sample_type,
    'instrument', v_report.instrument,
    'referred_by', v_report.referred_by,
    'collection_address', v_report.collection_address,
    'interpretation', v_report.interpretation,
    'patient_name', COALESCE(v_report.patient_name_snapshot, concat_ws(' ', v_report.first_name, v_report.last_name)),
    'patient_age', v_report.patient_age_snapshot,
    'patient_sex', v_report.patient_sex_snapshot,
    'patient_number', v_report.patient_number,
    'phone', v_report.phone,
    'test_types', v_test_types
  );

  RETURN v_result;
END;
$function$;

-- ============ TRIGGERS ============
DROP TRIGGER IF EXISTS set_consultation_fee_trigger ON appointments;
CREATE TRIGGER set_consultation_fee_trigger BEFORE INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION set_appointment_consultation_fee();
DROP TRIGGER IF EXISTS set_updated_at_appointments ON appointments;
CREATE TRIGGER set_updated_at_appointments BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trigger_auto_assign_queue_position ON appointments;
CREATE TRIGGER trigger_auto_assign_queue_position AFTER INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION auto_assign_queue_position();
DROP TRIGGER IF EXISTS trigger_update_queue_on_completion ON appointments;
CREATE TRIGGER trigger_update_queue_on_completion AFTER UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION update_queue_on_completion();
DROP TRIGGER IF EXISTS update_assessment_entries_updated_at ON assessment_entries;
CREATE TRIGGER update_assessment_entries_updated_at BEFORE UPDATE ON public.assessment_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_beds_updated ON beds;
CREATE TRIGGER trg_beds_updated BEFORE UPDATE ON public.beds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_daily_closings_updated_at ON daily_closings;
CREATE TRIGGER update_daily_closings_updated_at BEFORE UPDATE ON public.daily_closings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_doctor_availability_updated_at ON doctor_availability;
CREATE TRIGGER update_doctor_availability_updated_at BEFORE UPDATE ON public.doctor_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_doctor_daily_status_updated_at ON doctor_daily_status;
CREATE TRIGGER update_doctor_daily_status_updated_at BEFORE UPDATE ON public.doctor_daily_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_doctor_payments_updated_at ON doctor_payments;
CREATE TRIGGER update_doctor_payments_updated_at BEFORE UPDATE ON public.doctor_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at_doctor_specific_schedules ON doctor_specific_schedules;
CREATE TRIGGER set_updated_at_doctor_specific_schedules BEFORE UPDATE ON public.doctor_specific_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at_doctor_working_hours ON doctor_working_hours;
CREATE TRIGGER set_updated_at_doctor_working_hours BEFORE UPDATE ON public.doctor_working_hours FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_emergency_expenses_updated_at ON emergency_expenses;
CREATE TRIGGER update_emergency_expenses_updated_at BEFORE UPDATE ON public.emergency_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_finance_settings_updated_at ON finance_settings;
CREATE TRIGGER update_finance_settings_updated_at BEFORE UPDATE ON public.finance_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_hospital_closing_balance_updated_at ON hospital_closing_balance;
CREATE TRIGGER update_hospital_closing_balance_updated_at BEFORE UPDATE ON public.hospital_closing_balance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_hospital_services_updated_at ON hospital_services;
CREATE TRIGGER update_hospital_services_updated_at BEFORE UPDATE ON public.hospital_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS auto_xray_payment_trigger ON invoices;
CREATE TRIGGER auto_xray_payment_trigger BEFORE INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION auto_set_xray_paid();
DROP TRIGGER IF EXISTS trg_invoice_audit ON invoices;
CREATE TRIGGER trg_invoice_audit AFTER INSERT OR DELETE OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION log_invoice_change();
DROP TRIGGER IF EXISTS trg_sync_pathology_amounts ON invoices;
CREATE TRIGGER trg_sync_pathology_amounts AFTER UPDATE OF amount ON public.invoices FOR EACH ROW EXECUTE FUNCTION sync_pathology_amounts_from_invoice();
DROP TRIGGER IF EXISTS trg_admission_defaults ON ipd_admissions;
CREATE TRIGGER trg_admission_defaults BEFORE INSERT ON public.ipd_admissions FOR EACH ROW EXECUTE FUNCTION set_admission_defaults();
DROP TRIGGER IF EXISTS trg_ipd_admissions_updated ON ipd_admissions;
CREATE TRIGGER trg_ipd_admissions_updated BEFORE UPDATE ON public.ipd_admissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_sync_bed_status ON ipd_admissions;
CREATE TRIGGER trg_sync_bed_status AFTER INSERT OR UPDATE ON public.ipd_admissions FOR EACH ROW EXECUTE FUNCTION sync_bed_status_on_admission();
DROP TRIGGER IF EXISTS trg_ipd_invoice_defaults ON ipd_invoices;
CREATE TRIGGER trg_ipd_invoice_defaults BEFORE INSERT ON public.ipd_invoices FOR EACH ROW EXECUTE FUNCTION set_ipd_invoice_defaults();
DROP TRIGGER IF EXISTS trg_ipd_invoices_updated ON ipd_invoices;
CREATE TRIGGER trg_ipd_invoices_updated BEFORE UPDATE ON public.ipd_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_ipd_lab_orders_updated ON ipd_lab_orders;
CREATE TRIGGER trg_ipd_lab_orders_updated BEFORE UPDATE ON public.ipd_lab_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_ipd_med_orders_updated ON ipd_medicine_orders;
CREATE TRIGGER trg_ipd_med_orders_updated BEFORE UPDATE ON public.ipd_medicine_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_pathology_orders_updated_at ON lab_pathology_orders;
CREATE TRIGGER trg_pathology_orders_updated_at BEFORE UPDATE ON public.lab_pathology_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_lab_pathology_results_updated ON lab_pathology_report_results;
CREATE TRIGGER trg_lab_pathology_results_updated BEFORE UPDATE ON public.lab_pathology_report_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_lab_pathology_reports_updated ON lab_pathology_reports;
CREATE TRIGGER trg_lab_pathology_reports_updated BEFORE UPDATE ON public.lab_pathology_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_lab_stock_batches_updated_at ON lab_stock_batches;
CREATE TRIGGER update_lab_stock_batches_updated_at BEFORE UPDATE ON public.lab_stock_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_lab_store_batches_updated_at ON lab_store_batches;
CREATE TRIGGER update_lab_store_batches_updated_at BEFORE UPDATE ON public.lab_store_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_lab_test_parameters_updated ON lab_test_parameters;
CREATE TRIGGER trg_lab_test_parameters_updated BEFORE UPDATE ON public.lab_test_parameters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_lab_test_types_updated ON lab_test_types;
CREATE TRIGGER trg_lab_test_types_updated BEFORE UPDATE ON public.lab_test_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_lab_tests_updated_at ON lab_tests;
CREATE TRIGGER update_lab_tests_updated_at BEFORE UPDATE ON public.lab_tests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_miscellaneous_income_updated_at ON miscellaneous_income;
CREATE TRIGGER update_miscellaneous_income_updated_at BEFORE UPDATE ON public.miscellaneous_income FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_ot_expenses_updated_at ON ot_expenses;
CREATE TRIGGER update_ot_expenses_updated_at BEFORE UPDATE ON public.ot_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_ot_operations_updated_at ON ot_operations;
CREATE TRIGGER update_ot_operations_updated_at BEFORE UPDATE ON public.ot_operations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_ot_rooms_updated_at ON ot_rooms;
CREATE TRIGGER update_ot_rooms_updated_at BEFORE UPDATE ON public.ot_rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_ot_schedules_updated_at ON ot_schedules;
CREATE TRIGGER update_ot_schedules_updated_at BEFORE UPDATE ON public.ot_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_patient_documents_updated_at ON patient_documents;
CREATE TRIGGER update_patient_documents_updated_at BEFORE UPDATE ON public.patient_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS set_patient_defaults_trigger ON patients;
CREATE TRIGGER set_patient_defaults_trigger BEFORE INSERT ON public.patients FOR EACH ROW EXECUTE FUNCTION set_patient_defaults();
DROP TRIGGER IF EXISTS update_payroll_updated_at ON payroll;
CREATE TRIGGER update_payroll_updated_at BEFORE UPDATE ON public.payroll FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_payroll_templates_updated_at ON payroll_templates;
CREATE TRIGGER update_payroll_templates_updated_at BEFORE UPDATE ON public.payroll_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_pharmacy_account_updated_at ON pharmacy_account;
CREATE TRIGGER update_pharmacy_account_updated_at BEFORE UPDATE ON public.pharmacy_account FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_pharmacy_expenses_updated_at ON pharmacy_expenses;
CREATE TRIGGER update_pharmacy_expenses_updated_at BEFORE UPDATE ON public.pharmacy_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_postop_progress_entries_updated_at ON postop_progress_entries;
CREATE TRIGGER update_postop_progress_entries_updated_at BEFORE UPDATE ON public.postop_progress_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_prescriptions_updated_at ON prescriptions;
CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_refunds_updated_at ON refunds;
CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON public.refunds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_treatment_chart_entries_updated_at ON treatment_chart_entries;
CREATE TRIGGER update_treatment_chart_entries_updated_at BEFORE UPDATE ON public.treatment_chart_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_wards_updated ON wards;
CREATE TRIGGER trg_wards_updated BEFORE UPDATE ON public.wards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS auto_xray_reports_payment_trigger ON xray_reports;
CREATE TRIGGER auto_xray_reports_payment_trigger BEFORE INSERT OR UPDATE ON public.xray_reports FOR EACH ROW EXECUTE FUNCTION auto_set_xray_reports_paid();
DROP TRIGGER IF EXISTS update_xray_tests_updated_at ON xray_tests;
CREATE TRIGGER update_xray_tests_updated_at BEFORE UPDATE ON public.xray_tests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- trigger count: 54

-- ============ GRANTS + RLS ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.anesthesia_notes TO authenticated;
GRANT ALL ON public.anesthesia_notes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_entries TO authenticated;
GRANT ALL ON public.assessment_entries TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beds TO authenticated;
GRANT ALL ON public.beds TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_error_logs TO authenticated;
GRANT ALL ON public.client_error_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_closings TO authenticated;
GRANT ALL ON public.daily_closings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_availability TO authenticated;
GRANT ALL ON public.doctor_availability TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_daily_status TO authenticated;
GRANT ALL ON public.doctor_daily_status TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_payments TO authenticated;
GRANT ALL ON public.doctor_payments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_specific_schedules TO authenticated;
GRANT ALL ON public.doctor_specific_schedules TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_working_hours TO authenticated;
GRANT ALL ON public.doctor_working_hours TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctors TO authenticated;
GRANT ALL ON public.doctors TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_expenses TO authenticated;
GRANT ALL ON public.emergency_expenses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_settings TO authenticated;
GRANT ALL ON public.finance_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospital_closing_balance TO authenticated;
GRANT ALL ON public.hospital_closing_balance TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospital_services TO authenticated;
GRANT ALL ON public.hospital_services TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospital_settings TO authenticated;
GRANT ALL ON public.hospital_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_requests TO authenticated;
GRANT ALL ON public.inventory_requests TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_audit_log TO authenticated;
GRANT ALL ON public.invoice_audit_log TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ipd_admissions TO authenticated;
GRANT ALL ON public.ipd_admissions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ipd_charges TO authenticated;
GRANT ALL ON public.ipd_charges TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ipd_doctor_payments TO authenticated;
GRANT ALL ON public.ipd_doctor_payments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ipd_invoices TO authenticated;
GRANT ALL ON public.ipd_invoices TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ipd_lab_orders TO authenticated;
GRANT ALL ON public.ipd_lab_orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ipd_medicine_orders TO authenticated;
GRANT ALL ON public.ipd_medicine_orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ipd_treatment_chart TO authenticated;
GRANT ALL ON public.ipd_treatment_chart TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_inventory_items TO authenticated;
GRANT ALL ON public.lab_inventory_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_parameter_subranges TO authenticated;
GRANT ALL ON public.lab_parameter_subranges TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_pathology_order_items TO authenticated;
GRANT ALL ON public.lab_pathology_order_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_pathology_orders TO authenticated;
GRANT ALL ON public.lab_pathology_orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_pathology_report_results TO authenticated;
GRANT ALL ON public.lab_pathology_report_results TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_pathology_report_test_types TO authenticated;
GRANT ALL ON public.lab_pathology_report_test_types TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_pathology_reports TO authenticated;
GRANT ALL ON public.lab_pathology_reports TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_reports TO authenticated;
GRANT ALL ON public.lab_reports TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_stock_batches TO authenticated;
GRANT ALL ON public.lab_stock_batches TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_stock_consumption TO authenticated;
GRANT ALL ON public.lab_stock_consumption TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_stock_usage TO authenticated;
GRANT ALL ON public.lab_stock_usage TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_store_batches TO authenticated;
GRANT ALL ON public.lab_store_batches TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_test_consumables TO authenticated;
GRANT ALL ON public.lab_test_consumables TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_test_parameters TO authenticated;
GRANT ALL ON public.lab_test_parameters TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_test_types TO authenticated;
GRANT ALL ON public.lab_test_types TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_tests TO authenticated;
GRANT ALL ON public.lab_tests TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_records TO authenticated;
GRANT ALL ON public.medical_records TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medicines TO authenticated;
GRANT ALL ON public.medicines TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.miscellaneous_income TO authenticated;
GRANT ALL ON public.miscellaneous_income TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ot_expenses TO authenticated;
GRANT ALL ON public.ot_expenses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ot_operations TO authenticated;
GRANT ALL ON public.ot_operations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ot_rooms TO authenticated;
GRANT ALL ON public.ot_rooms TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ot_schedules TO authenticated;
GRANT ALL ON public.ot_schedules TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.overtime_records TO authenticated;
GRANT ALL ON public.overtime_records TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_discounts TO authenticated;
GRANT ALL ON public.patient_discounts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_documents TO authenticated;
GRANT ALL ON public.patient_documents TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll TO authenticated;
GRANT ALL ON public.payroll TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_templates TO authenticated;
GRANT ALL ON public.payroll_templates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_account TO authenticated;
GRANT ALL ON public.pharmacy_account TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_expenses TO authenticated;
GRANT ALL ON public.pharmacy_expenses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_invoice_items TO authenticated;
GRANT ALL ON public.pharmacy_invoice_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_invoices TO authenticated;
GRANT ALL ON public.pharmacy_invoices TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.postop_progress_entries TO authenticated;
GRANT ALL ON public.postop_progress_entries TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescriptions TO authenticated;
GRANT ALL ON public.prescriptions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.queue_positions TO authenticated;
GRANT ALL ON public.queue_positions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.refunds TO authenticated;
GRANT ALL ON public.refunds TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shifts TO authenticated;
GRANT ALL ON public.shifts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_shift_closings TO authenticated;
GRANT ALL ON public.staff_shift_closings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treatment_chart_entries TO authenticated;
GRANT ALL ON public.treatment_chart_entries TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wards TO authenticated;
GRANT ALL ON public.wards TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.xray_reports TO authenticated;
GRANT ALL ON public.xray_reports TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.xray_tests TO authenticated;
GRANT ALL ON public.xray_tests TO service_role;

ALTER TABLE public.anesthesia_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_daily_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_specific_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_closing_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ipd_admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ipd_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ipd_doctor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ipd_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ipd_lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ipd_medicine_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ipd_treatment_chart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_parameter_subranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_pathology_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_pathology_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_pathology_report_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_pathology_report_test_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_pathology_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_stock_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_stock_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_stock_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_store_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_test_consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_test_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_test_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miscellaneous_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ot_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ot_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ot_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ot_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overtime_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postop_progress_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_shift_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_chart_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xray_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xray_tests ENABLE ROW LEVEL SECURITY;

-- anon grants only where an anon-visible policy exists
GRANT SELECT ON public.anesthesia_notes TO anon;
GRANT SELECT ON public.appointments TO anon;
GRANT SELECT ON public.assessment_entries TO anon;
GRANT SELECT ON public.audit_logs TO anon;
GRANT SELECT ON public.client_error_logs TO anon;
GRANT SELECT ON public.daily_closings TO anon;
GRANT SELECT ON public.departments TO anon;
GRANT SELECT ON public.doctor_availability TO anon;
GRANT SELECT ON public.doctor_daily_status TO anon;
GRANT SELECT ON public.doctor_payments TO anon;
GRANT SELECT ON public.doctor_specific_schedules TO anon;
GRANT SELECT ON public.doctor_working_hours TO anon;
GRANT SELECT ON public.doctors TO anon;
GRANT SELECT ON public.emergency_expenses TO anon;
GRANT SELECT ON public.expenses TO anon;
GRANT SELECT ON public.hospital_closing_balance TO anon;
GRANT SELECT ON public.hospital_services TO anon;
GRANT SELECT ON public.hospital_settings TO anon;
GRANT SELECT ON public.inventory_items TO anon;
GRANT SELECT ON public.inventory_requests TO anon;
GRANT SELECT ON public.invoices TO anon;
GRANT SELECT ON public.lab_inventory_items TO anon;
GRANT SELECT ON public.lab_reports TO anon;
GRANT SELECT ON public.lab_tests TO anon;
GRANT SELECT ON public.medical_records TO anon;
GRANT SELECT ON public.medicines TO anon;
GRANT SELECT ON public.miscellaneous_income TO anon;
GRANT SELECT ON public.ot_expenses TO anon;
GRANT SELECT ON public.ot_operations TO anon;
GRANT SELECT ON public.ot_rooms TO anon;
GRANT SELECT ON public.ot_schedules TO anon;
GRANT SELECT ON public.overtime_records TO anon;
GRANT SELECT ON public.patient_discounts TO anon;
GRANT SELECT ON public.patient_documents TO anon;
GRANT SELECT ON public.patients TO anon;
GRANT SELECT ON public.payroll TO anon;
GRANT SELECT ON public.payroll_templates TO anon;
GRANT SELECT ON public.pharmacy_account TO anon;
GRANT SELECT ON public.pharmacy_expenses TO anon;
GRANT SELECT ON public.pharmacy_invoice_items TO anon;
GRANT SELECT ON public.pharmacy_invoices TO anon;
GRANT SELECT ON public.prescriptions TO anon;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.refunds TO anon;
GRANT SELECT ON public.shifts TO anon;
GRANT SELECT ON public.staff_shift_closings TO anon;
GRANT SELECT ON public.treatment_chart_entries TO anon;
GRANT SELECT ON public.users TO anon;
GRANT SELECT ON public.xray_reports TO anon;
GRANT SELECT ON public.xray_tests TO anon;

-- ============ POLICIES ============
CREATE POLICY "Clinical staff manage anesthesia_notes" ON public.anesthesia_notes AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'doctor'::text, 'ota'::text, 'staff'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'doctor'::text, 'ota'::text, 'staff'::text]))))));
CREATE POLICY "Nurses view anesthesia_notes" ON public.anesthesia_notes AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['nursing'::text, 'nurse'::text, 'finance'::text]))))));
CREATE POLICY "Allow staff to manage appointment payments" ON public.appointments AS PERMISSIVE FOR UPDATE TO public
  USING (true);
CREATE POLICY "Doctors can update their own appointments" ON public.appointments AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'doctor'::text) AND (appointments.doctor_id = auth.uid())))));
CREATE POLICY "Doctors can view their own appointments" ON public.appointments AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'doctor'::text) AND (appointments.doctor_id = auth.uid())))));
CREATE POLICY "Patients can create their own appointments" ON public.appointments AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'patient'::text) AND (appointments.patient_id = auth.uid())))));
CREATE POLICY "Patients can view their own appointments" ON public.appointments AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'patient'::text) AND (appointments.patient_id = auth.uid())))));
CREATE POLICY "Staff and admins can manage all appointments" ON public.appointments AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text]))))));
CREATE POLICY "Staff and admins can view all appointments" ON public.appointments AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text]))))));
CREATE POLICY "Everyone can view assessment entries" ON public.assessment_entries AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Medical staff can delete assessment entries" ON public.assessment_entries AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'doctor'::text, 'ota'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Medical staff can update assessment entries" ON public.assessment_entries AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'doctor'::text, 'ota'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Nursing staff can create assessment entries" ON public.assessment_entries AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'nursing'::text]))))));
CREATE POLICY "Allow all operations" ON public.audit_logs AS PERMISSIVE FOR ALL TO public
  USING (true);
CREATE POLICY "Admins manage beds" ON public.beds AS PERMISSIVE FOR ALL TO authenticated
  USING ((get_current_user_role() = 'admin'::text))
  WITH CHECK ((get_current_user_role() = 'admin'::text));
CREATE POLICY "Anyone authenticated can view beds" ON public.beds AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Staff update bed status" ON public.beds AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text])))
  WITH CHECK ((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text])));
CREATE POLICY "Admins can read client error logs" ON public.client_error_logs AS PERMISSIVE FOR SELECT TO authenticated
  USING ((get_current_user_role() = 'admin'::text));
CREATE POLICY "Anyone can insert client error logs" ON public.client_error_logs AS PERMISSIVE FOR INSERT TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY "Finance users can create daily closings" ON public.daily_closings AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can view all daily closings" ON public.daily_closings AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Allow all operations" ON public.departments AS PERMISSIVE FOR ALL TO public
  USING (true);
CREATE POLICY "Allow authenticated users to view doctor availability" ON public.doctor_availability AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Doctors can manage their own availability" ON public.doctor_availability AS PERMISSIVE FOR ALL TO public
  USING ((auth.uid() = doctor_id))
  WITH CHECK ((auth.uid() = doctor_id));
CREATE POLICY "Allow authenticated users to view doctor daily status" ON public.doctor_daily_status AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Authenticated users can read doctor_daily_status" ON public.doctor_daily_status AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Doctors can manage their own daily status" ON public.doctor_daily_status AS PERMISSIVE FOR ALL TO public
  USING ((auth.uid() = doctor_id))
  WITH CHECK ((auth.uid() = doctor_id));
CREATE POLICY "Doctors can update their own status" ON public.doctor_daily_status AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((doctor_id = auth.uid()));
CREATE POLICY "Doctors can upsert their own status" ON public.doctor_daily_status AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((doctor_id = auth.uid()));
CREATE POLICY "Doctors can view their own payments" ON public.doctor_payments AS PERMISSIVE FOR SELECT TO public
  USING ((doctor_id = auth.uid()));
CREATE POLICY "Finance users can create doctor payments" ON public.doctor_payments AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can update doctor payments" ON public.doctor_payments AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can view all doctor payments" ON public.doctor_payments AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Anyone can view doctor specific schedules" ON public.doctor_specific_schedules AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Doctors can manage their own specific schedules" ON public.doctor_specific_schedules AS PERMISSIVE FOR ALL TO public
  USING ((auth.uid() = doctor_id))
  WITH CHECK ((auth.uid() = doctor_id));
CREATE POLICY "Anyone can view doctor working hours" ON public.doctor_working_hours AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Doctors can manage their own working hours" ON public.doctor_working_hours AS PERMISSIVE FOR ALL TO public
  USING ((auth.uid() = doctor_id))
  WITH CHECK ((auth.uid() = doctor_id));
CREATE POLICY "Allow all operations" ON public.doctors AS PERMISSIVE FOR ALL TO public
  USING (true);
CREATE POLICY "Admin users can create emergency expenses" ON public.emergency_expenses AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Admin users can delete emergency expenses" ON public.emergency_expenses AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Admin users can update emergency expenses" ON public.emergency_expenses AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance and admin users can view all emergency expenses" ON public.emergency_expenses AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text, 'staff'::text]))))));
CREATE POLICY "Finance and pharmacy users can create expenses" ON public.expenses AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text, 'pharmacy'::text]))))));
CREATE POLICY "Finance users can create expenses" ON public.expenses AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can delete expenses" ON public.expenses AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can update expenses" ON public.expenses AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can view all expenses" ON public.expenses AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance and admin can insert finance settings" ON public.finance_settings AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance and admin can update finance settings" ON public.finance_settings AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance and admin can view finance settings" ON public.finance_settings AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can create hospital closing balance" ON public.hospital_closing_balance AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can update hospital closing balance" ON public.hospital_closing_balance AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can view hospital closing balance" ON public.hospital_closing_balance AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Admins can manage hospital services" ON public.hospital_services AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Everyone can view hospital services" ON public.hospital_services AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Anyone can view hospital settings" ON public.hospital_settings AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Only admins can modify hospital settings" ON public.hospital_settings AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Everyone can view inventory items" ON public.inventory_items AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Inventory manager and admin can manage inventory items" ON public.inventory_items AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['inventory_manager'::text, 'admin'::text, 'super_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['inventory_manager'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Store can manage inventory items" ON public.inventory_items AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'store'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'store'::text)))));
CREATE POLICY "Inventory manager can update requests" ON public.inventory_requests AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['inventory_manager'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Inventory manager can view all requests" ON public.inventory_requests AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['inventory_manager'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Store can update approved requests" ON public.inventory_requests AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'store'::text)))));
CREATE POLICY "Store can view approved requests" ON public.inventory_requests AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'store'::text)))));
CREATE POLICY "Users can create requests" ON public.inventory_requests AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((requested_by = auth.uid()));
CREATE POLICY "Users can view their own requests" ON public.inventory_requests AS PERMISSIVE FOR SELECT TO public
  USING ((requested_by = auth.uid()));
CREATE POLICY "super_admin reads invoice audit" ON public.invoice_audit_log AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'super_admin'::text));
CREATE POLICY "Allow all operations" ON public.invoices AS PERMISSIVE FOR ALL TO public
  USING (true);
CREATE POLICY "Admin delete admissions" ON public.ipd_admissions AS PERMISSIVE FOR DELETE TO authenticated
  USING ((get_current_user_role() = 'admin'::text));
CREATE POLICY "Staff create admissions" ON public.ipd_admissions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text])));
CREATE POLICY "Staff update admissions" ON public.ipd_admissions AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text])))
  WITH CHECK ((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text])));
CREATE POLICY "Staff view admissions" ON public.ipd_admissions AS PERMISSIVE FOR SELECT TO authenticated
  USING (((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text, 'pharmacist'::text, 'head_pharmacist'::text, 'assistant_pharmacist'::text, 'salesman_pharmacist'::text, 'lab'::text, 'lab_staff'::text])) OR (patient_id = auth.uid())));
CREATE POLICY "Staff manage ipd charges" ON public.ipd_charges AS PERMISSIVE FOR ALL TO authenticated
  USING ((get_current_user_role() = ANY (ARRAY['admin'::text, 'finance'::text, 'receptionist'::text, 'staff'::text, 'doctor'::text, 'nurse'::text, 'ota'::text, 'ipd'::text])))
  WITH CHECK ((get_current_user_role() = ANY (ARRAY['admin'::text, 'finance'::text, 'receptionist'::text, 'staff'::text, 'doctor'::text, 'nurse'::text, 'ota'::text, 'ipd'::text])));
CREATE POLICY "Staff view ipd charges" ON public.ipd_charges AS PERMISSIVE FOR SELECT TO authenticated
  USING (((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text])) OR (EXISTS ( SELECT 1
   FROM ipd_admissions a
  WHERE ((a.id = ipd_charges.admission_id) AND (a.patient_id = auth.uid()))))));
CREATE POLICY "Allow authenticated users to insert ipd_doctor_payments" ON public.ipd_doctor_payments AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "Allow authenticated users to read ipd_doctor_payments" ON public.ipd_doctor_payments AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Allow authenticated users to update ipd_doctor_payments" ON public.ipd_doctor_payments AS PERMISSIVE FOR UPDATE TO authenticated
  USING (true);
CREATE POLICY "Finance manage ipd invoices" ON public.ipd_invoices AS PERMISSIVE FOR ALL TO authenticated
  USING ((get_current_user_role() = ANY (ARRAY['admin'::text, 'finance'::text, 'receptionist'::text, 'staff'::text, 'ipd'::text])))
  WITH CHECK ((get_current_user_role() = ANY (ARRAY['admin'::text, 'finance'::text, 'receptionist'::text, 'staff'::text, 'ipd'::text])));
CREATE POLICY "Staff view ipd invoices" ON public.ipd_invoices AS PERMISSIVE FOR SELECT TO authenticated
  USING (((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text])) OR (patient_id = auth.uid())));
CREATE POLICY "Admin delete ipd labs" ON public.ipd_lab_orders AS PERMISSIVE FOR DELETE TO authenticated
  USING ((get_current_user_role() = 'admin'::text));
CREATE POLICY "Clinical create ipd labs" ON public.ipd_lab_orders AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'ota'::text, 'staff'::text, 'ipd'::text, 'lab'::text, 'lab_staff'::text])));
CREATE POLICY "Lab update ipd labs" ON public.ipd_lab_orders AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'lab'::text, 'lab_staff'::text, 'nurse'::text, 'ota'::text, 'ipd'::text])))
  WITH CHECK ((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'lab'::text, 'lab_staff'::text, 'nurse'::text, 'ota'::text, 'ipd'::text])));
CREATE POLICY "Staff view ipd labs" ON public.ipd_lab_orders AS PERMISSIVE FOR SELECT TO authenticated
  USING (((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text, 'lab'::text, 'lab_staff'::text])) OR (EXISTS ( SELECT 1
   FROM ipd_admissions a
  WHERE ((a.id = ipd_lab_orders.admission_id) AND (a.patient_id = auth.uid()))))));
CREATE POLICY "Admin delete ipd meds" ON public.ipd_medicine_orders AS PERMISSIVE FOR DELETE TO authenticated
  USING ((get_current_user_role() = 'admin'::text));
CREATE POLICY "Clinical create ipd meds" ON public.ipd_medicine_orders AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'ota'::text, 'staff'::text, 'ipd'::text])));
CREATE POLICY "Pharmacy update ipd meds" ON public.ipd_medicine_orders AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'ota'::text, 'ipd'::text, 'pharmacist'::text, 'head_pharmacist'::text, 'assistant_pharmacist'::text, 'salesman_pharmacist'::text])))
  WITH CHECK ((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'ota'::text, 'ipd'::text, 'pharmacist'::text, 'head_pharmacist'::text, 'assistant_pharmacist'::text, 'salesman_pharmacist'::text])));
CREATE POLICY "Staff view ipd meds" ON public.ipd_medicine_orders AS PERMISSIVE FOR SELECT TO authenticated
  USING (((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text, 'pharmacist'::text, 'head_pharmacist'::text, 'assistant_pharmacist'::text, 'salesman_pharmacist'::text])) OR (EXISTS ( SELECT 1
   FROM ipd_admissions a
  WHERE ((a.id = ipd_medicine_orders.admission_id) AND (a.patient_id = auth.uid()))))));
CREATE POLICY "Admin delete chart" ON public.ipd_treatment_chart AS PERMISSIVE FOR DELETE TO authenticated
  USING ((get_current_user_role() = 'admin'::text));
CREATE POLICY "Clinical update chart" ON public.ipd_treatment_chart AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'ota'::text, 'staff'::text, 'ipd'::text])))
  WITH CHECK ((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'ota'::text, 'staff'::text, 'ipd'::text])));
CREATE POLICY "Clinical write chart" ON public.ipd_treatment_chart AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'ota'::text, 'staff'::text, 'ipd'::text])));
CREATE POLICY "Staff view chart" ON public.ipd_treatment_chart AS PERMISSIVE FOR SELECT TO authenticated
  USING (((get_current_user_role() = ANY (ARRAY['admin'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'staff'::text, 'ota'::text, 'ipd'::text, 'finance'::text])) OR (EXISTS ( SELECT 1
   FROM ipd_admissions a
  WHERE ((a.id = ipd_treatment_chart.admission_id) AND (a.patient_id = auth.uid()))))));
CREATE POLICY "Everyone can view lab inventory items" ON public.lab_inventory_items AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Inventory manager and admin can manage lab inventory items" ON public.lab_inventory_items AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['inventory_manager'::text, 'admin'::text, 'super_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['inventory_manager'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Lab can manage lab inventory items" ON public.lab_inventory_items AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'lab'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'lab'::text)))));
CREATE POLICY "Store can manage lab inventory items" ON public.lab_inventory_items AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'store'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'store'::text)))));
CREATE POLICY "Anyone authenticated can view parameter subranges" ON public.lab_parameter_subranges AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Staff can manage parameter subranges" ON public.lab_parameter_subranges AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'lab_technician'::text, 'staff'::text, 'doctor'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'lab_technician'::text, 'staff'::text, 'doctor'::text]))))));
CREATE POLICY "Manage pathology order items" ON public.lab_pathology_order_items AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text, 'lab'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text, 'lab'::text]))))));
CREATE POLICY "View pathology order items" ON public.lab_pathology_order_items AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Manage pathology orders" ON public.lab_pathology_orders AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text, 'lab'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text, 'lab'::text]))))));
CREATE POLICY "View pathology orders" ON public.lab_pathology_orders AS PERMISSIVE FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'staff'::text, 'finance'::text, 'doctor'::text]))))) OR (patient_id = auth.uid())));
CREATE POLICY "Lab and admin manage pathology results" ON public.lab_pathology_report_results AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text]))))));
CREATE POLICY "View pathology results follows reports" ON public.lab_pathology_report_results AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Lab and admin manage report test types" ON public.lab_pathology_report_test_types AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text]))))));
CREATE POLICY "View report test types follows reports" ON public.lab_pathology_report_test_types AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Authenticated users can view pathology reports" ON public.lab_pathology_reports AS PERMISSIVE FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'staff'::text, 'doctor'::text, 'finance'::text]))))) OR (patient_id = auth.uid())));
CREATE POLICY "Lab and admin can manage pathology reports" ON public.lab_pathology_reports AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text]))))));
CREATE POLICY "Admin can delete lab reports" ON public.lab_reports AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text]))))));
CREATE POLICY "Everyone can view lab reports" ON public.lab_reports AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Staff admin lab can insert lab reports" ON public.lab_reports AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text, 'lab'::text, 'doctor'::text]))))));
CREATE POLICY "Staff admin lab can update lab reports" ON public.lab_reports AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text, 'lab'::text, 'doctor'::text]))))));
CREATE POLICY "manage lab batches" ON public.lab_stock_batches AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['lab'::text, 'inventory_manager'::text, 'store'::text, 'admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['lab'::text, 'inventory_manager'::text, 'store'::text, 'admin'::text]))))));
CREATE POLICY "view lab batches" ON public.lab_stock_batches AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "insert lab consumption" ON public.lab_stock_consumption AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "view lab consumption" ON public.lab_stock_consumption AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Managers can view all usage" ON public.lab_stock_usage AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['inventory_manager'::text, 'admin'::text, 'super_admin'::text, 'store'::text]))))));
CREATE POLICY "Users can record their own usage" ON public.lab_stock_usage AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((used_by = auth.uid()));
CREATE POLICY "Users can view their own usage" ON public.lab_stock_usage AS PERMISSIVE FOR SELECT TO authenticated
  USING ((used_by = auth.uid()));
CREATE POLICY "manage lab store batches" ON public.lab_store_batches AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['store'::text, 'inventory_manager'::text, 'admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['store'::text, 'inventory_manager'::text, 'admin'::text]))))));
CREATE POLICY "view lab store batches" ON public.lab_store_batches AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "manage test consumables" ON public.lab_test_consumables AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['lab'::text, 'inventory_manager'::text, 'admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['lab'::text, 'inventory_manager'::text, 'admin'::text]))))));
CREATE POLICY "view test consumables" ON public.lab_test_consumables AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Anyone authenticated can view lab test parameters" ON public.lab_test_parameters AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Staff can manage lab test parameters" ON public.lab_test_parameters AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'lab_technician'::text, 'staff'::text, 'doctor'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'lab_technician'::text, 'staff'::text, 'doctor'::text]))))));
CREATE POLICY "Anyone authenticated can view lab test types" ON public.lab_test_types AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Staff can manage lab test types" ON public.lab_test_types AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'lab_technician'::text, 'staff'::text, 'doctor'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'lab'::text, 'lab_technician'::text, 'staff'::text, 'doctor'::text]))))));
CREATE POLICY "Everyone can view lab tests" ON public.lab_tests AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Only admins can manage lab tests" ON public.lab_tests AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Allow all operations" ON public.medical_records AS PERMISSIVE FOR ALL TO public
  USING (true);
CREATE POLICY "Allow all operations on medicines" ON public.medicines AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Finance users can create miscellaneous income" ON public.miscellaneous_income AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can delete miscellaneous income" ON public.miscellaneous_income AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can update miscellaneous income" ON public.miscellaneous_income AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can view all miscellaneous income" ON public.miscellaneous_income AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Everyone can view OT expenses" ON public.ot_expenses AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Only admins can manage OT expenses" ON public.ot_expenses AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Everyone can view OT operations" ON public.ot_operations AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Only admins can manage OT operations" ON public.ot_operations AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Everyone can view OT rooms" ON public.ot_rooms AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Only admins can manage OT rooms" ON public.ot_rooms AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Doctors can update their own OT schedules" ON public.ot_schedules AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'doctor'::text) AND (ot_schedules.doctor_id = auth.uid())))));
CREATE POLICY "Doctors can view their own OT schedules" ON public.ot_schedules AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'doctor'::text) AND (ot_schedules.doctor_id = auth.uid())))));
CREATE POLICY "Everyone can view OT schedules" ON public.ot_schedules AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "OTA users can view and update OT schedules" ON public.ot_schedules AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'ota'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'ota'::text)))));
CREATE POLICY "Staff and admins can manage OT schedules" ON public.ot_schedules AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text]))))));
CREATE POLICY "Finance users can create overtime records" ON public.overtime_records AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can delete overtime records" ON public.overtime_records AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can update overtime records" ON public.overtime_records AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can view overtime records" ON public.overtime_records AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance and admin can manage patient discounts" ON public.patient_discounts AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Lab can read patient discounts" ON public.patient_discounts AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['lab'::text, 'finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Staff can consume patient discounts" ON public.patient_discounts AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'lab'::text, 'ota'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'lab'::text, 'ota'::text]))))));
CREATE POLICY "Staff can view patient discounts" ON public.patient_discounts AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'doctor'::text]))))));
CREATE POLICY "Patients can upload their own documents" ON public.patient_documents AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((patient_id IN ( SELECT patients.id
   FROM patients
  WHERE (patients.id = auth.uid()))));
CREATE POLICY "Patients can view their own documents" ON public.patient_documents AS PERMISSIVE FOR SELECT TO public
  USING ((patient_id IN ( SELECT patients.id
   FROM patients
  WHERE (patients.id = auth.uid()))));
CREATE POLICY "Staff can view all patient documents" ON public.patient_documents AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'admin'::text, 'super_admin'::text, 'doctor'::text]))))));
CREATE POLICY "Allow authenticated users all operations on patients" ON public.patients AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Prevent deletion of offline patient" ON public.patients AS PERMISSIVE FOR DELETE TO public
  USING ((id <> '00000000-0000-0000-0000-000000000001'::uuid));
CREATE POLICY "Finance users can create payroll records" ON public.payroll AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can delete payroll records" ON public.payroll AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can update payroll records" ON public.payroll AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can view all payroll records" ON public.payroll AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can create payroll templates" ON public.payroll_templates AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can delete payroll templates" ON public.payroll_templates AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can update payroll templates" ON public.payroll_templates AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can view all payroll templates" ON public.payroll_templates AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can create pharmacy account" ON public.pharmacy_account AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can update pharmacy account" ON public.pharmacy_account AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can view pharmacy account" ON public.pharmacy_account AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text, 'pharmacy'::text]))))));
CREATE POLICY "Finance users can create pharmacy expenses" ON public.pharmacy_expenses AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text, 'pharmacy'::text]))))));
CREATE POLICY "Finance users can delete pharmacy expenses" ON public.pharmacy_expenses AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can update pharmacy expenses" ON public.pharmacy_expenses AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can view pharmacy expenses" ON public.pharmacy_expenses AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text, 'pharmacy'::text]))))));
CREATE POLICY "Allow all operations" ON public.pharmacy_invoice_items AS PERMISSIVE FOR ALL TO public
  USING (true);
CREATE POLICY "Allow all operations" ON public.pharmacy_invoices AS PERMISSIVE FOR ALL TO public
  USING (true);
CREATE POLICY "Everyone can view postop progress entries" ON public.postop_progress_entries AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Medical staff can delete postop progress entries" ON public.postop_progress_entries AS PERMISSIVE FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'nursing'::text, 'doctor'::text, 'ota'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Medical staff can update postop progress entries" ON public.postop_progress_entries AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'nursing'::text, 'doctor'::text, 'ota'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Staff and nursing can create postop progress entries" ON public.postop_progress_entries AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'nursing'::text]))))));
CREATE POLICY "Doctors can create prescriptions" ON public.prescriptions AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = doctor_id));
CREATE POLICY "Doctors can update their prescriptions" ON public.prescriptions AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = doctor_id));
CREATE POLICY "Doctors can view their prescriptions" ON public.prescriptions AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = doctor_id));
CREATE POLICY "Patients can view their prescriptions" ON public.prescriptions AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = patient_id));
CREATE POLICY "Staff and admins can view all prescriptions" ON public.prescriptions AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'staff'::text]))))));
CREATE POLICY "Admin users can delete non-admin profiles" ON public.profiles AS PERMISSIVE FOR DELETE TO public
  USING (((EXISTS ( SELECT 1
   FROM profiles profiles_1
  WHERE ((profiles_1.id = auth.uid()) AND (profiles_1.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))) AND (role <> 'admin'::text)));
CREATE POLICY "Admin users can update any profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles profiles_1
  WHERE ((profiles_1.id = auth.uid()) AND (profiles_1.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Authenticated users can insert profiles" ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "Authenticated users can view all profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Prevent deletion of offline profile" ON public.profiles AS PERMISSIVE FOR DELETE TO public
  USING ((id <> '00000000-0000-0000-0000-000000000001'::uuid));
CREATE POLICY "Users can update own profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = id));
CREATE POLICY "Users can view own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = id));
CREATE POLICY "Allow authenticated users to manage queue positions" ON public.queue_positions AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Finance users can create refunds" ON public.refunds AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can update refunds" ON public.refunds AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance users can view all refunds" ON public.refunds AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Everyone can view shifts" ON public.shifts AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Only admins can manage shifts" ON public.shifts AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Admin can delete shift closings" ON public.staff_shift_closings AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance and admin can update shift closings" ON public.staff_shift_closings AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Finance and admin can view all shift closings" ON public.staff_shift_closings AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['finance'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Staff can create their own shift closings" ON public.staff_shift_closings AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((staff_id = auth.uid()));
CREATE POLICY "Staff can view their own shift closings" ON public.staff_shift_closings AS PERMISSIVE FOR SELECT TO public
  USING ((staff_id = auth.uid()));
CREATE POLICY "Doctors can create treatment chart entries" ON public.treatment_chart_entries AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['doctor'::text, 'admin'::text, 'super_admin'::text, 'ota'::text, 'staff'::text]))))));
CREATE POLICY "Doctors can delete treatment chart entries" ON public.treatment_chart_entries AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['doctor'::text, 'admin'::text, 'super_admin'::text, 'ota'::text, 'staff'::text]))))));
CREATE POLICY "Doctors can update treatment chart entries" ON public.treatment_chart_entries AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['doctor'::text, 'admin'::text, 'super_admin'::text, 'ota'::text, 'staff'::text]))))));
CREATE POLICY "Everyone can view treatment chart entries" ON public.treatment_chart_entries AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Medical staff can create treatment chart entries" ON public.treatment_chart_entries AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'nursing'::text, 'doctor'::text, 'ota'::text, 'admin'::text]))))));
CREATE POLICY "Medical staff can delete treatment chart entries" ON public.treatment_chart_entries AS PERMISSIVE FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'nursing'::text, 'doctor'::text, 'ota'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Medical staff can update treatment chart entries" ON public.treatment_chart_entries AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['staff'::text, 'nursing'::text, 'doctor'::text, 'ota'::text, 'admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Allow all operations" ON public.users AS PERMISSIVE FOR ALL TO public
  USING (true);
CREATE POLICY "Admins manage wards" ON public.wards AS PERMISSIVE FOR ALL TO authenticated
  USING ((get_current_user_role() = 'admin'::text))
  WITH CHECK ((get_current_user_role() = 'admin'::text));
CREATE POLICY "Anyone authenticated can view wards" ON public.wards AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Allow all operations on xray reports" ON public.xray_reports AS PERMISSIVE FOR ALL TO public
  USING (true);
CREATE POLICY "Everyone can view xray tests" ON public.xray_tests AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Only admins can manage xray tests" ON public.xray_tests AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES ('doctor-avatars','doctor-avatars',true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('patient-documents','patient-documents',true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('lab-results','lab-results',true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('finance-proofs','finance-proofs',true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('hospital-logos','hospital-logos',true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('doctor-assets','doctor-assets',true) ON CONFLICT (id) DO NOTHING;

-- ============ AUTH-SIDE TRIGGER (run after the rest) ============
-- Recreates the profile-on-signup hook. Requires the postgres/owner role.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ IMPORT ORDER ============
-- 1. Run this file (creates enums, tables, constraints, indexes, functions,
--    triggers, grants, RLS, policies, storage buckets).
-- 2. Import auth users FIRST (southwest-auth-users.sql) — many public tables
--    have foreign keys to auth.users(id).
-- 3. Import public table data (CSV export from Cloud -> Advanced -> Export data).
--    Disable triggers while loading:  SET session_replication_role = replica;
--    and re-enable after:             SET session_replication_role = origin;

-- ===========================================================
-- SCHEMA UPDATE BLOCK — changes made after 2026-07-29
-- Snapshot taken: 2026-09-08 05:08 UTC (10:08 Pakistan time)
-- Safe to re-run (all statements are IF NOT EXISTS / OR REPLACE)
-- ===========================================================

-- 1. Eye-specialist flag on doctors (drives the eye prescription template)
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS is_eye_specialist boolean NOT NULL DEFAULT false;

-- 2. Performance indexes added 2026-09-07
CREATE INDEX IF NOT EXISTS idx_profiles_created_at        ON public.profiles    USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at        ON public.invoices    USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status_created_at ON public.invoices    USING btree (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at      ON public.audit_logs  USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id         ON public.audit_logs  USING btree (user_id);

-- 3. Live patient-name sync onto pathology reports
CREATE OR REPLACE FUNCTION public.sync_patient_name_snapshots()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (COALESCE(NEW.first_name,'') IS DISTINCT FROM COALESCE(OLD.first_name,''))
     OR (COALESCE(NEW.last_name,'') IS DISTINCT FROM COALESCE(OLD.last_name,'')) THEN
    UPDATE public.lab_pathology_reports
       SET patient_name_snapshot = btrim(COALESCE(NEW.first_name,'') || ' ' || COALESCE(NEW.last_name,''))
     WHERE patient_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_patient_name_snapshots ON public.profiles;
CREATE TRIGGER trg_sync_patient_name_snapshots
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_patient_name_snapshots();

ANALYZE;
-- End of update block
