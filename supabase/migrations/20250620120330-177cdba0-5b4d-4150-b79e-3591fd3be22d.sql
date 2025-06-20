
-- Create medicines table
CREATE TABLE public.medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  formula TEXT,
  company_name TEXT,
  batch_number TEXT,
  manufacturing_date DATE,
  expiry_date DATE NOT NULL,
  purchase_price DECIMAL(10,2) NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  minimum_stock_level INTEGER DEFAULT 10,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create pharmacy_invoices table
CREATE TABLE public.pharmacy_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  total_amount DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  final_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create pharmacy_invoice_items table
CREATE TABLE public.pharmacy_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.pharmacy_invoices(id) ON DELETE CASCADE,
  medicine_id UUID REFERENCES public.medicines(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_invoice_items ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for development)
CREATE POLICY "Allow all operations" ON public.medicines FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.pharmacy_invoices FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.pharmacy_invoice_items FOR ALL USING (true);

-- Add ip_address column to audit_logs table if it doesn't exist
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Insert sample medicines data
INSERT INTO public.medicines (name, formula, company_name, batch_number, manufacturing_date, expiry_date, purchase_price, selling_price, stock_quantity, description) VALUES 
('Paracetamol 500mg', 'C8H9NO2', 'PharmaCorp', 'PC001', '2024-01-15', '2025-01-15', 50.00, 75.00, 100, 'Pain relief and fever reducer'),
('Amoxicillin 250mg', 'C16H19N3O5S', 'MediGen', 'MG002', '2024-02-10', '2024-12-10', 120.00, 180.00, 50, 'Antibiotic for bacterial infections'),
('Ibuprofen 400mg', 'C13H18O2', 'HealthPlus', 'HP003', '2024-03-01', '2024-11-01', 80.00, 120.00, 75, 'Anti-inflammatory and pain relief'),
('Cough Syrup', 'Dextromethorphan', 'CoughCare', 'CC004', '2024-04-15', '2024-10-15', 95.00, 140.00, 30, 'Cough suppressant syrup'),
('Vitamin D3', 'Cholecalciferol', 'VitaLife', 'VL005', '2024-05-01', '2025-05-01', 200.00, 300.00, 80, 'Vitamin D3 supplement');
