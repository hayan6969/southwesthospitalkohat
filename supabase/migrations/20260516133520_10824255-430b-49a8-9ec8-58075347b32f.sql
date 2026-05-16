-- 1. Add revenue attribution columns to ipd_charges
ALTER TABLE public.ipd_charges
  ADD COLUMN IF NOT EXISTS assigned_to TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES public.doctors(id) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS anesthesiologist_id UUID REFERENCES public.doctors(id) DEFAULT NULL;

-- 2. Create ipd_doctor_payments table
CREATE TABLE IF NOT EXISTS public.ipd_doctor_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES public.doctors(id) NOT NULL,
  admission_id UUID REFERENCES public.ipd_admissions(id) NOT NULL,
  charge_type TEXT NOT NULL CHECK (charge_type IN ('doctor', 'anesthesia', 'ota')),
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_at TIMESTAMPTZ DEFAULT NULL,
  paid_by UUID REFERENCES auth.users(id) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.ipd_doctor_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read ipd_doctor_payments"
  ON public.ipd_doctor_payments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert ipd_doctor_payments"
  ON public.ipd_doctor_payments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update ipd_doctor_payments"
  ON public.ipd_doctor_payments FOR UPDATE TO authenticated USING (true);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_ipd_doctor_payments_doctor_id ON public.ipd_doctor_payments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_ipd_doctor_payments_admission_id ON public.ipd_doctor_payments(admission_id);
CREATE INDEX IF NOT EXISTS idx_ipd_doctor_payments_status ON public.ipd_doctor_payments(status);
CREATE INDEX IF NOT EXISTS idx_ipd_charges_assigned_to ON public.ipd_charges(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ipd_charges_doctor_id ON public.ipd_charges(doctor_id);

-- 5. ipd_invoices new totals columns
ALTER TABLE public.ipd_invoices
  ADD COLUMN IF NOT EXISTS anesthesia_charges_total NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ota_charges_total NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ot_charges_total NUMERIC DEFAULT 0;

-- 6. ipd_admissions OTA assignment
ALTER TABLE public.ipd_admissions
  ADD COLUMN IF NOT EXISTS ota_id UUID REFERENCES public.profiles(id) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_ipd_admissions_ota_id ON public.ipd_admissions(ota_id);

-- 7. ipd_doctor_payments ota_id
ALTER TABLE public.ipd_doctor_payments
  ADD COLUMN IF NOT EXISTS ota_id UUID REFERENCES public.profiles(id) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_ipd_doctor_payments_ota_id ON public.ipd_doctor_payments(ota_id);