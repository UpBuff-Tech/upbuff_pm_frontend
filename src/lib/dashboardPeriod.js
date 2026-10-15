// The period filter of the dashboards: This month / Last month / This quarter / This year.
//
//   const period = periodPayload('month');            // sent to the server methods
//   api.call('projectTasks.getPeriodActivity', period, ...);
//
// Each period is a whole calendar month / quarter / year. A current period ("This ...") is
// compared with the one before, cut at the same point in time (1-15 Oct with 1-15 Sep), so a
// half-finished period is not compared with a whole one. A finished period ("Last month") is
// compared with the whole period before it.
import moment from 'moment';

export const PERIODS = [
  { key: 'month', label: 'This month', unit: 'month', offset: 0, bucket: 'day', prevLabel: 'last month' },
  { key: 'lastMonth', label: 'Last month', unit: 'month', offset: 1, bucket: 'day', prevLabel: 'the month before' },
  { key: 'quarter', label: 'This quarter', unit: 'quarter', offset: 0, bucket: 'week', prevLabel: 'last quarter' },
  { key: 'year', label: 'This year', unit: 'year', offset: 0, bucket: 'month', prevLabel: 'last year' },
];

export const DEFAULT_PERIOD = 'month';

export function periodInfo(key) {
  return PERIODS.find((period) => period.key === key) || PERIODS.find((period) => period.key === DEFAULT_PERIOD);
}

/** The period as the server methods take it ({ from, to, fromDay, toDay, prev..., bucket }). */
export function periodPayload(key) {
  const info = periodInfo(key);
  const now = moment();
  const from = now.clone().startOf(info.unit).subtract(info.offset, info.unit);
  const to = from.clone().endOf(info.unit);
  const prevFrom = from.clone().subtract(1, info.unit);
  const prevTo = info.offset === 0
    ? prevFrom.clone().add(now.diff(from), 'ms')   // same point of the previous period
    : prevFrom.clone().endOf(info.unit);           // the whole previous period
  return {
    from: from.valueOf(),
    to: to.valueOf(),
    fromDay: from.format('YYYY-MM-DD'),
    toDay: to.format('YYYY-MM-DD'),
    prevFrom: prevFrom.valueOf(),
    prevTo: prevTo.valueOf(),
    prevFromDay: prevFrom.format('YYYY-MM-DD'),
    prevToDay: prevTo.format('YYYY-MM-DD'),
    bucket: info.bucket,
  };
}

/** Axis label of a chart bucket key: '2026-10-14' -> '14 Oct', week -> '13 Oct', '2026-10' -> 'Oct'. */
export function bucketLabel(key, bucket) {
  if (bucket === 'month') return moment(key, 'YYYY-MM').format('MMM');
  return moment(key, 'YYYY-MM-DD').format('D MMM');
}

/** Tooltip title of a chart bucket: 'Tue, 14 Oct', 'Week of 13 Oct', 'October 2026'. */
export function bucketTitle(key, bucket) {
  if (bucket === 'month') return moment(key, 'YYYY-MM').format('MMMM YYYY');
  if (bucket === 'week') return 'Week of ' + moment(key, 'YYYY-MM-DD').format('D MMM');
  return moment(key, 'YYYY-MM-DD').format('ddd, D MMM');
}

/** The remembered period of a dashboard (falls back to the default; storage may be unavailable). */
export function savedPeriod(storageKey) {
  try {
    const value = localStorage.getItem(storageKey);
    return PERIODS.some((period) => period.key === value) ? value : DEFAULT_PERIOD;
  } catch (e) {
    return DEFAULT_PERIOD;
  }
}

export function savePeriod(storageKey, key) {
  try { localStorage.setItem(storageKey, key); } catch (e) { /* not remembered - fine */ }
}
