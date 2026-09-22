import * as React from 'react'

import { useAuth } from '@/auth/auth-provider'
import { supabase } from '@/lib/supabase'

/**
 * Phase 1 has no network switcher UI yet, so People CRUD operates against
 * the user's first network membership (the personal network created for
 * them on sign-up).
 */
export function usePrimaryNetwork() {
  const { user } = useAuth()
  const [networkId, setNetworkId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!user) {
      setNetworkId(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    supabase
      .from('network_members')
      .select('network_id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(error.message)
        setNetworkId(data?.network_id ?? null)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user])

  return { networkId, loading, error }
}
