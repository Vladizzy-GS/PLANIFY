// Types matching supabase/schema.sql

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// ─── Row types (what comes back from SELECT) ───────────────────────────────────

export type Employee = {
  id: string
  name: string
  initials: string
  email: string | null
  phone: string | null
  role_title: string | null
  avatar_gradient: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Profile = {
  id: string
  role: 'superuser' | 'admin' | 'branch_manager' | 'supervisor' | 'employee'
  employee_id: string | null
  display_name: string | null
  avatar_gradient: string | null
  created_at: string
  updated_at: string
}

export type Branch = {
  id: string
  name: string
  short_code: string
  color: string
  address: string | null
  lat: number | null
  lng: number | null
  created_at: string
  updated_at: string
}

export type Event = {
  id: string
  employee_id: string
  title: string
  start_date: string
  end_date: string
  start_hour: number
  end_hour: number
  color: string
  all_day: boolean
  priority_level: 'Faible' | 'Moyen' | 'Élevé'
  repeat_rule: 'Aucune' | 'Chaque semaine' | 'Chaque mois' | 'Chaque année'
  repeat_end_date: string | null
  branch_ids: string[]
  done: boolean
  assigned_by: string | null
  alert_linked: boolean
  linked_priority_id: string | null
  created_at: string
  updated_at: string
}

export type Priority = {
  id: string
  employee_id: string
  rank: number
  title: string
  description: string
  color: string
  priority_level: 'Faible' | 'Moyen' | 'Élevé'
  status: 'À faire' | 'En cours' | 'En révision' | 'Terminé' | 'Bloqué'
  due_date: string | null
  start_date: string | null
  end_date: string | null
  branch_ids: string[]
  locked: boolean
  notes: string
  linked_event_id: string | null
  created_at: string
  updated_at: string
}

export type PriorityPart = {
  id: string
  priority_id: string
  label: string
  done: boolean
  position: number
  created_at: string
}

export type Supplier = {
  id: string
  name: string
  category: string
  city: string | null
  postal_code: string | null
  phone: string | null
  email: string | null
  address: string | null
  lat: number | null
  lng: number | null
  created_at: string
  updated_at: string
}

export type Alert = {
  id: string
  employee_id: string | null
  title: string
  message: string
  alert_type: 'warn' | 'info' | 'task-assigned' | 'urgent' | 'information'
  frequency: string
  alert_date: string | null
  time_of_day: string | null
  link_type: '' | 'event' | 'priority' | 'task'
  category: string   // comma-separated: 'Horaire', 'Tache', 'Priorité' or combinations
  link_id: string | null
  add_to_schedule: boolean
  sms_enabled: boolean
  sms_phone: string | null
  is_read: boolean
  is_system: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export type UserPreferences = {
  user_id: string
  tasks_col_ratio: number
  tasks_sections: Json
  tasks_layout: Json
  sched_filter: string
  web_search: boolean
  created_at: string
  updated_at: string
}

export type AppSettings = {
  key: string
  value: string | null
}

// ─── Insert types ──────────────────────────────────────────────────────────────

export type EmployeeInsert = Omit<Employee, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  email?: string | null
  phone?: string | null
  role_title?: string | null
  avatar_gradient?: string
  is_active?: boolean
}
export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'> & {
  role?: Profile['role']
  employee_id?: string | null
  display_name?: string | null
  avatar_gradient?: string | null
}
export type BranchInsert = Omit<Branch, 'created_at' | 'updated_at'> & {
  color?: string
  address?: string | null
  lat?: number | null
  lng?: number | null
}
export type EventInsert = Omit<Event, 'id' | 'created_at' | 'updated_at' | 'assigned_by' | 'alert_linked' | 'linked_priority_id'> & {
  id?: string
  assigned_by?: string | null
  alert_linked?: boolean
  linked_priority_id?: string | null
  color?: string
  all_day?: boolean
  priority_level?: Event['priority_level']
  repeat_rule?: Event['repeat_rule']
  repeat_end_date?: string | null
  branch_ids?: string[]
  done?: boolean
}
export type PriorityInsert = Omit<Priority, 'id' | 'created_at' | 'updated_at' | 'locked' | 'linked_event_id' | 'branch_ids' | 'start_date' | 'end_date'> & {
  id?: string
  rank?: number
  description?: string
  color?: string
  priority_level?: Priority['priority_level']
  status?: Priority['status']
  due_date?: string | null
  start_date?: string | null
  end_date?: string | null
  branch_ids?: string[]
  locked?: boolean
  notes?: string
  linked_event_id?: string | null
}
export type PriorityPartInsert = Omit<PriorityPart, 'id' | 'created_at'> & {
  id?: string
  done?: boolean
  position?: number
}
export type SupplierInsert = Omit<Supplier, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  city?: string | null
  postal_code?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  lat?: number | null
  lng?: number | null
}
export type AlertInsert = Omit<Alert, 'id' | 'created_at' | 'updated_at' | 'time_of_day' | 'link_id' | 'sms_phone' | 'created_by' | 'category'> & {
  id?: string
  category?: Alert['category']
  time_of_day?: string | null
  link_type?: Alert['link_type']
  link_id?: string | null
  sms_phone?: string | null
  sms_enabled?: boolean
  is_read?: boolean
  is_system?: boolean
  created_by?: string | null
  alert_date?: string | null
  frequency?: string
}

// ─── Database type for Supabase client ────────────────────────────────────────

export type Database = {
  __InternalSupabase: { PostgrestVersion: '12' }
  public: {
    Tables: {
      employees: {
        Row: Employee
        Insert: EmployeeInsert
        Update: Partial<EmployeeInsert>
        Relationships: []
      }
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: Partial<ProfileInsert>
        Relationships: []
      }
      branches: {
        Row: Branch
        Insert: BranchInsert
        Update: Partial<BranchInsert>
        Relationships: []
      }
      events: {
        Row: Event
        Insert: EventInsert
        Update: Partial<EventInsert>
        Relationships: []
      }
      priorities: {
        Row: Priority
        Insert: PriorityInsert
        Update: Partial<PriorityInsert>
        Relationships: []
      }
      priority_parts: {
        Row: PriorityPart
        Insert: PriorityPartInsert
        Update: Partial<PriorityPartInsert>
        Relationships: []
      }
      suppliers: {
        Row: Supplier
        Insert: SupplierInsert
        Update: Partial<SupplierInsert>
        Relationships: []
      }
      alerts: {
        Row: Alert
        Insert: AlertInsert
        Update: Partial<AlertInsert>
        Relationships: []
      }
      user_preferences: {
        Row: UserPreferences
        Insert: UserPreferences
        Update: Partial<UserPreferences>
        Relationships: []
      }
      app_settings: {
        Row: AppSettings
        Insert: AppSettings
        Update: Partial<AppSettings>
        Relationships: []
      }
      batiment_inspection: {
        Row: BatimentInspection
        Insert: { id?: string; branch_id: string; period: string; period_type: 'annuel' | 'semestriel' | 'mensuel'; inspection_date?: string | null; notes?: string | null }
        Update: Partial<{ period_type: 'annuel' | 'semestriel' | 'mensuel'; inspection_date: string | null; notes: string | null; updated_at: string }>
        Relationships: []
      }
      batiment_deneigement: {
        Row: BatimentDeneigement
        Insert: { id?: string; branch_id: string; contact_role: string; company_name?: string | null; contact_name?: string | null; phone?: string | null; sort_order?: number }
        Update: Partial<{ contact_role: string; company_name: string | null; contact_name: string | null; phone: string | null; sort_order: number; updated_at: string }>
        Relationships: []
      }
      batiment_dechet: {
        Row: BatimentDechet
        Insert: { id?: string; branch_id: string; haute_dechet?: string; haute_recyclage?: string; basse_dechet?: string; basse_recyclage?: string; notes?: string | null; supplier?: string | null }
        Update: Partial<{ haute_dechet: string; haute_recyclage: string; basse_dechet: string; basse_recyclage: string; notes: string | null; supplier: string | null; updated_at: string }>
        Relationships: []
      }
      batiment_menage: {
        Row: BatimentMenage
        Insert: { id?: string; branch_id: string; haute_freq?: string; basse_freq?: string; notes?: string | null; supplier?: string | null }
        Update: Partial<{ haute_freq: string; basse_freq: string; notes: string | null; supplier: string | null; updated_at: string }>
        Relationships: []
      }
      batiment_inspection_incendie: {
        Row: BatimentInspectionIncendie
        Insert: { id?: string; branch_id: string; inspection_date: string; notes?: string | null }
        Update: Partial<{ inspection_date: string; notes: string | null }>
        Relationships: []
      }
      batiment_extincteur: {
        Row: BatimentDateRecord
        Insert: { id?: string; branch_id: string; inspection_date: string; notes?: string | null }
        Update: Partial<{ inspection_date: string; notes: string | null }>
        Relationships: []
      }
      batiment_prevention_incendie: {
        Row: BatimentDateRecord
        Insert: { id?: string; branch_id: string; inspection_date: string; notes?: string | null }
        Update: Partial<{ inspection_date: string; notes: string | null }>
        Relationships: []
      }
      batiment_lumiere_secours: {
        Row: BatimentDateRecord
        Insert: { id?: string; branch_id: string; inspection_date: string; notes?: string | null }
        Update: Partial<{ inspection_date: string; notes: string | null }>
        Relationships: []
      }
      batiment_boite_paradox: {
        Row: BatimentDateRecord
        Insert: { id?: string; branch_id: string; inspection_date: string; notes?: string | null }
        Update: Partial<{ inspection_date: string; notes: string | null }>
        Relationships: []
      }
      batiment_reservoir_eau_chaude: {
        Row: BatimentDateRecord
        Insert: { id?: string; branch_id: string; inspection_date: string; notes?: string | null }
        Update: Partial<{ inspection_date: string; notes: string | null }>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      is_admin: { Args: Record<never, never>; Returns: boolean }
      my_employee_id: { Args: Record<never, never>; Returns: string }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}

// ─── Section Bâtiment types ────────────────────────────────────────────────────

export type BatimentInspection = {
  id: string
  branch_id: string
  period: string          // '2025', '2025-06', '2025-07'
  period_type: 'annuel' | 'semestriel' | 'mensuel'
  inspection_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type BatimentDeneigement = {
  id: string
  branch_id: string
  contact_role: string    // 'deneigement' | 'deglacage' | 'plan_b' | 'plan_c' | 'responsable'
  company_name: string | null
  contact_name: string | null
  phone: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type BatimentDechet = {
  id: string
  branch_id: string
  haute_dechet: string    // '1x' | '2x' | '4x' | 'N/A'
  haute_recyclage: string
  basse_dechet: string
  basse_recyclage: string
  notes: string | null
  supplier: string | null
  created_at: string
  updated_at: string
}

export type BatimentMenage = {
  id: string
  branch_id: string
  haute_freq: string      // '1x' | '2x' | '4x' | 'N/A'
  basse_freq: string
  notes: string | null
  supplier: string | null
  created_at: string
  updated_at: string
}

export type BatimentInspectionIncendie = {
  id: string
  branch_id: string
  inspection_date: string
  notes: string | null
  created_at: string
}

// Shared shape for equipment inspection date-list tabs
export type BatimentDateRecord = {
  id: string
  branch_id: string
  inspection_date: string
  notes: string | null
  created_at: string
}

export type BatimentExtincteur = BatimentDateRecord
export type BatimentPreventionIncendie = BatimentDateRecord
export type BatimentLumiereSecours = BatimentDateRecord
export type BatimentBoiteParadox = BatimentDateRecord
export type BatimentReservoirEauChaude = BatimentDateRecord

// ─── Role type ─────────────────────────────────────────────────────────────────

export type UserRole = Profile['role']

// ─── Supplier categories ───────────────────────────────────────────────────────

export const SUP_CATS = [
  'Compresseur', 'Chauffage / AC', 'Portes de garage', "Système d'alarme",
  "Centrale d'alarme", "Système d'accès", 'Ménage', 'Produits ménagers',
  'Nettoyage de vitre', 'Plombier', 'Électricien', 'Collecte des déchets',
  'Livraison gravier/sable', 'Pont élévateur', 'Nettoyage de drain',
  'Extincteur', "Machine d'eau", 'Toiture', 'Clôture', 'Réparation asphalte',
  'Livraison gaz', 'Serrurier', 'Récupération métal', 'Récupération huile',
  'Location tapis', 'Autre',
] as const

export type SupplierCategory = typeof SUP_CATS[number]
