-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES ('doctor-avatars','doctor-avatars',true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('patient-documents','patient-documents',true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('lab-results','lab-results',true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('finance-proofs','finance-proofs',true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('hospital-logos','hospital-logos',true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('doctor-assets','doctor-assets',true) ON CONFLICT (id) DO NOTHING;

-- ============ AUTH-SIDE TRIGGER (run after the rest) ============
-- Recreates the profile-on-signup hook. Requires the postgres/owner role.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ IMPORT ORDER ============
-- 1. Run this file (creates enums, tables, constraints, indexes, functions,
--    triggers, grants, RLS, policies, storage buckets).
-- 2. Import auth users FIRST (southwest-auth-users.sql) — many public tables
--    have foreign keys to auth.users(id).
-- 3. Import public table data (CSV export from Cloud -> Advanced -> Export data).
--    Disable triggers while loading:  SET session_replication_role = replica;
--    and re-enable after:             SET session_replication_role = origin;

-- ===========================================================
-- SCHEMA UPDATE BLOCK — changes made after 2026-07-29
-- Snapshot taken: 2026-09-08 05:08 UTC (10:08 Pakistan time)
-- Safe to re-run (all statements are IF NOT EXISTS / OR REPLACE)
-- ===========================================================

-- 1. Eye-specialist flag on doctors (drives the eye prescription template)
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS is_eye_specialist boolean NOT NULL DEFAULT false;

-- 2. Performance indexes added 2026-09-07
CREATE INDEX IF NOT EXISTS idx_profiles_created_at        ON public.profiles    USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at        ON public.invoices    USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status_created_at ON public.invoices    USING btree (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at      ON public.audit_logs  USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id         ON public.audit_logs  USING btree (user_id);

-- 3. Live patient-name sync onto pathology reports
CREATE OR REPLACE FUNCTION public.sync_patient_name_snapshots()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (COALESCE(NEW.first_name,'') IS DISTINCT FROM COALESCE(OLD.first_name,''))
     OR (COALESCE(NEW.last_name,'') IS DISTINCT FROM COALESCE(OLD.last_name,'')) THEN
    UPDATE public.lab_pathology_reports
       SET patient_name_snapshot = btrim(COALESCE(NEW.first_name,'') || ' ' || COALESCE(NEW.last_name,''))
     WHERE patient_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_patient_name_snapshots ON public.profiles;
CREATE TRIGGER trg_sync_patient_name_snapshots
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_patient_name_snapshots();

ANALYZE;
-- End of update block
