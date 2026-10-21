// src/utils/datePeriodUtils.ts

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const SHORT_MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Formats a local Date object as YYYY-MM-DD without UTC timezone drift.
 */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns exact startDate (YYYY-MM-01), endDate (YYYY-MM-DD), label, and portal fp (MMYYYY)
 * for a given year and 0-indexed monthIndex, completely immune to UTC timezone offsets.
 */
export function getMonthBounds(year: number, monthIndex: number): {
  ym: string;
  startDate: string;
  endDate: string;
  label: string;
  shortLabel: string;
  fp: string;
} {
  const mm = String(monthIndex + 1).padStart(2, '0');
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const dd = String(lastDay).padStart(2, '0');
  return {
    ym: `${year}-${mm}`,
    startDate: `${year}-${mm}-01`,
    endDate: `${year}-${mm}-${dd}`,
    label: `${MONTH_NAMES[monthIndex]} ${year}`,
    shortLabel: `${SHORT_MONTH_NAMES[monthIndex]} ${year}`,
    fp: `${mm}${year}`,
  };
}

/**
 * Parses a "YYYY-MM" string into exact month bounds.
 */
export function getBoundsForYm(ym: string): {
  ym: string;
  startDate: string;
  endDate: string;
  label: string;
  shortLabel: string;
  fp: string;
} {
  const parts = ym.split('-');
  const year = parseInt(parts[0], 10) || new Date().getFullYear();
  const monthIndex = Math.max(0, Math.min(11, (parseInt(parts[1], 10) || 1) - 1));
  return getMonthBounds(year, monthIndex);
}

/**
 * Determines the Indian Financial Year start year for a given Date (April to March).
 */
export function getCurrentFyStartYear(now: Date = new Date()): number {
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

/**
 * Generates all 12 months of the active Indian Financial Year (April to March),
 * plus any additional months discovered in transaction dates, sorted chronologically or reverse.
 */
export function getAvailableMonths(
  dateStrings: Array<string | undefined | null> = [],
  now: Date = new Date()
): Array<{
  ym: string;
  label: string;
  shortLabel: string;
  startDate: string;
  endDate: string;
  fp: string;
}> {
  const ymSet = new Set<string>();
  const fyStart = getCurrentFyStartYear(now);

  // Add all 12 months of current FY (Apr fyStart to Mar fyStart+1)
  for (let m = 3; m < 12; m++) {
    ymSet.add(`${fyStart}-${String(m + 1).padStart(2, '0')}`);
  }
  for (let m = 0; m < 3; m++) {
    ymSet.add(`${fyStart + 1}-${String(m + 1).padStart(2, '0')}`);
  }

  // Also include current month and previous 6 months in case we are early in FY
  for (let i = 0; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    ymSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  // Include any months from actual records
  dateStrings.forEach((ds) => {
    if (ds && typeof ds === 'string' && /^\d{4}-\d{2}/.test(ds)) {
      ymSet.add(ds.slice(0, 7));
    }
  });

  // Sort descending (newest first, up to current FY end)
  return Array.from(ymSet)
    .sort()
    .reverse()
    .map((ym) => getBoundsForYm(ym));
}

export type GstPeriodPreset =
  | 'all'
  | 'this_month'
  | 'prev_month'
  | 'month'
  | 'q1'
  | 'q2'
  | 'q3'
  | 'q4'
  | 'fy';

/**
 * Resolves a GST Period Preset + optional selectedYm ("YYYY-MM") into startDate, endDate, label, and portal fp.
 */
export function resolveGstPeriodFilter(
  preset: GstPeriodPreset,
  selectedYm?: string,
  now: Date = new Date()
): {
  startDate?: string;
  endDate?: string;
  label: string;
  fp: string;
} {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const fyStart = getCurrentFyStartYear(now);
  const fyEnd = fyStart + 1;

  if (preset === 'this_month') {
    const b = getMonthBounds(currentYear, currentMonth);
    return { startDate: b.startDate, endDate: b.endDate, label: b.label, fp: b.fp };
  }

  if (preset === 'prev_month') {
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const b = getMonthBounds(prevYear, prevMonth);
    return { startDate: b.startDate, endDate: b.endDate, label: b.label, fp: b.fp };
  }

  if (preset === 'month' && selectedYm) {
    const b = getBoundsForYm(selectedYm);
    return { startDate: b.startDate, endDate: b.endDate, label: b.label, fp: b.fp };
  }

  if (preset === 'q1') {
    return {
      startDate: `${fyStart}-04-01`,
      endDate: `${fyStart}-06-30`,
      label: `Q1 (Apr - Jun ${fyStart})`,
      fp: `06${fyStart}`,
    };
  }

  if (preset === 'q2') {
    return {
      startDate: `${fyStart}-07-01`,
      endDate: `${fyStart}-09-30`,
      label: `Q2 (Jul - Sep ${fyStart})`,
      fp: `09${fyStart}`,
    };
  }

  if (preset === 'q3') {
    return {
      startDate: `${fyStart}-10-01`,
      endDate: `${fyStart}-12-31`,
      label: `Q3 (Oct - Dec ${fyStart})`,
      fp: `12${fyStart}`,
    };
  }

  if (preset === 'q4') {
    return {
      startDate: `${fyEnd}-01-01`,
      endDate: `${fyEnd}-03-31`,
      label: `Q4 (Jan - Mar ${fyEnd})`,
      fp: `03${fyEnd}`,
    };
  }

  if (preset === 'fy') {
    return {
      startDate: `${fyStart}-04-01`,
      endDate: `${fyEnd}-03-31`,
      label: `FY ${fyStart}-${String(fyEnd).slice(-2)}`,
      fp: `03${fyEnd}`,
    };
  }

  const defaultBounds = getMonthBounds(currentYear, currentMonth);
  return { label: 'All Transactions', fp: defaultBounds.fp };
}
