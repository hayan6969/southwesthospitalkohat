-- Create missing doctor record for existing doctor profile
INSERT INTO public.doctors (id, specialization, experience_years, license_number, consultation_fee)
VALUES ('1343b683-7fde-4d69-b8c3-bd66ba6aed6a', 'General Medicine', 5, 'MD-2024-001', 1500);