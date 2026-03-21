-- Add notes and supplier fields to batiment_dechet and batiment_menage

ALTER TABLE batiment_dechet
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS supplier text;

ALTER TABLE batiment_menage
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS supplier text;
