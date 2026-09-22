import { CalendarDays, Check, ChevronDown } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * Placeholder for the global occasion-switcher: Occasions aren't modeled
 * yet (no table, no data), so this only offers "All Occasions" for now.
 * Wiring it up to real occasions is a later phase.
 */
export function OccasionSwitcher() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-xs hover:bg-accent hover:text-accent-foreground"
        >
          <CalendarDays className="size-4" />
          <span>All Occasions</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Occasions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <Check className="size-4" />
          All Occasions
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="text-muted-foreground">
          Per-occasion views coming soon
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
