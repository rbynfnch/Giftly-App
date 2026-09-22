import { Gift, Home, MoreHorizontal, ShoppingBag, Users, type LucideIcon } from 'lucide-react'

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean }

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/people', label: 'People', icon: Users },
  { to: '/gifts', label: 'Gifts', icon: Gift },
  { to: '/shop', label: 'Shop', icon: ShoppingBag },
  { to: '/more', label: 'More', icon: MoreHorizontal },
]
