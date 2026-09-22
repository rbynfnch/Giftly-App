/**
 * Single source of truth for app identity. Swap these values to re-skin
 * the app under a different name/brand without touching component code,
 * the PWA manifest, or index.html.
 */
export const branding = {
  appName: 'Giftly',
  shortName: 'Giftly',
  tagline: 'Never miss the perfect gift.',
  description: 'Track people, occasions, and gift ideas for everyone in your life.',
  themeColor: '#4d7c5f',
  backgroundColor: '#ffffff',
} as const

export type Branding = typeof branding
