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

function buildPeriodRows(years: number[]) {
  const rows: { period: string; period_type: 'annuel' | 'semestriel' | 'mensuel'; label: string }[] = []
  for (const yr of years) {
    rows.push({ period: `${yr}`, period_type: 'annuel', label: `${yr}` })
    rows.push({ period: `${yr}-06`, period_type: 'semestriel', label: `${yr}-06` })
    rows.push({ period: `${yr}-12`, period_type: 'semestriel', label: `${yr}-12` })
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, '0')
      rows.push({ period: `${yr}-${mm}`, period_type: 'mensuel', label: `${yr}-${mm}` })
    }
  }
  return rows
}

const PERIOD_ROWS = buildPeriodRows([2025, 2026])

const ROW_BG: Record<string, string> = {
  annuel: '#00bcd4',
  semestriel: '#ffd600',
  mensuel: '#4caf50',
}
const ROW_TEXT: Record<string, string> = {
  annuel: '#fff',
  semestriel: '#000',
  mensuel: '#fff',
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  wrap: { padding: '24px 28px', minHeight: '100vh', background: 'var(--bg-base)' } as React.CSSProperties,
  header: { marginBottom: '20px' } as React.CSSProperties,
  title: { fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' } as React.CSSProperties,
  sub: { fontSize: '13px', color: 'var(--text-muted)' } as React.CSSProperties,
  tabs: { display: 'flex', gap: '4px', marginBottom: '20px', flexWrap: 'wrap' as const } as React.CSSProperties,
  tab: (active: boolean): React.CSSProperties => ({
    padding: '7px 16px',
    borderRadius: '8px',
    border: '1px solid',
    borderColor: active ? '#FF4D6D' : 'var(--border-subtle)',
    background: active ? 'rgba(255,77,109,.12)' : 'var(--bg-elevated)',
    color: active ? '#FF4D6D' : 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    transition: 'all .15s',
  }),
  card: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '12px',
    overflow: 'auto',
  } as React.CSSProperties,
  legend: {
    display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' as const, alignItems: 'center',
  } as React.CSSProperties,
  legendItem: (): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px',
    color: 'var(--text-secondary)',
  }),
  legendDot: (color: string): React.CSSProperties => ({
    width: '14px', height: '14px', borderRadius: '3px', background: color, flexShrink: 0,
  }),
  // Table
  tbl: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '12px' } as React.CSSProperties,
  th: (bg?: string, color?: string): React.CSSProperties => ({
    padding: '8px 10px',
    background: bg ?? 'var(--bg-panel)',
    color: color ?? 'var(--text-secondary)',
    fontWeight: 700,
    textAlign: 'center' as const,
    border: '1px solid var(--border-subtle)',
    whiteSpace: 'nowrap' as const,
    position: 'sticky' as const,
    top: 0,
    zIndex: 2,
  }),
  thLeft: (bg?: string, color?: string): React.CSSProperties => ({
    padding: '8px 12px',
    background: bg ?? 'var(--bg-panel)',
    color: color ?? 'var(--text-secondary)',
    fontWeight: 700,
    textAlign: 'left' as const,
    border: '1px solid var(--border-subtle)',
    whiteSpace: 'nowrap' as const,
    position: 'sticky' as const,
    left: 0,
    zIndex: 3,
  }),
  td: (bg?: string, color?: string): React.CSSProperties => ({
    padding: '6px 8px',
    border: '1px solid var(--border-subtle)',
    background: bg ?? 'transparent',
    color: color ?? 'var(--text-primary)',
    textAlign: 'center' as const,
    verticalAlign: 'middle' as const,
    minWidth: '90px',
  }),
  tdLeft: (bg?: string, color?: string): React.CSSProperties => ({
    padding: '6px 12px',
    border: '1px solid var(--border-subtle)',
    background: bg ?? 'var(--bg-panel)',
    color: color ?? 'var(--text-primary)',
    textAlign: 'left' as const,
    verticalAlign: 'middle' as const,
    fontWeight: 600,
    position: 'sticky' as const,
    left: 0,
    zIndex: 1,
    whiteSpace: 'nowrap' as const,
  }),
  dateInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'inherit',
    fontSize: '11px',
    width: '90px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    padding: '2px',
    borderRadius: '4px',
  } as React.CSSProperties,
  btn: {
    padding: '6px 14px',
    borderRadius: '8px',
    border: 'none',
    background: '#FF4D6D',
    color: '#fff',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
  } as React.CSSProperties,
  btnSm: {
    padding: '4px 10px',
    borderRadius: '6px',
    border: 'none',
    background: '#FF4D6D',
    color: '#fff',
    fontWeight: 600,
    fontSize: '11px',
    cursor: 'pointer',
  } as React.CSSProperties,
  btnGhost: {
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid var(--border-subtle)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    fontSize: '11px',
    cursor: 'pointer',
  } as React.CSSProperties,
  inp: {
    padding: '6px 10px',
    borderRadius: '8px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--bg-base)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
    width: '100%',
  } as React.CSSProperties,
  select: {
    padding: '4px 8px',
    borderRadius: '6px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--bg-base)',
    color: 'var(--text-primary)',
    fontSize: '12px',
    cursor: 'pointer',
    outline: 'none',
  } as React.CSSProperties,
  filterRow: { display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' as const, alignItems: 'center' } as React.CSSProperties,
  filterLabel: { fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginRight: '2px' } as React.CSSProperties,
  branchBtn: (active: boolean, color: string): React.CSSProperties => ({
    padding: '4px 10px', borderRadius: '6px',
    border: `1px solid ${active ? color : 'var(--border-subtle)'}`,
    background: active ? color + '22' : 'transparent',
    color: active ? color : 'var(--text-muted)',
    fontSize: '12px', fontWeight: active ? 700 : 400, cursor: 'pointer', transition: 'all .12s',
  }),
  allBtn: (active: boolean): React.CSSProperties => ({
    padding: '4px 10px', borderRadius: '6px',
    border: `1px solid ${active ? 'var(--text-secondary)' : 'var(--border-subtle)'}`,
    background: active ? 'var(--bg-elevated)' : 'transparent',
    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
    fontSize: '12px', fontWeight: active ? 700 : 400, cursor: 'pointer',
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
  isAdmin,
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
      <div style={s.tabs}>
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
        <DechetTab branches={filteredBranches} dechets={dechets} getDechet={getDechet} saveDechet={saveDechet} isAdmin={isAdmin} />
      )}
      {tab === 'menage' && (
        <MenageTab branches={filteredBranches} menages={menages} getMenage={getMenage} saveMenage={saveMenage} isAdmin={isAdmin} />
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
  return (
    <div>
      {/* Legend */}
      <div style={s.legend}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Légende :</span>
        {(['annuel', 'semestriel', 'mensuel'] as const).map(type => (
          <div key={type} style={s.legendItem()}>
            <div style={s.legendDot(ROW_BG[type])} />
            <span>{type.toUpperCase()}</span>
          </div>
        ))}
      </div>
      <div style={s.card}>
        <table style={s.tbl}>
          <thead>
            <tr>
              <th style={s.thLeft()}>Période</th>
              {branches.map(b => (
                <th key={b.id} style={{ ...s.th(b.color + '22', b.color), borderTop: `3px solid ${b.color}` }}>
                  {b.short_code}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIOD_ROWS.map(row => {
              const bg = ROW_BG[row.period_type]
              const tc = ROW_TEXT[row.period_type]
              const isYearRow = row.period_type === 'annuel'
              return (
                <tr key={row.period}>
                  <td style={{ ...s.tdLeft(bg, tc), fontWeight: isYearRow ? 800 : 600, fontSize: isYearRow ? '14px' : '12px' }}>
                    {row.label}
                  </td>
                  {branches.map(b => {
                    const val = getInspDate(b.id, row.period)
                    return (
                      <td key={b.id} style={s.td()}>
                        <input
                            type="date"
                            value={val}
                            onChange={e => saveInspDate(b.id, row.period, row.period_type, e.target.value)}
                            style={s.dateInput}
                          />
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
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

  function openAdd(branchId: string) {
    setForm(EMPTY_DEN)
    setModal({ branchId })
  }
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
            <div key={b.id} style={{ ...s.card, padding: '0', overflow: 'hidden' }}>
              {/* Branch header */}
              <div style={{ background: b.color, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: '15px' }}>{b.short_code}</span>
                <span style={{ color: 'rgba(255,255,255,.75)', fontSize: '11px' }}>{b.name}</span>
              </div>
              <div style={{ padding: '12px' }}>
                {ROLE_ORDER.map(role => {
                  const contacts = byRole[role] ?? []
                  return (
                    <div key={role} style={{ marginBottom: '10px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.06em' }}>
                        {ROLE_LABELS[role]}
                      </div>
                      {contacts.length === 0 ? (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>—</div>
                      ) : (
                        contacts.map(c => (
                          <div key={c.id} style={{ fontSize: '12px', color: 'var(--text-primary)', marginBottom: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <div>
                              {c.company_name && <div style={{ fontWeight: 600 }}>{c.company_name}</div>}
                              {c.contact_name && <div>{c.contact_name}</div>}
                              {c.phone && <div style={{ color: 'var(--text-muted)' }}>{c.phone}</div>}
                            </div>
                            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                              <button style={s.btnGhost} onClick={() => openEdit(c)}>✎</button>
                              <button style={{ ...s.btnGhost, color: '#f44' }} onClick={() => del(c.id)}>×</button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )
                })}
                <button style={{ ...s.btnSm, marginTop: '6px', width: '100%' }} onClick={() => openAdd(b.id)}>+ Ajouter contact</button>
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
              <select style={s.select} value={form.contact_role} onChange={e => setForm(f => ({ ...f, contact_role: e.target.value }))}>
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
  isAdmin: boolean
  onSave: (branchId: string, field: DechetField, val: string) => Promise<void>
}) {
  return (
    <select
      style={{ ...s.select, width: '60px', textAlign: 'center' }}
      value={value}
      onChange={e => onSave(branchId, field, e.target.value)}
    >
      {FREQ_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function DechetTab({ branches, getDechet, saveDechet }: {
  branches: Branch[]
  dechets: BatimentDechet[]
  getDechet: (id: string) => BatimentDechet | undefined
  saveDechet: (branchId: string, field: DechetField, val: string) => Promise<void>
  isAdmin: boolean
}) {
  const seasonTable = (season: 'haute' | 'basse', title: string, bg: string) => (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '10px', padding: '8px 14px', background: bg, borderRadius: '8px' }}>{title}</div>
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
                      <FreqCell value={val} branchId={b.id} field={field} isAdmin={isAdmin} onSave={saveDechet} />
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
      {seasonTable('haute', 'Fréquence par Mois — Saison Haute (Avril–Octobre)', 'rgba(255,214,0,.12)')}
      {seasonTable('basse', 'Fréquence par Mois — Saison Basse (Novembre–Mars)', 'rgba(255,77,109,.08)')}
    </div>
  )
}

// ─── Tab: Ménage ──────────────────────────────────────────────────────────────

function MenageTab({ branches, getMenage, saveMenage }: {
  branches: Branch[]
  menages: BatimentMenage[]
  getMenage: (id: string) => BatimentMenage | undefined
  saveMenage: (branchId: string, field: 'haute_freq' | 'basse_freq', val: string) => Promise<void>
  isAdmin: boolean
}) {
  const seasonRow = (field: 'haute_freq' | 'basse_freq', _label: string) => (
    <tr key={field}>
      <td style={s.tdLeft()}>Ménage</td>
      {branches.map(b => {
        const row = getMenage(b.id)
        const val = row?.[field] ?? 'N/A'
        return (
          <td key={b.id} style={s.td()}>
            <select style={{ ...s.select, width: '60px', textAlign: 'center' }} value={val} onChange={e => saveMenage(b.id, field, e.target.value)}>
              {FREQ_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </td>
        )
      })}
    </tr>
  )

  const tbl = (title: string, bg: string, field: 'haute_freq' | 'basse_freq') => (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '10px', padding: '8px 14px', background: bg, borderRadius: '8px' }}>{title}</div>
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
      {tbl('Fréquence par Mois — Saison Haute (Avril–Octobre)', 'rgba(255,214,0,.12)', 'haute_freq')}
      {tbl('Fréquence par Mois — Saison Basse (Novembre–Mars)', 'rgba(255,77,109,.08)', 'basse_freq')}
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
