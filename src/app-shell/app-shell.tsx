import { NavLink, Outlet } from 'react-router-dom'

import { OccasionSwitcher } from '@/app-shell/occasion-switcher'
import { UserMenu } from '@/app-shell/user-menu'
import { NAV_ITEMS } from '@/app-shell/nav-items'
import { branding } from '@/config/branding'
import { cn } from '@/lib/utils'

function NavItems({ orientation }: { orientation: 'horizontal' | 'vertical' }) {
  return (
    <>
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md text-sm font-medium transition-colors',
              orientation === 'vertical'
                ? 'px-3 py-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                : 'flex-1 flex-col gap-1 px-2 py-1.5 text-xs',
              isActive
                ? orientation === 'vertical'
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-primary'
                : orientation === 'vertical'
                  ? 'text-sidebar-foreground/80'
                  : 'text-muted-foreground',
            )
          }
        >
          <Icon className={orientation === 'vertical' ? 'size-4' : 'size-5'} />
          <span>{label}</span>
        </NavLink>
      ))}
    </>
  )
}

export function AppShell() {
  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="px-4 py-5 text-lg font-semibold text-sidebar-foreground">{branding.appName}</div>
        <nav className="flex flex-col gap-1 px-2">
          <NavItems orientation="vertical" />
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-3">
          <div className="md:hidden text-lg font-semibold">{branding.appName}</div>
          <OccasionSwitcher />
          <UserMenu />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 flex border-t border-border bg-background md:hidden">
          <NavItems orientation="horizontal" />
        </nav>
      </div>
    </div>
  )
}
