import { createClient } from '@/lib/supabase/server'
import BatimentClient from './BatimentClient'

export const dynamic = 'force-dynamic'

export default async function BatimentPage() {
  const supabase = await createClient()

  const [
    branchesRes,
    inspRes,
    denRes,
    dechetRes,
    menageRes,
    incendieRes,
    extincteurRes,
    preventionRes,
    lumiereRes,
    paradoxRes,
    reservoirRes,
    profileRes,
  ] = await Promise.all([
    supabase.from('branches').select('*').order('short_code'),
    supabase.from('batiment_inspection').select('*'),
    supabase.from('batiment_deneigement').select('*').order('sort_order'),
    supabase.from('batiment_dechet').select('*'),
    supabase.from('batiment_menage').select('*'),
    supabase.from('batiment_inspection_incendie').select('*').order('inspection_date', { ascending: false }),
    supabase.from('batiment_extincteur').select('*').order('inspection_date', { ascending: false }),
    supabase.from('batiment_prevention_incendie').select('*').order('inspection_date', { ascending: false }),
    supabase.from('batiment_lumiere_secours').select('*').order('inspection_date', { ascending: false }),
    supabase.from('batiment_boite_paradox').select('*').order('inspection_date', { ascending: false }),
    supabase.from('batiment_reservoir_eau_chaude').select('*').order('inspection_date', { ascending: false }),
    supabase.from('profiles').select('role').single(),
  ])

  const isAdmin = profileRes.data?.role === 'admin' || profileRes.data?.role === 'superuser'

  return (
    <BatimentClient
      branches={branchesRes.data ?? []}
      inspections={inspRes.data ?? []}
      deneigements={denRes.data ?? []}
      dechets={dechetRes.data ?? []}
      menages={menageRes.data ?? []}
      incendies={incendieRes.data ?? []}
      extincteurs={extincteurRes.data ?? []}
      preventionIncendie={preventionRes.data ?? []}
      lumiereSecours={lumiereRes.data ?? []}
      boiteParadox={paradoxRes.data ?? []}
      reservoirEauChaude={reservoirRes.data ?? []}
      isAdmin={isAdmin}
    />
  )
}
