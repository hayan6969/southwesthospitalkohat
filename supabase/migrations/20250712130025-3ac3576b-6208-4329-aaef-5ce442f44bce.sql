-- Clear all historical data from the system
-- Delete in order to respect foreign key constraints

-- Clear queue positions first (references appointments)
DELETE FROM public.queue_positions;

-- Clear medical records
DELETE FROM public.medical_records;

-- Clear lab reports
DELETE FROM public.lab_reports;

-- Clear OT schedules
DELETE FROM public.ot_schedules;

-- Clear OT expenses
DELETE FROM public.ot_expenses;

-- Clear pharmacy invoice items first (references pharmacy_invoices)
DELETE FROM public.pharmacy_invoice_items;

-- Clear pharmacy invoices
DELETE FROM public.pharmacy_invoices;

-- Clear regular invoices
DELETE FROM public.invoices;

-- Clear appointments
DELETE FROM public.appointments;

-- Reset sequences/counters if any exist
-- This ensures that new records start from clean IDs
SELECT setval(pg_get_serial_sequence('public.appointments', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('public.invoices', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('public.pharmacy_invoices', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('public.lab_reports', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('public.ot_schedules', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('public.medical_records', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('public.queue_positions', 'id'), 1, false);

-- Optional: Reset audit logs as well (uncomment if needed)
-- DELETE FROM public.audit_logs;
-- SELECT setval(pg_get_serial_sequence('public.audit_logs', 'id'), 1, false);