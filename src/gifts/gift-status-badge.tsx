import * as React from 'react'

import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { GIFT_STATUSES, GIFT_STATUS_BADGE_CLASS, GIFT_STATUS_LABELS, type GiftStatus } from '@/gifts/gift-status'

// Tapping cycles the badge instantly through all GIFT_STATUSES in order,
// wrapping back to the first; the actual save is debounced so rapid repeat
// taps only write once, after tapping stops.
const COMMIT_DELAY_MS = 600

function nextGiftStatus(status: GiftStatus): GiftStatus {
  const i = GIFT_STATUSES.indexOf(status)
  return GIFT_STATUSES[(i + 1) % GIFT_STATUSES.length]
}

export function GiftStatusBadge({
  giftId,
  status,
  onChanged,
}: {
  giftId: string
  status: GiftStatus
  onChanged: () => void
}) {
  const [display, setDisplay] = React.useState(status)
  const [failed, setFailed] = React.useState(false)
  const timerRef = React.useRef<number | undefined>(undefined)

  React.useEffect(() => {
    setDisplay(status)
  }, [status])

  React.useEffect(() => () => window.clearTimeout(timerRef.current), [])

  function handleTap() {
    const next = nextGiftStatus(display)
    setDisplay(next)
    setFailed(false)
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      void supabase
        .from('gifts')
        .update({ status: next })
        .eq('id', giftId)
        .then(({ error }) => {
          if (error) {
            console.error('Failed to save gift status:', error.message)
            setDisplay(status)
            setFailed(true)
          }
          onChanged()
        })
    }, COMMIT_DELAY_MS)
  }

  return (
    <button
      type="button"
      onClick={handleTap}
      className={`rounded-full transition-transform active:scale-95 ${failed ? 'ring-2 ring-destructive' : ''}`}
      aria-label={`Status: ${GIFT_STATUS_LABELS[display]}. Tap to change.${failed ? ' Last change failed to save.' : ''}`}
      title={failed ? 'Failed to save — tap to try again' : undefined}
    >
      <Badge className={`w-24 justify-center text-center ${GIFT_STATUS_BADGE_CLASS[display]}`}>
        {GIFT_STATUS_LABELS[display]}
      </Badge>
    </button>
  )
}
