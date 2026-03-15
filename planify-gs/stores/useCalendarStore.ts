import { create } from 'zustand'
import { getMondayOf, todayStr } from '@/lib/utils/dates'

type CalMode = 'week' | 'day' | 'month'
type SchedFilter = 'all' | 'undone' | 'done' | 'high' | 'medium'

interface CalendarState {
  calMode: CalMode
  wkStart: string      // YYYY-MM-DD of Monday of current week view
  dayView: string      // YYYY-MM-DD of current day view
  monView: string      // YYYY-MM-DD of first day of current month view
  showWeekends: boolean
  schedFilter: SchedFilter

  setCalMode: (mode: CalMode) => void
  setWkStart: (date: string) => void
  setDayView: (date: string) => void
  setMonView: (date: string) => void
  toggleWeekends: () => void
  setSchedFilter: (filter: SchedFilter) => void
  goToToday: () => void
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
  }
})
