import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import { GIFT_STATUSES, GIFT_STATUS_LABELS, type GiftStatus } from '@/gifts/gift-status'

type Gift = Database['public']['Tables']['gifts']['Row']
type GiftBundle = Database['public']['Tables']['gift_bundles']['Row']
type Person = Database['public']['Tables']['people']['Row']
type Occasion = Database['public']['Tables']['occasions']['Row']

type Mode =
  | { kind: 'person'; person: Person; occasions: Occasion[]; bundles: GiftBundle[] }
  | { kind: 'occasion'; occasion: Occasion; people: Person[] }
  | { kind: 'global'; people: Person[]; occasions: Occasion[] }

type FormValues = {
  title: string
  status: GiftStatus
  price: string
  url: string
  notes: string
  personId: string
  occasionId: string
  bundleName: string
  store: string
  category: string
}

// Best-effort guess at a store name from a product URL's hostname, e.g.
// "https://www.amazon.com/..." -> "Amazon". Never blocks saving - just a
// nicety the user can always override.
function guessStoreFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    const name = host.split('.')[0]
    return name.charAt(0).toUpperCase() + name.slice(1)
  } catch {
    return ''
  }
}

function emptyForm(mode: Mode, initialValues?: { title?: string; url?: string }): FormValues {
  return {
    title: initialValues?.title ?? '',
    status: 'idea',
    price: '',
    url: initialValues?.url ?? '',
    notes: '',
    personId: mode.kind === 'occasion' ? (mode.people[0]?.id ?? '') : '',
    occasionId: '',
    bundleName: '',
    store: initialValues?.url ? guessStoreFromUrl(initialValues.url) : '',
    category: '',
  }
}

function formFromGift(gift: Gift, mode: Mode): FormValues {
  const bundleName = mode.kind === 'person' ? (mode.bundles.find((b) => b.id === gift.bundle_id)?.name ?? '') : ''
  return {
    title: gift.title,
    status: gift.status,
    price: gift.price?.toString() ?? '',
    url: gift.url ?? '',
    notes: gift.notes ?? '',
    personId: gift.person_id,
    occasionId: gift.occasion_id ?? '',
    bundleName,
    store: gift.store ?? '',
    category: gift.category ?? '',
  }
}

export function GiftDialog({
  open,
  onOpenChange,
  networkId,
  userId,
  mode,
  gift,
  initialValues,
  storeOptions,
  categoryOptions,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  networkId: string
  userId: string
  mode: Mode
  gift?: Gift
  initialValues?: { title?: string; url?: string }
  storeOptions?: string[]
  categoryOptions?: string[]
  onSaved: () => void
}) {
  const [form, setForm] = React.useState<FormValues>(() => (gift ? formFromGift(gift, mode) : emptyForm(mode, initialValues)))
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setForm(gift ? formFromGift(gift, mode) : emptyForm(mode, initialValues))
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, gift?.id])

  async function resolveBundleId(personId: string, occasionId: string | null): Promise<string | null> {
    if (mode.kind !== 'person') return null
    const name = form.bundleName.trim()
    if (!name) return null

    const existing = mode.bundles.find((b) => b.name.toLowerCase() === name.toLowerCase())
    if (existing) return existing.id

    const { data, error } = await supabase
      .from('gift_bundles')
      .insert({ network_id: networkId, person_id: personId, occasion_id: occasionId, name, created_by: userId })
      .select('id')
      .single()
    if (error || !data) throw error ?? new Error('Could not create bundle.')
    return data.id
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const title = form.title.trim()
    if (!title) {
      setError('Title is required.')
      return
    }
    const price = form.price.trim() ? Number(form.price) : null
    if (price !== null && (Number.isNaN(price) || price < 0)) {
      setError('Price must be a positive number.')
      return
    }

    const personId = mode.kind === 'person' ? mode.person.id : form.personId
    if (!personId) {
      setError('Choose who this gift is for.')
      return
    }
    const occasionId = mode.kind === 'occasion' ? mode.occasion.id : form.occasionId || null

    setSaving(true)
    setError(null)

    try {
      const bundleId = await resolveBundleId(personId, occasionId)

      const payload = {
        network_id: networkId,
        person_id: personId,
        occasion_id: occasionId,
        bundle_id: bundleId,
        title,
        status: form.status,
        price,
        url: form.url.trim() || null,
        notes: form.notes.trim() || null,
        store: form.store.trim() || null,
        category: form.category.trim() || null,
      }

      const { error } = gift
        ? await supabase.from('gifts').update(payload).eq('id', gift.id)
        : await supabase.from('gifts').insert({ ...payload, created_by: userId })

      if (error) throw error

      onOpenChange(false)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{gift ? 'Edit gift' : 'Add gift'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="gift_title">Title</Label>
              <Input
                id="gift_title"
                required
                placeholder="Noise-cancelling headphones"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            {(mode.kind === 'occasion' || mode.kind === 'global') && (
              <div className="space-y-2">
                <Label htmlFor="gift_person">For</Label>
                <select
                  id="gift_person"
                  required
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={form.personId}
                  onChange={(e) => setForm((f) => ({ ...f, personId: e.target.value }))}
                >
                  {mode.kind === 'global' && <option value="">Select a person</option>}
                  {mode.people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="gift_status">Status</Label>
              <select
                id="gift_status"
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as GiftStatus }))}
              >
                {GIFT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {GIFT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gift_price">Price</Label>
              <Input
                id="gift_price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gift_url">Link</Label>
              <Input
                id="gift_url"
                type="url"
                placeholder="https://..."
                value={form.url}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    url: e.target.value,
                    store: f.store ? f.store : guessStoreFromUrl(e.target.value),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gift_store">Store (optional)</Label>
              <Input
                id="gift_store"
                list="gift-store-names"
                placeholder="e.g. Amazon"
                value={form.store}
                onChange={(e) => setForm((f) => ({ ...f, store: e.target.value }))}
              />
              <datalist id="gift-store-names">
                {(storeOptions ?? []).map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gift_category">Category (optional)</Label>
              <Input
                id="gift_category"
                list="gift-category-names"
                placeholder="e.g. Books, Games, Clothes, Toys"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              />
              <datalist id="gift-category-names">
                {(categoryOptions ?? []).map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            {(mode.kind === 'person' || mode.kind === 'global') && (
              <div className="space-y-2">
                <Label htmlFor="gift_occasion">Occasion (optional)</Label>
                <select
                  id="gift_occasion"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={form.occasionId}
                  onChange={(e) => setForm((f) => ({ ...f, occasionId: e.target.value }))}
                >
                  <option value="">No occasion</option>
                  {mode.occasions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {mode.kind === 'person' && (
              <div className="space-y-2">
                <Label htmlFor="gift_bundle">Bundle (optional)</Label>
                <Input
                  id="gift_bundle"
                  list="gift-bundle-names"
                  placeholder="e.g. Spa Day Bundle"
                  value={form.bundleName}
                  onChange={(e) => setForm((f) => ({ ...f, bundleName: e.target.value }))}
                />
                <datalist id="gift-bundle-names">
                  {mode.bundles.map((b) => (
                    <option key={b.id} value={b.name} />
                  ))}
                </datalist>
                <p className="text-xs text-muted-foreground">Group gifts given together under one name.</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="gift_notes">Notes</Label>
              <Textarea id="gift_notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {gift ? 'Save changes' : 'Add gift'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
