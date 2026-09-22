import { MoreVertical, Plus } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/auth/auth-provider'
import { usePrimaryNetwork } from '@/hooks/use-primary-network'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type Person = Database['public']['Tables']['people']['Row']

type PersonFormValues = {
  full_name: string
  relationship: string
  birthday: string
  notes: string
}

const EMPTY_FORM: PersonFormValues = { full_name: '', relationship: '', birthday: '', notes: '' }

export function PeoplePage() {
  const { user } = useAuth()
  const { networkId, loading: networkLoading, error: networkError } = usePrimaryNetwork()

  const [people, setPeople] = React.useState<Person[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<PersonFormValues>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)

  const loadPeople = React.useCallback(() => {
    if (!networkId) return
    setLoading(true)
    supabase
      .from('people')
      .select('*')
      .order('full_name', { ascending: true })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setPeople(data ?? [])
        setLoading(false)
      })
  }, [networkId])

  React.useEffect(() => {
    if (networkId) loadPeople()
  }, [networkId, loadPeople])

  function openAddDialog() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEditDialog(person: Person) {
    setEditingId(person.id)
    setForm({
      full_name: person.full_name,
      relationship: person.relationship ?? '',
      birthday: person.birthday ?? '',
      notes: person.notes ?? '',
    })
    setDialogOpen(true)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!networkId || !user) return
    setSaving(true)
    setError(null)

    const payload = {
      full_name: form.full_name.trim(),
      relationship: form.relationship.trim() || null,
      birthday: form.birthday || null,
      notes: form.notes.trim() || null,
    }

    const { error } = editingId
      ? await supabase.from('people').update(payload).eq('id', editingId)
      : await supabase.from('people').insert({ ...payload, network_id: networkId, created_by: user.id })

    if (error) {
      setError(error.message)
    } else {
      setDialogOpen(false)
      loadPeople()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('people').delete().eq('id', id)
    if (error) setError(error.message)
    else setPeople((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">People</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog} disabled={!networkId}>
              <Plus />
              Add person
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit person' : 'Add person'}</DialogTitle>
                <DialogDescription>Keep track of the people you gift for.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Name</Label>
                  <Input
                    id="full_name"
                    required
                    value={form.full_name}
                    onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="relationship">Relationship</Label>
                  <Input
                    id="relationship"
                    placeholder="Sister, Friend, Coworker..."
                    value={form.relationship}
                    onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthday">Birthday</Label>
                  <Input
                    id="birthday"
                    type="date"
                    value={form.birthday}
                    onChange={(e) => setForm((f) => ({ ...f, birthday: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    placeholder="Gift ideas, sizes, preferences..."
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving || !form.full_name.trim()}>
                  {editingId ? 'Save changes' : 'Add person'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {networkError && <p className="text-sm text-destructive">{networkError}</p>}

      {(networkLoading || loading) && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!networkLoading && !networkId && !networkError && (
        <p className="text-sm text-destructive">
          No network found for your account. Try signing out and back in, or contact support.
        </p>
      )}

      {!networkLoading && networkId && !loading && people.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No one here yet. Add the first person you're gifting for.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {people.map((person) => (
          <Card key={person.id}>
            <CardContent className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{person.full_name}</p>
                {person.relationship && <p className="text-sm text-muted-foreground">{person.relationship}</p>}
                {person.birthday && (
                  <p className="text-sm text-muted-foreground">
                    {new Date(person.birthday + 'T00:00:00').toLocaleDateString(undefined, {
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <MoreVertical />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => openEditDialog(person)}>Edit</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onSelect={() => void handleDelete(person.id)}>
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
