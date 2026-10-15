// Today / This week / This month / This quarter / This year switch of the dashboards.
//
//   <PeriodFilter value={periodKey} onChange={setPeriodKey} />

import { PERIODS } from '../lib/dashboardPeriod';

export default function PeriodFilter({ value, onChange, disabled }) {
  return (
    <div className="fx-view-toggle fx-period-filter" role="group" aria-label="Period">
      {PERIODS.map((period) => (
        <button type="button" key={period.key} className={value === period.key ? 'active' : ''}
          aria-pressed={value === period.key} disabled={disabled} onClick={() => onChange(period.key)}>
          {period.label}
        </button>
      ))}
    </div>
  );
}
