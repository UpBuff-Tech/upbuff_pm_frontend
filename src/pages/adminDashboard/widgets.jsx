// Building blocks shared by the admin and the director dashboard: KPI tiles, chart cards,
// and the change badge. Styles: dashboard.css.
import './dashboard.css';

export function Delta({ value, suffix = 'vs last period', invert = false }) {
  if (value === null || value === undefined) return <span className="fx-kpi-note">No previous data</span>;
  const good = invert ? value <= 0 : value >= 0;
  const icon = value > 0 ? 'bx-up-arrow-alt' : value < 0 ? 'bx-down-arrow-alt' : 'bx-minus';
  return (
    <span className="fx-kpi-note">
      <span className={'fx-delta ' + (value === 0 ? 'is-flat' : good ? 'is-good' : 'is-bad')}>
        <i className={'bx ' + icon}></i>{Math.abs(value)}%
      </span>
      {suffix}
    </span>
  );
}

export function KpiCard({ id, icon, tone, label, value, unit, children, loading }) {
  return (
    <div className="col-sm-6 col-xl-3">
      <div className={'card h-100 fx-kpi tone-' + tone}>
        <div className="card-body">
          <div className="fx-kpi-head">
            <span className="fx-kpi-icon"><i className={'bx ' + icon}></i></span>
            <span className="fx-kpi-label">{label}</span>
          </div>
          <div className="fx-kpi-value">
            {loading ? <span className="fx-skeleton fx-skeleton-value"></span> : <>{value}{unit && <small>{unit}</small>}</>}
          </div>
          <div className="fx-kpi-foot">{!loading && children}</div>
          {id && <div className="fx-kpi-spark" id={id}></div>}
        </div>
      </div>
    </div>
  );
}

export function ChartCard({ title, subtitle, chartId, height = 300, loading, empty, className = '', action, children }) {
  return (
    <div className={className}>
      <div className="card h-100 fx-chart-card">
        <div className="card-header">
          <div>
            <h5 className="card-title">{title}</h5>
            {subtitle && <p className="fx-card-subtitle">{subtitle}</p>}
          </div>
          {action}
        </div>
        <div className="card-body">
          {children}
          {loading && <div className="fx-skeleton fx-skeleton-chart" style={{ height }}></div>}
          {!loading && empty && (
            <div className="fx-chart-empty" style={{ height }}>
              <i className="bx bx-bar-chart-alt-2"></i>
              <span>{empty}</span>
            </div>
          )}
          <div id={chartId} style={{ display: loading || empty ? 'none' : undefined }}></div>
        </div>
      </div>
    </div>
  );
}
