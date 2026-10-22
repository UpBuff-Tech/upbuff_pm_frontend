/**
 * Holiday Calendar (Administration) - edit the holidays of a year.
 * Backend: holidays.listYears / holidays.getCalendarAdmin / holidays.saveCalendar
 * (permission holidayCalendar_manage). The Leave Requests "Holiday Calendar" tab, the user
 * dashboard and the attendance calendar read the saved calendar through holidays.getCalendar.
 */
import { useEffect, useState } from 'react';
import moment from 'moment';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Skeleton } from '../../components/skeleton/Skeleton';
import './holidayCalendar.css';

// Every row gets its own key so React keeps the inputs apart when a row is removed
let nextRowKey = 1;
const newRow = (row) => ({ key: nextRowKey++, date: '', name: '', tentative: false, ...row });

const weekday = (date) => (date && moment(date, 'YYYY-MM-DD', true).isValid() ? moment(date).format('dddd') : '');

/** The years in the drop-down: this year, next year and every year that already has a calendar. */
const yearOptions = (savedYears) => {
  const thisYear = moment().year();
  const years = new Set([thisYear, thisYear + 1, ...savedYears]);
  return [...years].sort((a, b) => a - b);
};

/** One table of holidays (fixed or optional). */
function HolidayRows({ year, rows, withTentative, onChange, onRemove }) {
  if (rows.length === 0) {
    return <div className="hc-empty">No holidays added yet.</div>;
  }
  return (
    <div className="table-responsive">
      <table className="table table-sm align-middle mb-0 hc-table">
        <thead>
          <tr>
            <th style={{ width: 170 }}>Date</th>
            <th style={{ width: 110 }}>Day</th>
            <th>Holiday</th>
            {withTentative && <th style={{ width: 100 }} className="text-center">Tentative</th>}
            <th style={{ width: 50 }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>
                <input type="date" className="form-control form-control-sm" value={row.date}
                  min={year + '-01-01'} max={year + '-12-31'}
                  onChange={(event) => onChange(row.key, { date: event.target.value })} />
              </td>
              <td className="text-muted small">{weekday(row.date)}</td>
              <td>
                <input type="text" className="form-control form-control-sm" value={row.name} placeholder="e.g. Republic Day"
                  onChange={(event) => onChange(row.key, { name: event.target.value })} />
              </td>
              {withTentative && (
                <td className="text-center">
                  <input type="checkbox" className="form-check-input" checked={row.tentative}
                    aria-label="Tentative date"
                    onChange={(event) => onChange(row.key, { tentative: event.target.checked })} />
                </td>
              )}
              <td className="text-end">
                <button type="button" className="btn btn-sm btn-icon btn-outline-danger" title="Remove"
                  aria-label={'Remove ' + (row.name || 'holiday')} onClick={() => onRemove(row.key)}>
                  <i className="bx bx-trash"></i>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function HolidayCalendarAdmin() {
  const { userCan } = useAuth();
  const canManage = userCan('holidayCalendar_manage');

  const [year, setYear] = useState(moment().year());
  const [savedYears, setSavedYears] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [info, setInfo] = useState(null); // { exists, updatedAt, updatedByName }
  const [fixed, setFixed] = useState([]);
  const [pool, setPool] = useState([]);
  const [optionalAllowed, setOptionalAllowed] = useState(0);
  const [flexiDays, setFlexiDays] = useState(0);

  const loadYears = () => {
    api.call('holidays.listYears', (error, result) => {
      if (!error) setSavedYears(result || []);
    });
  };

  /** Put a holidays.getCalendarAdmin / saveCalendar answer into the form. */
  const showCalendar = (data) => {
    setInfo({ exists: data.exists, updatedAt: data.updatedAt, updatedByName: data.updatedByName });
    setFixed((data.fixed || []).map((h) => newRow({ date: h.date, name: h.name, tentative: !!h.tentative })));
    setPool((data.optionalPool || []).map((h) => newRow({ date: h.date, name: h.name })));
    setOptionalAllowed(data.optionalAllowed || 0);
    setFlexiDays(data.flexiDays || 0);
    setDirty(false);
  };

  const loadCalendar = (forYear) => {
    setIsLoading(true);
    api.call('holidays.getCalendarAdmin', forYear, (error, result) => {
      setIsLoading(false);
      if (error) {
        toastr.error(error.reason || 'Failed to load the holiday calendar');
        return;
      }
      showCalendar(result);
    });
  };

  useEffect(() => {
    if (!canManage) return;
    loadYears();
    loadCalendar(year);
  }, [year, canManage]);

  const changeYear = (value) => {
    if (dirty && !window.confirm('You have unsaved changes. Switch year and lose them?')) return;
    setYear(Number(value));
  };

  // Row helpers: change / add / remove a row of one of the two lists
  const changeRow = (setRows) => (key, changes) => {
    setRows((rows) => rows.map((row) => (row.key === key ? { ...row, ...changes } : row)));
    setDirty(true);
  };
  const addRow = (setRows) => {
    setRows((rows) => [...rows, newRow()]);
    setDirty(true);
  };
  const removeRow = (setRows) => (key) => {
    setRows((rows) => rows.filter((row) => row.key !== key));
    setDirty(true);
  };

  const save = () => {
    const data = {
      fixed: fixed.map((row) => ({ date: row.date, name: row.name.trim(), tentative: row.tentative })),
      optionalPool: pool.map((row) => ({ date: row.date, name: row.name.trim() })),
      optionalAllowed: Number(optionalAllowed) || 0,
      flexiDays: Number(flexiDays) || 0,
    };
    setSaving(true);
    api.call('holidays.saveCalendar', year, data, (error, result) => {
      setSaving(false);
      if (error) {
        toastr.error(error.reason || 'Failed to save the holiday calendar');
        return;
      }
      toastr.success('Holiday calendar for ' + year + ' saved');
      showCalendar(result);
      loadYears();
    });
  };

  if (!canManage) {
    return (
      <div className="container-xxl flex-grow-1 container-p-y">
        <div className="card"><div className="card-body text-center text-muted py-5">
          <i className="bx bx-lock-alt d-block mb-2" style={{ fontSize: '2rem' }}></i>
          You don't have permission to manage the holiday calendar.
        </div></div>
      </div>
    );
  }

  const total = fixed.length + (Number(optionalAllowed) || 0) + (Number(flexiDays) || 0);

  return (
    <div className="container-xxl flex-grow-1 container-p-y hc-page">
      {/* Header */}
      <div className="hc-header">
        <div>
          <h4 className="fw-bold mb-1">Holiday Calendar</h4>
          <p className="text-muted mb-0">Fixed holidays, the optional holiday pool and flexi days of each year</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <select className="form-select" style={{ width: 120 }} value={year} aria-label="Year"
            onChange={(event) => changeYear(event.target.value)}>
            {yearOptions(savedYears).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button type="button" className="btn btn-primary" disabled={saving || isLoading} onClick={save}>
            <i className="bx bx-save me-1"></i> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="card"><div className="card-body"><Skeleton height={18} width="30%" /><Skeleton className="mt-3" height={220} /></div></div>
      ) : (
        <>
          {/* Status line */}
          <div className={'hc-status' + (info && info.exists ? '' : ' is-new')}>
            {info && info.exists ? (
              <span>
                <i className="bx bx-check-circle me-1"></i>
                Published for {year}
                {info.updatedAt && <> · last updated {moment(info.updatedAt).format('DD MMM YYYY, hh:mm A')}</>}
                {info.updatedByName && <> by {info.updatedByName}</>}
              </span>
            ) : (
              <span><i className="bx bx-info-circle me-1"></i>No calendar for {year} yet. Add the holidays and save to publish it.</span>
            )}
            <span className="hc-total">{total} paid days off in total</span>
          </div>

          {/* Fixed holidays */}
          <div className="card mb-4">
            <div className="card-header hc-card-head">
              <div>
                <h5 className="mb-0">Fixed holidays</h5>
                <small className="text-muted">The office is closed on these days; nobody has to apply.</small>
              </div>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => addRow(setFixed)}>
                <i className="bx bx-plus me-1"></i> Add holiday
              </button>
            </div>
            <div className="card-body pt-0">
              <HolidayRows year={year} rows={fixed} withTentative onChange={changeRow(setFixed)} onRemove={removeRow(setFixed)} />
            </div>
          </div>

          {/* Optional holiday pool */}
          <div className="card mb-4">
            <div className="card-header hc-card-head">
              <div>
                <h5 className="mb-0">Optional holiday pool</h5>
                <small className="text-muted">Each employee picks some of these dates on the Leave Requests page.</small>
              </div>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => addRow(setPool)}>
                <i className="bx bx-plus me-1"></i> Add date
              </button>
            </div>
            <div className="card-body pt-0">
              <HolidayRows year={year} rows={pool} onChange={changeRow(setPool)} onRemove={removeRow(setPool)} />
              <div className="hc-inline mt-3">
                <label htmlFor="hcOptionalAllowed" className="mb-0">Employees choose</label>
                <input id="hcOptionalAllowed" type="number" min="0" max={pool.length} className="form-control form-control-sm"
                  value={optionalAllowed}
                  onChange={(event) => { setOptionalAllowed(event.target.value); setDirty(true); }} />
                <span className="text-muted">of {pool.length} optional holidays</span>
              </div>
              <small className="text-muted d-block mt-2">
                Removing a date from the pool keeps the picks employees already made, but that date is no longer counted.
              </small>
            </div>
          </div>

          {/* Flexi days */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Flexi days</h5>
              <small className="text-muted">Sick and paid leave in one bank, used through normal leave requests. Days beyond it are Loss of Pay.</small>
            </div>
            <div className="card-body pt-0">
              <div className="hc-inline">
                <label htmlFor="hcFlexiDays" className="mb-0">Flexi days per employee</label>
                <input id="hcFlexiDays" type="number" min="0" className="form-control form-control-sm" value={flexiDays}
                  onChange={(event) => { setFlexiDays(event.target.value); setDirty(true); }} />
              </div>
            </div>
          </div>

          <div className="text-end">
            <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>
              <i className="bx bx-save me-1"></i> {saving ? 'Saving…' : 'Save calendar'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
