// Curated bright boho swatches for the person-color picker. Kept as a fixed
// set (not a free color picker) so every person's color stays legible as a
// light background tint and the set reads as one cohesive palette together.
export const PERSON_COLOR_SWATCHES = [
  '#E07A5F', // terracotta
  '#F2B544', // mustard
  '#2A9D8F', // teal
  '#E8998D', // dusty rose
  '#A663CC', // orchid
  '#6B9080', // sage
  '#EF6461', // coral
  '#5DA9E9', // sky blue
  '#D4A373', // ochre
  '#9D4EDD', // violet
  '#F4A261', // apricot
  '#4C956C', // forest green
] as const

// Background tint for a gift row: the swatch hex plus a low alpha, so the
// hue reads clearly without fighting the row's text contrast in either
// theme.
export function personColorTint(color: string | null | undefined): string | undefined {
  return color ? `${color}26` : undefined
}
