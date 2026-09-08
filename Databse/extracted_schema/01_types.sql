CREATE TYPE public.appointment_status AS ENUM (
    'scheduled',
    'completed',
    'cancelled',
    'rescheduled'
);
