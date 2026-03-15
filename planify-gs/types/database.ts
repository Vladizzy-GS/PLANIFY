// Auto-generated types matching supabase/schema.sql
// Run: npx supabase gen types typescript --project-id <your-project-id> > types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      employees: {
        Row: {
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
        Insert: Omit<Database['public']['Tables']['employees']['Row'], 'id' | 'created_at' | 'updated_at'>
          & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Database['public']['Tables']['employees']['Insert']>
      }
      profiles: {
        Row: {
          id: string
          role: 'admin' | 'branch_manager' | 'supervisor' | 'employee'
          employee_id: string | null
          display_name: string | null
          avatar_gradient: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
          & { created_at?: string; updated_at?: string }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      branches: {
        Row: {
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
        Insert: Omit<Database['public']['Tables']['branches']['Row'], 'created_at' | 'updated_at'>
          & { created_at?: string; updated_at?: string }
        Update: Partial<Database['public']['Tables']['branches']['Insert']>
      }
      events: {
        Row: {
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
        Insert: Omit<Database['public']['Tables']['events']['Row'], 'id' | 'created_at' | 'updated_at'>
          & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Database['public']['Tables']['events']['Insert']>
      }
      priorities: {
        Row: {
          id: string
          employee_id: string
          rank: number
          title: string
          description: string
          color: string
          priority_level: 'Faible' | 'Moyen' | 'Élevé'
          status: 'À faire' | 'En cours' | 'En révision' | 'Terminé' | 'Bloqué'
          due_date: string | null
          locked: boolean
          notes: string
          linked_event_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['priorities']['Row'], 'id' | 'created_at' | 'updated_at'>
          & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Database['public']['Tables']['priorities']['Insert']>
      }
      priority_parts: {
        Row: {
          id: string
          priority_id: string
          label: string
          done: boolean
          position: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['priority_parts']['Row'], 'id' | 'created_at'>
          & { id?: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['priority_parts']['Insert']>
      }
      suppliers: {
        Row: {
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
        Insert: Omit<Database['public']['Tables']['suppliers']['Row'], 'id' | 'created_at' | 'updated_at'>
          & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Database['public']['Tables']['suppliers']['Insert']>
      }
      alerts: {
        Row: {
          id: string
          employee_id: string | null
          title: string
          message: string
          alert_type: 'warn' | 'info' | 'task-assigned'
          frequency: string
          alert_date: string | null
          time_of_day: string | null
          link_type: '' | 'event' | 'priority'
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
        Insert: Omit<Database['public']['Tables']['alerts']['Row'], 'id' | 'created_at' | 'updated_at'>
          & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Database['public']['Tables']['alerts']['Insert']>
      }
      user_preferences: {
        Row: {
          user_id: string
          tasks_col_ratio: number
          tasks_sections: Json
          tasks_layout: Json
          sched_filter: string
          web_search: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_preferences']['Row'], 'created_at' | 'updated_at'>
          & { created_at?: string; updated_at?: string }
        Update: Partial<Database['public']['Tables']['user_preferences']['Insert']>
      }
      app_settings: {
        Row: { key: string; value: string | null }
        Insert: { key: string; value?: string | null }
        Update: Partial<Database['public']['Tables']['app_settings']['Insert']>
      }
    }
    Functions: {
      is_admin: { Args: Record<never, never>; Returns: boolean }
      my_employee_id: { Args: Record<never, never>; Returns: string }
    }
    Enums: Record<never, never>
  }
}

// Convenience row types
export type Employee = Database['public']['Tables']['employees']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Branch = Database['public']['Tables']['branches']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type Priority = Database['public']['Tables']['priorities']['Row']
export type PriorityPart = Database['public']['Tables']['priority_parts']['Row']
export type Supplier = Database['public']['Tables']['suppliers']['Row']
export type Alert = Database['public']['Tables']['alerts']['Row']
export type UserPreferences = Database['public']['Tables']['user_preferences']['Row']

// Role type
export type UserRole = Profile['role']

// Supplier categories constant
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
