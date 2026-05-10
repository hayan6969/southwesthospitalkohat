-- Add panel_price columns + unique name indexes to lab_tests and xray_tests
ALTER TABLE public.lab_tests ADD COLUMN IF NOT EXISTS panel_price numeric;
ALTER TABLE public.xray_tests ADD COLUMN IF NOT EXISTS panel_price numeric;
CREATE UNIQUE INDEX IF NOT EXISTS lab_tests_name_lower_uidx ON public.lab_tests (lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS xray_tests_name_lower_uidx ON public.xray_tests (lower(name));

-- New table for general hospital services (admission, OT, anesthesia, surgeries, etc.)
CREATE TABLE IF NOT EXISTS public.hospital_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alias_no integer,
  name text NOT NULL,
  price numeric NOT NULL,
  panel_price numeric,
  category text,
  application text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hospital_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view hospital services" ON public.hospital_services;
CREATE POLICY "Everyone can view hospital services"
  ON public.hospital_services FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage hospital services" ON public.hospital_services;
CREATE POLICY "Admins can manage hospital services"
  ON public.hospital_services FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP TRIGGER IF EXISTS update_hospital_services_updated_at ON public.hospital_services;
CREATE TRIGGER update_hospital_services_updated_at
  BEFORE UPDATE ON public.hospital_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE UNIQUE INDEX IF NOT EXISTS hospital_services_name_lower_uidx
  ON public.hospital_services (lower(name));