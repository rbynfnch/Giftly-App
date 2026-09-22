import { nextOccurrenceOfMonthDay } from '@/lib/date-utils'

export type OccasionPreset = {
  id: string
  label: string
  /** Freeform type value stored on the occasion row — never a DB-enforced enum. */
  type: string
  isRecurringTemplate: boolean
  /** Only set for holidays with a fixed calendar date; others need locale-specific rules or are one-off events, so the user picks the date. */
  prefillDate?: () => string
  /** True for the one preset that prompts for a person to prefill the date from their stored birthday. */
  needsPerson?: boolean
}

export const OCCASION_PRESETS: OccasionPreset[] = [
  { id: 'birthday', label: 'Birthday', type: 'birthday', isRecurringTemplate: true, needsPerson: true },
  { id: 'christmas', label: 'Christmas', type: 'christmas', isRecurringTemplate: true, prefillDate: () => nextOccurrenceOfMonthDay(12, 25) },
  { id: 'valentines', label: "Valentine's Day", type: 'valentines_day', isRecurringTemplate: true, prefillDate: () => nextOccurrenceOfMonthDay(2, 14) },
  { id: 'mothers_day', label: "Mother's Day", type: 'mothers_day', isRecurringTemplate: true },
  { id: 'fathers_day', label: "Father's Day", type: 'fathers_day', isRecurringTemplate: true },
  { id: 'easter', label: 'Easter', type: 'easter', isRecurringTemplate: true },
  { id: 'anniversary', label: 'Anniversary', type: 'anniversary', isRecurringTemplate: true },
  { id: 'wedding', label: 'Wedding', type: 'wedding', isRecurringTemplate: false },
  { id: 'baby_shower', label: 'Baby Shower', type: 'baby_shower', isRecurringTemplate: false },
  { id: 'graduation', label: 'Graduation', type: 'graduation', isRecurringTemplate: false },
  { id: 'housewarming', label: 'Housewarming', type: 'housewarming', isRecurringTemplate: false },
]

export const CUSTOM_PRESET: OccasionPreset = {
  id: 'custom',
  label: 'Custom',
  type: 'custom',
  isRecurringTemplate: false,
}
