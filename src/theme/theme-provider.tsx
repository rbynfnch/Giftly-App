import * as React from 'react'

export const PALETTES = [
  { id: 'meadow', label: 'Meadow', swatch: 'oklch(0.52 0.11 152)' },
  { id: 'plum', label: 'Plum', swatch: 'oklch(0.42 0.16 322)' },
] as const

export type Palette = (typeof PALETTES)[number]['id']
export type Mode = 'light' | 'dark' | 'system'

type ThemeContextValue = {
  palette: Palette
  setPalette: (palette: Palette) => void
  mode: Mode
  setMode: (mode: Mode) => void
  resolvedMode: 'light' | 'dark'
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

const PALETTE_KEY = 'giftly:palette'
const MODE_KEY = 'giftly:mode'

function readStorage<T extends string>(key: string, fallback: T, allowed: readonly string[]): T {
  try {
    const value = window.localStorage.getItem(key)
    return value && allowed.includes(value) ? (value as T) : fallback
  } catch {
    return fallback
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPaletteState] = React.useState<Palette>(() =>
    readStorage(PALETTE_KEY, 'meadow', PALETTES.map((p) => p.id)),
  )
  const [mode, setModeState] = React.useState<Mode>(() => readStorage(MODE_KEY, 'system', ['light', 'dark', 'system']))
  const [systemPrefersDark, setSystemPrefersDark] = React.useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  )

  React.useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches)
    mql.addEventListener('change', listener)
    return () => mql.removeEventListener('change', listener)
  }, [])

  const resolvedMode: 'light' | 'dark' = mode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : mode

  React.useEffect(() => {
    const root = document.documentElement
    root.dataset.palette = palette
    root.classList.toggle('dark', resolvedMode === 'dark')
  }, [palette, resolvedMode])

  const setPalette = React.useCallback((next: Palette) => {
    setPaletteState(next)
    try {
      window.localStorage.setItem(PALETTE_KEY, next)
    } catch {
      // localStorage unavailable (private mode, etc.) — palette still applies for this session
    }
  }, [])

  const setMode = React.useCallback((next: Mode) => {
    setModeState(next)
    try {
      window.localStorage.setItem(MODE_KEY, next)
    } catch {
      // localStorage unavailable — mode still applies for this session
    }
  }, [])

  const value = React.useMemo(
    () => ({ palette, setPalette, mode, setMode, resolvedMode }),
    [palette, setPalette, mode, setMode, resolvedMode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
