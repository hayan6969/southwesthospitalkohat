-- Create hospital_settings table
CREATE TABLE public.hospital_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opening_time TIME NOT NULL DEFAULT '08:00',
    closing_time TIME NOT NULL DEFAULT '20:00',
    working_days TEXT[] NOT NULL DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    max_appointments_per_doctor INTEGER NOT NULL DEFAULT 50,
    booking_lead_time_hours INTEGER NOT NULL DEFAULT 2,
    emergency_slots_percentage INTEGER NOT NULL DEFAULT 20,
    hospital_name TEXT NOT NULL DEFAULT 'City General Hospital',
    contact_number TEXT DEFAULT '+92-XXX-XXXXXXX',
    hospital_address TEXT DEFAULT '123 Main Street, City Center',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create queue_positions table for appointment queue management
CREATE TABLE public.queue_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id),
    appointment_date DATE NOT NULL,
    queue_position INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed', 'skipped')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(doctor_id, appointment_date, queue_position)
);

-- Enable RLS
ALTER TABLE public.hospital_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_positions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for hospital_settings (admin only can modify, everyone can read)
CREATE POLICY "Anyone can view hospital settings" 
ON public.hospital_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can modify hospital settings" 
ON public.hospital_settings 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Create RLS policies for queue_positions
CREATE POLICY "Users can view queue positions" 
ON public.queue_positions 
FOR SELECT 
USING (true);

CREATE POLICY "Staff and doctors can manage queue positions" 
ON public.queue_positions 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'doctor', 'staff')
    )
);

-- Insert default hospital settings
INSERT INTO public.hospital_settings (id) VALUES (gen_random_uuid());

-- Create function to get next queue position
CREATE OR REPLACE FUNCTION public.get_next_queue_position(doctor_uuid UUID, appointment_date_param DATE)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    next_position INTEGER;
BEGIN
    SELECT COALESCE(MAX(queue_position), 0) + 1
    INTO next_position
    FROM public.queue_positions
    WHERE doctor_id = doctor_uuid 
    AND appointment_date = appointment_date_param;
    
    RETURN next_position;
END;
$$;

-- Create trigger to auto-assign queue position when appointment is created
CREATE OR REPLACE FUNCTION public.auto_assign_queue_position()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    next_pos INTEGER;
    appointment_date_only DATE;
BEGIN
    -- Extract date from appointment_date timestamp
    appointment_date_only := NEW.appointment_date::DATE;
    
    -- Get next queue position
    next_pos := get_next_queue_position(NEW.doctor_id, appointment_date_only);
    
    -- Insert queue position
    INSERT INTO public.queue_positions (appointment_id, doctor_id, appointment_date, queue_position)
    VALUES (NEW.id, NEW.doctor_id, appointment_date_only, next_pos);
    
    RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_auto_assign_queue_position
    AFTER INSERT ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_assign_queue_position();

-- Create function to update queue positions when appointment is completed
CREATE OR REPLACE FUNCTION public.update_queue_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- When appointment status changes to completed, update queue position status
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE public.queue_positions 
        SET status = 'completed', updated_at = now()
        WHERE appointment_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for appointment completion
CREATE TRIGGER trigger_update_queue_on_completion
    AFTER UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_queue_on_completion();