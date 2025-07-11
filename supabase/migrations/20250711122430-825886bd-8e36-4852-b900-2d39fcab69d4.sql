-- Create OT rooms table
CREATE TABLE IF NOT EXISTS public.ot_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_name TEXT NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on ot_rooms
ALTER TABLE public.ot_rooms ENABLE ROW LEVEL SECURITY;

-- Create policies for ot_rooms
CREATE POLICY "Everyone can view OT rooms" ON public.ot_rooms
    FOR SELECT USING (true);

CREATE POLICY "Only admins can manage OT rooms" ON public.ot_rooms
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Add trigger for updated_at
CREATE TRIGGER update_ot_rooms_updated_at
    BEFORE UPDATE ON public.ot_rooms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create OT schedules table
CREATE TABLE IF NOT EXISTS public.ot_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id),
    doctor_id UUID REFERENCES public.doctors(id),
    doctor_name TEXT,
    doctor_expense NUMERIC DEFAULT 0,
    operation_id UUID REFERENCES public.ot_operations(id),
    room_id UUID REFERENCES public.ot_rooms(id),
    operation_date DATE NOT NULL,
    queue_position INTEGER NOT NULL,
    status TEXT DEFAULT 'scheduled',
    notes TEXT,
    total_cost NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on ot_schedules
ALTER TABLE public.ot_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies for ot_schedules
CREATE POLICY "Everyone can view OT schedules" ON public.ot_schedules
    FOR SELECT USING (true);

CREATE POLICY "Staff and admins can manage OT schedules" ON public.ot_schedules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'staff')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'staff')
        )
    );

-- Add trigger for updated_at
CREATE TRIGGER update_ot_schedules_updated_at
    BEFORE UPDATE ON public.ot_schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get next queue position for OT
CREATE OR REPLACE FUNCTION public.get_next_ot_queue_position(room_uuid uuid, operation_date_param date)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    next_position INTEGER;
BEGIN
    SELECT COALESCE(MAX(queue_position), 0) + 1
    INTO next_position
    FROM public.ot_schedules
    WHERE room_id = room_uuid 
    AND operation_date = operation_date_param;
    
    RETURN next_position;
END;
$$;