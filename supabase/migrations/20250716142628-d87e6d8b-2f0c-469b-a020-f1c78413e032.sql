-- Enable full replica identity for ot_schedules table to ensure all row data is captured
ALTER TABLE ot_schedules REPLICA IDENTITY FULL;

-- Make sure ot_schedules is in the realtime publication
-- (This might already be done, but let's ensure it)
-- First check if it's already there, then add if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'ot_schedules'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE ot_schedules;
    END IF;
END $$;