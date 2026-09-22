import { Check, Monitor, Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { PALETTES, useTheme, type Mode } from '@/theme/theme-provider'

const MODE_OPTIONS: { id: Mode; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
]

export function ThemeSwitcher() {
  const { palette, setPalette, mode, setMode } = useTheme()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Choose a color palette and light/dark mode.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {PALETTES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPalette(p.id)}
              className={cn(
                'flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                palette === p.id ? 'border-ring bg-accent' : 'border-input hover:bg-accent/50',
              )}
            >
              <span className="size-4 rounded-full border" style={{ backgroundColor: p.swatch }} />
              {p.label}
              {palette === p.id && <Check className="size-3.5" />}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {MODE_OPTIONS.map(({ id, label, icon: Icon }) => (
            <Button key={id} type="button" variant={mode === id ? 'default' : 'outline'} size="sm" onClick={() => setMode(id)}>
              <Icon />
              {label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
