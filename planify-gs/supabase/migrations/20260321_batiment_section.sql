-- Section Bâtiment: tables for building management tracking

-- Inspection Bâtiment: inspection dates per branch per period
CREATE TABLE IF NOT EXISTS batiment_inspection (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  period text NOT NULL,         -- e.g. '2025', '2025-06', '2025-07'
  period_type text NOT NULL CHECK (period_type IN ('annuel', 'semestriel', 'mensuel')),
  inspection_date text,         -- YYYY-MM-DD
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(branch_id, period)
);

-- Déneigement: snow removal contacts per branch
CREATE TABLE IF NOT EXISTS batiment_deneigement (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  contact_role text NOT NULL,   -- 'deneigement', 'deglacage', 'plan_b', 'plan_c', 'responsable'
  company_name text,
  contact_name text,
  phone text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Déchet: waste collection frequency per branch per season
CREATE TABLE IF NOT EXISTS batiment_dechet (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE UNIQUE,
  haute_dechet text DEFAULT 'N/A',
  haute_recyclage text DEFAULT 'N/A',
  basse_dechet text DEFAULT 'N/A',
  basse_recyclage text DEFAULT 'N/A',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ménage: cleaning frequency per branch per season
CREATE TABLE IF NOT EXISTS batiment_menage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE UNIQUE,
  haute_freq text DEFAULT 'N/A',
  basse_freq text DEFAULT 'N/A',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Inspection Incendie Ville: fire inspection dates per branch
CREATE TABLE IF NOT EXISTS batiment_inspection_incendie (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  inspection_date text NOT NULL, -- YYYY-MM-DD
  notes text,
  created_at timestamptz DEFAULT now()
);

-- RLS: allow authenticated users to read, admins to write
ALTER TABLE batiment_inspection ENABLE ROW LEVEL SECURITY;
ALTER TABLE batiment_deneigement ENABLE ROW LEVEL SECURITY;
ALTER TABLE batiment_dechet ENABLE ROW LEVEL SECURITY;
ALTER TABLE batiment_menage ENABLE ROW LEVEL SECURITY;
ALTER TABLE batiment_inspection_incendie ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_batiment_inspection" ON batiment_inspection FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_batiment_inspection" ON batiment_inspection FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "auth_read_batiment_deneigement" ON batiment_deneigement FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_batiment_deneigement" ON batiment_deneigement FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "auth_read_batiment_dechet" ON batiment_dechet FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_batiment_dechet" ON batiment_dechet FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "auth_read_batiment_menage" ON batiment_menage FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_batiment_menage" ON batiment_menage FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "auth_read_batiment_incendie" ON batiment_inspection_incendie FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_batiment_incendie" ON batiment_inspection_incendie FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
