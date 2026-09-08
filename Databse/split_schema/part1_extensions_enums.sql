-- South West HIMS — schema export (public schema)
-- Run in your new Supabase project's SQL editor.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- ============ ENUM TYPES ============
DO $$ BEGIN CREATE TYPE public.appointment_status AS ENUM ('scheduled', 'completed', 'cancelled', 'rescheduled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
