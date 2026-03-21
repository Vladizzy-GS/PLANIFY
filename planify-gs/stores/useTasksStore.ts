import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SectionId = 'assign' | 'today' | 'overdue' | 'upcoming' | 'priorities'

export const DEFAULT_SECTION_ORDER: SectionId[] = ['assign', 'today', 'overdue', 'upcoming', 'priorities']

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
  colRatio: number
  sectionsVis: SectionVisibility
  layout: TasksLayout
  sectionOrder: SectionId[]

  setColRatio: (ratio: number) => void
  setSectionVis: (key: keyof SectionVisibility, visible: boolean) => void
  setLayout: (layout: TasksLayout) => void
  setSectionOrder: (order: SectionId[]) => void
}

export const useTasksStore = create<TasksState>()(
  persist(
    (set) => ({
      colRatio: 50,
      sectionsVis: { overdue: true, upcoming: true, priorities: true },
      layout: { left: ['overdue', 'priorities'], right: ['upcoming'] },
      sectionOrder: DEFAULT_SECTION_ORDER,

      setColRatio: (colRatio) => set({ colRatio }),
      setSectionVis: (key, visible) =>
        set((s) => ({ sectionsVis: { ...s.sectionsVis, [key]: visible } })),
      setLayout: (layout) => set({ layout }),
      setSectionOrder: (sectionOrder) => set({ sectionOrder }),
    }),
    { name: 'planify-tasks-ui' }
  )
)
