export type GiftStatus = 'idea' | 'purchased' | 'delivered' | 'wrapped' | 'gifted'

export const GIFT_STATUSES: GiftStatus[] = ['idea', 'purchased', 'delivered', 'wrapped', 'gifted']

export const GIFT_STATUS_LABELS: Record<GiftStatus, string> = {
  idea: 'Idea',
  purchased: 'Purchased',
  delivered: 'Delivered',
  wrapped: 'Wrapped',
  gifted: 'Gifted',
}

export const GIFT_STATUS_BADGE_CLASS: Record<GiftStatus, string> = {
  idea: 'bg-secondary text-secondary-foreground',
  purchased: 'bg-accent text-accent-foreground',
  delivered: 'bg-accent/60 text-accent-foreground',
  wrapped: 'bg-primary/15 text-primary',
  gifted: 'bg-primary text-primary-foreground',
}

/** A gift counts toward "spent" once money's actually gone out the door. */
export function isSpentStatus(status: GiftStatus): boolean {
  return status === 'purchased' || status === 'delivered' || status === 'wrapped' || status === 'gifted'
}
