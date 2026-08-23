CREATE OR REPLACE FUNCTION public.sync_patient_name_snapshots()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (COALESCE(NEW.first_name,'') IS DISTINCT FROM COALESCE(OLD.first_name,''))
     OR (COALESCE(NEW.last_name,'') IS DISTINCT FROM COALESCE(OLD.last_name,'')) THEN
    UPDATE public.lab_pathology_reports
       SET patient_name_snapshot = btrim(COALESCE(NEW.first_name,'') || ' ' || COALESCE(NEW.last_name,''))
     WHERE patient_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_patient_name_snapshots ON public.profiles;
CREATE TRIGGER trg_sync_patient_name_snapshots
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_patient_name_snapshots();