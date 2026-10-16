/**
 * The building blocks shared by the Employee Task Report and the Client Task Report:
 * quick ranges, status colours, KPI tiles, ranked bars and sortable headers.
 * Styles live in employeeTaskReport.css (under .etr-page).
 */
import moment from 'moment';
import { colorFor, initialsOf } from '../../components/detailModal/DetailModal';

export const STATUSES = [
  { key: 'Pending', cls: 'pending' },
  { key: 'In Progress', cls: 'inprogress' },
  { key: 'Testing', cls: 'testing' },
  { key: 'On Hold', cls: 'onhold' },
  { key: 'Completed', cls: 'completed' },
];
export const statusClass = (status) => (STATUSES.find((s) => s.key === status) || STATUSES[0]).cls;

// Quick ranges: each returns [from, to] as moments
export const PRESETS = [
  { key: 'today', label: 'Today', range: () => [moment(), moment()] },
  { key: 'yesterday', label: 'Yesterday', range: () => [moment().subtract(1, 'day'), moment().subtract(1, 'day')] },
  { key: 'week', label: 'This week', range: () => [moment().startOf('isoWeek'), moment()] },
  { key: '7d', label: 'Last 7 days', range: () => [moment().subtract(6, 'days'), moment()] },
  { key: 'month', label: 'This month', range: () => [moment().startOf('month'), moment()] },
  { key: '30d', label: 'Last 30 days', range: () => [moment().subtract(29, 'days'), moment()] },
];

/** 5400 -> "1h 30m" (short form for tiles and bars) */
export function formatHours(seconds) {
  const total = Math.max(0, Math.round(seconds || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  if (minutes) return `${minutes}m`;
  return total ? `${total}s` : '0m';
}

/** Sum the seconds per key, largest first. `secondsOf` defaults to the in-range time. */
export function groupTime(tasks, keyOf, secondsOf = (task) => task.dailyTimeSpentSeconds) {
  const groups = new Map();
  tasks.forEach((task) => {
    const key = keyOf(task) || 'Unknown';
    const group = groups.get(key) || { name: key, seconds: 0, tasks: 0 };
    group.seconds += secondsOf(task) || 0;
    group.tasks += 1;
    groups.set(key, group);
  });
  return [...groups.values()].sort((a, b) => b.seconds - a.seconds);
}

export function Avatar({ name, size = '' }) {
  return (
    <span className={`etr-avatar ${size}`} style={{ '--c': colorFor(name || '?') }} title={name}>
      {initialsOf(name)}
    </span>
  );
}

export function KpiTile({ tone, icon, label, value, caption }) {
  return (
    <div className={`etr-kpi tone-${tone}`}>
      <div className="etr-kpi-head">
        <span className="etr-kpi-icon"><i className={`bx ${icon}`}></i></span>
        <span className="etr-kpi-label">{label}</span>
      </div>
      <strong className="etr-kpi-value">{value}</strong>
      {caption && <span className="etr-kpi-caption">{caption}</span>}
    </div>
  );
}

/** Ranked horizontal bars: one hue, value labelled at the end of each bar */
export function RankedBars({ rows, withAvatar, emptyText, limit = 8, unit = 'task' }) {
  const shown = rows.slice(0, limit);
  const max = Math.max(1, ...shown.map((row) => row.seconds));
  const rest = rows.slice(limit);

  if (!shown.length) return <p className="etr-muted-note">{emptyText}</p>;

  return (
    <ul className="etr-bars">
      {shown.map((row) => (
        <li key={row.name} title={`${row.name}: ${formatHours(row.seconds)} across ${row.tasks} ${unit}${row.tasks === 1 ? '' : 's'}`}>
          <div className="etr-bars-label">
            {withAvatar && <Avatar name={row.name} size="is-sm" />}
            <span>{row.name}</span>
          </div>
          <div className="etr-bars-track">
            <span style={{ width: `${Math.max(2, row.seconds / max * 100)}%` }}></span>
          </div>
          <b>{formatHours(row.seconds)}</b>
        </li>
      ))}
      {rest.length > 0 && (
        <li className="etr-bars-more">
          + {rest.length} more · {formatHours(rest.reduce((sum, row) => sum + row.seconds, 0))}
        </li>
      )}
    </ul>
  );
}

export function SortHeader({ label, sortKey, sort, onSort, className = '' }) {
  const active = sort.key === sortKey;
  return (
    <th className={className}>
      <button type="button" className={'etr-sort' + (active ? ' is-active' : '')} onClick={() => onSort(sortKey)}>
        {label}
        <i className={`bx ${active ? (sort.dir === 'asc' ? 'bx-chevron-up' : 'bx-chevron-down') : 'bx-sort-alt-2'}`}></i>
      </button>
    </th>
  );
}
