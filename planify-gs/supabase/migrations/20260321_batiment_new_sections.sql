-- New equipment inspection tables for Bâtiment section

CREATE TABLE IF NOT EXISTS batiment_extincteur (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  inspection_date text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS batiment_prevention_incendie (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  inspection_date text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS batiment_lumiere_secours (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  inspection_date text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS batiment_boite_paradox (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  inspection_date text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS batiment_reservoir_eau_chaude (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  inspection_date text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- RLS: allow all authenticated users to read and write (employees can edit)
ALTER TABLE batiment_extincteur ENABLE ROW LEVEL SECURITY;
ALTER TABLE batiment_prevention_incendie ENABLE ROW LEVEL SECURITY;
ALTER TABLE batiment_lumiere_secours ENABLE ROW LEVEL SECURITY;
ALTER TABLE batiment_boite_paradox ENABLE ROW LEVEL SECURITY;
ALTER TABLE batiment_reservoir_eau_chaude ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_batiment_extincteur" ON batiment_extincteur FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_batiment_prevention_incendie" ON batiment_prevention_incendie FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_batiment_lumiere_secours" ON batiment_lumiere_secours FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_batiment_boite_paradox" ON batiment_boite_paradox FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_batiment_reservoir_eau_chaude" ON batiment_reservoir_eau_chaude FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Also update existing batiment tables to allow all authenticated users to write
-- (employees can edit per UI requirements)
DROP POLICY IF EXISTS "admin_write_batiment_inspection" ON batiment_inspection;
DROP POLICY IF EXISTS "admin_write_batiment_deneigement" ON batiment_deneigement;
DROP POLICY IF EXISTS "admin_write_batiment_dechet" ON batiment_dechet;
DROP POLICY IF EXISTS "admin_write_batiment_menage" ON batiment_menage;
DROP POLICY IF EXISTS "admin_write_batiment_incendie" ON batiment_inspection_incendie;

CREATE POLICY "auth_write_batiment_inspection" ON batiment_inspection FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_write_batiment_deneigement" ON batiment_deneigement FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_write_batiment_dechet" ON batiment_dechet FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_write_batiment_menage" ON batiment_menage FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_write_batiment_incendie" ON batiment_inspection_incendie FOR ALL TO authenticated USING (true) WITH CHECK (true);
