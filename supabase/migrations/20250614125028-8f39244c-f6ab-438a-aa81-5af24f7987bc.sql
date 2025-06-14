
-- Create enum types for better data consistency
CREATE TYPE public.user_role AS ENUM ('patient', 'doctor', 'staff', 'admin');
CREATE TYPE public.appointment_status AS ENUM ('scheduled', 'completed', 'cancelled', 'rescheduled');
CREATE TYPE public.invoice_status AS ENUM ('paid', 'pending', 'overdue');
CREATE TYPE public.lab_status AS ENUM ('pending', 'completed', 'reviewed');

-- Create departments table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create users table (for all user types)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL,
  department_id UUID REFERENCES public.departments(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create patients table (extends users)
CREATE TABLE public.patients (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  blood_type TEXT,
  allergies TEXT
);

-- Create doctors table (extends users)
CREATE TABLE public.doctors (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  specialization TEXT,
  license_number TEXT UNIQUE,
  experience_years INTEGER DEFAULT 0
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) NOT NULL,
  doctor_id UUID REFERENCES public.doctors(id) NOT NULL,
  appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status appointment_status DEFAULT 'scheduled',
  type TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create medical records table
CREATE TABLE public.medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) NOT NULL,
  doctor_id UUID REFERENCES public.doctors(id) NOT NULL,
  visit_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  diagnosis TEXT,
  treatment TEXT,
  prescription TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) NOT NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status invoice_status DEFAULT 'pending',
  due_date DATE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Create lab reports table
CREATE TABLE public.lab_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) NOT NULL,
  doctor_id UUID REFERENCES public.doctors(id) NOT NULL,
  test_name TEXT NOT NULL,
  test_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  results TEXT,
  status lab_status DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create audit logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies (for now, allow all operations for development)
CREATE POLICY "Allow all operations" ON public.departments FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.users FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.patients FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.doctors FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.appointments FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.medical_records FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.invoices FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.lab_reports FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.audit_logs FOR ALL USING (true);

-- Insert dummy data
-- Insert departments
INSERT INTO public.departments (name, description) VALUES 
('Cardiology', 'Heart and cardiovascular system'),
('Pediatrics', 'Medical care for children'),
('General Medicine', 'Primary healthcare services'),
('Neurology', 'Brain and nervous system'),
('Orthopedics', 'Bones and joints'),
('Emergency', 'Emergency medical services');

-- Insert users (doctors, staff, admin)
INSERT INTO public.users (id, email, first_name, last_name, phone, role, department_id) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'alice.smith@hospital.com', 'Alice', 'Smith', '555-0101', 'doctor', (SELECT id FROM public.departments WHERE name = 'General Medicine' LIMIT 1)),
('550e8400-e29b-41d4-a716-446655440002', 'bob.lee@hospital.com', 'Bob', 'Lee', '555-0102', 'doctor', (SELECT id FROM public.departments WHERE name = 'Cardiology' LIMIT 1)),
('550e8400-e29b-41d4-a716-446655440003', 'emily.carter@hospital.com', 'Emily', 'Carter', '555-0103', 'doctor', (SELECT id FROM public.departments WHERE name = 'Pediatrics' LIMIT 1)),
('550e8400-e29b-41d4-a716-446655440004', 'david.wilson@hospital.com', 'David', 'Wilson', '555-0104', 'doctor', (SELECT id FROM public.departments WHERE name = 'Neurology' LIMIT 1)),
('550e8400-e29b-41d4-a716-446655440005', 'amy.taylor@hospital.com', 'Amy', 'Taylor', '555-0105', 'staff', (SELECT id FROM public.departments WHERE name = 'General Medicine' LIMIT 1)),
('550e8400-e29b-41d4-a716-446655440006', 'tom.chan@hospital.com', 'Tom', 'Chan', '555-0106', 'staff', (SELECT id FROM public.departments WHERE name = 'Emergency' LIMIT 1)),
('550e8400-e29b-41d4-a716-446655440007', 'admin@hospital.com', 'System', 'Administrator', '555-0107', 'admin', NULL);

-- Insert patient users
INSERT INTO public.users (id, email, first_name, last_name, phone, role) VALUES 
('550e8400-e29b-41d4-a716-446655440008', 'john.doe@email.com', 'John', 'Doe', '555-0201', 'patient'),
('550e8400-e29b-41d4-a716-446655440009', 'jane.smith@email.com', 'Jane', 'Smith', '555-0202', 'patient'),
('550e8400-e29b-41d4-a716-446655440010', 'nancy.drew@email.com', 'Nancy', 'Drew', '555-0203', 'patient'),
('550e8400-e29b-41d4-a716-446655440011', 'mark.wilson@email.com', 'Mark', 'Wilson', '555-0204', 'patient'),
('550e8400-e29b-41d4-a716-446655440012', 'sarah.johnson@email.com', 'Sarah', 'Johnson', '555-0205', 'patient');

-- Insert doctors
INSERT INTO public.doctors (id, specialization, license_number, experience_years) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'General Practice', 'MD001', 8),
('550e8400-e29b-41d4-a716-446655440002', 'Cardiology', 'MD002', 12),
('550e8400-e29b-41d4-a716-446655440003', 'Pediatrics', 'MD003', 6),
('550e8400-e29b-41d4-a716-446655440004', 'Neurology', 'MD004', 15);

-- Insert patients
INSERT INTO public.patients (id, date_of_birth, address, emergency_contact_name, emergency_contact_phone, blood_type) VALUES 
('550e8400-e29b-41d4-a716-446655440008', '1985-03-15', '123 Main St, City, State', 'Emergency Contact', '555-9999', 'O+'),
('550e8400-e29b-41d4-a716-446655440009', '1990-07-22', '456 Oak Ave, City, State', 'Emergency Contact', '555-9998', 'A+'),
('550e8400-e29b-41d4-a716-446655440010', '1988-11-30', '789 Pine Rd, City, State', 'Emergency Contact', '555-9997', 'B+'),
('550e8400-e29b-41d4-a716-446655440011', '1975-05-18', '321 Elm St, City, State', 'Emergency Contact', '555-9996', 'AB+'),
('550e8400-e29b-41d4-a716-446655440012', '1992-09-10', '654 Maple Dr, City, State', 'Emergency Contact', '555-9995', 'O-');

-- Insert appointments
INSERT INTO public.appointments (patient_id, doctor_id, appointment_date, status, type, notes) VALUES 
('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440001', '2024-06-15 09:00:00+00', 'scheduled', 'Annual Checkup', 'Regular annual physical examination'),
('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440002', '2024-06-18 14:30:00+00', 'scheduled', 'Follow-up', 'Cardiology follow-up for blood pressure'),
('550e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440001', '2024-06-14 10:30:00+00', 'completed', 'Consultation', 'General health consultation'),
('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440003', '2024-06-16 11:00:00+00', 'scheduled', 'Routine Checkup', 'Pediatric routine checkup'),
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440004', '2024-06-17 15:00:00+00', 'scheduled', 'Consultation', 'Neurological consultation');

-- Insert medical records
INSERT INTO public.medical_records (patient_id, doctor_id, diagnosis, treatment, prescription, notes) VALUES 
('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440001', 'Hypertension', 'Lifestyle changes and medication', 'Lisinopril 10mg daily', 'Patient responding well to treatment'),
('550e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440001', 'Common Cold', 'Rest and fluids', 'None', 'Symptoms improving'),
('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440003', 'Routine Physical', 'No issues found', 'None', 'Patient in good health');

-- Insert invoices
INSERT INTO public.invoices (patient_id, invoice_number, amount, status, due_date, description) VALUES 
('550e8400-e29b-41d4-a716-446655440008', 'INV-001', 45.00, 'paid', '2024-05-31', 'Annual physical examination'),
('550e8400-e29b-41d4-a716-446655440008', 'INV-002', 90.00, 'pending', '2024-06-20', 'Cardiology consultation'),
('550e8400-e29b-41d4-a716-446655440009', 'INV-003', 65.00, 'paid', '2024-06-10', 'General consultation'),
('550e8400-e29b-41d4-a716-446655440010', 'INV-004', 80.00, 'pending', '2024-06-25', 'Pediatric checkup');

-- Insert lab reports
INSERT INTO public.lab_reports (patient_id, doctor_id, test_name, results, status, notes) VALUES 
('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440001', 'Complete Blood Count', 'Normal values across all parameters', 'completed', 'All results within normal range'),
('550e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440001', 'Lipid Panel', 'Cholesterol slightly elevated', 'completed', 'Recommend dietary changes'),
('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440002', 'ECG', 'Normal heart rhythm', 'completed', 'No abnormalities detected');

-- Insert audit logs
INSERT INTO public.audit_logs (user_id, action, details) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'Appointment completed', 'Completed consultation with Jane Smith'),
('550e8400-e29b-41d4-a716-446655440005', 'Patient registered', 'Registered new patient Nancy Drew'),
('550e8400-e29b-41d4-a716-446655440006', 'Lab results uploaded', 'Uploaded blood test results for John Doe'),
('550e8400-e29b-41d4-a716-446655440001', 'Medical record updated', 'Updated prescription for John Doe'),
('550e8400-e29b-41d4-a716-446655440005', 'Appointment scheduled', 'Scheduled appointment for Mark Wilson');
