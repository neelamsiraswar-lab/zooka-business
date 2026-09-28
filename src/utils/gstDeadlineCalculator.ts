import { normalizeStateCode, getStateName } from './gstTaxEngine';

export interface GstDeadlineItem {
  id: string;
  formType: 'GSTR-1' | 'GSTR-3B' | 'GSTR-2B' | 'IFF' | 'PMT-06';
  title: string;
  taxPeriod: string; // e.g. "September 2026" or "Q2 FY 2026-27"
  taxPeriodCode: string; // e.g. "2026-09"
  dueDate: string; // "YYYY-MM-DD"
  dueDateFormatted: string; // e.g. "11 Oct 2026"
  daysRemaining: number;
  status: 'upcoming' | 'due_today' | 'overdue' | 'filed';
  urgency: 'critical' | 'warning' | 'normal' | 'overdue';
  description: string;
  statutoryRule: string;
  cutoffTime: string; // "23:59:59 IST"
  isQuarterly?: boolean;
  applicableCategory?: string; // e.g. "Monthly Filers" or "QRMP Group 1"
  lateFeeDailyRate?: number; // e.g. ₹50/day
  actionTab?: 'gstr1' | 'gstr2b' | 'gstr3b';
}

export interface GstFilingCycle {
  taxPeriod: string;
  taxPeriodCode: string;
  monthName: string;
  year: number;
  deadlines: GstDeadlineItem[];
  isCurrentCycle: boolean;
}

// Indian states categorized into QRMP Group 1 (22nd) vs Group 2 (24th)
// Group 1: Southern & Western States
const QRMP_GROUP_1_STATE_CODES = new Set([
  '27', // Maharashtra
  '24', // Gujarat
  '29', // Karnataka
  '33', // Tamil Nadu
  '32', // Kerala
  '36', // Telangana
  '37', // Andhra Pradesh
  '30', // Goa
  '23', // Madhya Pradesh
  '22', // Chhattisgarh
  '25', // Daman & Diu
  '26', // Dadra & Nagar Haveli
  '34', // Puducherry
  '35', // Andaman & Nicobar
  '31', // Lakshadweep
]);

export function getQrmpGroupForState(stateCodeOrName?: string): {
  group: '1' | '2';
  gstr3bDueDay: number;
  groupName: string;
} {
  const code = normalizeStateCode(stateCodeOrName);
  if (QRMP_GROUP_1_STATE_CODES.has(code)) {
    return {
      group: '1',
      gstr3bDueDay: 22,
      groupName: 'Group 1 (Southern & Western States)',
    };
  }
  return {
    group: '2',
    gstr3bDueDay: 24,
    groupName: 'Group 2 (Northern & Eastern States)',
  };
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function formatDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(d: Date): string {
  const day = d.getDate();
  const month = MONTH_SHORT[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export function getDaysDiff(targetDateStr: string, baseDate: Date): number {
  const target = new Date(`${targetDateStr}T23:59:59`);
  const base = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const diffTime = target.getTime() - base.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function calculateFilingDeadlines(
  referenceDate: Date = new Date(),
  companyStateCodeOrName?: string,
  filingScheme: 'monthly' | 'qrmp' = 'monthly',
  filedStatusMap: Record<string, { filedDate?: string; arn?: string }> = {}
): {
  nextImmediateDeadline: GstDeadlineItem | null;
  currentCycle: GstFilingCycle;
  previousCycle: GstFilingCycle;
  upcomingCycle: GstFilingCycle;
  allDeadlines: GstDeadlineItem[];
  qrmpInfo: { group: '1' | '2'; gstr3bDueDay: number; groupName: string };
  companyStateName: string;
} {
  const stateCode = normalizeStateCode(companyStateCodeOrName);
  const companyStateName = getStateName(stateCode);
  const qrmpInfo = getQrmpGroupForState(stateCode);

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth(); // 0 to 11
  const refDay = referenceDate.getDate();

  // Helper to construct a single deadline item
  const buildDeadlineItem = (
    id: string,
    formType: 'GSTR-1' | 'GSTR-3B' | 'GSTR-2B' | 'IFF' | 'PMT-06',
    title: string,
    taxPeriod: string,
    taxPeriodCode: string,
    dueDate: Date,
    description: string,
    statutoryRule: string,
    actionTab: 'gstr1' | 'gstr2b' | 'gstr3b',
    isQuarterly = false,
    applicableCategory = 'Monthly Filers'
  ): GstDeadlineItem => {
    const dueDateStr = formatDateStr(dueDate);
    const daysRemaining = getDaysDiff(dueDateStr, referenceDate);
    const isFiled = Boolean(filedStatusMap[id]);

    let status: 'upcoming' | 'due_today' | 'overdue' | 'filed' = 'upcoming';
    let urgency: 'critical' | 'warning' | 'normal' | 'overdue' = 'normal';

    if (isFiled) {
      status = 'filed';
      urgency = 'normal';
    } else if (daysRemaining < 0) {
      status = 'overdue';
      urgency = 'overdue';
    } else if (daysRemaining === 0) {
      status = 'due_today';
      urgency = 'critical';
    } else if (daysRemaining <= 3) {
      status = 'upcoming';
      urgency = 'critical';
    } else if (daysRemaining <= 7) {
      status = 'upcoming';
      urgency = 'warning';
    }

    return {
      id,
      formType,
      title,
      taxPeriod,
      taxPeriodCode,
      dueDate: dueDateStr,
      dueDateFormatted: formatDisplayDate(dueDate),
      daysRemaining,
      status,
      urgency,
      description,
      statutoryRule,
      cutoffTime: '23:59:59 IST',
      isQuarterly,
      applicableCategory,
      lateFeeDailyRate: formType === 'GSTR-2B' ? 0 : 50,
      actionTab,
    };
  };

  // Helper to build a complete filing cycle for a specific month (year, monthIndex)
  const buildCycle = (year: number, monthIndex: number, isCurrent: boolean): GstFilingCycle => {
    const periodLabel = `${MONTH_NAMES[monthIndex]} ${year}`;
    const periodCode = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

    // Succeeding month
    const succMonth = monthIndex === 11 ? 0 : monthIndex + 1;
    const succYear = monthIndex === 11 ? year + 1 : year;

    // GSTR-1 Due Date: 11th of succeeding month (Monthly) or 13th (QRMP Quarterly)
    const isEndOfQuarter = (monthIndex + 1) % 3 === 0;
    const quarterNumber = Math.ceil((monthIndex + 1) / 3);

    const deadlines: GstDeadlineItem[] = [];

    if (filingScheme === 'monthly') {
      // 1. GSTR-1 Monthly
      const gstr1DueDate = new Date(succYear, succMonth, 11);
      deadlines.push(
        buildDeadlineItem(
          `GSTR1-${periodCode}`,
          'GSTR-1',
          `GSTR-1 Monthly Return (${periodLabel})`,
          periodLabel,
          periodCode,
          gstr1DueDate,
          'Details of outward supplies of goods and services including B2B, B2CL, B2CS, and HSN summary.',
          'Rule 59(1) of CGST Rules (11th of succeeding month)',
          'gstr1',
          false,
          'Monthly Filers'
        )
      );

      // 2. GSTR-2B Statement Generation (14th)
      const gstr2bDate = new Date(succYear, succMonth, 14);
      deadlines.push(
        buildDeadlineItem(
          `GSTR2B-${periodCode}`,
          'GSTR-2B',
          `GSTR-2B Auto-Drafted ITC Statement (${periodLabel})`,
          periodLabel,
          periodCode,
          gstr2bDate,
          'Static monthly statement auto-drafted by GST portal based on supplier filings for ITC claim.',
          'Rule 60(7) of CGST Rules (14th of succeeding month)',
          'gstr2b',
          false,
          'Auto-Drafted by Portal'
        )
      );

      // 3. GSTR-3B Monthly Return (20th)
      const gstr3bDueDate = new Date(succYear, succMonth, 20);
      deadlines.push(
        buildDeadlineItem(
          `GSTR3B-${periodCode}`,
          'GSTR-3B',
          `GSTR-3B Monthly Return & Tax Payment (${periodLabel})`,
          periodLabel,
          periodCode,
          gstr3bDueDate,
          'Summary return of outward supplies, input tax credit availed, set-off under Rule 88A, and cash payment via challan.',
          'Rule 61(5) of CGST Rules (20th of succeeding month)',
          'gstr3b',
          false,
          'Monthly Filers'
        )
      );
    } else {
      // QRMP Scheme (Quarterly Return Monthly Payment)
      if (isEndOfQuarter) {
        // Quarter Return
        const qLabel = `Q${quarterNumber} (FY ${year}-${(year + 1).toString().slice(-2)})`;
        const gstr1QDueDate = new Date(succYear, succMonth, 13);
        deadlines.push(
          buildDeadlineItem(
            `GSTR1-Q${quarterNumber}-${year}`,
            'GSTR-1',
            `GSTR-1 Quarterly Return (${qLabel})`,
            qLabel,
            periodCode,
            gstr1QDueDate,
            'Quarterly outward supplies filing for taxpayers enrolled in QRMP scheme.',
            'Notification No. 82/2020-CT (13th of month succeeding quarter)',
            'gstr1',
            true,
            'QRMP Quarterly'
          )
        );

        // GSTR-3B Quarterly
        const gstr3bQDueDate = new Date(succYear, succMonth, qrmpInfo.gstr3bDueDay);
        deadlines.push(
          buildDeadlineItem(
            `GSTR3B-Q${quarterNumber}-${year}`,
            'GSTR-3B',
            `GSTR-3B Quarterly Return & Payment (${qLabel})`,
            qLabel,
            periodCode,
            gstr3bQDueDate,
            `Quarterly tax return and final credit settlement for ${qrmpInfo.groupName}.`,
            `Notification No. 84/2020-CT (${qrmpInfo.gstr3bDueDay}th of month succeeding quarter)`,
            'gstr3b',
            true,
            qrmpInfo.groupName
          )
        );
      } else {
        // Month 1 or Month 2 of Quarter: IFF and PMT-06
        const iffDueDate = new Date(succYear, succMonth, 13);
        deadlines.push(
          buildDeadlineItem(
            `IFF-${periodCode}`,
            'IFF',
            `Invoice Furnishing Facility (IFF) (${periodLabel})`,
            periodLabel,
            periodCode,
            iffDueDate,
            'Optional facility for QRMP filers to pass B2B invoice ITC to buyers for Month 1/2 of quarter.',
            'Rule 59(2) of CGST Rules (13th of succeeding month)',
            'gstr1',
            true,
            'QRMP IFF Facility'
          )
        );

        const pmt06DueDate = new Date(succYear, succMonth, 25);
        deadlines.push(
          buildDeadlineItem(
            `PMT06-${periodCode}`,
            'PMT-06',
            `Monthly Tax Challan Deposit PMT-06 (${periodLabel})`,
            periodLabel,
            periodCode,
            pmt06DueDate,
            'Mandatory monthly tax deposit (35% fixed sum method or actual self-assessment) for QRMP taxpayers.',
            'Notification No. 85/2020-CT (25th of succeeding month)',
            'gstr3b',
            true,
            'QRMP Tax Deposit'
          )
        );
      }
    }

    return {
      taxPeriod: periodLabel,
      taxPeriodCode: periodCode,
      monthName: MONTH_NAMES[monthIndex],
      year,
      deadlines,
      isCurrentCycle: isCurrent,
    };
  };

  // Determine which tax period is currently being filed vs upcoming
  // Typically, transactions of the current month (M) are filed in month M+1.
  // So:
  // - "currentCycle" represents the current active month that needs filing (or whose filing deadline is next).
  // E.g. on Sep 27, September is active; its filing happens in October.
  // - "previousCycle" represents August, whose filings were due around Sep 11-20.
  // - "upcomingCycle" represents October, whose filings are due in November.

  const prevMonthIndex = refMonth === 0 ? 11 : refMonth - 1;
  const prevYear = refMonth === 0 ? refYear - 1 : refYear;

  const nextMonthIndex = refMonth === 11 ? 0 : refMonth + 1;
  const nextYear = refMonth === 11 ? refYear + 1 : refYear;

  const previousCycle = buildCycle(prevYear, prevMonthIndex, false);
  const currentCycle = buildCycle(refYear, refMonth, true);
  const upcomingCycle = buildCycle(nextYear, nextMonthIndex, false);

  // Combine all deadlines
  const allDeadlines = [
    ...previousCycle.deadlines,
    ...currentCycle.deadlines,
    ...upcomingCycle.deadlines,
  ];

  // Find the next immediate unfiled deadline that is upcoming or due today or overdue
  // Sort by dueDate ascending
  const sorted = [...allDeadlines].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  
  // Prefer the earliest unfiled deadline that is >= today, or the most recent overdue if any
  let nextImmediateDeadline = sorted.find((d) => d.daysRemaining >= 0 && d.status !== 'filed') || null;
  if (!nextImmediateDeadline) {
    // If all are past or filed, find the earliest unfiled overdue
    nextImmediateDeadline = sorted.find((d) => d.status !== 'filed') || sorted[0] || null;
  }

  return {
    nextImmediateDeadline,
    currentCycle,
    previousCycle,
    upcomingCycle,
    allDeadlines,
    qrmpInfo,
    companyStateName,
  };
}

// Generate an iCalendar (.ics) string for importing into Google Calendar / Apple Calendar
export function generateGstCalendarIcs(deadlines: GstDeadlineItem[], companyName = 'Business'): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const dtStamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AI Studio//GST Filing Tracker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:GST Filing Deadlines - ${companyName}`,
    'X-WR-TIMEZONE:Asia/Kolkata',
  ];

  deadlines.forEach((item) => {
    const [y, m, d] = item.dueDate.split('-');
    const dtStart = `${y}${m}${d}T100000Z`;
    const dtEnd = `${y}${m}${d}T180000Z`;

    ics.push(
      'BEGIN:VEVENT',
      `UID:gst-deadline-${item.id}@aistudio`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:GST Deadline: ${item.formType} (${item.taxPeriod})`,
      `DESCRIPTION:${item.title}\\n\\nRule: ${item.statutoryRule}\\n${item.description}\\nCutoff: ${item.cutoffTime}`,
      `STATUS:CONFIRMED`,
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      `DESCRIPTION:Reminder: ${item.formType} due tomorrow!`,
      'END:VALARM',
      'END:VEVENT'
    );
  });

  ics.push('END:VCALENDAR');
  return ics.join('\r\n');
}
