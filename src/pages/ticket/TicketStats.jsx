/**
 * Status overview of the ticket page: a bar showing how the tickets split across statuses,
 * and one tab per status with its count. Clicking a tab filters the list by that status.
 *
 *   <TicketStats stats={stats} activeStatus={filters.status} onSelectStatus={(status) => ...} />
 */
const STATUSES = [
  { key: 'open', label: 'Open', icon: 'bx-envelope-open' },
  { key: 'assigned', label: 'Assigned', icon: 'bx-user-check' },
  { key: 'in_progress', label: 'In Progress', icon: 'bx-loader-circle' },
  { key: 'on_hold', label: 'On Hold', icon: 'bx-pause-circle' },
  { key: 'in_review', label: 'In Review', icon: 'bx-show' },
  { key: 'closed', label: 'Closed', icon: 'bx-check-circle' },
];

export default function TicketStats({ stats, activeStatus, onSelectStatus }) {
  const byStatus = stats.byStatus || {};
  const total = stats.total || 0;
  const active = activeStatus || '';

  return (
    <div className="card tk-overview">
      {/* Share of tickets per status */}
      <div className="tk-distribution" aria-hidden="true">
        {total > 0 && STATUSES.map((s) => (byStatus[s.key] ? (
          <span key={s.key} className={'tk-dist-seg st-' + s.key}
            style={{ width: (byStatus[s.key] / total) * 100 + '%' }}
            title={s.label + ': ' + byStatus[s.key]}></span>
        ) : null))}
      </div>

      <div className="tk-status-tabs" role="tablist" aria-label="Filter by status">
        <button type="button" role="tab" aria-selected={active === ''}
          className={'tk-status-tab st-all' + (active === '' ? ' active' : '')} onClick={() => onSelectStatus('')}>
          <span className="tk-status-icon"><i className="bx bx-receipt"></i></span>
          <span className="tk-status-text">
            <span className="tk-status-count">{stats.loaded ? total : '–'}</span>
            <span className="tk-status-label">All tickets</span>
          </span>
        </button>
        {STATUSES.map((s) => (
          <button key={s.key} type="button" role="tab" aria-selected={active === s.key}
            className={'tk-status-tab st-' + s.key + (active === s.key ? ' active' : '')}
            onClick={() => onSelectStatus(active === s.key ? '' : s.key)}>
            <span className="tk-status-icon"><i className={'bx ' + s.icon}></i></span>
            <span className="tk-status-text">
              <span className="tk-status-count">{stats.loaded ? (byStatus[s.key] || 0) : '–'}</span>
              <span className="tk-status-label">{s.label}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
