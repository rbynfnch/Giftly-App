import { Cake, Plus } from 'lucide-react'
import * as React from 'react'
import { useNavigate } from 'react-router-dom'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/auth/auth-provider'
import { usePrimaryNetwork } from '@/hooks/use-primary-network'
import { daysUntilNextBirthday, formatMonthDay, parseDateOnly } from '@/lib/date-utils'
import { supabase } from '@/lib/supabase'
import { getInitials } from '@/lib/utils'
import type { Database } from '@/lib/database.types'

type Person = Database['public']['Tables']['people']['Row']

const BIRTHDAY_LOOKAHEAD_DAYS = 60

type NewPersonValues = { full_name: string; relationship: string; birthday: string }
const EMPTY_FORM: NewPersonValues = { full_name: '', relationship: '', birthday: '' }

export function PeoplePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { networkId, loading: networkLoading, error: networkError } = usePrimaryNetwork()

  const [people, setPeople] = React.useState<Person[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [form, setForm] = React.useState<NewPersonValues>(EMPTY_FORM)
  const [formError, setFormError] = React.useState<string | null>(null)
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
    setForm(EMPTY_FORM)
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!networkId || !user) return

    const fullName = form.full_name.trim()
    if (!fullName) {
      setFormError('Name is required.')
      return
    }
    if (form.birthday && !parseDateOnly(form.birthday)) {
      setFormError('Enter a valid birthday.')
      return
    }

    setSaving(true)
    setFormError(null)

    const { data, error } = await supabase
      .from('people')
      .insert({
        network_id: networkId,
        created_by: user.id,
        full_name: fullName,
        relationship: form.relationship.trim() || null,
        birthday: form.birthday || null,
      })
      .select('id')
      .single()

    setSaving(false)

    if (error || !data) {
      setFormError(error?.message ?? 'Something went wrong.')
      return
    }

    setDialogOpen(false)
    navigate(`/people/${data.id}`)
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
                <DialogTitle>Add person</DialogTitle>
                <DialogDescription>
                  Add the basics now — you can add a photo, interests, and other details on their profile next.
                </DialogDescription>
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
                {formError && <p className="text-sm text-destructive">{formError}</p>}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving || !form.full_name.trim()}>
                  Add person
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {(networkError || error) && <p className="text-sm text-destructive">{networkError ?? error}</p>}

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
        {people.map((person) => {
          const daysUntil = person.birthday ? daysUntilNextBirthday(person.birthday) : null
          const showBirthday = daysUntil !== null && daysUntil <= BIRTHDAY_LOOKAHEAD_DAYS

          return (
            <Card
              key={person.id}
              className="cursor-pointer transition-colors hover:bg-accent/40"
              onClick={() => navigate(`/people/${person.id}`)}
            >
              <CardContent className="flex items-center gap-3">
                <Avatar className="size-12">
                  {person.avatar_url && <AvatarImage src={person.avatar_url} alt={person.full_name} />}
                  <AvatarFallback>{getInitials(person.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{person.full_name}</p>
                  {person.relationship && <p className="truncate text-sm text-muted-foreground">{person.relationship}</p>}
                  {showBirthday && (
                    <Badge variant="secondary" className="mt-1">
                      <Cake />
                      {daysUntil === 0 ? 'Birthday today!' : `Birthday in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`}
                      {' · '}
                      {formatMonthDay(person.birthday!)}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
