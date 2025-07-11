-- Enable realtime for ot_schedules table
ALTER TABLE public.ot_schedules REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ot_schedules;