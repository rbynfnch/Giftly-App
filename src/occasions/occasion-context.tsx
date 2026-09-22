import * as React from 'react'

import { usePrimaryNetwork } from '@/hooks/use-primary-network'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type Occasion = Database['public']['Tables']['occasions']['Row']

type OccasionContextValue = {
  occasions: Occasion[]
  loading: boolean
  networkId: string | null
  selectedOccasionId: string | null
  selectedOccasion: Occasion | null
  setSelectedOccasionId: (id: string | null) => void
  refresh: () => void
}

const OccasionContext = React.createContext<OccasionContextValue | null>(null)

const SELECTED_KEY = 'giftly:selectedOccasion'

export function OccasionProvider({ children }: { children: React.ReactNode }) {
  const { networkId } = usePrimaryNetwork()
  const [occasions, setOccasions] = React.useState<Occasion[]>([])
  const [loading, setLoading] = React.useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = React.useState(false)
  const [selectedOccasionId, setSelectedOccasionIdState] = React.useState<string | null>(() => {
    try {
      return window.localStorage.getItem(SELECTED_KEY)
    } catch {
      return null
    }
  })

  const refresh = React.useCallback(() => {
    if (!networkId) return
    setLoading(true)
    supabase
      .from('occasions')
      .select('*')
      .eq('network_id', networkId)
      .order('date', { ascending: true })
      .then(({ data, error }) => {
        if (!error) setOccasions(data ?? [])
        setLoading(false)
        setHasLoadedOnce(true)
      })
  }, [networkId])

  React.useEffect(() => {
    if (networkId) refresh()
  }, [networkId, refresh])

  // Drop a stale selection (e.g. the occasion was deleted elsewhere) once we know the real list.
  // Gated on hasLoadedOnce so a persisted selection isn't wiped before the first fetch even runs.
  React.useEffect(() => {
    if (!hasLoadedOnce || loading) return
    if (selectedOccasionId && !occasions.some((o) => o.id === selectedOccasionId)) {
      setSelectedOccasionIdState(null)
      try {
        window.localStorage.removeItem(SELECTED_KEY)
      } catch {
        // localStorage unavailable — selection still clears for this session
      }
    }
  }, [occasions, loading, hasLoadedOnce, selectedOccasionId])

  const setSelectedOccasionId = React.useCallback((id: string | null) => {
    setSelectedOccasionIdState(id)
    try {
      if (id) window.localStorage.setItem(SELECTED_KEY, id)
      else window.localStorage.removeItem(SELECTED_KEY)
    } catch {
      // localStorage unavailable — selection still applies for this session
    }
  }, [])

  const selectedOccasion = occasions.find((o) => o.id === selectedOccasionId) ?? null

  const value = React.useMemo<OccasionContextValue>(
    () => ({ occasions, loading, networkId, selectedOccasionId, selectedOccasion, setSelectedOccasionId, refresh }),
    [occasions, loading, networkId, selectedOccasionId, selectedOccasion, setSelectedOccasionId, refresh],
  )

  return <OccasionContext.Provider value={value}>{children}</OccasionContext.Provider>
}

export function useOccasions() {
  const ctx = React.useContext(OccasionContext)
  if (!ctx) throw new Error('useOccasions must be used within an OccasionProvider')
  return ctx
}
