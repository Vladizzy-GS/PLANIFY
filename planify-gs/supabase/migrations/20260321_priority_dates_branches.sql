-- Add date range and branch tagging to priorities
ALTER TABLE priorities
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date   date,
  ADD COLUMN IF NOT EXISTS branch_ids text[] DEFAULT '{}';
