/** Parses a "YYYY-MM-DD" string, rejecting anything that isn't a real calendar date. */
export function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const [, yearStr, monthStr, dayStr] = match
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)
  const date = new Date(Date.UTC(year, month - 1, day))

  const isReal = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  return isReal ? date : null
}

export function formatMonthDay(value: string): string {
  const date = parseDateOnly(value)
  if (!date) return value
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', timeZone: 'UTC' })
}

/** Days until the next occurrence of this birthday (0 = today), or null if invalid. */
export function daysUntilNextBirthday(birthday: string): number | null {
  const date = parseDateOnly(birthday)
  if (!date) return null

  const today = new Date()
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())

  let next = Date.UTC(today.getFullYear(), date.getUTCMonth(), date.getUTCDate())
  if (next < todayUTC) {
    next = Date.UTC(today.getFullYear() + 1, date.getUTCMonth(), date.getUTCDate())
  }

  return Math.round((next - todayUTC) / (1000 * 60 * 60 * 24))
}
