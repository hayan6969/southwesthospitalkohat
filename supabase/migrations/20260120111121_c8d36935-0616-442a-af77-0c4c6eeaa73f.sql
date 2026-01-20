
-- Update the 1/20/2026 daily closing with correct pharmacy data
-- Pharmacy revenue: 567,640.97 (calculated from pharmacy_invoices in the time period)
-- Pharmacy profit: 97,503.71 (calculated from invoice items cost vs selling price)
-- Net profit: current net_profit (216,100) + pharmacy_profit (97,503.71) = 313,603.71

UPDATE daily_closings 
SET 
  pharmacy_revenue = 567640.97,
  pharmacy_profit = 97503.71,
  net_profit = 313603.71,
  transactions_data = jsonb_set(
    transactions_data::jsonb,
    '{pharmacyInvoices}',
    (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', pi.id,
          'invoice_number', pi.invoice_number,
          'customer_name', pi.customer_name,
          'customer_phone', pi.customer_phone,
          'total_amount', pi.total_amount,
          'discount_amount', pi.discount_amount,
          'final_amount', pi.final_amount,
          'status', pi.status,
          'created_at', pi.created_at,
          'pharmacy_invoice_items', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', pii.id,
                'quantity', pii.quantity,
                'unit_price', pii.unit_price,
                'total_price', pii.total_price,
                'medicine_id', pii.medicine_id,
                'medicines', jsonb_build_object(
                  'name', m.name,
                  'purchase_price', m.purchase_price,
                  'selling_price', m.selling_price
                )
              )
            )
            FROM pharmacy_invoice_items pii
            LEFT JOIN medicines m ON m.id = pii.medicine_id
            WHERE pii.invoice_id = pi.id
          ), '[]'::jsonb)
        )
      ), '[]'::jsonb)
      FROM pharmacy_invoices pi
      WHERE pi.created_at > '2026-01-19 04:48:28.318+00'
        AND pi.created_at <= '2026-01-20 06:01:22.075+00'
        AND pi.status = 'completed'
    )
  ),
  updated_at = NOW()
WHERE id = '91d65c88-4c7c-48fc-9eb7-0b1ccc45bdf2';
