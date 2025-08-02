-- Check if pharmacy_expenses table exists and create if not, then add bill_number column
CREATE TABLE IF NOT EXISTS public.pharmacy_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC NOT NULL,
  expense_type TEXT NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add bill_number column if it doesn't exist
ALTER TABLE public.pharmacy_expenses 
ADD COLUMN IF NOT EXISTS bill_number TEXT;

-- Enable RLS if not already enabled
ALTER TABLE public.pharmacy_expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for pharmacy_expenses if they don't exist
DO $$
BEGIN
  -- Check if policy exists before creating
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pharmacy_expenses' 
    AND policyname = 'Finance users can view pharmacy expenses'
  ) THEN
    CREATE POLICY "Finance users can view pharmacy expenses"
    ON public.pharmacy_expenses FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('finance', 'admin', 'pharmacy')
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pharmacy_expenses' 
    AND policyname = 'Finance users can create pharmacy expenses'
  ) THEN
    CREATE POLICY "Finance users can create pharmacy expenses"
    ON public.pharmacy_expenses FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('finance', 'admin', 'pharmacy')
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pharmacy_expenses' 
    AND policyname = 'Finance users can update pharmacy expenses'
  ) THEN
    CREATE POLICY "Finance users can update pharmacy expenses"
    ON public.pharmacy_expenses FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('finance', 'admin')
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pharmacy_expenses' 
    AND policyname = 'Finance users can delete pharmacy expenses'
  ) THEN
    CREATE POLICY "Finance users can delete pharmacy expenses"
    ON public.pharmacy_expenses FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('finance', 'admin')
      )
    );
  END IF;
END $$;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_pharmacy_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_pharmacy_expenses_updated_at ON public.pharmacy_expenses;
CREATE TRIGGER update_pharmacy_expenses_updated_at
    BEFORE UPDATE ON public.pharmacy_expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_pharmacy_expenses_updated_at();