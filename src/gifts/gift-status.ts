export type GiftStatus = 'idea' | 'planned' | 'purchased' | 'given'

export const GIFT_STATUSES: GiftStatus[] = ['idea', 'planned', 'purchased', 'given']

export const GIFT_STATUS_LABELS: Record<GiftStatus, string> = {
  idea: 'Idea',
  planned: 'Planned',
  purchased: 'Purchased',
  given: 'Given',
}

export const GIFT_STATUS_BADGE_CLASS: Record<GiftStatus, string> = {
  idea: 'bg-secondary text-secondary-foreground',
  planned: 'bg-accent text-accent-foreground',
  purchased: 'bg-primary/15 text-primary',
  given: 'bg-primary text-primary-foreground',
}

/** A gift counts toward "spent" once it's actually been bought. */
export function isSpentStatus(status: GiftStatus): boolean {
  return status === 'purchased' || status === 'given'
}
