import { Plus, Repeat } from 'lucide-react'
import * as React from 'react'
import { useNavigate } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatMonthDay } from '@/lib/date-utils'
import { CreateOccasionDialog } from '@/occasions/create-occasion-dialog'
import { useOccasions } from '@/occasions/occasion-context'

export function OccasionsListPage() {
  const navigate = useNavigate()
  const { occasions, loading } = useOccasions()
  const [createOpen, setCreateOpen] = React.useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Manage Occasions</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          New Occasion
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!loading && occasions.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No occasions yet. Create one to start planning gifts around it.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {occasions.map((occasion) => (
          <Card key={occasion.id} className="cursor-pointer transition-colors hover:bg-accent/40" onClick={() => navigate(`/occasions/${occasion.id}`)}>
            <CardContent className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-medium">{occasion.name}</p>
                {occasion.is_recurring_template && <Repeat className="size-3.5 shrink-0 text-muted-foreground" />}
              </div>
              <p className="text-sm text-muted-foreground">{formatMonthDay(occasion.date)}</p>
              {occasion.budget !== null && <Badge variant="secondary">Budget ${occasion.budget.toFixed(2)}</Badge>}
            </CardContent>
          </Card>
        ))}
      </div>

      <CreateOccasionDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(id) => navigate(`/occasions/${id}`)} />
    </div>
  )
}
