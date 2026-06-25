-- =============================================
-- Prescription System — Schema (adapted to existing DB)
-- =============================================
-- Note: existing doctors table uses column `name` (not `doctor_name`)
--       sample UUIDs use only hex chars (gen_random_uuid() compatible)

-- 1. EXTEND EXISTING doctors TABLE
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS clinic_name         text,
  ADD COLUMN IF NOT EXISTS clinic_short_name   text,
  ADD COLUMN IF NOT EXISTS phone               text,
  ADD COLUMN IF NOT EXISTS address             text,
  ADD COLUMN IF NOT EXISTS qualifications      text,
  ADD COLUMN IF NOT EXISTS title               text,
  ADD COLUMN IF NOT EXISTS doctor_details      text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS urdu_doctor_name    text,
  ADD COLUMN IF NOT EXISTS urdu_details        text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS consultation_fee    numeric DEFAULT 0;

-- 2. CREATE patients TABLE
CREATE TABLE IF NOT EXISTS public.patients (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn        text UNIQUE NOT NULL,
  full_name  text NOT NULL,
  age        text,
  gender     text,
  doctor_id  uuid REFERENCES public.doctors(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. CREATE visits TABLE
CREATE TABLE IF NOT EXISTS public.visits (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id     uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id      uuid REFERENCES public.doctors(id) ON DELETE SET NULL,
  token_number   text,
  visit_date     date DEFAULT CURRENT_DATE,
  clinical_notes text,
  uterus         text,
  adnexa         text,
  pod            text,
  created_at     timestamptz DEFAULT now()
);

-- 4. CREATE medicines TABLE
CREATE TABLE IF NOT EXISTS public.medicines (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id  uuid REFERENCES public.visits(id) ON DELETE CASCADE,
  name      text NOT NULL,
  dose      text,
  frequency text,
  duration  text,
  created_at timestamptz DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_patients_mrn        ON public.patients(mrn);
CREATE INDEX IF NOT EXISTS idx_patients_doctor_id  ON public.patients(doctor_id);
CREATE INDEX IF NOT EXISTS idx_visits_patient_id   ON public.visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_doctor_id    ON public.visits(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medicines_visit_id  ON public.medicines(visit_id);

-- ROW LEVEL SECURITY
ALTER TABLE public.patients  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read doctors" ON public.doctors;
DROP POLICY IF EXISTS "Authenticated users can read patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated users can read visits" ON public.visits;
DROP POLICY IF EXISTS "Authenticated users can read medicines" ON public.medicines;

CREATE POLICY "Authenticated users can read doctors"
  ON public.doctors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read patients"
  ON public.patients FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read visits"
  ON public.visits FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read medicines"
  ON public.medicines FOR SELECT TO authenticated USING (true);

-- =============================================
-- SAMPLE DATA (hex-only UUIDs for Postgres compatibility)
-- =============================================
INSERT INTO public.doctors (id, name, clinic_name, clinic_short_name, phone, address,
  qualifications, title, doctor_details,
  urdu_doctor_name, urdu_details, consultation_fee, active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Prof. Dr. Musarrat Jabeen',
  'SOUTH WEST HEALTH COMPLEX KOHAT',
  'SWHC',
  '0336-1974146',
  'Opposite Millinium Guest House, Pindi Raod Kohat',
  'MBBS, FCPS, CHPE, CHR',
  'Consultant Gynaecologist',
  ARRAY[
    'Principal KMU-IMS Kohat',
    'CEO DHQ & W&C/LM Teaching Hospital Kohat',
    'Pattern in Chief Society of OBS/Gynae (SOGP) Kohat Chapter',
    'Former Chairperson Society of OBS/Gynae (SOGP) Kohat Chapter',
    'Former Head of Gynae Department Liaqat Memorial Hospital Kohat',
    'Former Dean, Faculty of Allied Health Sciences KMU Peshawar, Pakistan'
  ],
  'پروفیسر ڈاکٹر مسرت جبین',
  ARRAY[
    'ایم بی بی ایس، ایف سی پی ایس، سی ایچ پی ای، سی ایچ آر)',
    'گائنی کالوجسٹ',
    'پرنسپل کے ایم یو-آئی ایم ایس (کے آئی ایم ایس) کوہاٹ',
    'چیف ایگزیکٹیو آفیسر ڈی ایچ کیو ایم ایچ کوہاٹ',
    'پیٹرن ان چیف سوسائٹی آف گائنی (ایس او جی پی) کوہاٹ چیپٹر',
    'فارمر چیئرپرسن سوسائٹی آف گائنی (ایس او جی پی) کوہاٹ چیپٹر',
    'فارمر ہیڈ آف گائنی ڈیپارٹمنٹ لیاقت میموریل ہسپتال کوہاٹ',
    'فارمر ڈین فیکلٹی آف الائیڈ ہیلتھ سائنسز کے ایم یو پیشاور، پاکستان'
  ],
  1500.00,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  clinic_name = EXCLUDED.clinic_name,
  clinic_short_name = EXCLUDED.clinic_short_name,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  qualifications = EXCLUDED.qualifications,
  title = EXCLUDED.title,
  doctor_details = EXCLUDED.doctor_details,
  urdu_doctor_name = EXCLUDED.urdu_doctor_name,
  urdu_details = EXCLUDED.urdu_details,
  consultation_fee = EXCLUDED.consultation_fee;

INSERT INTO public.patients (id, mrn, full_name, age, gender, doctor_id)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'MR-00241',
  'Fatima Bibi',
  '32 yrs',
  'Female',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO UPDATE SET
  mrn = EXCLUDED.mrn,
  full_name = EXCLUDED.full_name,
  age = EXCLUDED.age,
  gender = EXCLUDED.gender,
  doctor_id = EXCLUDED.doctor_id;

INSERT INTO public.visits (id, patient_id, doctor_id, token_number, visit_date,
  clinical_notes, uterus, adnexa, pod)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'TK-005',
  '2026-06-24',
  'Patient presents with lower abdominal pain for 2 weeks. No fever. Normal bowel habits.',
  'Anteverted, normal size, smooth outline',
  'Clear bilateral, no masses',
  'Free fluid — minimal'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.medicines (visit_id, name, dose, frequency, duration)
VALUES
  ('00000000-0000-0000-0000-000000000003', 'Augmentin 625mg',  '1 tab',  'BID',  '7 days'),
  ('00000000-0000-0000-0000-000000000003', 'Omeprazole 20mg',  '1 cap',  'OD',   '7 days'),
  ('00000000-0000-0000-0000-000000000003', 'Mefenamic Acid 500mg', '1 tab', 'PRN', '3 days')
ON CONFLICT DO NOTHING;
