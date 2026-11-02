import { Cake, Check, Plus } from 'lucide-react'
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
import { isSpentStatus } from '@/gifts/gift-status'
import { usePrimaryNetwork } from '@/hooks/use-primary-network'
import { daysUntilNextBirthday, formatMonthDay, parseDateOnly } from '@/lib/date-utils'
import { formatMoney } from '@/lib/money'
import { supabase } from '@/lib/supabase'
import { getInitials } from '@/lib/utils'
import type { Database } from '@/lib/database.types'
import { useOccasions } from '@/occasions/occasion-context'

type Person = Database['public']['Tables']['people']['Row']
type Occasion = Database['public']['Tables']['occasions']['Row']
type OccasionParticipant = Database['public']['Tables']['occasion_participants']['Row']
type GiftRow = Database['public']['Tables']['gifts']['Row']

const BIRTHDAY_LOOKAHEAD_DAYS = 60

type PersonOccasionSummary = {
  occasionId: string
  occasionName: string
  totalGifts: number
  purchasedGifts: number
  spent: number
  budget: number | null
}

// Per person, per occasion that actually has gifts listed for them (being a
// participant with zero gifts added yet doesn't show): gift counts and
// spend vs. their individual budget for that occasion
// (occasion_participants.budget — not the occasion's overall shared
// budget, which isn't person-specific).
function buildPersonOccasionSummaries(
  occasions: Occasion[],
  participants: OccasionParticipant[],
  gifts: GiftRow[],
): Map<string, PersonOccasionSummary[]> {
  const byPerson = new Map<string, PersonOccasionSummary[]>()

  for (const occasion of occasions) {
    const occasionParticipants = participants.filter((p) => p.occasion_id === occasion.id)
    for (const participant of occasionParticipants) {
      const occasionGifts = gifts.filter((g) => g.person_id === participant.person_id && g.occasion_id === occasion.id)
      if (occasionGifts.length === 0) continue

      const summary: PersonOccasionSummary = {
        occasionId: occasion.id,
        occasionName: occasion.name,
        totalGifts: occasionGifts.length,
        purchasedGifts: occasionGifts.filter((g) => isSpentStatus(g.status)).length,
        spent: occasionGifts.filter((g) => isSpentStatus(g.status)).reduce((sum, g) => sum + (g.price ?? 0), 0),
        budget: participant.budget,
      }
      const list = byPerson.get(participant.person_id) ?? []
      list.push(summary)
      byPerson.set(participant.person_id, list)
    }
  }

  return byPerson
}

type NewPersonValues = { full_name: string; relationship: string; birthday: string }
const EMPTY_FORM: NewPersonValues = { full_name: '', relationship: '', birthday: '' }

export function PeoplePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { networkId, loading: networkLoading, error: networkError } = usePrimaryNetwork()
  const { selectedOccasion } = useOccasions()

  const [people, setPeople] = React.useState<Person[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [participantIds, setParticipantIds] = React.useState<Set<string>>(new Set())

  const [occasions, setOccasions] = React.useState<Occasion[]>([])
  const [allParticipants, setAllParticipants] = React.useState<OccasionParticipant[]>([])
  const [gifts, setGifts] = React.useState<GiftRow[]>([])

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

  React.useEffect(() => {
    if (!networkId) return
    supabase
      .from('occasions')
      .select('*')
      .eq('network_id', networkId)
      .order('date', { ascending: true })
      .then(({ data }) => setOccasions(data ?? []))
    supabase
      .from('gifts')
      .select('*')
      .eq('network_id', networkId)
      .then(({ data }) => setGifts(data ?? []))
  }, [networkId])

  React.useEffect(() => {
    if (occasions.length === 0) {
      setAllParticipants([])
      return
    }
    supabase
      .from('occasion_participants')
      .select('*')
      .in(
        'occasion_id',
        occasions.map((o) => o.id),
      )
      .then(({ data }) => setAllParticipants(data ?? []))
  }, [occasions])

  const personOccasionSummaries = React.useMemo(
    () => buildPersonOccasionSummaries(occasions, allParticipants, gifts),
    [occasions, allParticipants, gifts],
  )

  React.useEffect(() => {
    if (!selectedOccasion) {
      setParticipantIds(new Set())
      return
    }
    supabase
      .from('occasion_participants')
      .select('person_id')
      .eq('occasion_id', selectedOccasion.id)
      .then(({ data }) => setParticipantIds(new Set((data ?? []).map((r) => r.person_id))))
  }, [selectedOccasion])

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

      {selectedOccasion && (
        <p className="text-sm text-muted-foreground">
          Showing who's already added to <span className="font-medium text-foreground">{selectedOccasion.name}</span>.
        </p>
      )}

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
          const occasionSummaries = personOccasionSummaries.get(person.id) ?? []

          return (
            <Card
              key={person.id}
              className="cursor-pointer transition-colors hover:bg-accent/40"
              onClick={() => navigate(`/people/${person.id}`)}
            >
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Avatar className="size-12">
                    {person.avatar_url && <AvatarImage src={person.avatar_url} alt={person.full_name} />}
                    <AvatarFallback>{getInitials(person.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{person.full_name}</p>
                    {person.relationship && <p className="truncate text-sm text-muted-foreground">{person.relationship}</p>}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {showBirthday && (
                        <Badge variant="secondary">
                          <Cake />
                          {daysUntil === 0 ? 'Birthday today!' : `Birthday in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`}
                          {' · '}
                          {formatMonthDay(person.birthday!)}
                        </Badge>
                      )}
                      {selectedOccasion && participantIds.has(person.id) && (
                        <Badge variant="outline">
                          <Check />
                          Added
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {occasionSummaries.length > 0 && (
                  <div className="space-y-1 border-t pt-2 text-xs">
                    {occasionSummaries.map((summary) => (
                      <div key={summary.occasionId} className="flex items-center justify-between gap-2">
                        <span className="truncate text-muted-foreground">{summary.occasionName}</span>
                        <span className="shrink-0 font-medium">
                          {summary.purchasedGifts}/{summary.totalGifts} purchased
                          {' · '}
                          {summary.budget !== null
                            ? `${formatMoney(summary.spent)}/${formatMoney(summary.budget)}`
                            : `${formatMoney(summary.spent)} spent`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
