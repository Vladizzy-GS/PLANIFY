'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  Branch,
  BatimentInspection,
  BatimentDeneigement,
  BatimentDechet,
  BatimentMenage,
  BatimentDateRecord,
} from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  branches: Branch[]
  inspections: BatimentInspection[]
  deneigements: BatimentDeneigement[]
  dechets: BatimentDechet[]
  menages: BatimentMenage[]
  incendies: BatimentDateRecord[]
  extincteurs: BatimentDateRecord[]
  preventionIncendie: BatimentDateRecord[]
  lumiereSecours: BatimentDateRecord[]
  boiteParadox: BatimentDateRecord[]
  reservoirEauChaude: BatimentDateRecord[]
  isAdmin: boolean
}

type Tab = 'inspection' | 'deneigement' | 'dechet' | 'menage' | 'incendie' | 'extincteur' | 'prevention' | 'lumiere' | 'paradox' | 'reservoir'

const TABS: { id: Tab; label: string }[] = [
  { id: 'inspection', label: 'Inspection Bâtiment' },
  { id: 'deneigement', label: 'Déneigement' },
  { id: 'dechet', label: 'Déchet' },
  { id: 'menage', label: 'Ménage' },
  { id: 'incendie', label: 'Inspection Incendie' },
  { id: 'extincteur', label: 'Inspection des Extincteurs' },
  { id: 'prevention', label: 'Prévention Incendie' },
  { id: 'lumiere', label: 'Lumière de Secours' },
  { id: 'paradox', label: 'Boite Paradox' },
  { id: 'reservoir', label: 'Réservoir Eau Chaude' },
]

const FREQ_OPTIONS = ['N/A', '1x', '2x', '4x']

// ─── Period rows for Inspection Bâtiment ─────────────────────────────────────

const INSP_YEARS_INIT = [2025, 2026]
const MONTH_NAMES = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

function buildPeriodRows(yr: number) {
  // Exactly 15 rows: 1 annuel + 2 semestriel + 12 mensuel
  // Use distinct keys: S1/S2 for semiannual so they never collide with monthly keys
  const rows: { period: string; period_type: 'annuel' | 'semestriel' | 'mensuel'; label: string }[] = []
  rows.push({ period: `${yr}`, period_type: 'annuel', label: 'Annuel' })
  rows.push({ period: `${yr}-S1`, period_type: 'semestriel', label: 'Semi — Juin' })
  rows.push({ period: `${yr}-S2`, period_type: 'semestriel', label: 'Semi — Déc' })
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, '0')
    rows.push({ period: `${yr}-${mm}`, period_type: 'mensuel', label: MONTH_NAMES[m - 1] })
  }
  return rows
}

const TYPE_COLOR: Record<string, string> = {
  annuel: '#00bcd4',
  semestriel: '#ffd600',
  mensuel: '#4caf50',
}
const TYPE_LABEL: Record<string, string> = {
  annuel: 'A',
  semestriel: 'S',
  mensuel: 'M',
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  wrap: { padding: '28px 32px', minHeight: '100vh', background: 'var(--bg-base)' } as React.CSSProperties,
  header: { marginBottom: '20px' } as React.CSSProperties,
  title: { fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.2px' } as React.CSSProperties,
  sub: { fontSize: '13px', color: 'var(--text-muted)' } as React.CSSProperties,
  // Branch filter
  filterRow: { display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' as const, alignItems: 'center' } as React.CSSProperties,
  filterLabel: { fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginRight: '4px' } as React.CSSProperties,
  branchBtn: (active: boolean, _color: string): React.CSSProperties => ({
    padding: '4px 12px', borderRadius: '20px',
    border: `1.5px solid ${active ? 'rgba(180,180,190,.5)' : 'var(--border-subtle)'}`,
    background: active ? 'rgba(180,180,190,.18)' : 'transparent',
    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
    fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all .12s',
  }),
  allBtn: (active: boolean): React.CSSProperties => ({
    padding: '4px 12px', borderRadius: '20px',
    border: '1.5px solid var(--border-subtle)',
    background: 'transparent',
    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
    fontSize: '12px', fontWeight: active ? 700 : 400, cursor: 'pointer',
  }),
  // Tabs — underline style
  tabBar: { display: 'flex', gap: '0', marginBottom: '24px', flexWrap: 'wrap' as const, borderBottom: '2px solid var(--border-subtle)' } as React.CSSProperties,
  tab: (active: boolean): React.CSSProperties => ({
    padding: '9px 16px',
    border: 'none',
    borderBottom: `2px solid ${active ? '#FF4D6D' : 'transparent'}`,
    background: 'transparent',
    color: active ? '#FF4D6D' : 'var(--text-muted)',
    fontSize: '13px', fontWeight: active ? 600 : 400,
    cursor: 'pointer', transition: 'color .15s',
    marginBottom: '-2px', whiteSpace: 'nowrap' as const,
  }),
  // Card
  card: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '10px', overflow: 'auto',
  } as React.CSSProperties,
  // Season section header (Déchet / Ménage)
  sectionHead: (accent: string): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 14px', marginBottom: '12px',
    borderLeft: `3px solid ${accent}`,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    borderLeftWidth: '3px',
    borderRadius: '0 8px 8px 0',
  }),
  // Legend
  legend: { display: 'flex', gap: '14px', marginBottom: '14px', flexWrap: 'wrap' as const, alignItems: 'center' } as React.CSSProperties,
  legendItem: (): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)',
  }),
  legendDot: (color: string): React.CSSProperties => ({
    width: '10px', height: '10px', borderRadius: '2px', background: color, flexShrink: 0,
  }),
  // Table
  tbl: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' } as React.CSSProperties,
  th: (bg?: string, color?: string): React.CSSProperties => ({
    padding: '10px 12px',
    background: bg ?? 'var(--bg-panel)',
    color: color ?? 'var(--text-secondary)',
    fontWeight: 700, textAlign: 'center' as const,
    borderBottom: '2px solid var(--border-subtle)',
    borderRight: '1px solid var(--border-subtle)',
    whiteSpace: 'nowrap' as const,
    position: 'sticky' as const, top: 0, zIndex: 2,
    fontSize: '12px', letterSpacing: '0.05em',
  }),
  thLeft: (bg?: string, color?: string): React.CSSProperties => ({
    padding: '10px 14px',
    background: bg ?? 'var(--bg-panel)',
    color: color ?? 'var(--text-muted)',
    fontWeight: 700, textAlign: 'left' as const,
    borderBottom: '2px solid var(--border-subtle)',
    borderRight: '1px solid var(--border-subtle)',
    whiteSpace: 'nowrap' as const,
    position: 'sticky' as const, left: 0, zIndex: 3,
    fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.06em',
  }),
  td: (bg?: string, color?: string): React.CSSProperties => ({
    padding: '8px 10px',
    borderBottom: '1px solid var(--border-subtle)',
    borderRight: '1px solid var(--border-subtle)',
    background: bg ?? 'var(--bg-base)',
    color: color ?? 'var(--text-primary)',
    textAlign: 'center' as const, verticalAlign: 'middle' as const, minWidth: '110px',
  }),
  tdLeft: (bg?: string, color?: string): React.CSSProperties => ({
    padding: '8px 14px',
    borderBottom: '1px solid var(--border-subtle)',
    borderRight: '1px solid var(--border-subtle)',
    background: bg ?? 'var(--bg-panel)',
    color: color ?? 'var(--text-primary)',
    textAlign: 'left' as const, verticalAlign: 'middle' as const,
    fontWeight: 600, position: 'sticky' as const, left: 0, zIndex: 1,
    whiteSpace: 'nowrap' as const, fontSize: '12px',
  }),
  // Date input — visible border
  dateInput: {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-subtle)',
    outline: 'none', color: 'var(--text-primary)',
    fontSize: '12px', width: '128px',
    textAlign: 'center' as const, cursor: 'pointer',
    padding: '5px 6px', borderRadius: '6px',
  } as React.CSSProperties,
  // Frequency select (Déchet / Ménage)
  freqSelect: {
    padding: '5px 8px', borderRadius: '6px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--bg-panel)', color: 'var(--text-primary)',
    fontSize: '12px', cursor: 'pointer', outline: 'none',
    width: '72px', textAlign: 'center' as const, fontWeight: 600,
  } as React.CSSProperties,
  // Buttons
  btn: { padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#FF4D6D', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' } as React.CSSProperties,
  btnSm: { padding: '5px 12px', borderRadius: '6px', border: 'none', background: '#FF4D6D', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer' } as React.CSSProperties,
  btnGhost: { padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '13px', cursor: 'pointer' } as React.CSSProperties,
  btnIcon: { padding: '3px 7px', borderRadius: '5px', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', lineHeight: '1' } as React.CSSProperties,
  inp: { padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' as const } as React.CSSProperties,
  select: { padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer', outline: 'none', width: '100%' } as React.CSSProperties,
  // Date chip for GenericDateTab
  dateChip: (): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)',
    borderRadius: '8px', padding: '5px 10px', fontSize: '12px', color: 'var(--text-primary)',
  }),
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ minWidth: '420px', maxWidth: '560px', padding: '24px', borderRadius: '14px', background: 'var(--bg-elevated)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BatimentClient({
  branches,
  inspections: initInspections,
  deneigements: initDeneigements,
  dechets: initDechets,
  menages: initMenages,
  incendies: initIncendies,
  extincteurs: initExtincteurs,
  preventionIncendie: initPrevention,
  lumiereSecours: initLumiere,
  boiteParadox: initParadox,
  reservoirEauChaude: initReservoir,
  isAdmin: _isAdmin,
}: Props) {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('inspection')
  const [inspections, setInspections] = useState(initInspections)
  const [deneigements, setDeneigements] = useState(initDeneigements)
  const [dechets, setDechets] = useState(initDechets)
  const [menages, setMenages] = useState(initMenages)
  const [incendies, setIncendies] = useState(initIncendies)
  const [extincteurs, setExtincteurs] = useState(initExtincteurs)
  const [prevention, setPrevention] = useState(initPrevention)
  const [lumiere, setLumiere] = useState(initLumiere)
  const [paradox, setParadox] = useState(initParadox)
  const [reservoir, setReservoir] = useState(initReservoir)

  // ── Branch filter ─────────────────────────────────────────────────────────
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(() => new Set(branches.map(b => b.id)))
  const filteredBranches = branches.filter(b => selectedBranches.has(b.id))
  const allSelected = selectedBranches.size === branches.length
  function toggleBranch(id: string) {
    setSelectedBranches(prev => { const n = new Set(prev); if (n.has(id)) { n.delete(id) } else { n.add(id) }; return n })
  }

  // ── Inspection Bâtiment helpers ──────────────────────────────────────────

  const getInspDate = useCallback((branchId: string, period: string) => {
    return inspections.find(i => i.branch_id === branchId && i.period === period)?.inspection_date ?? ''
  }, [inspections])

  const saveInspDate = useCallback(async (branchId: string, period: string, periodType: BatimentInspection['period_type'], date: string) => {
    const existing = inspections.find(i => i.branch_id === branchId && i.period === period)
    if (existing) {
      const { data } = await supabase.from('batiment_inspection').update({ inspection_date: date || null, updated_at: new Date().toISOString() }).eq('id', existing.id).select().single()
      if (data) setInspections(prev => prev.map(i => i.id === data.id ? data : i))
    } else {
      const { data } = await supabase.from('batiment_inspection').insert({ branch_id: branchId, period, period_type: periodType, inspection_date: date || null }).select().single()
      if (data) setInspections(prev => [...prev, data])
    }
  }, [inspections, supabase])

  // ── Déchet helpers ───────────────────────────────────────────────────────

  const getDechet = useCallback((branchId: string): BatimentDechet | undefined => {
    return dechets.find(d => d.branch_id === branchId)
  }, [dechets])

  const saveDechet = useCallback(async (branchId: string, field: DechetField, value: string) => {
    const existing = dechets.find(d => d.branch_id === branchId)
    if (existing) {
      const { data } = await supabase.from('batiment_dechet').update({ [field]: value }).eq('id', existing.id).select().single()
      if (data) setDechets(prev => prev.map(d => d.id === data.id ? data : d))
    } else {
      const row = { branch_id: branchId, haute_dechet: 'N/A', haute_recyclage: 'N/A', basse_dechet: 'N/A', basse_recyclage: 'N/A', [field]: value }
      const { data } = await supabase.from('batiment_dechet').insert(row).select().single()
      if (data) setDechets(prev => [...prev, data])
    }
  }, [dechets, supabase])

  // ── Ménage helpers ───────────────────────────────────────────────────────

  const getMenage = useCallback((branchId: string): BatimentMenage | undefined => {
    return menages.find(m => m.branch_id === branchId)
  }, [menages])

  const saveMenage = useCallback(async (branchId: string, field: 'haute_freq' | 'basse_freq', value: string) => {
    const existing = menages.find(m => m.branch_id === branchId)
    if (existing) {
      const { data } = await supabase.from('batiment_menage').update({ [field]: value }).eq('id', existing.id).select().single()
      if (data) setMenages(prev => prev.map(m => m.id === data.id ? data : m))
    } else {
      const { data } = await supabase.from('batiment_menage').insert({ branch_id: branchId, haute_freq: 'N/A', basse_freq: 'N/A', [field]: value }).select().single()
      if (data) setMenages(prev => [...prev, data])
    }
  }, [menages, supabase])

  // ── Renders ───────────────────────────────────────────────────────────────

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div style={s.title}>Bâtiment</div>
        <div style={s.sub}>Gestion des bâtiments par succursale</div>
      </div>

      {/* Branch filter */}
      <div style={s.filterRow}>
        <span style={s.filterLabel}>Succursales :</span>
        <button style={s.allBtn(allSelected)} onClick={() => setSelectedBranches(allSelected ? new Set() : new Set(branches.map(b => b.id)))}>Toutes</button>
        {branches.map(b => (
          <button key={b.id} style={s.branchBtn(selectedBranches.has(b.id), b.color)} onClick={() => toggleBranch(b.id)}>{b.short_code}</button>
        ))}
      </div>

      {/* Tabs */}
      <div style={s.tabBar}>
        {TABS.map(t => (
          <button key={t.id} style={s.tab(tab === t.id)} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'inspection' && (
        <InspectionBatimentTab branches={filteredBranches} inspections={inspections} getInspDate={getInspDate} saveInspDate={saveInspDate} />
      )}
      {tab === 'deneigement' && (
        <DeneigementTab branches={filteredBranches} deneigements={deneigements} setDeneigements={setDeneigements} supabase={supabase} />
      )}
      {tab === 'dechet' && (
        <DechetTab branches={filteredBranches} getDechet={getDechet} saveDechet={saveDechet} />
      )}
      {tab === 'menage' && (
        <MenageTab branches={filteredBranches} getMenage={getMenage} saveMenage={saveMenage} />
      )}
      {tab === 'incendie' && (
        <GenericDateTab tableName="batiment_inspection_incendie" branches={filteredBranches} rows={incendies} setRows={setIncendies} supabase={supabase} />
      )}
      {tab === 'extincteur' && (
        <GenericDateTab tableName="batiment_extincteur" branches={filteredBranches} rows={extincteurs} setRows={setExtincteurs} supabase={supabase} />
      )}
      {tab === 'prevention' && (
        <GenericDateTab tableName="batiment_prevention_incendie" branches={filteredBranches} rows={prevention} setRows={setPrevention} supabase={supabase} />
      )}
      {tab === 'lumiere' && (
        <GenericDateTab tableName="batiment_lumiere_secours" branches={filteredBranches} rows={lumiere} setRows={setLumiere} supabase={supabase} />
      )}
      {tab === 'paradox' && (
        <GenericDateTab tableName="batiment_boite_paradox" branches={filteredBranches} rows={paradox} setRows={setParadox} supabase={supabase} />
      )}
      {tab === 'reservoir' && (
        <GenericDateTab tableName="batiment_reservoir_eau_chaude" branches={filteredBranches} rows={reservoir} setRows={setReservoir} supabase={supabase} />
      )}
    </div>
  )
}

// ─── Tab: Inspection Bâtiment ─────────────────────────────────────────────────

const FREQ_TYPE_LABELS: Record<string, string> = {
  annuel: 'ANNUEL',
  semestriel: 'SEMESTRIEL',
  mensuel: 'MENSUEL',
}

function InspectionBatimentTab({
  branches,
  getInspDate,
  saveInspDate,
}: {
  branches: Branch[]
  inspections: BatimentInspection[]
  getInspDate: (branchId: string, period: string) => string
  saveInspDate: (branchId: string, period: string, periodType: BatimentInspection['period_type'], date: string) => Promise<void>
}) {
  const [years, setYears] = useState<number[]>(INSP_YEARS_INIT)
  const [year, setYear] = useState(INSP_YEARS_INIT[0])
  // Active type filters — all on by default
  const [activeTypes, setActiveTypes] = useState<Set<string>>(() => new Set(['annuel', 'semestriel', 'mensuel']))

  const allRows = buildPeriodRows(year)
  const rows = allRows.filter(r => activeTypes.has(r.period_type))

  function addNextYear() {
    const next = Math.max(...years) + 1
    setYears(prev => [...prev, next])
    setYear(next)
  }

  function removeYear(y: number) {
    if (years.length <= 1) return
    const next = years.filter(x => x !== y)
    setYears(next)
    if (year === y) setYear(next[next.length - 1])
  }

  function toggleType(t: string) {
    setActiveTypes(prev => {
      const n = new Set(prev)
      if (n.has(t)) {
        // Don't allow deselecting all
        if (n.size === 1) return n
        n.delete(t)
      } else {
        n.add(t)
      }
      return n
    })
  }

  return (
    <div>
      {/* Year selector + legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {/* Year tabs */}
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
          {years.map((y, i) => (
            <div key={y} style={{ display: 'flex', alignItems: 'center', borderLeft: i > 0 ? '1px solid var(--border-subtle)' : undefined }}>
              <button onClick={() => setYear(y)} style={{
                padding: '6px 14px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all .12s',
                background: year === y ? 'rgba(180,180,190,.2)' : 'transparent',
                color: year === y ? 'var(--text-primary)' : 'var(--text-muted)',
              }}>{y}</button>
              {years.length > 1 && (
                <button onClick={() => removeYear(y)} title={`Supprimer ${y}`} style={{
                  padding: '0 6px 0 0', border: 'none', background: 'transparent',
                  color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', lineHeight: 1,
                }}>×</button>
              )}
            </div>
          ))}
          <button onClick={addNextYear} title={`Ajouter ${Math.max(...years) + 1}`} style={{
            padding: '6px 12px', border: 'none', borderLeft: '1px solid var(--border-subtle)',
            cursor: 'pointer', fontSize: '15px', fontWeight: 700, color: 'var(--text-muted)',
            background: 'transparent', lineHeight: 1, transition: 'color .12s',
          }}>+</button>
        </div>

        {/* Frequency type filter chips */}
        {(['annuel', 'semestriel', 'mensuel'] as const).map(t => {
          const active = activeTypes.has(t)
          const color = TYPE_COLOR[t]
          return (
            <button key={t} onClick={() => toggleType(t)} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '5px 12px', borderRadius: '20px', cursor: 'pointer',
              border: `1.5px solid ${active ? color : 'var(--border-subtle)'}`,
              background: active ? color + '22' : 'transparent',
              transition: 'all .12s',
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: active ? color : 'var(--text-muted)' }} />
              <span style={{ fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontWeight: 700, color: active ? color : 'var(--text-muted)' }}>
                {FREQ_TYPE_LABELS[t]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Card per branch */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {branches.map(b => (
          <div key={b.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '11px 16px', borderBottom: `3px solid ${b.color}`, background: 'var(--bg-panel)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: b.color, boxShadow: `0 0 6px ${b.color}` }} />
                <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{b.short_code}</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{b.name}</span>
            </div>
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {rows.map(row => {
                const val = getInspDate(b.id, row.period)
                const tc = TYPE_COLOR[row.period_type]
                const tl = TYPE_LABEL[row.period_type]
                return (
                  <div key={row.period} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: tc + '22', border: `1px solid ${tc}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '9px', fontWeight: 800, color: tc }}>{tl}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', minWidth: '80px', flexShrink: 0 }}>{row.label}</span>
                    <input
                      type="date"
                      value={val}
                      onChange={e => saveInspDate(b.id, row.period, row.period_type, e.target.value)}
                      style={{
                        flex: 1, padding: '4px 8px', borderRadius: '6px',
                        border: val ? `1px solid ${b.color}66` : '1px solid var(--border-subtle)',
                        background: val ? b.color + '18' : 'var(--bg-panel)',
                        color: val ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontSize: '12px', outline: 'none', cursor: 'pointer',
                      }}
                    />
                    {val && (
                      <button onClick={() => saveInspDate(b.id, row.period, row.period_type, '')} title="Effacer" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '15px', lineHeight: 1, padding: '0 2px' }}>×</button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tab: Déneigement ─────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  deneigement: 'Déneigement',
  deglacage: 'Déglacage',
  plan_b: 'Plan B',
  plan_c: 'Plan C',
  responsable: 'Responsable',
}
const ROLE_ORDER = ['deneigement', 'deglacage', 'plan_b', 'plan_c', 'responsable']

type DenForm = { contact_role: string; company_name: string; contact_name: string; phone: string }
const EMPTY_DEN: DenForm = { contact_role: 'deneigement', company_name: '', contact_name: '', phone: '' }

function DeneigementTab({
  branches, deneigements, setDeneigements, supabase,
}: {
  branches: Branch[]
  deneigements: BatimentDeneigement[]
  setDeneigements: React.Dispatch<React.SetStateAction<BatimentDeneigement[]>>
  supabase: ReturnType<typeof createClient>
}) {
  const [modal, setModal] = useState<{ branchId: string; edit?: BatimentDeneigement } | null>(null)
  const [form, setForm] = useState<DenForm>(EMPTY_DEN)
  const [saving, setSaving] = useState(false)

  function openEdit(item: BatimentDeneigement) {
    setForm({ contact_role: item.contact_role, company_name: item.company_name ?? '', contact_name: item.contact_name ?? '', phone: item.phone ?? '' })
    setModal({ branchId: item.branch_id, edit: item })
  }

  async function save() {
    if (!modal) return
    setSaving(true)
    if (modal.edit) {
      const { data } = await supabase.from('batiment_deneigement').update({ ...form, updated_at: new Date().toISOString() }).eq('id', modal.edit.id).select().single()
      if (data) setDeneigements(prev => prev.map(d => d.id === data.id ? data : d))
    } else {
      const existing = deneigements.filter(d => d.branch_id === modal.branchId)
      const { data } = await supabase.from('batiment_deneigement').insert({ ...form, branch_id: modal.branchId, sort_order: existing.length }).select().single()
      if (data) setDeneigements(prev => [...prev, data])
    }
    setSaving(false)
    setModal(null)
  }

  async function del(id: string) {
    await supabase.from('batiment_deneigement').delete().eq('id', id)
    setDeneigements(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {branches.map(b => {
          const items = deneigements.filter(d => d.branch_id === b.id)
          const byRole: Record<string, BatimentDeneigement[]> = {}
          for (const r of ROLE_ORDER) byRole[r] = items.filter(d => d.contact_role === r)

          return (
            <div key={b.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '12px', overflow: 'hidden' }}>
              {/* Branch header */}
              <div style={{ padding: '12px 16px', borderBottom: `3px solid ${b.color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-panel)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: b.color, boxShadow: `0 0 6px ${b.color}` }} />
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '14px' }}>{b.short_code}</span>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{b.name}</span>
              </div>
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {ROLE_ORDER.map(role => {
                  const contacts = byRole[role] ?? []
                  return (
                    <div key={role}>
                      {/* Role header row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{ROLE_LABELS[role]}</span>
                        <button
                          onClick={() => { setForm({ ...EMPTY_DEN, contact_role: role }); setModal({ branchId: b.id }) }}
                          style={{ background: 'none', border: '1px solid var(--border-subtle)', borderRadius: '5px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px', padding: '2px 7px', lineHeight: 1.4 }}
                        >+ Ajouter</button>
                      </div>
                      {contacts.length === 0 ? (
                        <button
                          onClick={() => { setForm({ ...EMPTY_DEN, contact_role: role }); setModal({ branchId: b.id }) }}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px dashed var(--border-subtle)', background: 'transparent', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', textAlign: 'left' }}
                        >
                          Cliquer pour ajouter…
                        </button>
                      ) : (
                        contacts.map(c => (
                          <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '5px', background: 'var(--bg-base)' }}>
                            <div style={{ fontSize: '12px', minWidth: 0 }}>
                              {c.company_name && <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1px' }}>{c.company_name}</div>}
                              {c.contact_name && <div style={{ color: 'var(--text-secondary)' }}>{c.contact_name}</div>}
                              {c.phone && <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '1px' }}>{c.phone}</div>}
                            </div>
                            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                              <button style={s.btnIcon} onClick={() => openEdit(c)} title="Modifier">✎</button>
                              <button style={{ ...s.btnIcon, color: '#f55' }} onClick={() => del(c.id)} title="Supprimer">×</button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {modal && (
        <Modal title={modal.edit ? 'Modifier contact' : 'Ajouter contact'} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Rôle</label>
              <select style={{ ...s.select, marginTop: '4px' }} value={form.contact_role} onChange={e => setForm(f => ({ ...f, contact_role: e.target.value }))}>
                {ROLE_ORDER.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Compagnie</label>
              <input style={s.inp} value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Nom de la compagnie" />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Contact (personne)</label>
              <input style={s.inp} value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="Prénom Nom" />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Téléphone</label>
              <input style={s.inp} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="000-000-0000" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <button style={s.btnGhost} onClick={() => setModal(null)}>Annuler</button>
              <button style={s.btn} onClick={save} disabled={saving}>{saving ? '…' : 'Sauvegarder'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Tab: Déchet ──────────────────────────────────────────────────────────────

type DechetField = 'haute_dechet' | 'haute_recyclage' | 'basse_dechet' | 'basse_recyclage'

function FreqCell({
  value, branchId, field, onSave,
}: {
  value: string
  branchId: string
  field: DechetField
  onSave: (branchId: string, field: DechetField, val: string) => Promise<void>
}) {
  return (
    <select style={s.freqSelect} value={value} onChange={e => onSave(branchId, field, e.target.value)}>
      {FREQ_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function DechetTab({ branches, getDechet, saveDechet }: {
  branches: Branch[]
  getDechet: (id: string) => BatimentDechet | undefined
  saveDechet: (branchId: string, field: DechetField, val: string) => Promise<void>
}) {
  const seasonTable = (season: 'haute' | 'basse', title: string, accent: string) => (
    <div style={{ marginBottom: '28px' }}>
      <div style={s.sectionHead(accent)}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</span>
      </div>
      <div style={s.card}>
        <table style={s.tbl}>
          <thead>
            <tr>
              <th style={s.thLeft()}>Type</th>
              {branches.map(b => <th key={b.id} style={s.th(b.color + '22', b.color)}>{b.short_code}</th>)}
            </tr>
          </thead>
          <tbody>
            {(['dechet', 'recyclage'] as const).map(type => (
              <tr key={type}>
                <td style={s.tdLeft()}>{type === 'dechet' ? 'Déchet' : 'Recyclage'}</td>
                {branches.map(b => {
                  const row = getDechet(b.id)
                  const field = `${season}_${type}` as DechetField
                  const val = row?.[field] ?? 'N/A'
                  return (
                    <td key={b.id} style={s.td()}>
                      <FreqCell value={val} branchId={b.id} field={field} onSave={saveDechet} />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div>
      {seasonTable('haute', 'Saison Haute — Avril à Octobre', '#FCBF49')}
      {seasonTable('basse', 'Saison Basse — Novembre à Mars', '#4CC9F0')}
    </div>
  )
}

// ─── Tab: Ménage ──────────────────────────────────────────────────────────────

function MenageTab({ branches, getMenage, saveMenage }: {
  branches: Branch[]
  getMenage: (id: string) => BatimentMenage | undefined
  saveMenage: (branchId: string, field: 'haute_freq' | 'basse_freq', val: string) => Promise<void>
}) {
  const seasonRow = (field: 'haute_freq' | 'basse_freq', _label: string) => (
    <tr key={field}>
      <td style={s.tdLeft()}>Ménage</td>
      {branches.map(b => {
        const row = getMenage(b.id)
        const val = row?.[field] ?? 'N/A'
        return (
          <td key={b.id} style={s.td()}>
            <select style={s.freqSelect} value={val} onChange={e => saveMenage(b.id, field, e.target.value)}>
              {FREQ_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </td>
        )
      })}
    </tr>
  )

  const tbl = (title: string, accent: string, field: 'haute_freq' | 'basse_freq') => (
    <div style={{ marginBottom: '28px' }}>
      <div style={s.sectionHead(accent)}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</span>
      </div>
      <div style={s.card}>
        <table style={s.tbl}>
          <thead>
            <tr>
              <th style={s.thLeft()}>Type</th>
              {branches.map(b => <th key={b.id} style={s.th(b.color + '22', b.color)}>{b.short_code}</th>)}
            </tr>
          </thead>
          <tbody>{seasonRow(field, title)}</tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div>
      {tbl('Saison Haute — Avril à Octobre', '#FCBF49', 'haute_freq')}
      {tbl('Saison Basse — Novembre à Mars', '#4CC9F0', 'basse_freq')}
    </div>
  )
}

// ─── Generic Date Tab (Incendie, Extincteurs, Prévention, Lumière, Paradox, Réservoir) ──

function GenericDateTab({
  tableName, branches, rows, setRows, supabase,
}: {
  tableName: string
  branches: Branch[]
  rows: BatimentDateRecord[]
  setRows: React.Dispatch<React.SetStateAction<BatimentDateRecord[]>>
  supabase: ReturnType<typeof createClient>
}) {
  const [modal, setModal] = useState<{ branchId: string } | null>(null)
  const [newDate, setNewDate] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function addDate() {
    if (!modal || !newDate) return
    setSaving(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).from(tableName).insert({ branch_id: modal.branchId, inspection_date: newDate, notes: newNotes || null }).select().single()
    if (data) setRows(prev => [data as BatimentDateRecord, ...prev])
    setSaving(false)
    setModal(null)
    setNewDate('')
    setNewNotes('')
  }

  async function del(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from(tableName).delete().eq('id', id)
    setRows(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div>
      <div style={s.card}>
        <table style={s.tbl}>
          <thead>
            <tr>
              <th style={s.thLeft('var(--bg-panel)', 'var(--text-secondary)')}>Succursale</th>
              <th style={s.th()}>Dates d'inspection</th>
              <th style={s.th()}>Action</th>
            </tr>
          </thead>
          <tbody>
            {branches.map(b => {
              const dates = rows.filter(r => r.branch_id === b.id).sort((a, z) => z.inspection_date.localeCompare(a.inspection_date))
              return (
                <tr key={b.id}>
                  <td style={{ ...s.tdLeft(b.color + '22', b.color), fontWeight: 700 }}>{b.short_code}</td>
                  <td style={{ ...s.td(), textAlign: 'left' }}>
                    {dates.length === 0 ? (
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>Aucune</span>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {dates.map(d => (
                          <span key={d.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255,214,0,.15)', color: '#ffd600', border: '1px solid rgba(255,214,0,.3)', borderRadius: '6px', padding: '3px 8px', fontSize: '12px', fontWeight: 600 }}>
                            {d.inspection_date}
                            {d.notes && <span style={{ color: 'rgba(255,214,0,.6)', fontSize: '10px' }}> · {d.notes}</span>}
                            <button style={{ background: 'none', border: 'none', color: '#f44', cursor: 'pointer', padding: '0 0 0 4px', fontSize: '12px' }} onClick={() => del(d.id)}>×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={s.td()}>
                    <button style={s.btnSm} onClick={() => setModal({ branchId: b.id })}>+ Date</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Ajouter une date" onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Date d'inspection</label>
              <input type="date" style={s.inp} value={newDate} onChange={e => setNewDate(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Notes (optionnel)</label>
              <input style={s.inp} value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Ex: Rapport envoyé" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <button style={s.btnGhost} onClick={() => setModal(null)}>Annuler</button>
              <button style={s.btn} onClick={addDate} disabled={saving || !newDate}>{saving ? '…' : 'Ajouter'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
