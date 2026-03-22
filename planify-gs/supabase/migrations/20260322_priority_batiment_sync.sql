-- Add frequency_type to priorities for batiment inspection sync
ALTER TABLE priorities
  ADD COLUMN IF NOT EXISTS frequency_type text CHECK (frequency_type IN ('mensuel', 'semestriel', 'annuel'));

-- Add completed_date to priority_parts to track when each branch was inspected
ALTER TABLE priority_parts
  ADD COLUMN IF NOT EXISTS completed_date date;
