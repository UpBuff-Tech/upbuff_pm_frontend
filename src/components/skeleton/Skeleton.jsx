// Shimmering placeholders shown while a page or a block of a page is loading.
// Styles: skeleton.css (loaded globally from main.jsx).
//
//   <Skeleton width="60%" height={14} />              one block
//   <TableSkeleton rows={6} columns={5} />            a table
//   <CardGridSkeleton count={6} />                    a grid of cards
//   <ListSkeleton rows={5} />                         avatar + two lines per row
//   <StatCardsSkeleton count={4} />                   KPI tiles
//   <CalendarSkeleton />  <ChartSkeleton />  <GanttSkeleton />
//   <PageSkeleton />                                  a whole page (route loading)

const range = (n) => Array.from({ length: n }, (_, i) => i);

// Text widths vary per row so the placeholder looks like real content, not a barcode.
const WIDTHS = ['82%', '64%', '91%', '55%', '74%', '68%', '87%', '60%'];
const widthAt = (i, offset = 0) => WIDTHS[(i + offset) % WIDTHS.length];

const toCss = (value) => (typeof value === 'number' ? value + 'px' : value);

export function Skeleton({ width, height, circle = false, radius, className = '', style }) {
  return (
    <span
      className={'sk' + (circle ? ' sk-circle' : '') + (className ? ' ' + className : '')}
      style={{
        width: toCss(width),
        height: toCss(height ?? (circle ? width : undefined)),
        borderRadius: toCss(radius),
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

/** Wraps a skeleton so screen readers announce "loading" once instead of reading empty blocks. */
function Loading({ label = 'Loading…', className = '', children, ...rest }) {
  return (
    <div className={className} role="status" aria-busy="true" aria-live="polite" {...rest}>
      <span className="visually-hidden">{label}</span>
      {children}
    </div>
  );
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={'sk-stack ' + className}>
      {range(lines).map((i) => (
        <Skeleton key={i} className="sk-text" width={i === lines - 1 ? '55%' : widthAt(i)} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 5, header = true, label = 'Loading table…', className = '' }) {
  // First column a little wider (usually the name / title), last one narrow (actions).
  const cols = range(columns).map((i) => (i === 0 ? '2fr' : i === columns - 1 && columns > 2 ? '0.7fr' : '1fr')).join(' ');
  return (
    <Loading label={label} className={'sk-table ' + className} style={{ '--sk-cols': cols }}>
      {header && (
        <div className="sk-table-head">
          {range(columns).map((c) => <Skeleton key={c} width={c === 0 ? '40%' : '55%'} />)}
        </div>
      )}
      <div className="sk-stagger">
        {range(rows).map((r) => (
          <div className="sk-table-row" key={r}>
            {range(columns).map((c) => {
              if (c === 0) {
                return (
                  <div className="sk-row" key={c}>
                    <Skeleton circle width={32} />
                    <div className="sk-grow sk-stack" style={{ gap: 6 }}>
                      <Skeleton className="sk-text" width={widthAt(r)} />
                      <Skeleton className="sk-text" width="45%" height={9} />
                    </div>
                  </div>
                );
              }
              if (c === columns - 1 && columns > 2) return <Skeleton key={c} className="sk-pill" width={56} />;
              return <Skeleton key={c} className={c % 2 ? 'sk-pill' : 'sk-text'} width={c % 2 ? 72 : widthAt(r, c)} />;
            })}
          </div>
        ))}
      </div>
    </Loading>
  );
}

export function CardGridSkeleton({ count = 6, colClass = 'col-md-6 col-xl-4', label = 'Loading…' }) {
  return (
    <Loading label={label} className="row g-3 sk-stagger">
      {range(count).map((i) => (
        <div className={colClass} key={i}>
          <div className="sk-card">
            <div className="sk-row">
              <Skeleton circle width={44} />
              <div className="sk-grow sk-stack" style={{ gap: 8 }}>
                <Skeleton className="sk-title" width={widthAt(i)} />
                <Skeleton className="sk-text" width="45%" height={10} />
              </div>
            </div>
            <Skeleton className="sk-pill" width={88} />
            <SkeletonText lines={2} />
            <div className="sk-card-footer">
              <Skeleton className="sk-text" width="35%" />
              <Skeleton className="sk-text" width="20%" />
            </div>
          </div>
        </div>
      ))}
    </Loading>
  );
}

export function ListSkeleton({ rows = 5, avatar = true, indent = false, label = 'Loading…' }) {
  return (
    <Loading label={label} className="sk-stagger">
      {range(rows).map((i) => (
        <div className="sk-list-item" key={i} style={indent ? { paddingLeft: 4 + (i % 3) * 28 } : undefined}>
          {avatar && <Skeleton circle width={38} />}
          <div className="sk-grow sk-stack" style={{ gap: 8 }}>
            <Skeleton className="sk-text" width={widthAt(i)} height={13} />
            <Skeleton className="sk-text" width={widthAt(i, 3)} height={10} style={{ maxWidth: '60%' }} />
          </div>
          <Skeleton className="sk-pill sk-hide-sm" width={64} />
        </div>
      ))}
    </Loading>
  );
}

export function StatCardsSkeleton({ count = 4, colClass = 'col-sm-6 col-lg-3' }) {
  return (
    <div className="row g-3 sk-stagger" aria-hidden="true">
      {range(count).map((i) => (
        <div className={colClass} key={i}>
          <div className="sk-stat-card">
            <Skeleton width={44} height={44} radius={12} />
            <div className="sk-grow sk-stack" style={{ gap: 8 }}>
              <Skeleton className="sk-text" width="55%" height={10} />
              <Skeleton width="40%" height={22} radius={6} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const BAR_HEIGHTS = [45, 70, 55, 85, 40, 65, 90, 50, 75, 60, 80, 48];

export function ChartSkeleton({ height = 260, bars = 12 }) {
  return (
    <div className="sk-chart" style={{ height }} aria-hidden="true">
      {range(bars).map((i) => <Skeleton key={i} height={BAR_HEIGHTS[i % BAR_HEIGHTS.length] + '%'} />)}
    </div>
  );
}

export function CalendarSkeleton({ label = 'Loading calendar…' }) {
  return (
    <Loading label={label}>
      <div className="sk-cal-head">
        <Skeleton className="sk-title" width={180} height={26} />
        <div className="sk-row">
          <Skeleton className="sk-btn" width={72} />
          <Skeleton className="sk-btn sk-hide-sm" width={140} />
        </div>
      </div>
      <div className="sk-cal-grid">
        {range(35).map((i) => (
          <div className="sk-cal-cell" key={i}>
            <Skeleton className="sk-text" width={18} height={10} />
            {i % 3 === 0 && <Skeleton height={16} radius={4} width={widthAt(i)} />}
            {i % 5 === 1 && <Skeleton height={16} radius={4} width={widthAt(i, 2)} />}
          </div>
        ))}
      </div>
    </Loading>
  );
}

const GANTT_BARS = [[0, 30], [18, 34], [40, 22], [48, 30], [10, 55], [62, 28], [70, 22], [30, 40]];

export function GanttSkeleton({ rows = 8, label = 'Loading Gantt chart…' }) {
  return (
    <Loading label={label} className="sk-stagger">
      {range(rows).map((i) => {
        const [left, width] = GANTT_BARS[i % GANTT_BARS.length];
        return (
          <div className="sk-gantt-row" key={i}>
            <Skeleton className="sk-text" width={widthAt(i)} />
            <div className="sk-gantt-track">
              <Skeleton style={{ left: left + '%', width: width + '%' }} />
            </div>
          </div>
        );
      })}
    </Loading>
  );
}

/** Generic page: title bar, KPI tiles and a table. Used while a page's code is downloading. */
export function PageSkeleton({ label = 'Loading page…' }) {
  return (
    <div className="container-xxl flex-grow-1 container-p-y sk-delayed">
      <Loading label={label}>
        <div className="sk-page-header">
          <div className="sk-stack" style={{ gap: 8, flex: 1 }}>
            <Skeleton className="sk-title" width={220} height={24} style={{ maxWidth: '70%' }} />
            <Skeleton className="sk-text" width={320} style={{ maxWidth: '90%' }} />
          </div>
          <Skeleton className="sk-btn sk-hide-sm" width={130} />
        </div>
        <div className="mb-4">
          <StatCardsSkeleton count={4} />
        </div>
        <div className="card">
          <div className="card-body">
            <TableSkeleton rows={7} columns={5} />
          </div>
        </div>
      </Loading>
    </div>
  );
}
