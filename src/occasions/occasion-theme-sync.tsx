import * as React from 'react'

import { useOccasions } from '@/occasions/occasion-context'
import { useTheme, type OccasionPaletteOverride } from '@/theme/theme-provider'

function overrideForType(type: string): OccasionPaletteOverride | null {
  switch (type.trim().toLowerCase()) {
    case 'christmas':
      return 'christmas'
    case 'birthday':
      return 'birthday'
    default:
      return null
  }
}

// Re-skins the whole app to red/green for a selected Christmas occasion, or
// purple/teal for a selected birthday - any other occasion (or none
// selected) leaves the user's own chosen palette in place. Renders nothing;
// it only syncs the occasion switcher's selection into ThemeProvider.
export function OccasionThemeSync() {
  const { selectedOccasion } = useOccasions()
  const { setOccasionOverride } = useTheme()

  React.useEffect(() => {
    setOccasionOverride(selectedOccasion ? overrideForType(selectedOccasion.type) : null)
    return () => setOccasionOverride(null)
  }, [selectedOccasion, setOccasionOverride])

  return null
}
