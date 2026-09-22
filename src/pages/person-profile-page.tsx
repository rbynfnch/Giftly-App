import { ArrowLeft, Camera, Gift, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
import { Textarea } from '@/components/ui/textarea'
import { daysUntilNextBirthday, formatMonthDay, parseDateOnly } from '@/lib/date-utils'
import { deletePersonAvatars, uploadPersonAvatar } from '@/lib/avatar-storage'
import { supabase } from '@/lib/supabase'
import { getInitials } from '@/lib/utils'
import type { Database } from '@/lib/database.types'

type Person = Database['public']['Tables']['people']['Row']
type PersonAttribute = Database['public']['Tables']['person_attributes']['Row']

const DEFAULT_CATEGORIES = ['Clothing Sizes', 'Preferences']

export function PersonProfilePage() {
  const { id } = useParams<{ id: string }>()

  const [person, setPerson] = React.useState<Person | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [attributes, setAttributes] = React.useState<PersonAttribute[]>([])
  const [attributesLoading, setAttributesLoading] = React.useState(true)

  const loadPerson = React.useCallback(() => {
    if (!id) return
    setLoading(true)
    supabase
      .from('people')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setPerson(data)
        setLoading(false)
      })
  }, [id])

  const loadAttributes = React.useCallback(() => {
    if (!id) return
    setAttributesLoading(true)
    supabase
      .from('person_attributes')
      .select('*')
      .eq('person_id', id)
      .order('category', { ascending: true })
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error) setAttributes(data ?? [])
        setAttributesLoading(false)
      })
  }, [id])

  React.useEffect(loadPerson, [loadPerson])
  React.useEffect(loadAttributes, [loadAttributes])

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (error || !person) {
    return (
      <div className="space-y-4">
        <BackButton />
        <p className="text-sm text-destructive">{error ?? 'Person not found.'}</p>
      </div>
    )
  }

  const daysUntil = person.birthday ? daysUntilNextBirthday(person.birthday) : null

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <BackButton />
        <DeletePersonButton person={person} />
      </div>

      <div className="flex items-center gap-4">
        <AvatarUploader person={person} onUploaded={(url) => setPerson({ ...person, avatar_url: url })} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold">{person.full_name}</h1>
          {person.relationship && <p className="text-muted-foreground">{person.relationship}</p>}
          {person.birthday && (
            <p className="text-sm text-muted-foreground">
              {formatMonthDay(person.birthday)}
              {daysUntil !== null && daysUntil <= 60 && (
                <> · {daysUntil === 0 ? 'today!' : `in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`}</>
              )}
            </p>
          )}
        </div>
        <EditPersonDialog person={person} onSaved={setPerson} />
      </div>

      {person.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">{person.notes}</CardContent>
        </Card>
      )}

      <InterestsEditor person={person} onChange={setPerson} />

      <AttributesSection personId={person.id} attributes={attributes} loading={attributesLoading} onChange={loadAttributes} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gift History</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
          <Gift className="size-8" />
          <p className="text-sm">Gift tracking is coming in a later phase.</p>
        </CardContent>
      </Card>
    </div>
  )
}

function BackButton() {
  const navigate = useNavigate()
  return (
    <Button variant="ghost" size="sm" onClick={() => navigate('/people')}>
      <ArrowLeft />
      People
    </Button>
  )
}

function AvatarUploader({ person, onUploaded }: { person: Person; onUploaded: (url: string) => void }) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setUploading(true)
    setError(null)
    try {
      const url = await uploadPersonAvatar(person.network_id, person.id, file)
      const { error } = await supabase.from('people').update({ avatar_url: url }).eq('id', person.id)
      if (error) throw error
      onUploaded(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        className="relative size-20 shrink-0 rounded-full"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Change photo"
      >
        <Avatar className="size-20 text-lg">
          {person.avatar_url && <AvatarImage src={person.avatar_url} alt={person.full_name} />}
          <AvatarFallback>{getInitials(person.full_name)}</AvatarFallback>
        </Avatar>
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-white opacity-0 transition-opacity hover:bg-black/40 hover:opacity-100">
          {uploading ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      {error && <p className="max-w-24 text-center text-xs text-destructive">{error}</p>}
    </div>
  )
}

type PersonFormValues = { full_name: string; relationship: string; birthday: string; notes: string }

function EditPersonDialog({ person, onSaved }: { person: Person; onSaved: (person: Person) => void }) {
  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState<PersonFormValues>({
    full_name: person.full_name,
    relationship: person.relationship ?? '',
    birthday: person.birthday ?? '',
    notes: person.notes ?? '',
  })
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  function openDialog() {
    setForm({
      full_name: person.full_name,
      relationship: person.relationship ?? '',
      birthday: person.birthday ?? '',
      notes: person.notes ?? '',
    })
    setError(null)
    setOpen(true)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const fullName = form.full_name.trim()
    if (!fullName) {
      setError('Name is required.')
      return
    }
    if (form.birthday && !parseDateOnly(form.birthday)) {
      setError('Enter a valid birthday.')
      return
    }

    setSaving(true)
    setError(null)
    const { data, error } = await supabase
      .from('people')
      .update({
        full_name: fullName,
        relationship: form.relationship.trim() || null,
        birthday: form.birthday || null,
        notes: form.notes.trim() || null,
      })
      .eq('id', person.id)
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
        <Button variant="outline" size="icon" onClick={openDialog} aria-label="Edit details">
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit details</DialogTitle>
            <DialogDescription>Update the basics for {person.full_name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_full_name">Name</Label>
              <Input
                id="edit_full_name"
                required
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_relationship">Relationship</Label>
              <Input
                id="edit_relationship"
                value={form.relationship}
                onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_birthday">Birthday</Label>
              <Input
                id="edit_birthday"
                type="date"
                value={form.birthday}
                onChange={(e) => setForm((f) => ({ ...f, birthday: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_notes">Notes</Label>
              <Textarea
                id="edit_notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving || !form.full_name.trim()}>
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function InterestsEditor({ person, onChange }: { person: Person; onChange: (person: Person) => void }) {
  const [draft, setDraft] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  async function persist(interests: string[]) {
    setSaving(true)
    const { data, error } = await supabase.from('people').update({ interests }).eq('id', person.id).select('*').single()
    setSaving(false)
    if (!error && data) onChange(data)
  }

  function addInterest() {
    const tag = draft.trim()
    if (!tag || person.interests.includes(tag)) {
      setDraft('')
      return
    }
    setDraft('')
    void persist([...person.interests, tag])
  }

  function removeInterest(tag: string) {
    void persist(person.interests.filter((t) => t !== tag))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Interests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {person.interests.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
              <button type="button" onClick={() => removeInterest(tag)} aria-label={`Remove ${tag}`}>
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          {person.interests.length === 0 && <p className="text-sm text-muted-foreground">No interests added yet.</p>}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add an interest and press Enter"
            value={draft}
            disabled={saving}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addInterest()
              }
            }}
          />
          <Button type="button" variant="outline" onClick={addInterest} disabled={saving || !draft.trim()}>
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

type AttributeFormValues = { category: string; label: string; value: string }
const EMPTY_ATTRIBUTE_FORM: AttributeFormValues = { category: DEFAULT_CATEGORIES[0], label: '', value: '' }

function AttributesSection({
  personId,
  attributes,
  loading,
  onChange,
}: {
  personId: string
  attributes: PersonAttribute[]
  loading: boolean
  onChange: () => void
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<AttributeFormValues>(EMPTY_ATTRIBUTE_FORM)
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  const categoryOptions = React.useMemo(() => {
    const used = attributes.map((a) => a.category)
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...used]))
  }, [attributes])

  const grouped = React.useMemo(() => {
    const map = new Map<string, PersonAttribute[]>()
    for (const attr of attributes) {
      const list = map.get(attr.category) ?? []
      list.push(attr)
      map.set(attr.category, list)
    }
    return map
  }, [attributes])

  function openAddDialog() {
    setEditingId(null)
    setForm(EMPTY_ATTRIBUTE_FORM)
    setError(null)
    setDialogOpen(true)
  }

  function openEditDialog(attr: PersonAttribute) {
    setEditingId(attr.id)
    setForm({ category: attr.category, label: attr.label, value: attr.value })
    setError(null)
    setDialogOpen(true)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const category = form.category.trim() || 'Other'
    const label = form.label.trim()
    const value = form.value.trim()
    if (!label || !value) {
      setError('Label and value are both required.')
      return
    }

    setSaving(true)
    setError(null)

    const { error } = editingId
      ? await supabase.from('person_attributes').update({ category, label, value }).eq('id', editingId)
      : await supabase.from('person_attributes').insert({ person_id: personId, category, label, value, created_by: (await supabase.auth.getUser()).data.user!.id })

    setSaving(false)

    if (error) {
      setError(error.message)
      return
    }
    setDialogOpen(false)
    onChange()
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('person_attributes').delete().eq('id', id)
    if (!error) onChange()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Custom Attributes</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={openAddDialog}>
              <Plus />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit attribute' : 'Add attribute'}</DialogTitle>
                <DialogDescription>e.g. "Ring size" → "7", grouped under a category like Clothing Sizes.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="attr_category">Category</Label>
                  <Input
                    id="attr_category"
                    list="attribute-categories"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  />
                  <datalist id="attribute-categories">
                    {categoryOptions.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attr_label">Label</Label>
                  <Input
                    id="attr_label"
                    placeholder="Ring size"
                    required
                    value={form.label}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attr_value">Value</Label>
                  <Input
                    id="attr_value"
                    placeholder="7"
                    required
                    value={form.value}
                    onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {editingId ? 'Save changes' : 'Add attribute'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && attributes.length === 0 && (
          <p className="text-sm text-muted-foreground">No custom attributes yet — add sizes, preferences, or anything else.</p>
        )}
        {Array.from(grouped.entries()).map(([category, items]) => (
          <div key={category} className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{category}</p>
            <div className="space-y-1">
              {items.map((attr) => (
                <div key={attr.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="min-w-0">
                    <span className="font-medium">{attr.label}</span>
                    <span className="text-muted-foreground"> — {attr.value}</span>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(attr)} aria-label={`Edit ${attr.label}`}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => void handleDelete(attr.id)} aria-label={`Delete ${attr.label}`}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function DeletePersonButton({ person }: { person: Person }) {
  const navigate = useNavigate()
  const [open, setOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  async function handleDelete() {
    setDeleting(true)
    await deletePersonAvatars(person.network_id, person.id)
    const { error } = await supabase.from('people').delete().eq('id', person.id)
    setDeleting(false)
    if (!error) navigate('/people')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label="Delete person">
          <Trash2 />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {person.full_name}?</DialogTitle>
          <DialogDescription>
            This removes their profile, custom attributes, and photo. This can't be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
