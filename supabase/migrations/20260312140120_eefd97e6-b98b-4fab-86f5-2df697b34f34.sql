
-- =============================================
-- COMPLETE HOSPITAL MANAGEMENT SYSTEM SCHEMA
-- =============================================

-- 1. UTILITY FUNCTIONS
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- 2. ENUM TYPES
CREATE TYPE public.appointment_status AS ENUM ('scheduled', 'completed', 'cancelled', 'rescheduled');

-- 3. CORE TABLES

-- Departments
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin','doctor','staff','ota','nursing','head_pharmacist','assistant_pharmacist','salesman_pharmacist','finance','patient')),
  department_id UUID REFERENCES public.departments(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_phone_for_patients UNIQUE (phone) DEFERRABLE INITIALLY DEFERRED
);

-- Patients
CREATE TABLE public.patients (
  id UUID PRIMARY KEY,
  date_of_birth DATE,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  blood_type TEXT,
  allergies TEXT,
  cnic TEXT DEFAULT '',
  patient_number TEXT UNIQUE
);

-- Doctors
CREATE TABLE public.doctors (
  id UUID PRIMARY KEY,
  specialization TEXT,
  license_number TEXT UNIQUE,
  experience_years INTEGER DEFAULT 0,
  consultation_fee NUMERIC DEFAULT 0,
  avatar_url TEXT
);

-- 4. APPOINTMENT & QUEUE TABLES

CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id),
  appointment_date TIMESTAMPTZ NOT NULL,
  status appointment_status DEFAULT 'scheduled',
  type TEXT NOT NULL,
  notes TEXT,
  booking_type TEXT DEFAULT 'online',
  payment_status TEXT DEFAULT 'pending',
  payment_due_time TIMESTAMPTZ,
  invoice_generated_at TIMESTAMPTZ,
  consultation_fee_at_time NUMERIC DEFAULT 0,
  cleared_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.queue_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id),
  appointment_date DATE NOT NULL,
  queue_position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','in_progress','completed','skipped')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(doctor_id, appointment_date, queue_position)
);

-- 5. MEDICAL TABLES

CREATE TABLE public.medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id),
  visit_date TIMESTAMPTZ DEFAULT now(),
  diagnosis TEXT, treatment TEXT, prescription TEXT, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.lab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, description TEXT, price NUMERIC NOT NULL,
  category TEXT, normal_range TEXT, preparation_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.lab_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  doctor_id UUID REFERENCES public.doctors(id),
  external_doctor_name TEXT,
  test_name TEXT NOT NULL,
  test_id UUID REFERENCES public.lab_tests(id),
  test_date TIMESTAMPTZ DEFAULT now(),
  results TEXT, status TEXT DEFAULT 'pending', notes TEXT,
  price NUMERIC DEFAULT 0, result_file_url TEXT, invoice_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT lab_reports_doctor_check CHECK (
    (doctor_id IS NOT NULL AND external_doctor_name IS NULL) OR
    (doctor_id IS NULL AND external_doctor_name IS NOT NULL)
  )
);

CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL, patient_id UUID NOT NULL, doctor_id UUID NOT NULL,
  prescription_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. INVOICE TABLES

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  doctor_id UUID,
  invoice_number TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  due_date DATE, description TEXT,
  emergency_patient_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ
);

-- 7. PHARMACY TABLES

CREATE TABLE public.medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, formula TEXT, company_name TEXT, batch_number TEXT,
  manufacturing_date DATE, expiry_date DATE NOT NULL,
  purchase_price DECIMAL(10,2) NOT NULL, selling_price DECIMAL(10,2) NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0, minimum_stock_level INTEGER DEFAULT 10,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.pharmacy_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  customer_name TEXT, customer_phone TEXT,
  total_amount DECIMAL(10,2) NOT NULL, discount_amount DECIMAL(10,2) DEFAULT 0,
  final_amount DECIMAL(10,2) NOT NULL, status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.pharmacy_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.pharmacy_invoices(id) ON DELETE CASCADE,
  medicine_id UUID REFERENCES public.medicines(id),
  quantity INTEGER NOT NULL, unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.pharmacy_account (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  starting_balance NUMERIC DEFAULT 0, notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.pharmacy_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC NOT NULL, expense_type TEXT NOT NULL DEFAULT 'profit_withdrawal',
  description TEXT, bill_number TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. OT TABLES

CREATE TABLE public.ot_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.ot_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES public.ot_operations(id) ON DELETE CASCADE,
  expense_name TEXT NOT NULL, cost NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.ot_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_name TEXT NOT NULL, is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.ot_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  doctor_id UUID REFERENCES public.doctors(id),
  doctor_name TEXT, doctor_expense NUMERIC DEFAULT 0,
  operation_id UUID REFERENCES public.ot_operations(id),
  room_id UUID REFERENCES public.ot_rooms(id),
  operation_date DATE NOT NULL, queue_position INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', notes TEXT,
  total_cost NUMERIC DEFAULT 0, ot_notes JSONB,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. X-RAY TABLES

CREATE TABLE public.xray_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, description TEXT, category TEXT,
  price NUMERIC NOT NULL, preparation_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.xray_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id),
  doctor_id UUID REFERENCES public.profiles(id),
  test_id UUID REFERENCES public.xray_tests(id),
  test_name TEXT NOT NULL,
  xray_date TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'pending', price NUMERIC DEFAULT 0,
  invoice_id UUID, notes TEXT, external_doctor_name TEXT, results TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. FINANCE TABLES

CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, description TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC NOT NULL, refund_type TEXT NOT NULL,
  description TEXT NOT NULL, doctor_id UUID REFERENCES public.profiles(id),
  patient_id UUID, related_record_id UUID,
  processed_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL, employee_name TEXT NOT NULL,
  role TEXT NOT NULL, base_salary DECIMAL(10,2) NOT NULL,
  allowances DECIMAL(10,2) DEFAULT 0, deductions DECIMAL(10,2) DEFAULT 0,
  net_salary DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  pay_period TEXT NOT NULL, paid_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.payroll_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL UNIQUE, employee_name TEXT NOT NULL,
  role TEXT NOT NULL, base_salary DECIMAL(10,2) NOT NULL,
  allowances DECIMAL(10,2) DEFAULT 0, deductions DECIMAL(10,2) DEFAULT 0,
  net_salary DECIMAL(10,2) NOT NULL, is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.doctor_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  period_start DATE NOT NULL, period_end DATE NOT NULL,
  appointment_count INTEGER DEFAULT 0, ot_count INTEGER DEFAULT 0,
  consultation_earnings NUMERIC DEFAULT 0, ot_earnings NUMERIC DEFAULT 0,
  total_earnings NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','processing')),
  paid_at TIMESTAMPTZ, paid_by UUID REFERENCES public.profiles(id), notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(doctor_id, period_start, period_end)
);

CREATE TABLE public.daily_closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_date DATE NOT NULL, closing_time TIMESTAMPTZ NOT NULL,
  day_name TEXT NOT NULL,
  hospital_revenue NUMERIC DEFAULT 0, pharmacy_revenue NUMERIC DEFAULT 0,
  pharmacy_profit NUMERIC DEFAULT 0, total_expenses NUMERIC DEFAULT 0,
  total_refunds NUMERIC DEFAULT 0, net_profit NUMERIC DEFAULT 0,
  transactions_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.hospital_closing_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_date DATE NOT NULL UNIQUE, closing_balance NUMERIC DEFAULT 0,
  created_by UUID REFERENCES auth.users(id), notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.miscellaneous_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC NOT NULL, description TEXT NOT NULL,
  income_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.emergency_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, cost NUMERIC DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. DOCTOR AVAILABILITY TABLES

CREATE TABLE public.doctor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL, availability_date DATE NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(doctor_id, availability_date)
);

CREATE TABLE public.doctor_daily_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL, status_date DATE NOT NULL,
  accepting_appointments BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(doctor_id, status_date)
);

CREATE TABLE public.doctor_working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME DEFAULT '09:00', end_time TIME DEFAULT '17:00',
  is_working BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(doctor_id, day_of_week)
);

CREATE TABLE public.doctor_specific_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  specific_date DATE NOT NULL,
  start_time TIME DEFAULT '09:00', end_time TIME DEFAULT '17:00',
  is_working BOOLEAN DEFAULT true, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(doctor_id, specific_date)
);

-- 12. SETTINGS & MISC

CREATE TABLE public.hospital_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opening_time TIME DEFAULT '08:00', closing_time TIME DEFAULT '20:00',
  working_days TEXT[] DEFAULT ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  max_appointments_per_doctor INTEGER DEFAULT 50,
  booking_lead_time_hours INTEGER DEFAULT 2,
  emergency_slots_percentage INTEGER DEFAULT 20,
  hospital_name TEXT DEFAULT 'City General Hospital',
  contact_number TEXT DEFAULT '+92-XXX-XXXXXXX',
  hospital_address TEXT DEFAULT '123 Main Street, City Center',
  logo_url TEXT, payroll_payment_date INTEGER DEFAULT 1,
  emergency_consultation_fee NUMERIC DEFAULT 10000,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, action TEXT NOT NULL, details TEXT, ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL, document_label TEXT NOT NULL,
  file_url TEXT NOT NULL, file_size INTEGER, file_type TEXT,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

-- OTA progress tables
CREATE TABLE public.treatment_chart_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ot_schedule_id UUID NOT NULL,
  entry_date DATE NOT NULL, medicine TEXT, investigation TEXT,
  user_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.postop_progress_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ot_schedule_id UUID NOT NULL REFERENCES public.ot_schedules(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  blood_pressure TEXT, pulses TEXT, temperature TEXT,
  input_data TEXT, output_data TEXT, remarks TEXT,
  user_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.assessment_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ot_schedule_id UUID NOT NULL,
  entry_date DATE DEFAULT CURRENT_DATE, entry_time TIME DEFAULT CURRENT_TIME,
  assessment TEXT, plan TEXT, user_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

-- Legacy users table (referenced by old data)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL, first_name TEXT NOT NULL, last_name TEXT NOT NULL,
  phone TEXT, role TEXT NOT NULL, department_id UUID REFERENCES public.departments(id),
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ot_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ot_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ot_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ot_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xray_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xray_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_closing_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miscellaneous_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_daily_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_specific_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_chart_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postop_progress_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Departments: everyone can view
CREATE POLICY "Allow all operations" ON public.departments FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.users FOR ALL USING (true);

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Authenticated users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Authenticated users can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin users can update any profile" ON public.profiles FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin users can delete non-admin profiles" ON public.profiles FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') AND role != 'admin');
CREATE POLICY "Prevent deletion of offline profile" ON public.profiles FOR DELETE USING (id != '00000000-0000-0000-0000-000000000001');

-- Patients
CREATE POLICY "Allow authenticated users all operations on patients" ON public.patients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Prevent deletion of offline patient" ON public.patients FOR DELETE USING (id != '00000000-0000-0000-0000-000000000001');

-- Doctors
CREATE POLICY "Allow all operations" ON public.doctors FOR ALL USING (true);

-- Appointments
CREATE POLICY "Doctors can view their own appointments" ON public.appointments FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'doctor' AND appointments.doctor_id = auth.uid()));
CREATE POLICY "Patients can view their own appointments" ON public.appointments FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'patient' AND appointments.patient_id = auth.uid()));
CREATE POLICY "Staff and admins can view all appointments" ON public.appointments FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','staff')));
CREATE POLICY "Staff and admins can manage all appointments" ON public.appointments FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','staff'))) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','staff')));
CREATE POLICY "Doctors can update their own appointments" ON public.appointments FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'doctor' AND appointments.doctor_id = auth.uid()));
CREATE POLICY "Patients can create their own appointments" ON public.appointments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'patient' AND appointments.patient_id = auth.uid()));
CREATE POLICY "Allow staff to manage appointment payments" ON public.appointments FOR UPDATE USING (true);

-- Queue positions
CREATE POLICY "Allow authenticated users to manage queue positions" ON public.queue_positions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Medical records
CREATE POLICY "Allow all operations" ON public.medical_records FOR ALL USING (true);

-- Lab tests
CREATE POLICY "Everyone can view lab tests" ON public.lab_tests FOR SELECT USING (true);
CREATE POLICY "Only admins can manage lab tests" ON public.lab_tests FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Lab reports
CREATE POLICY "Allow all operations" ON public.lab_reports FOR ALL USING (true);

-- Prescriptions
CREATE POLICY "Doctors can create prescriptions" ON public.prescriptions FOR INSERT WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "Doctors can view their prescriptions" ON public.prescriptions FOR SELECT USING (auth.uid() = doctor_id);
CREATE POLICY "Doctors can update their prescriptions" ON public.prescriptions FOR UPDATE USING (auth.uid() = doctor_id);
CREATE POLICY "Patients can view their prescriptions" ON public.prescriptions FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Staff and admins can view all prescriptions" ON public.prescriptions FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','staff')));

-- Invoices
CREATE POLICY "Allow all operations" ON public.invoices FOR ALL USING (true);

-- Medicines
CREATE POLICY "Allow all operations" ON public.medicines FOR ALL USING (true);

-- Pharmacy invoices
CREATE POLICY "Allow all operations" ON public.pharmacy_invoices FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.pharmacy_invoice_items FOR ALL USING (true);

-- Pharmacy account
CREATE POLICY "Finance users can view pharmacy account" ON public.pharmacy_account FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance','admin','pharmacy')));
CREATE POLICY "Finance users can create pharmacy account" ON public.pharmacy_account FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance','admin')));
CREATE POLICY "Finance users can update pharmacy account" ON public.pharmacy_account FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance','admin')));

-- Pharmacy expenses
CREATE POLICY "Finance users can view pharmacy expenses" ON public.pharmacy_expenses FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance','admin','pharmacy')));
CREATE POLICY "Finance users can create pharmacy expenses" ON public.pharmacy_expenses FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance','admin','pharmacy')));
CREATE POLICY "Finance users can update pharmacy expenses" ON public.pharmacy_expenses FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance','admin')));
CREATE POLICY "Finance users can delete pharmacy expenses" ON public.pharmacy_expenses FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance','admin')));

-- OT tables
CREATE POLICY "Everyone can view OT operations" ON public.ot_operations FOR SELECT USING (true);
CREATE POLICY "Only admins can manage OT operations" ON public.ot_operations FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Everyone can view OT expenses" ON public.ot_expenses FOR SELECT USING (true);
CREATE POLICY "Only admins can manage OT expenses" ON public.ot_expenses FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Everyone can view OT rooms" ON public.ot_rooms FOR SELECT USING (true);
CREATE POLICY "Only admins can manage OT rooms" ON public.ot_rooms FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Everyone can view OT schedules" ON public.ot_schedules FOR SELECT USING (true);
CREATE POLICY "Staff and admins can manage OT schedules" ON public.ot_schedules FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('staff','admin'))) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('staff','admin')));
CREATE POLICY "Doctors can view their own OT schedules" ON public.ot_schedules FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'doctor' AND ot_schedules.doctor_id = auth.uid()));
CREATE POLICY "Doctors can update their own OT schedules" ON public.ot_schedules FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'doctor' AND ot_schedules.doctor_id = auth.uid()));
CREATE POLICY "OTA users can view and update OT schedules" ON public.ot_schedules FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ota')) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ota'));

-- X-ray tables
CREATE POLICY "Everyone can view xray tests" ON public.xray_tests FOR SELECT USING (true);
CREATE POLICY "Only admins can manage xray tests" ON public.xray_tests FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Allow all operations on xray reports" ON public.xray_reports FOR ALL USING (true);

-- Finance tables
CREATE POLICY "Finance users can view all expenses" ON public.expenses FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance','admin')));
CREATE POLICY "Finance and pharmacy users can create expenses" ON public.expenses FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['finance','admin','pharmacy'])));
CREATE POLICY "Finance users can update expenses" ON public.expenses FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance','admin')));
CREATE POLICY "Finance users can delete expenses" ON public.expenses FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance','admin')));

CREATE POLICY "Finance users can view all refunds" ON public.refunds FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance','admin')));
CREATE POLICY "Finance users can create refunds" ON public.refunds FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance','admin')));
CREATE POLICY "Finance users can update refunds" ON public.refunds FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance','admin')));

CREATE POLICY "Finance users can view all payroll records" ON public.payroll FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance','admin')));
CREATE POLICY "Finance users can create payroll records" ON public.payroll FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance','admin')));
CREATE POLICY "Finance users can update payroll records" ON public.payroll FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance','admin')));
CREATE POLICY "Finance users can delete payroll records" ON public.payroll FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance','admin')));

CREATE POLICY "Finance users can view all payroll templates" ON public.payroll_templates FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance','admin')));
CREATE POLICY "Finance users can create payroll templates" ON public.payroll_templates FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance','admin')));
CREATE POLICY "Finance users can update payroll templates" ON public.payroll_templates FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance','admin')));
CREATE POLICY "Finance users can delete payroll templates" ON public.payroll_templates FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance','admin')));

CREATE POLICY "Finance users can view all doctor payments" ON public.doctor_payments FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance','admin')));
CREATE POLICY "Finance users can create doctor payments" ON public.doctor_payments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance','admin')));
CREATE POLICY "Finance users can update doctor payments" ON public.doctor_payments FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance','admin')));
CREATE POLICY "Doctors can view their own payments" ON public.doctor_payments FOR SELECT USING (doctor_id = auth.uid());

CREATE POLICY "Finance users can view all daily closings" ON public.daily_closings FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['finance','admin'])));
CREATE POLICY "Finance users can create daily closings" ON public.daily_closings FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['finance','admin'])));

CREATE POLICY "Finance users can view hospital closing balance" ON public.hospital_closing_balance FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance','admin')));
CREATE POLICY "Finance users can create hospital closing balance" ON public.hospital_closing_balance FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance','admin')));
CREATE POLICY "Finance users can update hospital closing balance" ON public.hospital_closing_balance FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance','admin')));

CREATE POLICY "Finance users can view all miscellaneous income" ON public.miscellaneous_income FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('finance','admin')));
CREATE POLICY "Finance users can create miscellaneous income" ON public.miscellaneous_income FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('finance','admin')));
CREATE POLICY "Finance users can update miscellaneous income" ON public.miscellaneous_income FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('finance','admin')));
CREATE POLICY "Finance users can delete miscellaneous income" ON public.miscellaneous_income FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('finance','admin')));

CREATE POLICY "Finance and admin users can view all emergency expenses" ON public.emergency_expenses FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('finance','admin','staff')));
CREATE POLICY "Admin users can create emergency expenses" ON public.emergency_expenses FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin users can update emergency expenses" ON public.emergency_expenses FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin users can delete emergency expenses" ON public.emergency_expenses FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Doctor availability
CREATE POLICY "Doctors can manage their own availability" ON public.doctor_availability FOR ALL USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "Allow authenticated users to view doctor availability" ON public.doctor_availability FOR SELECT TO authenticated USING (true);
CREATE POLICY "Doctors can manage their own daily status" ON public.doctor_daily_status FOR ALL USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "Allow authenticated users to view doctor daily status" ON public.doctor_daily_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view doctor working hours" ON public.doctor_working_hours FOR SELECT USING (true);
CREATE POLICY "Doctors can manage their own working hours" ON public.doctor_working_hours FOR ALL USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "Anyone can view doctor specific schedules" ON public.doctor_specific_schedules FOR SELECT USING (true);
CREATE POLICY "Doctors can manage their own specific schedules" ON public.doctor_specific_schedules FOR ALL USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);

-- Hospital settings
CREATE POLICY "Anyone can view hospital settings" ON public.hospital_settings FOR SELECT USING (true);
CREATE POLICY "Only admins can modify hospital settings" ON public.hospital_settings FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Audit logs
CREATE POLICY "Allow all operations" ON public.audit_logs FOR ALL USING (true);

-- Patient documents
CREATE POLICY "Staff can view all patient documents" ON public.patient_documents FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('staff','admin','doctor')));
CREATE POLICY "Patients can view their own documents" ON public.patient_documents FOR SELECT USING (patient_id IN (SELECT id FROM public.patients WHERE id = auth.uid()));
CREATE POLICY "Patients can upload their own documents" ON public.patient_documents FOR INSERT WITH CHECK (patient_id IN (SELECT id FROM public.patients WHERE id = auth.uid()));

-- Treatment/assessment entries
CREATE POLICY "Everyone can view treatment chart entries" ON public.treatment_chart_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff and nursing can create treatment chart entries" ON public.treatment_chart_entries FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('staff','nursing')));
CREATE POLICY "Medical staff can update treatment chart entries" ON public.treatment_chart_entries FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('staff','nursing','doctor','ota','admin')));
CREATE POLICY "Medical staff can delete treatment chart entries" ON public.treatment_chart_entries FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('staff','nursing','doctor','ota','admin')));

CREATE POLICY "Everyone can view postop progress entries" ON public.postop_progress_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff and nursing can create postop progress entries" ON public.postop_progress_entries FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('staff','nursing')));
CREATE POLICY "Medical staff can update postop progress entries" ON public.postop_progress_entries FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('staff','nursing','doctor','ota','admin')));
CREATE POLICY "Medical staff can delete postop progress entries" ON public.postop_progress_entries FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('staff','nursing','doctor','ota','admin')));

CREATE POLICY "Everyone can view assessment entries" ON public.assessment_entries FOR SELECT USING (true);
CREATE POLICY "Nursing staff can create assessment entries" ON public.assessment_entries FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','nursing')));
CREATE POLICY "Medical staff can update assessment entries" ON public.assessment_entries FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff','doctor','ota','admin')));
CREATE POLICY "Medical staff can delete assessment entries" ON public.assessment_entries FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff','doctor','ota','admin')));

-- =============================================
-- TRIGGERS
-- =============================================
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_appointments BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lab_tests_updated_at BEFORE UPDATE ON public.lab_tests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ot_operations_updated_at BEFORE UPDATE ON public.ot_operations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ot_expenses_updated_at BEFORE UPDATE ON public.ot_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ot_rooms_updated_at BEFORE UPDATE ON public.ot_rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ot_schedules_updated_at BEFORE UPDATE ON public.ot_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_xray_tests_updated_at BEFORE UPDATE ON public.xray_tests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON public.refunds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payroll_updated_at BEFORE UPDATE ON public.payroll FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payroll_templates_updated_at BEFORE UPDATE ON public.payroll_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_doctor_payments_updated_at BEFORE UPDATE ON public.doctor_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_daily_closings_updated_at BEFORE UPDATE ON public.daily_closings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hospital_closing_balance_updated_at BEFORE UPDATE ON public.hospital_closing_balance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_miscellaneous_income_updated_at BEFORE UPDATE ON public.miscellaneous_income FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_emergency_expenses_updated_at BEFORE UPDATE ON public.emergency_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_doctor_availability_updated_at BEFORE UPDATE ON public.doctor_availability FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_doctor_daily_status_updated_at BEFORE UPDATE ON public.doctor_daily_status FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_doctor_working_hours BEFORE UPDATE ON public.doctor_working_hours FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_doctor_specific_schedules BEFORE UPDATE ON public.doctor_specific_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_patient_documents_updated_at BEFORE UPDATE ON public.patient_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_treatment_chart_entries_updated_at BEFORE UPDATE ON public.treatment_chart_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_postop_progress_entries_updated_at BEFORE UPDATE ON public.postop_progress_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assessment_entries_updated_at BEFORE UPDATE ON public.assessment_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pharmacy_account_updated_at BEFORE UPDATE ON public.pharmacy_account FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pharmacy_expenses_updated_at BEFORE UPDATE ON public.pharmacy_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_patients_cnic ON public.patients(cnic);
CREATE INDEX idx_expenses_category ON public.expenses(category);
CREATE INDEX idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX idx_expenses_created_by ON public.expenses(created_by);
CREATE INDEX idx_payroll_pay_period ON public.payroll(pay_period);
CREATE INDEX idx_payroll_employee_id ON public.payroll(employee_id);
CREATE INDEX idx_payroll_status ON public.payroll(status);
CREATE INDEX idx_payroll_templates_employee_id ON public.payroll_templates(employee_id);
CREATE INDEX idx_payroll_templates_is_active ON public.payroll_templates(is_active);
CREATE INDEX idx_daily_closings_date ON public.daily_closings(closing_date);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Patient number generator
CREATE OR REPLACE FUNCTION public.generate_patient_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE next_num INTEGER; formatted_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(patient_number FROM 'P-(.*)') AS INTEGER)), 0) + 1
  INTO next_num FROM public.patients WHERE patient_number ~ '^P-[0-9]+$';
  formatted_num := 'P-' || LPAD(next_num::TEXT, 5, '0');
  RETURN formatted_num;
END; $$;

-- Patient defaults trigger
CREATE OR REPLACE FUNCTION public.set_patient_defaults()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.id = COALESCE(NEW.id, gen_random_uuid());
  IF NEW.patient_number IS NULL THEN NEW.patient_number = generate_patient_number(); END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER set_patient_defaults_trigger BEFORE INSERT ON public.patients FOR EACH ROW EXECUTE FUNCTION public.set_patient_defaults();

-- Handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
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
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create user account function
CREATE OR REPLACE FUNCTION public.create_user_account(p_email text, p_password text, p_first_name text, p_last_name text, p_role text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_user_id uuid;
BEGIN
  new_user_id := gen_random_uuid();
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  VALUES ('00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated', p_email, crypt(p_password, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'role', p_role), now(), now(), '', '', '', '');
  RETURN new_user_id;
END; $$;

-- Delete user safely
CREATE OR REPLACE FUNCTION public.delete_user_safely(user_uuid uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.audit_logs WHERE user_id = user_uuid;
  DELETE FROM public.appointments WHERE patient_id = user_uuid;
  DELETE FROM public.appointments WHERE doctor_id = user_uuid;
  DELETE FROM public.lab_reports WHERE patient_id = user_uuid;
  DELETE FROM public.lab_reports WHERE doctor_id = user_uuid;
  DELETE FROM public.medical_records WHERE patient_id = user_uuid;
  DELETE FROM public.medical_records WHERE doctor_id = user_uuid;
  DELETE FROM public.invoices WHERE patient_id = user_uuid;
  DELETE FROM public.patient_documents WHERE patient_id = user_uuid;
  DELETE FROM public.doctor_availability WHERE doctor_id = user_uuid;
  DELETE FROM public.doctor_daily_status WHERE doctor_id = user_uuid;
  DELETE FROM public.doctor_payments WHERE doctor_id = user_uuid;
  DELETE FROM public.queue_positions WHERE doctor_id = user_uuid;
  DELETE FROM public.ot_schedules WHERE patient_id = user_uuid;
  DELETE FROM public.ot_schedules WHERE doctor_id = user_uuid;
  DELETE FROM public.payroll WHERE employee_id = user_uuid;
  DELETE FROM public.payroll_templates WHERE employee_id = user_uuid;
  DELETE FROM public.patients WHERE id = user_uuid;
  DELETE FROM public.doctors WHERE id = user_uuid;
  DELETE FROM public.profiles WHERE id = user_uuid;
  DELETE FROM auth.users WHERE id = user_uuid;
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error deleting user %: %', user_uuid, SQLERRM;
  RETURN false;
END; $$;

-- Queue position functions
CREATE OR REPLACE FUNCTION public.get_next_queue_position(doctor_uuid UUID, appointment_date_param DATE)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE next_position INTEGER;
BEGIN
  SELECT COALESCE(MAX(queue_position), 0) + 1 INTO next_position FROM public.queue_positions WHERE doctor_id = doctor_uuid AND appointment_date = appointment_date_param;
  RETURN next_position;
END; $$;

CREATE OR REPLACE FUNCTION public.auto_assign_queue_position()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE next_pos INTEGER; appointment_date_only DATE;
BEGIN
  appointment_date_only := NEW.appointment_date::DATE;
  next_pos := get_next_queue_position(NEW.doctor_id, appointment_date_only);
  INSERT INTO public.queue_positions (appointment_id, doctor_id, appointment_date, queue_position) VALUES (NEW.id, NEW.doctor_id, appointment_date_only, next_pos);
  RETURN NEW;
END; $$;

CREATE TRIGGER trigger_auto_assign_queue_position AFTER INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.auto_assign_queue_position();

CREATE OR REPLACE FUNCTION public.update_queue_on_completion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.queue_positions SET status = 'completed', updated_at = now() WHERE appointment_id = NEW.id;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trigger_update_queue_on_completion AFTER UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_queue_on_completion();

-- Consultation fee trigger
CREATE OR REPLACE FUNCTION public.set_appointment_consultation_fee()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE doctor_fee NUMERIC;
BEGIN
  SELECT COALESCE(consultation_fee, 0) INTO doctor_fee FROM public.doctors WHERE id = NEW.doctor_id;
  NEW.consultation_fee_at_time := doctor_fee;
  RETURN NEW;
END; $$;

CREATE TRIGGER set_consultation_fee_trigger BEFORE INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.set_appointment_consultation_fee();

-- Reorder queue after cancellation
CREATE OR REPLACE FUNCTION public.reorder_queue_after_cancellation(p_doctor_id UUID, p_appointment_date DATE, p_cancelled_position INTEGER)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE queue_record RECORD; new_position INTEGER;
BEGIN
  new_position := p_cancelled_position;
  FOR queue_record IN SELECT id, queue_position FROM public.queue_positions WHERE doctor_id = p_doctor_id AND appointment_date = p_appointment_date AND queue_position > p_cancelled_position AND status IN ('waiting','in_progress') ORDER BY queue_position ASC
  LOOP
    UPDATE public.queue_positions SET queue_position = new_position, updated_at = now() WHERE id = queue_record.id;
    new_position := new_position + 1;
  END LOOP;
END; $$;

-- OT queue position
CREATE OR REPLACE FUNCTION public.get_next_ot_queue_position(room_uuid uuid, operation_date_param date)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE next_position INTEGER;
BEGIN
  SELECT COALESCE(MAX(queue_position), 0) + 1 INTO next_position FROM public.ot_schedules WHERE room_id = room_uuid AND operation_date = operation_date_param;
  RETURN next_position;
END; $$;

-- Doctor earnings calculation
CREATE OR REPLACE FUNCTION public.calculate_doctor_earnings(p_doctor_id uuid, p_start_date date, p_end_date date)
RETURNS TABLE(appointment_count integer, ot_count integer, consultation_earnings numeric, ot_earnings numeric, total_earnings numeric)
LANGUAGE plpgsql AS $$
DECLARE appointment_cnt INTEGER; ot_cnt INTEGER; consult_earnings NUMERIC; ot_earnings_total NUMERIC; total_earn NUMERIC;
BEGIN
  SELECT COUNT(*) INTO appointment_cnt FROM public.appointments a WHERE a.doctor_id = p_doctor_id AND a.status = 'completed' AND a.cleared_at IS NULL AND DATE(a.appointment_date) BETWEEN p_start_date AND p_end_date;
  SELECT COUNT(*) INTO ot_cnt FROM public.ot_schedules ots WHERE ots.doctor_id = p_doctor_id AND ots.status = 'completed' AND ots.operation_date BETWEEN p_start_date AND p_end_date;
  SELECT COALESCE(SUM(a.consultation_fee_at_time), 0) INTO consult_earnings FROM public.appointments a WHERE a.doctor_id = p_doctor_id AND a.status = 'completed' AND a.cleared_at IS NULL AND DATE(a.appointment_date) BETWEEN p_start_date AND p_end_date;
  SELECT COALESCE(SUM(ots.doctor_expense), 0) INTO ot_earnings_total FROM public.ot_schedules ots WHERE ots.doctor_id = p_doctor_id AND ots.status = 'completed' AND ots.operation_date BETWEEN p_start_date AND p_end_date;
  total_earn := consult_earnings + ot_earnings_total;
  RETURN QUERY SELECT appointment_cnt, ot_cnt, consult_earnings, ot_earnings_total, total_earn;
END; $$;

-- Generate daily doctor payments
CREATE OR REPLACE FUNCTION public.generate_daily_doctor_payments(target_date DATE)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE doctor_record RECORD; earnings_data RECORD; inserted_count INTEGER := 0; updated_count INTEGER := 0;
BEGIN
  FOR doctor_record IN SELECT d.id, p.first_name, p.last_name FROM public.doctors d JOIN public.profiles p ON d.id = p.id WHERE p.is_active = true AND p.role = 'doctor'
  LOOP
    SELECT * INTO earnings_data FROM public.calculate_doctor_earnings(doctor_record.id, target_date, target_date);
    IF earnings_data.total_earnings > 0 THEN
      IF EXISTS (SELECT 1 FROM public.doctor_payments dp WHERE dp.doctor_id = doctor_record.id AND dp.period_start = target_date AND dp.period_end = target_date) THEN
        UPDATE public.doctor_payments SET appointment_count = earnings_data.appointment_count, ot_count = earnings_data.ot_count, consultation_earnings = earnings_data.consultation_earnings, ot_earnings = earnings_data.ot_earnings, total_earnings = earnings_data.total_earnings, updated_at = now() WHERE doctor_id = doctor_record.id AND period_start = target_date AND period_end = target_date AND payment_status = 'pending';
        IF FOUND THEN updated_count := updated_count + 1; END IF;
      ELSE
        INSERT INTO public.doctor_payments (doctor_id, period_start, period_end, appointment_count, ot_count, consultation_earnings, ot_earnings, total_earnings, payment_status) VALUES (doctor_record.id, target_date, target_date, earnings_data.appointment_count, earnings_data.ot_count, earnings_data.consultation_earnings, earnings_data.ot_earnings, earnings_data.total_earnings, 'pending');
        inserted_count := inserted_count + 1;
      END IF;
    END IF;
  END LOOP;
  RETURN inserted_count + updated_count;
END; $$;

-- Daily closing functions
CREATE OR REPLACE FUNCTION public.create_daily_closing(p_closing_date DATE, p_closing_time TIMESTAMPTZ, p_day_name TEXT, p_hospital_revenue NUMERIC, p_pharmacy_revenue NUMERIC, p_pharmacy_profit NUMERIC, p_total_expenses NUMERIC, p_total_refunds NUMERIC, p_net_profit NUMERIC, p_transactions_data JSONB)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE closing_id UUID;
BEGIN
  INSERT INTO public.daily_closings (closing_date, closing_time, day_name, hospital_revenue, pharmacy_revenue, pharmacy_profit, total_expenses, total_refunds, net_profit, transactions_data) VALUES (p_closing_date, p_closing_time, p_day_name, p_hospital_revenue, p_pharmacy_revenue, p_pharmacy_profit, p_total_expenses, p_total_refunds, p_net_profit, p_transactions_data) RETURNING id INTO closing_id;
  RETURN closing_id;
END; $$;

CREATE OR REPLACE FUNCTION public.get_last_daily_closing()
RETURNS TABLE(id UUID, closing_date DATE, closing_time TIMESTAMPTZ, day_name TEXT, hospital_revenue NUMERIC, pharmacy_revenue NUMERIC, pharmacy_profit NUMERIC, total_expenses NUMERIC, total_refunds NUMERIC, net_profit NUMERIC, transactions_data JSONB, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN RETURN QUERY SELECT dc.* FROM public.daily_closings dc ORDER BY dc.closing_date DESC LIMIT 1; END; $$;

-- Auto-cancel overdue appointments
CREATE OR REPLACE FUNCTION public.auto_cancel_overdue_appointments()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE overdue_count INTEGER; check_time TIMESTAMPTZ; rec RECORD;
BEGIN
  check_time := now();
  UPDATE public.appointments SET status = 'cancelled', updated_at = check_time FROM public.queue_positions qp WHERE appointments.id = qp.appointment_id AND appointments.payment_status = 'pending' AND appointments.booking_type = 'online' AND appointments.payment_due_time < check_time AND appointments.status = 'scheduled' AND DATE(appointments.appointment_date) = DATE(check_time) AND qp.queue_position > 1;
  GET DIAGNOSTICS overdue_count = ROW_COUNT;
END; $$;

-- Auto-set X-ray paid
CREATE OR REPLACE FUNCTION public.auto_set_xray_paid()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.description ILIKE '%xray%' OR NEW.description ILIKE '%x-ray%' OR NEW.description ILIKE '%radiology%' OR NEW.invoice_number LIKE 'XRAY-%') THEN
    NEW.status = 'paid'; NEW.paid_at = now();
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER auto_xray_payment_trigger BEFORE INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.auto_set_xray_paid();

CREATE OR REPLACE FUNCTION public.auto_set_xray_reports_paid()
RETURNS TRIGGER AS $$ BEGIN NEW.status = 'paid'; RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER auto_xray_reports_payment_trigger BEFORE INSERT OR UPDATE ON public.xray_reports FOR EACH ROW EXECUTE FUNCTION public.auto_set_xray_reports_paid();

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- =============================================
-- REALTIME
-- =============================================
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER TABLE public.patients REPLICA IDENTITY FULL;
ALTER TABLE public.doctors REPLICA IDENTITY FULL;
ALTER TABLE public.invoices REPLICA IDENTITY FULL;
ALTER TABLE public.medicines REPLICA IDENTITY FULL;
ALTER TABLE public.pharmacy_invoices REPLICA IDENTITY FULL;
ALTER TABLE public.pharmacy_invoice_items REPLICA IDENTITY FULL;
ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;
ALTER TABLE public.lab_reports REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.ot_schedules REPLICA IDENTITY FULL;
ALTER TABLE public.queue_positions REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.patients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.doctors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.medicines;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pharmacy_invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pharmacy_invoice_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lab_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ot_schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_positions;

-- =============================================
-- STORAGE BUCKETS
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('doctor-avatars', 'doctor-avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('patient-documents', 'patient-documents', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('lab-results', 'lab-results', true);

-- Storage policies
CREATE POLICY "Doctor avatars are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'doctor-avatars');
CREATE POLICY "Doctors can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'doctor-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Doctors can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'doctor-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Doctors can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'doctor-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view patient documents" ON storage.objects FOR SELECT USING (bucket_id = 'patient-documents');
CREATE POLICY "Authenticated users can upload patient documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'patient-documents' AND auth.role() = 'authenticated');
CREATE POLICY "Document owners can delete patient documents" ON storage.objects FOR DELETE USING (bucket_id = 'patient-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Lab results are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'lab-results');
CREATE POLICY "Authenticated users can upload lab results" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'lab-results' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update lab results" ON storage.objects FOR UPDATE USING (bucket_id = 'lab-results' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete lab results" ON storage.objects FOR DELETE USING (bucket_id = 'lab-results' AND auth.role() = 'authenticated');

-- =============================================
-- DEFAULT DATA
-- =============================================
INSERT INTO public.hospital_settings (id) VALUES (gen_random_uuid());
INSERT INTO public.pharmacy_account (starting_balance, notes) VALUES (0, 'Initial pharmacy account setup');
