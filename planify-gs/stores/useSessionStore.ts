import { create } from 'zustand'
import type { UserRole } from '@/types/database'

interface SessionState {
  // The authenticated user's role (from profiles table)
  role: UserRole | null
  // The authenticated user's linked employee_id
  myEmployeeId: string | null
  // The employee currently being viewed (admin can switch this)
  selectedEmployeeId: string | null
  // Whether this is an admin session
  isAdmin: boolean

  setSession: (role: UserRole, employeeId: string | null) => void
  setSelectedEmployee: (employeeId: string) => void
  clearSession: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  role: null,
  myEmployeeId: null,
  selectedEmployeeId: null,
  isAdmin: false,

  setSession: (role, employeeId) =>
    set({
      role,
      myEmployeeId: employeeId,
      selectedEmployeeId: employeeId,
      isAdmin: role === 'admin',
    }),

  setSelectedEmployee: (employeeId) =>
    set({ selectedEmployeeId: employeeId }),

  clearSession: () =>
    set({
      role: null,
      myEmployeeId: null,
      selectedEmployeeId: null,
      isAdmin: false,
    }),
}))
