-- ============================================================
-- Migration: Set real civic addresses + geocoords for branches
-- Run in Supabase SQL Editor
-- ============================================================

UPDATE branches SET
  address = '1755 Rue Sigouin, Drummondville, QC J2C 5R7',
  lat     = 45.8700100,
  lng     = -72.5225000
WHERE id = 'drum';

UPDATE branches SET
  address = '19 Rue de Varennes, Gatineau, QC J8T 8G7',
  lat     = 45.4448000,
  lng     = -75.7382000
WHERE id = 'gat';

UPDATE branches SET
  address = '193 Rue Joseph M. Parent, Notre-Dame-des-Prairies, QC J6E 0S1',
  lat     = 46.0539000,
  lng     = -73.4354000
WHERE id = 'ndp';

UPDATE branches SET
  address = '3235 Boulevard St François, Jonquière, QC G7T 1A1',
  lat     = 48.4059000,
  lng     = -71.2498000
WHERE id = 'jon';

UPDATE branches SET
  address = '44 Rue John-A.-Scott #101, Lévis, QC G6Z 8K7',
  lat     = 46.7124000,
  lng     = -71.3750000
WHERE id = 'lev';

UPDATE branches SET
  address = '3674 Boul Rideau, Rouyn-Noranda, QC J0Z 1Y0',
  lat     = 48.2013000,
  lng     = -79.0822000
WHERE id = 'ryn';

UPDATE branches SET
  address = '1629 Rue des Quais, Sainte-Catherine, QC J5C 1B9',
  lat     = 45.4026000,
  lng     = -73.5791000
WHERE id = 'sca';
