
-- ============ WARDS ============
CREATE TABLE public.wards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  ward_type TEXT NOT NULL DEFAULT 'general', -- general, private, semi_private, icu, hdu, isolation, pediatric, maternity
  floor TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ BEDS ============
CREATE TABLE public.beds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id UUID NOT NULL REFERENCES public.wards(id) ON DELETE CASCADE,
  bed_number TEXT NOT NULL,
  daily_charge NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available', -- available, occupied, maintenance, reserved
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ward_id, bed_number)
);

CREATE INDEX idx_beds_ward ON public.beds(ward_id);
CREATE INDEX idx_beds_status ON public.beds(status);

-- ============ IPD ADMISSIONS ============
CREATE TABLE public.ipd_admissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_number TEXT NOT NULL UNIQUE,
  patient_id UUID NOT NULL,
  doctor_id UUID,
  bed_id UUID REFERENCES public.beds(id) ON DELETE SET NULL,
  ward_id UUID REFERENCES public.wards(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'direct', -- opd, emergency, direct
  referring_appointment_id UUID,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, admitted, discharged, cancelled
  admission_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  discharge_date TIMESTAMPTZ,
  chief_complaint TEXT,
  provisional_diagnosis TEXT,
  final_diagnosis TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ipd_admissions_patient ON public.ipd_admissions(patient_id);
CREATE INDEX idx_ipd_admissions_doctor ON public.ipd_admissions(doctor_id);
CREATE INDEX idx_ipd_admissions_status ON public.ipd_admissions(status);
CREATE INDEX idx_ipd_admissions_bed ON public.ipd_admissions(bed_id);

-- Generate admission number
CREATE OR REPLACE FUNCTION public.generate_admission_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(admission_number FROM 'IPD-([0-9]+)$') AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.ipd_admissions
  WHERE admission_number ~ '^IPD-[0-9]+$';
  RETURN 'IPD-' || LPAD(next_num::TEXT, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_admission_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.admission_number IS NULL OR NEW.admission_number = '' THEN
    NEW.admission_number := public.generate_admission_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_admission_defaults
BEFORE INSERT ON public.ipd_admissions
FOR EACH ROW EXECUTE FUNCTION public.set_admission_defaults();

-- Sync bed status when admission changes
CREATE OR REPLACE FUNCTION public.sync_bed_status_on_admission()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
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
$$;

CREATE TRIGGER trg_sync_bed_status
AFTER INSERT OR UPDATE ON public.ipd_admissions
FOR EACH ROW EXECUTE FUNCTION public.sync_bed_status_on_admission();

-- ============ IPD TREATMENT CHART ============
CREATE TABLE public.ipd_treatment_chart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id UUID NOT NULL REFERENCES public.ipd_admissions(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  entry_type TEXT NOT NULL, -- vitals, doctor_note, nurse_note, iv_fluid, intake_output, medicine_admin
  -- Vitals
  bp_systolic INTEGER,
  bp_diastolic INTEGER,
  pulse INTEGER,
  temperature NUMERIC,
  oxygen_saturation NUMERIC,
  respiratory_rate INTEGER,
  -- Notes
  notes TEXT,
  -- IV fluids
  fluid_type TEXT,
  fluid_volume_ml NUMERIC,
  fluid_rate TEXT,
  -- Intake/output
  intake_ml NUMERIC,
  output_ml NUMERIC,
  -- Meta
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chart_admission ON public.ipd_treatment_chart(admission_id);
CREATE INDEX idx_chart_recorded_at ON public.ipd_treatment_chart(recorded_at);

-- ============ IPD MEDICINE ORDERS ============
CREATE TABLE public.ipd_medicine_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id UUID NOT NULL REFERENCES public.ipd_admissions(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  route TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, dispensed, administered, cancelled
  ordered_by UUID,
  dispensed_by UUID,
  dispensed_at TIMESTAMPTZ,
  administered_by UUID,
  administered_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_med_orders_admission ON public.ipd_medicine_orders(admission_id);
CREATE INDEX idx_med_orders_status ON public.ipd_medicine_orders(status);

-- ============ IPD LAB ORDERS ============
CREATE TABLE public.ipd_lab_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id UUID NOT NULL REFERENCES public.ipd_admissions(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  test_type_id UUID,
  charge NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  result_notes TEXT,
  ordered_by UUID,
  completed_by UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ipd_lab_admission ON public.ipd_lab_orders(admission_id);

-- ============ IPD INVOICES ============
CREATE TABLE public.ipd_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  admission_id UUID NOT NULL UNIQUE REFERENCES public.ipd_admissions(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL,
  bed_charges_total NUMERIC NOT NULL DEFAULT 0,
  medicine_charges_total NUMERIC NOT NULL DEFAULT 0,
  lab_charges_total NUMERIC NOT NULL DEFAULT 0,
  nursing_charges_total NUMERIC NOT NULL DEFAULT 0,
  doctor_charges_total NUMERIC NOT NULL DEFAULT 0,
  other_charges_total NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open', -- open, finalized, paid, cancelled
  finalized_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.generate_ipd_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'IPDI-([0-9]+)$') AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.ipd_invoices
  WHERE invoice_number ~ '^IPDI-[0-9]+$';
  RETURN 'IPDI-' || LPAD(next_num::TEXT, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_ipd_invoice_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := public.generate_ipd_invoice_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ipd_invoice_defaults
BEFORE INSERT ON public.ipd_invoices
FOR EACH ROW EXECUTE FUNCTION public.set_ipd_invoice_defaults();

-- ============ IPD CHARGES ============
CREATE TABLE public.ipd_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id UUID NOT NULL REFERENCES public.ipd_admissions(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.ipd_invoices(id) ON DELETE SET NULL,
  charge_type TEXT NOT NULL, -- bed, medicine, lab, nursing, doctor, other
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0,
  charge_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source_table TEXT,
  source_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ipd_charges_admission ON public.ipd_charges(admission_id);
CREATE INDEX idx_ipd_charges_invoice ON public.ipd_charges(invoice_id);
CREATE INDEX idx_ipd_charges_type ON public.ipd_charges(charge_type);

-- ============ updated_at triggers ============
CREATE TRIGGER trg_wards_updated BEFORE UPDATE ON public.wards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_beds_updated BEFORE UPDATE ON public.beds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ipd_admissions_updated BEFORE UPDATE ON public.ipd_admissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ipd_med_orders_updated BEFORE UPDATE ON public.ipd_medicine_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ipd_lab_orders_updated BEFORE UPDATE ON public.ipd_lab_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ipd_invoices_updated BEFORE UPDATE ON public.ipd_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RLS ============
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ipd_admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ipd_treatment_chart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ipd_medicine_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ipd_lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ipd_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ipd_charges ENABLE ROW LEVEL SECURITY;

-- Helper: staff roles allowed to operate on IPD
-- Wards & Beds: read for all authenticated, manage for admin
CREATE POLICY "Anyone authenticated can view wards" ON public.wards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage wards" ON public.wards FOR ALL TO authenticated USING (public.get_current_user_role() = 'admin') WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Anyone authenticated can view beds" ON public.beds FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage beds" ON public.beds FOR ALL TO authenticated USING (public.get_current_user_role() = 'admin') WITH CHECK (public.get_current_user_role() = 'admin');
CREATE POLICY "Staff update bed status" ON public.beds FOR UPDATE TO authenticated USING (public.get_current_user_role() IN ('admin','doctor','nurse','receptionist','staff','ota','finance')) WITH CHECK (public.get_current_user_role() IN ('admin','doctor','nurse','receptionist','staff','ota','finance'));

-- Admissions
CREATE POLICY "Staff view admissions" ON public.ipd_admissions FOR SELECT TO authenticated USING (
  public.get_current_user_role() IN ('admin','doctor','nurse','receptionist','staff','ota','finance','pharmacist','head_pharmacist','assistant_pharmacist','salesman_pharmacist','lab','lab_staff') OR patient_id = auth.uid()
);
CREATE POLICY "Staff create admissions" ON public.ipd_admissions FOR INSERT TO authenticated WITH CHECK (public.get_current_user_role() IN ('admin','doctor','nurse','receptionist','staff','ota'));
CREATE POLICY "Staff update admissions" ON public.ipd_admissions FOR UPDATE TO authenticated USING (public.get_current_user_role() IN ('admin','doctor','nurse','receptionist','staff','ota','finance')) WITH CHECK (public.get_current_user_role() IN ('admin','doctor','nurse','receptionist','staff','ota','finance'));
CREATE POLICY "Admin delete admissions" ON public.ipd_admissions FOR DELETE TO authenticated USING (public.get_current_user_role() = 'admin');

-- Treatment chart
CREATE POLICY "Staff view chart" ON public.ipd_treatment_chart FOR SELECT TO authenticated USING (
  public.get_current_user_role() IN ('admin','doctor','nurse','receptionist','staff','ota','finance')
  OR EXISTS (SELECT 1 FROM public.ipd_admissions a WHERE a.id = admission_id AND a.patient_id = auth.uid())
);
CREATE POLICY "Clinical write chart" ON public.ipd_treatment_chart FOR INSERT TO authenticated WITH CHECK (public.get_current_user_role() IN ('admin','doctor','nurse','ota','staff'));
CREATE POLICY "Clinical update chart" ON public.ipd_treatment_chart FOR UPDATE TO authenticated USING (public.get_current_user_role() IN ('admin','doctor','nurse','ota','staff')) WITH CHECK (public.get_current_user_role() IN ('admin','doctor','nurse','ota','staff'));
CREATE POLICY "Admin delete chart" ON public.ipd_treatment_chart FOR DELETE TO authenticated USING (public.get_current_user_role() = 'admin');

-- Medicine orders
CREATE POLICY "Staff view ipd meds" ON public.ipd_medicine_orders FOR SELECT TO authenticated USING (
  public.get_current_user_role() IN ('admin','doctor','nurse','receptionist','staff','ota','finance','pharmacist','head_pharmacist','assistant_pharmacist','salesman_pharmacist')
  OR EXISTS (SELECT 1 FROM public.ipd_admissions a WHERE a.id = admission_id AND a.patient_id = auth.uid())
);
CREATE POLICY "Clinical create ipd meds" ON public.ipd_medicine_orders FOR INSERT TO authenticated WITH CHECK (public.get_current_user_role() IN ('admin','doctor','nurse','ota','staff'));
CREATE POLICY "Pharmacy update ipd meds" ON public.ipd_medicine_orders FOR UPDATE TO authenticated USING (public.get_current_user_role() IN ('admin','doctor','nurse','ota','pharmacist','head_pharmacist','assistant_pharmacist','salesman_pharmacist')) WITH CHECK (public.get_current_user_role() IN ('admin','doctor','nurse','ota','pharmacist','head_pharmacist','assistant_pharmacist','salesman_pharmacist'));
CREATE POLICY "Admin delete ipd meds" ON public.ipd_medicine_orders FOR DELETE TO authenticated USING (public.get_current_user_role() = 'admin');

-- Lab orders
CREATE POLICY "Staff view ipd labs" ON public.ipd_lab_orders FOR SELECT TO authenticated USING (
  public.get_current_user_role() IN ('admin','doctor','nurse','receptionist','staff','ota','finance','lab','lab_staff')
  OR EXISTS (SELECT 1 FROM public.ipd_admissions a WHERE a.id = admission_id AND a.patient_id = auth.uid())
);
CREATE POLICY "Clinical create ipd labs" ON public.ipd_lab_orders FOR INSERT TO authenticated WITH CHECK (public.get_current_user_role() IN ('admin','doctor','nurse','ota','staff','lab','lab_staff'));
CREATE POLICY "Lab update ipd labs" ON public.ipd_lab_orders FOR UPDATE TO authenticated USING (public.get_current_user_role() IN ('admin','doctor','lab','lab_staff','nurse','ota')) WITH CHECK (public.get_current_user_role() IN ('admin','doctor','lab','lab_staff','nurse','ota'));
CREATE POLICY "Admin delete ipd labs" ON public.ipd_lab_orders FOR DELETE TO authenticated USING (public.get_current_user_role() = 'admin');

-- Invoices
CREATE POLICY "Staff view ipd invoices" ON public.ipd_invoices FOR SELECT TO authenticated USING (
  public.get_current_user_role() IN ('admin','doctor','nurse','receptionist','staff','ota','finance')
  OR patient_id = auth.uid()
);
CREATE POLICY "Finance manage ipd invoices" ON public.ipd_invoices FOR ALL TO authenticated USING (public.get_current_user_role() IN ('admin','finance','receptionist','staff')) WITH CHECK (public.get_current_user_role() IN ('admin','finance','receptionist','staff'));

-- Charges
CREATE POLICY "Staff view ipd charges" ON public.ipd_charges FOR SELECT TO authenticated USING (
  public.get_current_user_role() IN ('admin','doctor','nurse','receptionist','staff','ota','finance')
  OR EXISTS (SELECT 1 FROM public.ipd_admissions a WHERE a.id = admission_id AND a.patient_id = auth.uid())
);
CREATE POLICY "Staff manage ipd charges" ON public.ipd_charges FOR ALL TO authenticated USING (public.get_current_user_role() IN ('admin','finance','receptionist','staff','doctor','nurse','ota')) WITH CHECK (public.get_current_user_role() IN ('admin','finance','receptionist','staff','doctor','nurse','ota'));
