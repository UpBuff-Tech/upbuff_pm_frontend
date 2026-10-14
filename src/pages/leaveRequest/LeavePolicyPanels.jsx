/**
 * The holiday & leave policy on the Leave Requests page:
 *   <PolicySummary policy={policy} stats={stats} onChooseOptional={...} />  balance tiles above the tabs
 *   <HolidayCalendarTab policy={policy} />                                  fixed holidays + optional picker
 * `policy` comes from useLeavePolicy(). Styles: leavePolicy.css.
 */
import { useEffect, useState } from 'react';
import moment from 'moment';
import { Skeleton } from '../../components/skeleton/Skeleton';
import { fmtDays } from './useLeavePolicy';
import './leavePolicy.css';

const todayKey = () => moment().format('YYYY-MM-DD');

function Tile({ tone, icon, label, children, action }) {
  return (
    <div className={'lp-tile lp-' + tone}>
      <div className="lp-tile-top">
        <span className="lp-tile-icon"><i className={'bx ' + icon}></i></span>
        <span className="lp-tile-label">{label}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

export function PolicySummary({ policy, stats, onChooseOptional }) {
  const { balance, calendar } = policy;

  if (!balance || !calendar) {
    return (
      <div className="lp-tiles mb-4" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => <div className="lp-tile" key={i}><Skeleton width="50%" height={12} /><Skeleton className="mt-3" width="35%" height={26} /><Skeleton className="mt-3" height={6} /></div>)}
      </div>
    );
  }

  const total = balance.flexiTotal || 0;
  const usedPct = total ? Math.min(100, (balance.flexiUsed / total) * 100) : 0;
  const pendingPct = total ? Math.min(100 - usedPct, (balance.flexiPending / total) * 100) : 0;

  const today = todayKey();
  const upcoming = calendar.defined
    ? [
      ...calendar.fixed,
      ...calendar.optional.filter((h) => (calendar.mySelection || []).includes(h.date))
    ].filter((h) => h.date >= today).sort((a, b) => a.date.localeCompare(b.date))
    : [];
  const next = upcoming[0];
  const daysToNext = next ? moment(next.date).diff(moment().startOf('day'), 'days') : null;
  const picked = (calendar.mySelection || []).length;

  return (
    <div className="lp-tiles mb-4">
      <Tile tone="indigo" icon="bx-calendar-heart" label="Flexi leave">
        <div className="lp-big">{fmtDays(balance.flexiRemaining)}<small> of {total} days left</small></div>
        <div className="lp-meter" role="img" aria-label={`${fmtDays(balance.flexiUsed)} used, ${fmtDays(balance.flexiPending)} pending of ${total}`}>
          <span className="is-used" style={{ width: usedPct + '%' }}></span>
          <span className="is-pending" style={{ width: pendingPct + '%' }}></span>
        </div>
        <div className="lp-sub">
          <span><i className="lp-dot is-used"></i>{fmtDays(balance.flexiUsed)} used</span>
          <span><i className="lp-dot is-pending"></i>{fmtDays(balance.flexiPending)} pending</span>
          {balance.lossOfPayDays > 0 && <span className="lp-lop"><i className="bx bx-error-circle"></i>{fmtDays(balance.lossOfPayDays)} LOP</span>}
        </div>
      </Tile>

      <Tile tone="violet" icon="bx-star" label="Optional holidays"
        action={calendar.defined && <button type="button" className="lp-link" onClick={onChooseOptional}>{picked < calendar.optionalAllowed ? 'Choose' : 'View'}</button>}>
        <div className="lp-big">{picked}<small> of {calendar.optionalAllowed} chosen</small></div>
        <div className="lp-pips">
          {Array.from({ length: calendar.optionalAllowed }).map((_, i) => <span key={i} className={i < picked ? 'is-on' : ''}></span>)}
        </div>
        <div className="lp-sub">{picked < calendar.optionalAllowed
          ? `Pick ${calendar.optionalAllowed - picked} more from ${calendar.optional.length} dates`
          : 'All optional holidays chosen'}</div>
      </Tile>

      <Tile tone="green" icon="bx-party" label="Next holiday">
        {next ? (
          <>
            <div className="lp-big lp-big-text">{next.name}</div>
            <div className="lp-sub">
              {moment(next.date).format('ddd, DD MMM')} · {daysToNext === 0 ? 'today' : daysToNext === 1 ? 'tomorrow' : `in ${daysToNext} days`}
            </div>
          </>
        ) : <div className="lp-sub mt-2">No more holidays this year</div>}
        <div className="lp-sub">{calendar.totalPaidDaysOff} paid days off in {calendar.year}</div>
      </Tile>

      <Tile tone="amber" icon="bx-list-check" label="My requests">
        <div className="lp-big">{stats.pending}<small> pending</small></div>
        <div className="lp-sub">
          <span>{stats.approved} approved</span>
          <span>{stats.rejected} rejected</span>
          <span>{fmtDays(stats.wfh)} WFH days</span>
        </div>
      </Tile>
    </div>
  );
}

export function HolidayCalendarTab({ policy }) {
  const { calendar, saveOptional } = policy;
  const [picked, setPicked] = useState([]);
  const [saving, setSaving] = useState(false);

  const saved = (calendar && calendar.mySelection) || [];
  useEffect(() => {
    setPicked(saved);
  }, [saved.join(',')]);

  if (!calendar) {
    return <div className="card"><div className="card-body"><Skeleton height={18} width="30%" /><Skeleton className="mt-3" height={220} /></div></div>;
  }
  if (!calendar.defined) {
    return (
      <div className="card"><div className="card-body text-center text-muted py-5">
        <i className="bx bx-calendar-x d-block mb-2" style={{ fontSize: '2rem' }}></i>
        No holiday calendar has been published for {calendar.year} yet.
      </div></div>
    );
  }

  const today = todayKey();
  const allowed = calendar.optionalAllowed;
  const dirty = picked.length !== saved.length || picked.some((d) => !saved.includes(d));

  const toggle = (date) => {
    if (date < today) return; // passed dates are locked
    setPicked((current) => {
      if (current.includes(date)) return current.filter((d) => d !== date);
      if (current.length >= allowed) {
        toastr.warning(`You can choose up to ${allowed} optional holidays`);
        return current;
      }
      return [...current, date];
    });
  };

  const save = () => {
    setSaving(true);
    saveOptional(picked)
      .then(() => toastr.success('Your optional holidays are saved'))
      .catch((err) => toastr.error(err.reason || 'Failed to save your optional holidays'))
      .finally(() => setSaving(false));
  };

  const dateBadge = (date) => (
    <span className="lp-date">
      <small>{moment(date).format('MMM')}</small>
      <strong>{moment(date).format('DD')}</strong>
    </span>
  );

  return (
    <div className="lp-calendar">
      <div className="lp-policy-note">
        <i className="bx bx-info-circle"></i>
        <div>
          <strong>{calendar.year} leave policy:</strong> {calendar.fixed.length} fixed holidays + {allowed} optional holidays of your choice
          + {calendar.flexiDays} flexi-holidays = <strong>{calendar.totalPaidDaysOff} paid days off</strong>.
          Sick and paid leave are merged into flexi-holidays: use them for any reason. Flexi leave beyond your balance is Loss of Pay.
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-5">
          <div className="card h-100">
            <div className="lp-card-head">
              <div>
                <h6>Fixed holidays</h6>
                <small>Office closed · no request needed</small>
              </div>
              <span className="lp-count">{calendar.fixed.length}</span>
            </div>
            <ul className="lp-list">
              {calendar.fixed.map((h) => (
                <li key={h.date} className={h.date < today ? 'is-past' : ''}>
                  {dateBadge(h.date)}
                  <span className="lp-name"><strong>{h.name}</strong><small>{h.day}</small></span>
                  {h.date < today ? <span className="lp-tag">Passed</span> : h.date === today ? <span className="lp-tag is-today">Today</span> : null}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card h-100">
            <div className="lp-card-head">
              <div>
                <h6>Optional holidays</h6>
                <small>Choose any {allowed} of these {calendar.optional.length} · no approval needed</small>
              </div>
              <span className={'lp-count' + (picked.length === allowed ? ' is-full' : '')}>{picked.length}/{allowed}</span>
            </div>
            <ul className="lp-list lp-pick">
              {calendar.optional.map((h) => {
                const on = picked.includes(h.date);
                const past = h.date < today;
                const full = !on && picked.length >= allowed;
                return (
                  <li key={h.date} className={(on ? 'is-on' : '') + (past ? ' is-past' : '')}>
                    <button type="button" onClick={() => toggle(h.date)} disabled={past || saving}
                      aria-pressed={on} title={past ? 'This date has passed and can no longer be changed' : full ? `You have already chosen ${allowed}` : ''}>
                      {dateBadge(h.date)}
                      <span className="lp-name"><strong>{h.name}</strong><small>{h.day}</small></span>
                      <span className={'lp-check' + (full && !past ? ' is-muted' : '')}><i className={'bx ' + (on ? 'bx-check' : past ? 'bx-lock-alt' : 'bx-plus')}></i></span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="lp-card-foot">
              <small>{dirty ? 'You have unsaved changes' : picked.length < allowed ? `You can choose ${allowed - picked.length} more` : 'Saved'}</small>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-sm btn-outline-secondary" disabled={!dirty || saving} onClick={() => setPicked(saved)}>Reset</button>
                <button type="button" className="btn btn-sm btn-primary" disabled={!dirty || saving} onClick={save}>
                  {saving && <span className="spinner-border spinner-border-sm me-1"></span>}Save choices
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
