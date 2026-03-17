-- ============================================================
-- Planify GS — Seed Data
-- Run this in Supabase SQL Editor AFTER schema.sql
-- ============================================================

-- ─── Employees ─────────────────────────────────────────────
INSERT INTO employees (id, name, initials, email, phone, role_title, avatar_gradient, is_active) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001',
   'Steven Veilleux', 'SV', 'steven.veilleux@planify.app', '450-555-0101',
   'Directeur des opérations',
   'linear-gradient(135deg,#FF4D6D,#F77F00)', true),
  ('a1b2c3d4-0002-0002-0002-000000000002',
   'Vladyslav Patyngo', 'VP', 'vladyslav.patyngo@planify.app', '450-555-0202',
   'Superviseur terrain',
   'linear-gradient(135deg,#4CC9F0,#7B2FBE)', true)
ON CONFLICT (id) DO NOTHING;

-- ─── Suppliers ─────────────────────────────────────────────
INSERT INTO suppliers (name, category, city, phone) VALUES
  ('Compresseur Drummond',      'Compresseur',        'Drummondville', '819-555-1001'),
  ('Bourque Refrigeration inc', 'Chauffage / AC',     'Montréal',      '514-555-2002'),
  ('SD énergie (gaz)',          'Chauffage / AC',     'Québec',        '418-555-3003'),
  ('Matrec',                    'Collecte des déchets','Trois-Rivières','819-555-4004'),
  ('Pero maître électricien',   'Électricien',        'Montréal',      '514-555-5005'),
  ('Plomberie P Lampron',       'Plombier',           'Lévis',         '418-555-6006')
ON CONFLICT DO NOTHING;

-- ─── Priorities (tasks) for Steven Veilleux ───────────────
INSERT INTO priorities (id, employee_id, rank, title, description, priority_level, status, due_date) VALUES
  ('b1000000-0001-0001-0001-000000000001',
   'a1b2c3d4-0001-0001-0001-000000000001',
   1, 'Inspection succursale Montréal', 'Vérifier équipements HVAC et compresseurs',
   'Élevé', 'À faire', (CURRENT_DATE + interval '3 days')::date),
  ('b1000000-0002-0002-0002-000000000002',
   'a1b2c3d4-0001-0001-0001-000000000001',
   2, 'Rapport hebdomadaire équipe', 'Compiler les rapports de toutes les succursales',
   'Moyen', 'En cours', (CURRENT_DATE + interval '7 days')::date),
  ('b1000000-0003-0003-0003-000000000003',
   'a1b2c3d4-0001-0001-0001-000000000001',
   3, 'Renouvellement contrat Matrec', 'Négociation contrat collecte déchets 2026',
   'Moyen', 'À faire', (CURRENT_DATE + interval '14 days')::date)
ON CONFLICT (id) DO NOTHING;

-- ─── Alerts ────────────────────────────────────────────────
-- 3 personal alerts for Steven, 2 global alerts
INSERT INTO alerts (employee_id, title, message, alert_type, is_read, is_system) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001',
   'Inspection à confirmer', 'Succursale Drummondville — confirmation requise avant vendredi.',
   'warn', false, false),
  ('a1b2c3d4-0001-0001-0001-000000000001',
   'Nouveau fournisseur ajouté', 'Pero maître électricien a été ajouté à la liste.',
   'info', false, false),
  ('a1b2c3d4-0001-0001-0001-000000000001',
   'Tâche en retard', 'Le rapport de la semaine 10 n''a pas été soumis.',
   'warn', false, false),
  (NULL,
   'Mise à jour système', 'Planify GS v2.1 est maintenant disponible.',
   'info', false, true),
  (NULL,
   'Rappel maintenance', 'Vérification trimestrielle des équipements prévue cette semaine.',
   'info', false, true);

-- ─── Events (schedule) for Steven Veilleux ────────────────
INSERT INTO events (employee_id, title, start_date, end_date, color, all_day, priority_level, branch_ids) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001',
   'Visite succursale MTL', CURRENT_DATE, CURRENT_DATE,
   '#FF4D6D', true, 'Élevé', ARRAY['mtl']),
  ('a1b2c3d4-0001-0001-0001-000000000001',
   'Réunion équipe Drummondville', (CURRENT_DATE + interval '2 days')::date, (CURRENT_DATE + interval '2 days')::date,
   '#F77F00', true, 'Moyen', ARRAY['drum']),
  ('a1b2c3d4-0001-0001-0001-000000000001',
   'Formation sécurité Jonquière', (CURRENT_DATE + interval '4 days')::date, (CURRENT_DATE + interval '4 days')::date,
   '#06D6A0', true, 'Faible', ARRAY['jon'])
ON CONFLICT DO NOTHING;

-- ─── Link your auth user to Steven Veilleux ───────────────
-- After running this seed, go to Supabase → Table Editor → profiles
-- Find your user row and set:
--   role = 'admin'
--   employee_id = 'a1b2c3d4-0001-0001-0001-000000000001'
--
-- Or run this SQL replacing YOUR-AUTH-USER-UUID with your actual user id
-- (find it in Authentication → Users):
--
-- UPDATE profiles
-- SET role = 'admin',
--     employee_id = 'a1b2c3d4-0001-0001-0001-000000000001'
-- WHERE id = 'YOUR-AUTH-USER-UUID';
