-- ============================================================
-- Planify GS — Supabase Schema
-- Run this in Supabase SQL editor (Settings → SQL Editor)
-- ============================================================

-- ─── Extensions ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Helper Functions ──────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION my_employee_id()
RETURNS uuid AS $$
  SELECT employee_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── Table: employees ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  initials         text NOT NULL CHECK (char_length(initials) <= 3),
  email            text UNIQUE,
  phone            text,
  role_title       text,
  avatar_gradient  text NOT NULL DEFAULT 'linear-gradient(135deg,#4CC9F0,#7B2FBE)',
  is_active        boolean DEFAULT true,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employees_select_authenticated"
  ON employees FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "employees_insert_admin"
  ON employees FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "employees_update_admin"
  ON employees FOR UPDATE TO authenticated
  USING (is_admin());

CREATE POLICY "employees_delete_admin"
  ON employees FOR DELETE TO authenticated
  USING (is_admin());

-- ─── Table: profiles ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id               uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role             text NOT NULL DEFAULT 'employee'
                   CHECK (role IN ('admin', 'branch_manager', 'supervisor', 'employee')),
  employee_id      uuid REFERENCES employees(id) ON DELETE SET NULL,
  display_name     text,
  avatar_gradient  text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_admin());

CREATE POLICY "profiles_insert_admin"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR is_admin());

CREATE POLICY "profiles_delete_admin"
  ON profiles FOR DELETE TO authenticated
  USING (is_admin());

-- ─── Table: branches ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  short_code  text NOT NULL UNIQUE,
  color       text NOT NULL DEFAULT '#4CC9F0',
  address     text,
  lat         numeric(10,7),
  lng         numeric(10,7),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branches_select_authenticated"
  ON branches FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "branches_insert_admin"
  ON branches FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "branches_update_admin"
  ON branches FOR UPDATE TO authenticated
  USING (is_admin());

CREATE POLICY "branches_delete_admin"
  ON branches FOR DELETE TO authenticated
  USING (is_admin());

-- ─── Table: events ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id         uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title               text NOT NULL,
  start_date          date NOT NULL,
  end_date            date NOT NULL,
  start_hour          smallint DEFAULT 0 CHECK (start_hour BETWEEN 0 AND 23),
  end_hour            smallint DEFAULT 0 CHECK (end_hour BETWEEN 0 AND 23),
  color               text DEFAULT '#FF4D6D',
  all_day             boolean DEFAULT true,
  priority_level      text DEFAULT 'Moyen'
                      CHECK (priority_level IN ('Faible','Moyen','Élevé')),
  repeat_rule         text DEFAULT 'Aucune'
                      CHECK (repeat_rule IN ('Aucune','Chaque semaine','Chaque mois','Chaque année')),
  repeat_end_date     date,
  branch_ids          text[] DEFAULT '{}',
  done                boolean DEFAULT false,
  assigned_by         uuid REFERENCES employees(id),
  alert_linked        boolean DEFAULT false,
  linked_priority_id  uuid,  -- FK added after priorities table created
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_employee_id_idx ON events(employee_id);
CREATE INDEX IF NOT EXISTS events_start_date_idx ON events(start_date);
CREATE INDEX IF NOT EXISTS events_employee_date_idx ON events(employee_id, start_date);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_select"
  ON events FOR SELECT TO authenticated
  USING (employee_id = my_employee_id() OR is_admin());

CREATE POLICY "events_insert"
  ON events FOR INSERT TO authenticated
  WITH CHECK (employee_id = my_employee_id() OR is_admin());

CREATE POLICY "events_update"
  ON events FOR UPDATE TO authenticated
  USING (employee_id = my_employee_id() OR is_admin());

CREATE POLICY "events_delete"
  ON events FOR DELETE TO authenticated
  USING (employee_id = my_employee_id() OR is_admin());

-- ─── Table: priorities ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS priorities (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  rank            smallint DEFAULT 0,
  title           text NOT NULL,
  description     text DEFAULT '',
  color           text DEFAULT '#FF4D6D',
  priority_level  text DEFAULT 'Moyen'
                  CHECK (priority_level IN ('Faible','Moyen','Élevé')),
  status          text DEFAULT 'À faire'
                  CHECK (status IN ('À faire','En cours','En révision','Terminé','Bloqué')),
  due_date        date,
  locked          boolean DEFAULT false,
  notes           text DEFAULT '',
  linked_event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS priorities_employee_id_idx ON priorities(employee_id);
CREATE INDEX IF NOT EXISTS priorities_status_idx ON priorities(status);
CREATE INDEX IF NOT EXISTS priorities_due_date_idx ON priorities(due_date);

-- Add FK from events to priorities (circular, so done after both tables exist)
ALTER TABLE events
  ADD CONSTRAINT events_linked_priority_id_fkey
  FOREIGN KEY (linked_priority_id) REFERENCES priorities(id) ON DELETE SET NULL;

ALTER TABLE priorities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "priorities_select"
  ON priorities FOR SELECT TO authenticated
  USING (employee_id = my_employee_id() OR is_admin());

CREATE POLICY "priorities_insert"
  ON priorities FOR INSERT TO authenticated
  WITH CHECK (employee_id = my_employee_id() OR is_admin());

CREATE POLICY "priorities_update"
  ON priorities FOR UPDATE TO authenticated
  USING (employee_id = my_employee_id() OR is_admin());

CREATE POLICY "priorities_delete"
  ON priorities FOR DELETE TO authenticated
  USING (employee_id = my_employee_id() OR is_admin());

-- ─── Table: priority_parts ─────────────────────────────────
CREATE TABLE IF NOT EXISTS priority_parts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  priority_id  uuid NOT NULL REFERENCES priorities(id) ON DELETE CASCADE,
  label        text NOT NULL,
  done         boolean DEFAULT false,
  position     smallint DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS priority_parts_priority_id_idx ON priority_parts(priority_id);

ALTER TABLE priority_parts ENABLE ROW LEVEL SECURITY;

-- Inherit access via priority's employee_id
CREATE POLICY "priority_parts_select"
  ON priority_parts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM priorities p
      WHERE p.id = priority_id
      AND (p.employee_id = my_employee_id() OR is_admin())
    )
  );

CREATE POLICY "priority_parts_insert"
  ON priority_parts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM priorities p
      WHERE p.id = priority_id
      AND (p.employee_id = my_employee_id() OR is_admin())
    )
  );

CREATE POLICY "priority_parts_update"
  ON priority_parts FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM priorities p
      WHERE p.id = priority_id
      AND (p.employee_id = my_employee_id() OR is_admin())
    )
  );

CREATE POLICY "priority_parts_delete"
  ON priority_parts FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM priorities p
      WHERE p.id = priority_id
      AND (p.employee_id = my_employee_id() OR is_admin())
    )
  );

-- ─── Table: suppliers ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  category     text NOT NULL DEFAULT 'Autre',
  city         text,
  postal_code  text,
  phone        text,
  email        text,
  address      text,
  lat          numeric(10,7),
  lng          numeric(10,7),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS suppliers_category_idx ON suppliers(category);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suppliers_select_authenticated"
  ON suppliers FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "suppliers_insert_authenticated"
  ON suppliers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "suppliers_update_authenticated"
  ON suppliers FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "suppliers_delete_admin"
  ON suppliers FOR DELETE TO authenticated
  USING (is_admin());

-- ─── Table: alerts ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     uuid REFERENCES employees(id) ON DELETE CASCADE,  -- null = global
  title           text NOT NULL,
  message         text DEFAULT '',
  alert_type      text DEFAULT 'info'
                  CHECK (alert_type IN ('warn','info','task-assigned')),
  frequency       text DEFAULT 'once',
  alert_date      date,
  time_of_day     time,
  link_type       text DEFAULT ''
                  CHECK (link_type IN ('','event','priority')),
  link_id         uuid,
  add_to_schedule boolean DEFAULT false,
  sms_enabled     boolean DEFAULT false,
  sms_phone       text,
  is_read         boolean DEFAULT false,
  is_system       boolean DEFAULT false,
  created_by      uuid REFERENCES employees(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alerts_employee_id_idx ON alerts(employee_id);
CREATE INDEX IF NOT EXISTS alerts_is_read_idx ON alerts(is_read);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alerts_select"
  ON alerts FOR SELECT TO authenticated
  USING (
    employee_id IS NULL               -- global alerts, visible to all
    OR employee_id = my_employee_id()  -- own alerts
    OR is_admin()
  );

CREATE POLICY "alerts_insert"
  ON alerts FOR INSERT TO authenticated
  WITH CHECK (
    is_admin()
    OR employee_id = my_employee_id()
  );

CREATE POLICY "alerts_update"
  ON alerts FOR UPDATE TO authenticated
  USING (
    employee_id = my_employee_id()
    OR is_admin()
  );

CREATE POLICY "alerts_delete"
  ON alerts FOR DELETE TO authenticated
  USING (
    is_admin()
    OR (employee_id = my_employee_id() AND NOT is_system)
  );

-- ─── Table: user_preferences ───────────────────────────────
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tasks_col_ratio  numeric(5,2) DEFAULT 50,
  tasks_sections   jsonb DEFAULT '{"overdue":true,"upcoming":true,"priorities":true}'::jsonb,
  tasks_layout     jsonb DEFAULT '{"left":["overdue","priorities"],"right":["upcoming"]}'::jsonb,
  sched_filter     text DEFAULT 'all',
  web_search       boolean DEFAULT false,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prefs_select_own"
  ON user_preferences FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "prefs_insert_own"
  ON user_preferences FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "prefs_update_own"
  ON user_preferences FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ─── Table: app_settings ───────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key    text PRIMARY KEY,
  value  text
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select_admin"
  ON app_settings FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "settings_update_admin"
  ON app_settings FOR UPDATE TO authenticated
  USING (is_admin());

-- ─── Seed: branches ────────────────────────────────────────
INSERT INTO branches (id, name, short_code, color, address) VALUES
  ('mtl',  'Montréal',                 'SSM', '#FF4D6D', ''),
  ('lev',  'Lévis',                    'SQB', '#F77F00', ''),
  ('drum', 'Drummondville',            'SD',  '#FCBF49', ''),
  ('gat',  'Gatineau',                 'SG',  '#4CC9F0', ''),
  ('ndp',  'Notre-Dame-des-Prairies',  'SLA', '#7B2FBE', ''),
  ('jon',  'Jonquière',                'SSA', '#06D6A0', ''),
  ('ryn',  'Rouyn-Noranda',            'SAI', '#EF233C', ''),
  ('sca',  'Sainte-Catherine',         'SM',  '#3A86FF', ''),
  ('sjr',  'Saint-Jérôme',             'SL',  '#FB5607', ''),
  ('she',  'Sherbrooke',               'SE',  '#8338EC', ''),
  ('tr',   'Trois-Rivières',           'SMA', '#06A77D', '')
ON CONFLICT (id) DO NOTHING;

-- ─── Seed: app_settings ────────────────────────────────────
INSERT INTO app_settings (key, value) VALUES
  ('admin_pin', '1234')
ON CONFLICT (key) DO NOTHING;

-- ─── Auto-update updated_at trigger ───────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER branches_updated_at BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER priorities_updated_at BEFORE UPDATE ON priorities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER alerts_updated_at BEFORE UPDATE ON alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Auto-create profile on new user signup ────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', 'employee')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
