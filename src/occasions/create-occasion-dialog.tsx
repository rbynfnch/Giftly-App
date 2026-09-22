import { ArrowLeft } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/auth/auth-provider'
import { nextOccurrenceOfMonthDay, parseDateOnly } from '@/lib/date-utils'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import { useOccasions } from '@/occasions/occasion-context'
import { CUSTOM_PRESET, OCCASION_PRESETS, type OccasionPreset } from '@/occasions/occasion-presets'

type Person = Database['public']['Tables']['people']['Row']

type FormValues = { name: string; type: string; date: string; budget: string; isRecurringTemplate: boolean }
const EMPTY_FORM: FormValues = { name: '', type: 'custom', date: '', budget: '', isRecurringTemplate: false }

export function CreateOccasionDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (occasionId: string) => void
}) {
  const { user } = useAuth()
  const { networkId, refresh } = useOccasions()

  const [step, setStep] = React.useState<'preset' | 'person' | 'details'>('preset')
  const [people, setPeople] = React.useState<Person[]>([])
  const [form, setForm] = React.useState<FormValues>(EMPTY_FORM)
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  function reset() {
    setStep('preset')
    setForm(EMPTY_FORM)
    setError(null)
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  function choosePreset(preset: OccasionPreset) {
    if (preset.needsPerson) {
      setStep('person')
      if (networkId) {
        supabase
          .from('people')
          .select('*')
          .eq('network_id', networkId)
          .order('full_name', { ascending: true })
          .then(({ data }) => setPeople(data ?? []))
      }
      return
    }

    setForm({
      name: preset.label,
      type: preset.type,
      date: preset.prefillDate?.() ?? '',
      budget: '',
      isRecurringTemplate: preset.isRecurringTemplate,
    })
    setStep('details')
  }

  function choosePerson(person: Person) {
    const birthdayDate = person.birthday ? parseDateOnly(person.birthday) : null
    setForm({
      name: `${person.full_name}'s Birthday`,
      type: 'birthday',
      date: birthdayDate ? nextOccurrenceOfMonthDay(birthdayDate.getUTCMonth() + 1, birthdayDate.getUTCDate()) : '',
      budget: '',
      isRecurringTemplate: true,
    })
    setStep('details')
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!networkId || !user) return

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
      .insert({
        network_id: networkId,
        created_by: user.id,
        name,
        type: form.type.trim() || 'custom',
        date: form.date,
        budget,
        is_recurring_template: form.isRecurringTemplate,
      })
      .select('id')
      .single()
    setSaving(false)

    if (error || !data) {
      setError(error?.message ?? 'Something went wrong.')
      return
    }

    refresh()
    handleOpenChange(false)
    onCreated(data.id)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        {step === 'preset' && (
          <>
            <DialogHeader>
              <DialogTitle>New occasion</DialogTitle>
              <DialogDescription>Pick a common occasion, or start from scratch.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2 py-4 sm:grid-cols-3">
              {[...OCCASION_PRESETS, CUSTOM_PRESET].map((preset) => (
                <Button key={preset.id} type="button" variant="outline" onClick={() => choosePreset(preset)}>
                  {preset.label}
                </Button>
              ))}
            </div>
          </>
        )}

        {step === 'person' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="icon" onClick={() => setStep('preset')}>
                  <ArrowLeft />
                </Button>
                <DialogTitle>Whose birthday?</DialogTitle>
              </div>
              <DialogDescription>We'll prefill the date from their stored birthday, if you've added one.</DialogDescription>
            </DialogHeader>
            <div className="max-h-72 space-y-1 overflow-y-auto py-2">
              {people.length === 0 && <p className="text-sm text-muted-foreground">No people yet.</p>}
              {people.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  className="w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => choosePerson(person)}
                >
                  {person.full_name}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'details' && (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="icon" onClick={() => setStep('preset')}>
                  <ArrowLeft />
                </Button>
                <DialogTitle>Occasion details</DialogTitle>
              </div>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="occasion_name">Name</Label>
                <Input id="occasion_name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="occasion_type">Type</Label>
                <Input id="occasion_type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="occasion_date">Date</Label>
                <Input id="occasion_date" type="date" required value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="occasion_budget">Overall budget (optional)</Label>
                <Input
                  id="occasion_budget"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
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
                Create occasion
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
