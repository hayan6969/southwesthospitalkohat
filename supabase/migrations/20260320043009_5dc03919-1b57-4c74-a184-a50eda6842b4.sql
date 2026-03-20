-- Allow staff to UPDATE patient_discounts (to mark discounts as used when creating invoices)
CREATE POLICY "Staff can consume patient discounts"
ON public.patient_discounts
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('staff', 'lab', 'ota')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('staff', 'lab', 'ota')
  )
);