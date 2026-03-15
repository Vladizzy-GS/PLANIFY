// Date utilities — ported from planify_gs.html

/** Returns today's date as a YYYY-MM-DD string in local time */
export function todayStr(): string {
  return dateStr(new Date())
}

/** Formats a Date object to YYYY-MM-DD in local time */
export function dateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parses a YYYY-MM-DD string to a local Date (avoids UTC offset issues) */
export function localDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Add N days to a date string, returns YYYY-MM-DD */
export function addDays(s: string, n: number): string {
  const d = localDate(s)
  d.setDate(d.getDate() + n)
  return dateStr(d)
}

/** Get the Monday of the week containing the given date string */
export function getMondayOf(s: string): string {
  const d = localDate(s)
  const dow = d.getDay() // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  return dateStr(d)
}

/** Get the first day of the month for a given YYYY-MM-DD string */
export function getMonthStart(s: string): string {
  const [y, m] = s.split('-')
  return `${y}-${m}-01`
}

/** Returns short day name in French */
export function shortDay(s: string): string {
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  return days[localDate(s).getDay()]
}

/** Returns short month name in French */
export function shortMonth(s: string): string {
  const months = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc']
  return months[localDate(s).getMonth()]
}

/** Returns full month name in French */
export function fullMonth(s: string): string {
  const months = [
    'Janvier','Février','Mars','Avril','Mai','Juin',
    'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
  ]
  return months[localDate(s).getMonth()]
}

/** Compare two YYYY-MM-DD strings */
export function compareDates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Check if date s is between start and end (inclusive) */
export function isBetween(s: string, start: string, end: string): boolean {
  return s >= start && s <= end
}

/** Check if a repeating event occurs on a given date */
export function repeatOccursOn(
  eventStart: string,
  repeatRule: string,
  repeatEnd: string | null,
  checkDate: string
): boolean {
  if (repeatRule === 'Aucune') return false
  if (checkDate < eventStart) return false
  if (repeatEnd && checkDate > repeatEnd) return false

  const sd = localDate(eventStart)
  const cd = localDate(checkDate)

  if (repeatRule === 'Chaque semaine') {
    return sd.getDay() === cd.getDay()
  }
  if (repeatRule === 'Chaque mois') {
    return sd.getDate() === cd.getDate()
  }
  if (repeatRule === 'Chaque année') {
    return sd.getMonth() === cd.getMonth() && sd.getDate() === cd.getDate()
  }
  return false
}

/** Returns true if the event (with possible repeat) is visible on checkDate */
export function eventVisibleOn(
  event: { start_date: string; end_date: string; repeat_rule: string; repeat_end_date: string | null },
  checkDate: string
): boolean {
  // Direct range hit
  if (isBetween(checkDate, event.start_date, event.end_date)) return true

  // Repeating — check if this date matches the pattern
  if (event.repeat_rule !== 'Aucune') {
    return repeatOccursOn(event.start_date, event.repeat_rule, event.repeat_end_date, checkDate)
  }

  return false
}

/** Format hour number to display string (e.g. 9 → "9h00", 13 → "13h00") */
export function formatHour(h: number): string {
  return `${h}h00`
}

/** Returns relative time string in French (e.g. "Il y a 2h") */
export function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "À l'instant"
  if (mins < 60) return `Il y a ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Il y a ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `Il y a ${days}j`
}
