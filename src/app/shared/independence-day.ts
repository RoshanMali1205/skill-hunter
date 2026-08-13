/**
 * Indian Independence Day festive window (Asia/Kolkata).
 * Visible from 1 Aug 00:00 IST through 15 Aug end of day (until 16 Aug 00:00 IST).
 */

const IST = 'Asia/Kolkata';

export function istCalendarParts(date: Date = new Date()): { month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST,
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);

  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  return { month, day };
}

/** True while IST calendar date is 1–15 August inclusive (through 15 Aug EOD). */
export function isIndependenceDayIconVisible(date: Date = new Date()): boolean {
  const { month, day } = istCalendarParts(date);
  return month === 8 && day >= 1 && day <= 15;
}
