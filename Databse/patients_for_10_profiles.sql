-- Patients for the 10 profiles created after 2026-09-08 05:08 UTC (10:08 PKT)
-- Run AFTER profiles_after_08Sep_0508UTC.sql (patients reference profiles).
-- Safe to run more than once: existing rows are skipped (no ON CONFLICT used).
BEGIN;

-- P-03405 SAINA BIBI
INSERT INTO public.patients (id, cnic, patient_number)
SELECT '6fa041ff-f254-4c10-828f-a3bf6eaf66d7', '..,,,,..,,.,.,.,.,.,', 'P-03405'
WHERE NOT EXISTS (SELECT 1 FROM public.patients pt WHERE pt.id = '6fa041ff-f254-4c10-828f-a3bf6eaf66d7');

-- P-03406 SANIA HAMEED
INSERT INTO public.patients (id, cnic, patient_number)
SELECT '9539a304-a5cc-431c-bb0d-fbb8216b10d8', '`````````><><>', 'P-03406'
WHERE NOT EXISTS (SELECT 1 FROM public.patients pt WHERE pt.id = '9539a304-a5cc-431c-bb0d-fbb8216b10d8');

-- P-03407 ASMA SAFI ULLAH
INSERT INTO public.patients (id, cnic, patient_number)
SELECT '4cea9385-7edf-443a-aaa0-1e57c36255d6', '03349606226', 'P-03407'
WHERE NOT EXISTS (SELECT 1 FROM public.patients pt WHERE pt.id = '4cea9385-7edf-443a-aaa0-1e57c36255d6');

-- P-03408 UMME EMAN
INSERT INTO public.patients (id, cnic, patient_number)
SELECT '59d6d7b9-0067-47eb-adab-db986386c809', '`````>>>>....', 'P-03408'
WHERE NOT EXISTS (SELECT 1 FROM public.patients pt WHERE pt.id = '59d6d7b9-0067-47eb-adab-db986386c809');

-- P-03409 SODAIS
INSERT INTO public.patients (id, cnic, patient_number)
SELECT '28b17a03-3ded-4267-8b2b-950c74cb06b7', '**************', 'P-03409'
WHERE NOT EXISTS (SELECT 1 FROM public.patients pt WHERE pt.id = '28b17a03-3ded-4267-8b2b-950c74cb06b7');

-- P-03410 SAYED KHIZAR
INSERT INTO public.patients (id, cnic, patient_number)
SELECT '8ffec605-11ca-407a-b816-c0a8f99df8ef', '*******', 'P-03410'
WHERE NOT EXISTS (SELECT 1 FROM public.patients pt WHERE pt.id = '8ffec605-11ca-407a-b816-c0a8f99df8ef');

-- P-03411 MUHAMMAD JAMEEL
INSERT INTO public.patients (id, cnic, patient_number)
SELECT '78c8e033-c2e7-4f5b-a948-f5f89551d63d', '***********', 'P-03411'
WHERE NOT EXISTS (SELECT 1 FROM public.patients pt WHERE pt.id = '78c8e033-c2e7-4f5b-a948-f5f89551d63d');

-- P-03412 HALEEMA BIBI
INSERT INTO public.patients (id, cnic, patient_number)
SELECT 'b92a57a9-72da-44df-b6f9-a732458a9838', '03339663495', 'P-03412'
WHERE NOT EXISTS (SELECT 1 FROM public.patients pt WHERE pt.id = 'b92a57a9-72da-44df-b6f9-a732458a9838');

-- P-03413 AYESHA BIBI
INSERT INTO public.patients (id, cnic, patient_number)
SELECT '2da5deca-d40d-49f4-84e8-5bf1159d1874', '03369667700', 'P-03413'
WHERE NOT EXISTS (SELECT 1 FROM public.patients pt WHERE pt.id = '2da5deca-d40d-49f4-84e8-5bf1159d1874');

-- P-03414 HALEEMA BIBI
INSERT INTO public.patients (id, cnic, patient_number)
SELECT 'a4a82f34-ead6-431f-8000-951d1ff0e5dc', '`````>>><><><`````````', 'P-03414'
WHERE NOT EXISTS (SELECT 1 FROM public.patients pt WHERE pt.id = 'a4a82f34-ead6-431f-8000-951d1ff0e5dc');

COMMIT;

-- Verify:
-- SELECT count(*) FROM public.patients WHERE patient_number BETWEEN 'P-03405' AND 'P-03414';  -- expect 10
