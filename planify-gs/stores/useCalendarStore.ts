import { create } from 'zustand'
import { getMondayOf, todayStr } from '@/lib/utils/dates'
import type { Event, Branch } from '@/types/database'

type CalMode = 'week' | 'day' | 'month'
type SchedFilter = 'all' | 'undone' | 'done' | 'high' | 'medium'

interface CalendarState {
  calMode: CalMode
  wkStart: string      // YYYY-MM-DD of Monday of current week view
  dayView: string      // YYYY-MM-DD of current day view
  monView: string      // YYYY-MM-DD of first day of current month view
  showWeekends: boolean
  schedFilter: SchedFilter
  calEvents: Event[]
  branches: Branch[]

  setCalMode: (mode: CalMode) => void
  setWkStart: (date: string) => void
  setDayView: (date: string) => void
  setMonView: (date: string) => void
  toggleWeekends: () => void
  setSchedFilter: (filter: SchedFilter) => void
  goToToday: () => void
  setCalEvents: (events: Event[]) => void
  setBranches: (branches: Branch[]) => void
}

export const useCalendarStore = create<CalendarState>((set) => {
  const today = todayStr()
  return {
    calMode: 'week',
    wkStart: getMondayOf(today),
    dayView: today,
    monView: today.substring(0, 8) + '01',
    showWeekends: true,
    schedFilter: 'all',
    calEvents: [],
    branches: [],

    setCalMode: (calMode) => set({ calMode }),
    setWkStart: (wkStart) => set({ wkStart }),
    setDayView: (dayView) => set({ dayView }),
    setMonView: (monView) => set({ monView }),
    toggleWeekends: () => set((s) => ({ showWeekends: !s.showWeekends })),
    setSchedFilter: (schedFilter) => set({ schedFilter }),
    goToToday: () => {
      const t = todayStr()
      set({
        wkStart: getMondayOf(t),
        dayView: t,
        monView: t.substring(0, 8) + '01',
      })
    },
    setCalEvents: (calEvents) => set({ calEvents }),
    setBranches: (branches) => set({ branches }),
  }
})
