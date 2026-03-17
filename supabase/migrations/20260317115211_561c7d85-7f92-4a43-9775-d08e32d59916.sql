
-- Add proof_url column to expenses table
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS proof_url text;

-- Add proof_url column to refunds table  
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS proof_url text;

-- Create storage bucket for finance proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('finance-proofs', 'finance-proofs', true) ON CONFLICT (id) DO NOTHING;

-- RLS policies for finance-proofs bucket
CREATE POLICY "Finance users can upload proofs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'finance-proofs' AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance', 'admin', 'staff')));

CREATE POLICY "Anyone authenticated can view proofs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'finance-proofs');

CREATE POLICY "Finance users can delete proofs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'finance-proofs' AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance', 'admin')));
