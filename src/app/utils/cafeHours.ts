// Cafe operating-hours model (Option 2 — calendar-day display).
//
// A cafe's schedule lives in the `cafe_hours` table, one row per (cafe, day_of_week).
// A schedule may cross midnight (close_time < open_time), e.g. open 18:00, close 02:00.
//
// Under the CALENDAR-DAY model, the hours bookable *on a given calendar day D* are:
//   (a) the CARRY block — the post-midnight tail of D-1's session (only if D-1 crosses
//       midnight), which lands in D's early hours; PLUS
//   (b) D's OWN block — from D's opening up to either its same-day close, or 23:00 if D
//       itself crosses midnight (the tail then carries into D+1).
// The gap between (a) and (b) renders as a natural dead zone (the cafe is shut).
//
// Everything stays within hour 0..23 per calendar day — that is the whole point of the
// calendar-day model, and why `bookings.booking_date` (a plain date) needs no change.
//
// NOTE (MVP): the CafeEditor writes one schedule to all 7 day rows, so every day has the
// same hours and the same previous-day hours. `hoursForUniformSchedule` exploits that to
// compute a single day-independent hour set. When per-day hours ship, callers switch to
// `hoursForCalendarDay(dayRow, prevDayRow)` per selected date — no change to this logic.

export interface CafeHoursSchedule {
  open_time: string; // "HH:MM" or "HH:MM:SS"
  close_time: string;
}

const parseHour = (t: string) => parseInt(t?.split(":")[0] || "0", 10);
const parseMinute = (t: string) => parseInt(t?.split(":")[1] || "0", 10) || 0;

/** True when close is strictly earlier in the day than open (schedule spans midnight). */
export function crossesMidnight(open: string, close: string): boolean {
  return parseHour(close) * 60 + parseMinute(close) < parseHour(open) * 60 + parseMinute(open);
}

/**
 * Full-hour slot starts bookable on one calendar day, given that day's schedule and the
 * previous day's schedule (for the midnight-carry block). Returns sorted hour integers 0..23.
 *
 * Rounding rules (unchanged from the pre-existing single-day logic):
 *  - First slot rounds UP if opening has minutes (06:29 -> first slot 07:00).
 *  - Last slot must END by close, so it starts one hour before the close hour, and a close
 *    with a sub-hour remainder is floored (close 00:35 yields NO post-midnight full hour;
 *    close 02:00 yields carry hours [0, 1]).
 */
export function hoursForCalendarDay(
  day: CafeHoursSchedule | null,
  prev: CafeHoursSchedule | null
): number[] {
  const hours: number[] = [];

  // (a) Carry block from the previous day's midnight-crossing session.
  if (prev && crossesMidnight(prev.open_time, prev.close_time)) {
    const carryEnd = parseHour(prev.close_time); // last full hour that ends by close
    for (let h = 0; h < carryEnd; h++) hours.push(h);
  }

  // (b) The day's own block.
  if (day) {
    const firstSlot = parseHour(day.open_time) + (parseMinute(day.open_time) > 0 ? 1 : 0);
    if (crossesMidnight(day.open_time, day.close_time)) {
      // Evening portion only; the tail spills into the next calendar day's carry block.
      for (let h = firstSlot; h <= 23; h++) hours.push(h);
    } else {
      const lastSlot = parseHour(day.close_time) - 1; // last slot ends by close
      for (let h = firstSlot; h <= lastSlot; h++) hours.push(h);
    }
  }

  return hours;
}

/**
 * MVP convenience: hours for a cafe whose schedule is identical every day. Passing the same
 * schedule as both "day" and "previous day" yields the correct calendar-day set (own block
 * plus the carry from an identical previous day), and it is the same for every calendar date.
 */
export function hoursForUniformSchedule(schedule: CafeHoursSchedule | null): number[] {
  return hoursForCalendarDay(schedule, schedule);
}

export interface HourGap {
  afterHour: number;
  from: number;
  to: number;
}

/**
 * Detect gaps (closed periods) in a sorted hour array. A gap exists wherever two
 * consecutive entries differ by more than 1.
 */
export function findHourGaps(hours: number[]): HourGap[] {
  if (hours.length < 2) return [];
  const sorted = [...hours].sort((a, b) => a - b);
  const gaps: HourGap[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1] - sorted[i] > 1) {
      gaps.push({ afterHour: sorted[i], from: sorted[i] + 1, to: sorted[i + 1] });
    }
  }
  return gaps;
}
