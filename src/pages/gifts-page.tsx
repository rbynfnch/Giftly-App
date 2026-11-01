import { ExternalLink, Gift as GiftIcon, Package, Pencil, Plus, Trash2 } from 'lucide-react'
import * as React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/auth/auth-provider'
import { usePrimaryNetwork } from '@/hooks/use-primary-network'
import { formatMoney } from '@/lib/money'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import { GiftDialog } from '@/gifts/gift-dialog'
import { GIFT_STATUSES, GIFT_STATUS_LABELS, isSpentStatus } from '@/gifts/gift-status'
import { GiftStatusBadge } from '@/gifts/gift-status-badge'

type GiftRow = Database['public']['Tables']['gifts']['Row']
type Person = Database['public']['Tables']['people']['Row']
type Occasion = Database['public']['Tables']['occasions']['Row']
type GiftBundle = Database['public']['Tables']['gift_bundles']['Row']

type StatusFilter = 'all' | GiftRow['status']
type GroupBy = 'none' | 'occasion' | 'store'

function GiftRowView({
  gift,
  person,
  occasion,
  bundle,
  onEdit,
  onDelete,
  onStatusChanged,
}: {
  gift: GiftRow
  person: Person | undefined
  occasion: Occasion | undefined
  bundle: GiftBundle | undefined
  onEdit: (gift: GiftRow) => void
  onDelete: (id: string) => void
  onStatusChanged: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium">{gift.title}</span>
          <GiftStatusBadge giftId={gift.id} status={gift.status} onChanged={onStatusChanged} />
          {occasion && (
            <Badge variant="outline" className="text-muted-foreground">
              {occasion.name}
            </Badge>
          )}
          {bundle && (
            <Badge variant="outline" className="text-muted-foreground">
              <Package className="size-3" />
              {bundle.name}
            </Badge>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {person && <span>{person.full_name}</span>}
          {gift.store && <span>{gift.store}</span>}
          {gift.price !== null && <span>{formatMoney(gift.price)}</span>}
          {gift.url && (
            <a href={gift.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:underline">
              <ExternalLink className="size-3" />
              Link
            </a>
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="icon" onClick={() => onEdit(gift)} aria-label={`Edit ${gift.title}`}>
          <Pencil className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(gift.id)} aria-label={`Delete ${gift.title}`}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

export function GiftsPage() {
  const { user } = useAuth()
  const { networkId, loading: networkLoading, error: networkError } = usePrimaryNetwork()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const [gifts, setGifts] = React.useState<GiftRow[]>([])
  const [people, setPeople] = React.useState<Person[]>([])
  const [occasions, setOccasions] = React.useState<Occasion[]>([])
  const [bundles, setBundles] = React.useState<GiftBundle[]>([])
  const [loading, setLoading] = React.useState(false)
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all')
  const [groupBy, setGroupBy] = React.useState<GroupBy>('none')

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingGift, setEditingGift] = React.useState<GiftRow | undefined>(undefined)
  const [prefill, setPrefill] = React.useState<{ title?: string; url?: string } | undefined>(undefined)

  const loadAll = React.useCallback(() => {
    if (!networkId) return
    setLoading(true)
    Promise.all([
      supabase.from('gifts').select('*').eq('network_id', networkId).order('created_at', { ascending: false }),
      supabase.from('people').select('*').eq('network_id', networkId).order('full_name', { ascending: true }),
      supabase.from('occasions').select('*').eq('network_id', networkId).order('date', { ascending: true }),
      supabase.from('gift_bundles').select('*').eq('network_id', networkId),
    ]).then(([giftsRes, peopleRes, occasionsRes, bundlesRes]) => {
      setGifts(giftsRes.data ?? [])
      setPeople(peopleRes.data ?? [])
      setOccasions(occasionsRes.data ?? [])
      setBundles(bundlesRes.data ?? [])
      setLoading(false)
    })
  }, [networkId])

  React.useEffect(() => {
    if (networkId) loadAll()
  }, [networkId, loadAll])

  // Hand-off from the PWA share target (sharing a link from another app):
  // prefill the Add dialog with the shared title/url, then clear the query
  // string so refreshing doesn't reopen it.
  React.useEffect(() => {
    const sharedTitle = searchParams.get('title') ?? searchParams.get('text') ?? undefined
    const sharedUrl = searchParams.get('url') ?? undefined
    if (sharedTitle || sharedUrl) {
      setPrefill({ title: sharedTitle, url: sharedUrl })
      setEditingGift(undefined)
      setDialogOpen(true)
      setSearchParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const personById = React.useMemo(() => new Map(people.map((p) => [p.id, p])), [people])
  const occasionById = React.useMemo(() => new Map(occasions.map((o) => [o.id, o])), [occasions])
  const bundleById = React.useMemo(() => new Map(bundles.map((b) => [b.id, b])), [bundles])

  const filteredGifts = statusFilter === 'all' ? gifts : gifts.filter((g) => g.status === statusFilter)
  const totalSpent = gifts.filter((g) => isSpentStatus(g.status)).reduce((sum, g) => sum + (g.price ?? 0), 0)

  const storeOptions = React.useMemo(
    () => Array.from(new Set(gifts.map((g) => g.store).filter((s): s is string => !!s))).sort(),
    [gifts],
  )

  const groups = React.useMemo(() => {
    if (groupBy === 'none') return [{ label: null as string | null, gifts: filteredGifts }]

    const buckets = new Map<string, GiftRow[]>()
    for (const gift of filteredGifts) {
      const key =
        groupBy === 'occasion'
          ? (gift.occasion_id ? occasionById.get(gift.occasion_id)?.name : undefined) ?? 'No occasion'
          : gift.store ?? 'No store'
      const bucket = buckets.get(key)
      if (bucket) bucket.push(gift)
      else buckets.set(key, [gift])
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, gifts]) => ({ label, gifts }))
  }, [groupBy, filteredGifts, occasionById])

  function openAdd() {
    setEditingGift(undefined)
    setPrefill(undefined)
    setDialogOpen(true)
  }

  function openEdit(gift: GiftRow) {
    setEditingGift(gift)
    setPrefill(undefined)
    setDialogOpen(true)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('gifts').delete().eq('id', id)
    if (!error) loadAll()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Gifts</h1>
        <Button onClick={openAdd} disabled={!networkId || people.length === 0}>
          <Plus />
          Add
        </Button>
      </div>

      {(networkError || (!networkLoading && !networkId)) && (
        <p className="text-sm text-destructive">{networkError ?? 'No network found for your account.'}</p>
      )}

      {!networkLoading && networkId && people.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Add a person first, then you can start tracking gifts for them.{' '}
            <button type="button" className="underline" onClick={() => navigate('/people')}>
              Go to People
            </button>
          </CardContent>
        </Card>
      )}

      {people.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>
              {gifts.length} gift{gifts.length === 1 ? '' : 's'} · {formatMoney(totalSpent)} spent
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant={statusFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('all')}>
              All
            </Button>
            {GIFT_STATUSES.map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(status)}
              >
                {GIFT_STATUS_LABELS[status]}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Group by</span>
            {(['none', 'occasion', 'store'] as const).map((g) => (
              <Button key={g} variant={groupBy === g ? 'default' : 'outline'} size="sm" onClick={() => setGroupBy(g)}>
                {g === 'none' ? 'None' : g === 'occasion' ? 'Occasion' : 'Store'}
              </Button>
            ))}
          </div>

          {(networkLoading || loading) && <p className="text-sm text-muted-foreground">Loading…</p>}

          {!loading && filteredGifts.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                <GiftIcon className="size-8" />
                <p className="text-sm">{statusFilter === 'all' ? 'No gifts tracked yet.' : `No ${GIFT_STATUS_LABELS[statusFilter].toLowerCase()} gifts.`}</p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {groups.map((group) => {
              const subtotal = group.gifts.filter((g) => isSpentStatus(g.status)).reduce((sum, g) => sum + (g.price ?? 0), 0)
              return (
                <div key={group.label ?? 'all'} className="space-y-1">
                  {group.label && (
                    <div className="flex items-baseline justify-between text-sm font-medium text-muted-foreground">
                      <span>
                        {group.label} · {group.gifts.length} gift{group.gifts.length === 1 ? '' : 's'}
                      </span>
                      {subtotal > 0 && <span>{formatMoney(subtotal)}</span>}
                    </div>
                  )}
                  {group.gifts.map((gift) => (
                    <GiftRowView
                      key={gift.id}
                      gift={gift}
                      person={personById.get(gift.person_id)}
                      occasion={gift.occasion_id ? occasionById.get(gift.occasion_id) : undefined}
                      bundle={gift.bundle_id ? bundleById.get(gift.bundle_id) : undefined}
                      onEdit={openEdit}
                      onDelete={(id) => void handleDelete(id)}
                      onStatusChanged={loadAll}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        </>
      )}

      {user && networkId && people.length > 0 && (
        <GiftDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          networkId={networkId}
          userId={user.id}
          mode={{ kind: 'global', people, occasions }}
          gift={editingGift}
          initialValues={prefill}
          storeOptions={storeOptions}
          onSaved={loadAll}
        />
      )}
    </div>
  )
}
