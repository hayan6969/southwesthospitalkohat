
-- Create patient_discounts table
CREATE TABLE public.patient_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  discount_type text NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL DEFAULT 0,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (patient_id)
);

-- Enable RLS
ALTER TABLE public.patient_discounts ENABLE ROW LEVEL SECURITY;

-- Finance/admin can do everything
CREATE POLICY "Finance and admin can manage patient discounts"
  ON public.patient_discounts FOR ALL
  TO public
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance', 'admin')));

-- Staff can view discounts (needed when creating invoices)
CREATE POLICY "Staff can view patient discounts"
  ON public.patient_discounts FOR SELECT
  TO public
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('staff', 'doctor')));
