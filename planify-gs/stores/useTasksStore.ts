import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SectionVisibility {
  overdue: boolean
  upcoming: boolean
  priorities: boolean
}

interface TasksLayout {
  left: string[]
  right: string[]
}

interface TasksState {
  colRatio: number  // 0–100, left column width %
  sectionsVis: SectionVisibility
  layout: TasksLayout

  setColRatio: (ratio: number) => void
  setSectionVis: (key: keyof SectionVisibility, visible: boolean) => void
  setLayout: (layout: TasksLayout) => void
}

export const useTasksStore = create<TasksState>()(
  persist(
    (set) => ({
      colRatio: 50,
      sectionsVis: { overdue: true, upcoming: true, priorities: true },
      layout: { left: ['overdue', 'priorities'], right: ['upcoming'] },

      setColRatio: (colRatio) => set({ colRatio }),
      setSectionVis: (key, visible) =>
        set((s) => ({ sectionsVis: { ...s.sectionsVis, [key]: visible } })),
      setLayout: (layout) => set({ layout }),
    }),
    { name: 'planify-tasks-ui' }
  )
)
