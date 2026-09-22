import { Calendar, Check, ChevronDown, Plus, Settings } from 'lucide-react'
import * as React from 'react'
import { useNavigate } from 'react-router-dom'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatMonthDay } from '@/lib/date-utils'
import { CreateOccasionDialog } from '@/occasions/create-occasion-dialog'
import { useOccasions } from '@/occasions/occasion-context'

export function OccasionSwitcher() {
  const navigate = useNavigate()
  const { occasions, selectedOccasion, setSelectedOccasionId } = useOccasions()
  const [createOpen, setCreateOpen] = React.useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex max-w-56 items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-xs hover:bg-accent hover:text-accent-foreground"
          >
            <Calendar className="size-4 shrink-0" />
            <span className="truncate">{selectedOccasion ? selectedOccasion.name : 'All Occasions'}</span>
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Occasions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setSelectedOccasionId(null)}>
            {!selectedOccasion && <Check className="size-4" />}
            All Occasions
          </DropdownMenuItem>
          {occasions.map((occasion) => (
            <DropdownMenuItem key={occasion.id} onSelect={() => setSelectedOccasionId(occasion.id)}>
              {selectedOccasion?.id === occasion.id && <Check className="size-4" />}
              <span className="min-w-0 flex-1 truncate">{occasion.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{formatMonthDay(occasion.date)}</span>
            </DropdownMenuItem>
          ))}
          {occasions.length === 0 && (
            <DropdownMenuItem disabled className="text-muted-foreground">
              No occasions yet
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Add Occasion
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate('/occasions')}>
            <Settings className="size-4" />
            Manage Occasions
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateOccasionDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(id) => navigate(`/occasions/${id}`)} />
    </>
  )
}
