import { ArrowLeft, Copy, Pencil, Plus, Trash2, Users } from 'lucide-react'
import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/auth/auth-provider'
import { addYears, formatMonthDay, parseDateOnly } from '@/lib/date-utils'
import { supabase } from '@/lib/supabase'
import { getInitials } from '@/lib/utils'
import type { Database } from '@/lib/database.types'
import { useOccasions } from '@/occasions/occasion-context'

type Occasion = Database['public']['Tables']['occasions']['Row']
type Person = Database['public']['Tables']['people']['Row']
type Participant = Database['public']['Tables']['occasion_participants']['Row'] & { person: Person }
type Group = Database['public']['Tables']['groups']['Row']
type GroupBudget = Database['public']['Tables']['occasion_group_budgets']['Row']

function money(n: number) {
  return `$${n.toFixed(2)}`
}

export function OccasionDashboardPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { networkId, refresh: refreshOccasionList } = useOccasions()

  const [occasion, setOccasion] = React.useState<Occasion | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [participants, setParticipants] = React.useState<Participant[]>([])
  const [groups, setGroups] = React.useState<Group[]>([])
  const [groupBudgets, setGroupBudgets] = React.useState<GroupBudget[]>([])

  const loadOccasion = React.useCallback(() => {
    if (!id) return
    setLoading(true)
    supabase
      .from('occasions')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setOccasion(data)
        setLoading(false)
      })
  }, [id])

  const loadParticipants = React.useCallback(async () => {
    if (!id) return
    const { data: rows } = await supabase.from('occasion_participants').select('*').eq('occasion_id', id)
    if (!rows || rows.length === 0) {
      setParticipants([])
      return
    }
    const { data: people } = await supabase
      .from('people')
      .select('*')
      .in('id', rows.map((r) => r.person_id))
    const peopleById = new Map((people ?? []).map((p) => [p.id, p]))
    setParticipants(rows.map((r) => ({ ...r, person: peopleById.get(r.person_id)! })).filter((p) => p.person))
  }, [id])

  const loadGroups = React.useCallback(() => {
    if (!networkId) return
    supabase
      .from('groups')
      .select('*')
      .eq('network_id', networkId)
      .then(({ data }) => setGroups(data ?? []))
  }, [networkId])

  const loadGroupBudgets = React.useCallback(() => {
    if (!id) return
    supabase
      .from('occasion_group_budgets')
      .select('*')
      .eq('occasion_id', id)
      .then(({ data }) => setGroupBudgets(data ?? []))
  }, [id])

  React.useEffect(loadOccasion, [loadOccasion])
  React.useEffect(() => {
    void loadParticipants()
  }, [loadParticipants])
  React.useEffect(loadGroups, [loadGroups])
  React.useEffect(loadGroupBudgets, [loadGroupBudgets])

  async function handleDuplicate() {
    if (!occasion || !networkId || !user) return
    const { data: newOccasion, error } = await supabase
      .from('occasions')
      .insert({
        network_id: networkId,
        created_by: user.id,
        name: occasion.name,
        type: occasion.type,
        date: addYears(occasion.date, 1),
        budget: occasion.budget,
        is_recurring_template: occasion.is_recurring_template,
      })
      .select('id')
      .single()

    if (error || !newOccasion) return

    if (participants.length > 0) {
      await supabase.from('occasion_participants').insert(participants.map((p) => ({ occasion_id: newOccasion.id, person_id: p.person_id })))
    }

    refreshOccasionList()
    navigate(`/occasions/${newOccasion.id}`)
  }

  async function handleDelete() {
    if (!occasion) return
    const { error } = await supabase.from('occasions').delete().eq('id', occasion.id)
    if (!error) {
      refreshOccasionList()
      navigate('/occasions')
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (error || !occasion) {
    return (
      <div className="space-y-4">
        <BackButton />
        <p className="text-sm text-destructive">{error ?? 'Occasion not found.'}</p>
      </div>
    )
  }

  const allocatedToIndividuals = participants.reduce((sum, p) => sum + (p.budget ?? 0), 0)
  const allocatedToGroups = groupBudgets.reduce((sum, g) => sum + g.budget, 0)
  const spent = 0
  const remaining = occasion.budget !== null ? occasion.budget - allocatedToIndividuals - allocatedToGroups : null

  const groupsInPlay = groups.filter(
    (g) => participants.some((p) => p.person.group_id === g.id) || groupBudgets.some((gb) => gb.group_id === g.id),
  )

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <BackButton />
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => void handleDuplicate()} aria-label="Duplicate for next year">
            <Copy />
          </Button>
          <DeleteOccasionButton occasionName={occasion.name} onConfirm={handleDelete} />
        </div>
      </div>

      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{occasion.name}</h1>
          <p className="text-muted-foreground">
            {formatMonthDay(occasion.date)}
            {occasion.is_recurring_template && ' · Recurs yearly'}
          </p>
        </div>
        <EditOccasionDialog occasion={occasion} onSaved={setOccasion} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Budget</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Budget" value={occasion.budget !== null ? money(occasion.budget) : '—'} />
          <Stat label="Allocated" value={money(allocatedToIndividuals + allocatedToGroups)} />
          <Stat label="Spent" value={money(spent)} note="Gift tracking coming later" />
          <Stat label="Remaining" value={remaining !== null ? money(remaining) : '—'} />
        </CardContent>
      </Card>

      <ParticipantsSection
        occasionId={occasion.id}
        networkId={networkId}
        participants={participants}
        onChange={() => void loadParticipants()}
      />

      {groupsInPlay.length > 0 && (
        <GroupBudgetsSection
          occasionId={occasion.id}
          groups={groupsInPlay}
          groupBudgets={groupBudgets}
          participants={participants}
          onChange={loadGroupBudgets}
        />
      )}
    </div>
  )
}

function BackButton() {
  const navigate = useNavigate()
  return (
    <Button variant="ghost" size="sm" onClick={() => navigate('/occasions')}>
      <ArrowLeft />
      Occasions
    </Button>
  )
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  )
}

function DeleteOccasionButton({ occasionName, onConfirm }: { occasionName: string; onConfirm: () => void }) {
  const [open, setOpen] = React.useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label="Delete occasion">
          <Trash2 />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {occasionName}?</DialogTitle>
          <DialogDescription>This removes the occasion, its participant list, and group budgets. This can't be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type OccasionFormValues = { name: string; type: string; date: string; budget: string; isRecurringTemplate: boolean }

function EditOccasionDialog({ occasion, onSaved }: { occasion: Occasion; onSaved: (o: Occasion) => void }) {
  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState<OccasionFormValues>({
    name: occasion.name,
    type: occasion.type,
    date: occasion.date,
    budget: occasion.budget?.toString() ?? '',
    isRecurringTemplate: occasion.is_recurring_template,
  })
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  function openDialog() {
    setForm({
      name: occasion.name,
      type: occasion.type,
      date: occasion.date,
      budget: occasion.budget?.toString() ?? '',
      isRecurringTemplate: occasion.is_recurring_template,
    })
    setError(null)
    setOpen(true)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const name = form.name.trim()
    if (!name) {
      setError('Name is required.')
      return
    }
    if (!form.date || !parseDateOnly(form.date)) {
      setError('Enter a valid date.')
      return
    }
    const budget = form.budget.trim() ? Number(form.budget) : null
    if (budget !== null && (Number.isNaN(budget) || budget < 0)) {
      setError('Budget must be a positive number.')
      return
    }

    setSaving(true)
    setError(null)
    const { data, error } = await supabase
      .from('occasions')
      .update({ name, type: form.type.trim() || 'custom', date: form.date, budget, is_recurring_template: form.isRecurringTemplate })
      .eq('id', occasion.id)
      .select('*')
      .single()
    setSaving(false)

    if (error || !data) {
      setError(error?.message ?? 'Something went wrong.')
      return
    }
    onSaved(data)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" onClick={openDialog} aria-label="Edit occasion">
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit occasion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_occasion_name">Name</Label>
              <Input id="edit_occasion_name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_occasion_type">Type</Label>
              <Input id="edit_occasion_type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_occasion_date">Date</Label>
              <Input id="edit_occasion_date" type="date" required value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_occasion_budget">Overall budget</Label>
              <Input
                id="edit_occasion_budget"
                type="number"
                min="0"
                step="0.01"
                value={form.budget}
                onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isRecurringTemplate}
                onChange={(e) => setForm((f) => ({ ...f, isRecurringTemplate: e.target.checked }))}
              />
              Recurs every year
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ParticipantsSection({
  occasionId,
  networkId,
  participants,
  onChange,
}: {
  occasionId: string
  networkId: string | null
  participants: Participant[]
  onChange: () => void
}) {
  const [addOpen, setAddOpen] = React.useState(false)
  const [candidates, setCandidates] = React.useState<Person[]>([])
  const [budgetDrafts, setBudgetDrafts] = React.useState<Record<string, string>>({})

  function openAddDialog() {
    if (!networkId) return
    supabase
      .from('people')
      .select('*')
      .eq('network_id', networkId)
      .order('full_name', { ascending: true })
      .then(({ data }) => setCandidates((data ?? []).filter((p) => !participants.some((part) => part.person_id === p.id))))
    setAddOpen(true)
  }

  async function addParticipant(personId: string, budget: string) {
    const parsedBudget = budget.trim() ? Number(budget) : null
    await supabase.from('occasion_participants').insert({
      occasion_id: occasionId,
      person_id: personId,
      budget: parsedBudget !== null && !Number.isNaN(parsedBudget) ? parsedBudget : null,
    })
    onChange()
  }

  async function removeParticipant(id: string) {
    await supabase.from('occasion_participants').delete().eq('id', id)
    onChange()
  }

  async function saveBudget(participantId: string) {
    const raw = budgetDrafts[participantId]
    const parsed = raw?.trim() ? Number(raw) : null
    await supabase
      .from('occasion_participants')
      .update({ budget: parsed !== null && !Number.isNaN(parsed) ? parsed : null })
      .eq('id', participantId)
    onChange()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Participants</CardTitle>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={openAddDialog}>
              <Plus />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add participant</DialogTitle>
              <DialogDescription>Optionally set a per-person budget — you can also skip it and rely on a group budget.</DialogDescription>
            </DialogHeader>
            <div className="max-h-80 space-y-2 overflow-y-auto py-2">
              {candidates.length === 0 && <p className="text-sm text-muted-foreground">Everyone's already added, or you have no people yet.</p>}
              {candidates.map((person) => (
                <AddCandidateRow key={person.id} person={person} onAdd={(budget) => void addParticipant(person.id, budget).then(() => setAddOpen(false))} />
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-2">
        {participants.length === 0 && <p className="text-sm text-muted-foreground">No participants yet.</p>}
        {participants.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
            <Avatar className="size-9 shrink-0">
              {p.person.avatar_url && <AvatarImage src={p.person.avatar_url} alt={p.person.full_name} />}
              <AvatarFallback>{getInitials(p.person.full_name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{p.person.full_name}</p>
              {p.person.relationship && <p className="truncate text-xs text-muted-foreground">{p.person.relationship}</p>}
            </div>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="Budget"
              className="w-16 shrink-0 sm:w-24"
              value={budgetDrafts[p.id] ?? p.budget?.toString() ?? ''}
              onChange={(e) => setBudgetDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
              onBlur={() => void saveBudget(p.id)}
            />
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => void removeParticipant(p.id)}
              aria-label={`Remove ${p.person.full_name}`}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function AddCandidateRow({ person, onAdd }: { person: Person; onAdd: (budget: string) => void }) {
  const [budget, setBudget] = React.useState('')
  return (
    <div className="flex items-center gap-2 rounded-md border px-3 py-2">
      <span className="min-w-0 flex-1 truncate text-sm">{person.full_name}</span>
      <Input type="number" min="0" step="0.01" placeholder="Budget (optional)" className="w-32" value={budget} onChange={(e) => setBudget(e.target.value)} />
      <Button type="button" size="sm" onClick={() => onAdd(budget)}>
        Add
      </Button>
    </div>
  )
}

function GroupBudgetsSection({
  occasionId,
  groups,
  groupBudgets,
  participants,
  onChange,
}: {
  occasionId: string
  groups: Group[]
  groupBudgets: GroupBudget[]
  participants: Participant[]
  onChange: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4" />
          Group Budgets
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {groups.map((group) => {
          const existing = groupBudgets.find((gb) => gb.group_id === group.id)
          const individualAllocated = participants
            .filter((p) => p.person.group_id === group.id)
            .reduce((sum, p) => sum + (p.budget ?? 0), 0)
          return (
            <GroupBudgetRow
              key={group.id}
              occasionId={occasionId}
              group={group}
              existing={existing}
              individualAllocated={individualAllocated}
              onChange={onChange}
            />
          )
        })}
      </CardContent>
    </Card>
  )
}

function GroupBudgetRow({
  occasionId,
  group,
  existing,
  individualAllocated,
  onChange,
}: {
  occasionId: string
  group: Group
  existing: GroupBudget | undefined
  individualAllocated: number
  onChange: () => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(existing?.budget.toString() ?? '')

  async function save() {
    const parsed = Number(draft)
    if (Number.isNaN(parsed) || parsed < 0) return
    if (existing) {
      await supabase.from('occasion_group_budgets').update({ budget: parsed }).eq('id', existing.id)
    } else {
      await supabase.from('occasion_group_budgets').insert({ occasion_id: occasionId, group_id: group.id, budget: parsed })
    }
    setEditing(false)
    onChange()
  }

  return (
    <div className="rounded-md border px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{group.name}</p>
        {editing ? (
          <div className="flex items-center gap-2">
            <Input type="number" min="0" step="0.01" className="w-24" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
            <Button size="sm" onClick={() => void save()}>
              Save
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            {existing ? money(existing.budget) : 'Set budget'}
          </Button>
        )}
      </div>
      <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
        <span>Allocated to individuals: {money(individualAllocated)}</span>
        <span>Spent: {money(0)}</span>
      </div>
    </div>
  )
}
