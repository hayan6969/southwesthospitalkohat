-- Enable realtime for queue_positions table
ALTER TABLE public.queue_positions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_positions;