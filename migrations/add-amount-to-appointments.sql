-- Migration: Add amount column to appointments table
-- This column tracks the price charged for each appointment

ALTER TABLE appointments
ADD COLUMN amount numeric DEFAULT 0 NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN appointments.amount IS 'The amount/price charged for this appointment in BRL';

-- Create index for faster queries on amount
CREATE INDEX idx_appointments_amount ON appointments(amount);

-- Update existing appointments with the service price as default
UPDATE appointments
SET amount = (
  SELECT price FROM services WHERE services.id = appointments.service_id
)
WHERE amount = 0 AND service_id IS NOT NULL;
