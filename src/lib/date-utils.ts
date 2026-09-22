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

function toDateOnlyString(utcMs: number): string {
  return new Date(utcMs).toISOString().slice(0, 10)
}

/** Next upcoming "YYYY-MM-DD" for a given month/day (today counts as upcoming), ignoring year. */
export function nextOccurrenceOfMonthDay(month: number, day: number): string {
  const today = new Date()
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())

  let next = Date.UTC(today.getFullYear(), month - 1, day)
  if (next < todayUTC) {
    next = Date.UTC(today.getFullYear() + 1, month - 1, day)
  }
  return toDateOnlyString(next)
}

/** Days until the next occurrence of this birthday (0 = today), or null if invalid. */
export function daysUntilNextBirthday(birthday: string): number | null {
  const date = parseDateOnly(birthday)
  if (!date) return null

  const today = new Date()
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const nextStr = nextOccurrenceOfMonthDay(date.getUTCMonth() + 1, date.getUTCDate())
  const next = parseDateOnly(nextStr)!.getTime()

  return Math.round((next - todayUTC) / (1000 * 60 * 60 * 24))
}

/** Adds whole years to a "YYYY-MM-DD" string (used for "duplicate for next year"). */
export function addYears(dateStr: string, years: number): string {
  const date = parseDateOnly(dateStr)
  if (!date) return dateStr
  return toDateOnlyString(Date.UTC(date.getUTCFullYear() + years, date.getUTCMonth(), date.getUTCDate()))
}
