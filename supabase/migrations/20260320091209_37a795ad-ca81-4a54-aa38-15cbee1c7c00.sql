
CREATE TABLE public.overtime_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  employee_name text NOT NULL,
  overtime_hours numeric NOT NULL DEFAULT 0,
  overtime_rate numeric NOT NULL DEFAULT 0,
  overtime_amount numeric NOT NULL DEFAULT 0,
  overtime_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_by uuid,
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.overtime_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance users can view overtime records"
  ON public.overtime_records FOR SELECT
  TO public
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance', 'admin')));

CREATE POLICY "Finance users can create overtime records"
  ON public.overtime_records FOR INSERT
  TO public
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance', 'admin')));

CREATE POLICY "Finance users can update overtime records"
  ON public.overtime_records FOR UPDATE
  TO public
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance', 'admin')));

CREATE POLICY "Finance users can delete overtime records"
  ON public.overtime_records FOR DELETE
  TO public
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance', 'admin')));
