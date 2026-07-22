-- Add amount column to appointments table if it doesn't exist
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS amount numeric DEFAULT 0;

-- Update existing appointments to have the service price as default amount
UPDATE public.appointments
SET amount = (
  SELECT price FROM public.services 
  WHERE services.id = appointments.service_id
)
WHERE amount = 0 AND service_id IS NOT NULL;
