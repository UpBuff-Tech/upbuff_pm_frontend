/**
 * The company holiday & leave policy as it applies to the logged-in user
 * (backend: HolidayPolicy / holidays.getCalendar / userDashboard.getSummary).
 *
 *   const policy = useLeavePolicy();
 *   policy.calendar   { year, defined, fixed, optional, optionalAllowed, flexiDays, totalPaidDaysOff, mySelection }
 *   policy.balance    { flexiTotal, flexiUsed, flexiPending, flexiRemaining, lossOfPayDays, optionalSelected, ... }
 *   policy.holidays   Set of yyyy-MM-dd days that are holidays for me (fixed + my optional picks)
 *   policy.reload()   after a request was created / edited / cancelled
 *   policy.saveOptional(dates)  -> Promise
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import api from '../../api/client';

export function useLeavePolicy() {
  const [calendar, setCalendar] = useState(null);
  const [balance, setBalance] = useState(null);

  const reload = useCallback(() => {
    api.call('holidays.getCalendar', moment().year(), (err, data) => {
      if (!err && data) setCalendar(data);
    });
    api.call('userDashboard.getSummary', (err, data) => {
      if (!err && data) setBalance(data.balance);
    });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const saveOptional = (dates) => new Promise((resolve, reject) => {
    api.call('holidays.saveMyOptional', calendar.year, dates, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      setCalendar((current) => ({ ...current, mySelection: result.mySelection }));
      reload(); // the flexi count and upcoming holidays depend on the picks
      resolve(result);
    });
  });

  const holidays = useMemo(() => {
    if (!calendar || !calendar.defined) return new Set();
    return new Set([...calendar.fixed.map((h) => h.date), ...(calendar.mySelection || [])]);
  }, [calendar]);

  return { calendar, balance, holidays, reload, saveOptional };
}

/** "2.5" / "3" for day counts */
export const fmtDays = (n) => String(Math.round((Number(n) || 0) * 10) / 10);

/**
 * The note of the request form for the chosen dates, following the policy:
 * { text, warning, lopDays } or null while a date is missing.
 *
 * - weekends and my holidays (fixed + optional picks) are not counted;
 * - a flexi leave beyond what is left of the year's bank is Loss of Pay.
 * `ownDays` = days of the request being edited (they are already in the balance).
 */
export function describeRequestDays({ fromDate, toDate, dayType, type, policy, ownDays = 0 }) {
  if (!fromDate || !toDate) return null;

  const end = moment(toDate, 'YYYY-MM-DD');
  let working = 0;
  let holidaysSkipped = 0;
  for (const d = moment(fromDate, 'YYYY-MM-DD'); d.isSameOrBefore(end, 'day'); d.add(1, 'day')) {
    const weekend = d.day() === 0 || d.day() === 6;
    if (weekend) continue;
    if (policy.holidays.has(d.format('YYYY-MM-DD'))) holidaysSkipped++;
    else working++;
  }

  if (working === 0) {
    return { text: 'Selected dates only include weekends or holidays', warning: true, lopDays: 0 };
  }

  const days = dayType === 'half' ? working * 0.5 : working;
  const skipped = holidaysSkipped ? ` and ${holidaysSkipped} holiday${holidaysSkipped === 1 ? '' : 's'}` : '';
  let text = `${fmtDays(days)} working day${days !== 1 ? 's' : ''}${dayType === 'half' ? ' (half day)' : ''} (excluding weekends${skipped})`;

  // Flexi balance (only known for the current policy year)
  let lopDays = 0;
  const { balance, calendar } = policy;
  const sameYear = calendar && moment(fromDate, 'YYYY-MM-DD').year() === calendar.year;
  if (type === 'leave' && balance && balance.defined && sameYear) {
    const taken = balance.flexiUsed + balance.lossOfPayDays + balance.flexiPending - ownDays;
    const left = Math.max(0, balance.flexiTotal - taken);
    lopDays = Math.max(0, Math.min(days, days - left));
    text += lopDays > 0
      ? ` · only ${fmtDays(left)} flexi day${left === 1 ? '' : 's'} left, ${fmtDays(lopDays)} day${lopDays === 1 ? '' : 's'} will be Loss of Pay`
      : ` · ${fmtDays(left - days)} of ${balance.flexiTotal} flexi days left after this`;
  }

  return { text, warning: lopDays > 0, lopDays };
}
