/**
 * "Team today" card of My Dashboard: how many colleagues are in, working from home, on leave or
 * not in yet, and who is away today. Reads the same register as the "Who's In" page
 * (leaveRequests.getRegister). Renders nothing when the register can't be loaded.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import moment from 'moment';
import api, { onDataChanged } from '../../api/client';

/** Register status → the group it is counted in. */
const GROUP_OF_STATUS = {
  available: 'in',
  early: 'in',
  signedOff: 'in',
  wfh: 'wfh',
  leave: 'away',
  half: 'away',
  notIn: 'notIn',
};

const GROUPS = [
  { key: 'in', label: 'In today' },
  { key: 'wfh', label: 'Remote' },
  { key: 'away', label: 'On leave' },
  { key: 'notIn', label: 'Not in yet' },
];

/** What to show next to a person who is not at work as usual. */
function awayText(person) {
  if (person.status === 'wfh') return 'Working from home';
  if (person.status === 'half') return 'Half day leave';
  if (person.leaveType === 'optionalHoliday') return 'Optional holiday';
  if (person.backOn) return 'On leave · back ' + moment(person.backOn).format('ddd D MMM');
  return 'On leave';
}

function initials(name) {
  return String(name || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

export default function TeamToday() {
  const [register, setRegister] = useState(undefined); // undefined = loading, null = not available

  useEffect(() => {
    let active = true;
    const load = () => {
      api.call('leaveRequests.getRegister', '', (error, result) => {
        if (!active) return;
        setRegister(error || !result ? null : result);
      });
    };
    load();
    const stopListening = onDataChanged(load);
    return () => {
      active = false;
      stopListening();
    };
  }, []);

  if (register === null) return null;

  const people = (register && register.people) || [];
  const counts = { in: 0, wfh: 0, away: 0, notIn: 0 };
  for (const person of people) {
    const group = GROUP_OF_STATUS[person.status];
    if (group) counts[group] += 1;
  }
  const awayPeople = people.filter((p) => p.status === 'wfh' || p.status === 'leave' || p.status === 'half');

  return (
    <div className="card h-100 ud-card">
      <div className="ud-card-head">
        <span className="ud-card-icon"><i className="bx bx-group"></i></span>
        <div>
          <h5>Team today</h5>
          <p>{register ? (register.holiday ? register.holiday.name + ' · office closed' : people.length + ' people') : 'Who is in, remote or away'}</p>
        </div>
        <Link to="/leaveRegister" className="ud-link">Who&apos;s in</Link>
      </div>
      <div className="ud-card-body pt-0">
        {register === undefined ? (
          [0, 1, 2].map((i) => <span key={i} className="fx-skeleton ud-sk-row"></span>)
        ) : (
          <>
            <div className="ud-team-counts">
              {GROUPS.map((g) => (
                <span key={g.key} className={'ud-team-count g-' + g.key}>
                  <strong>{counts[g.key]}</strong><small>{g.label}</small>
                </span>
              ))}
            </div>
            {awayPeople.length === 0 ? (
              <div className="ud-empty">Everyone is working as usual today.</div>
            ) : (
              <ul className="ud-list">
                {awayPeople.slice(0, 5).map((p) => (
                  <li key={p.userId} className="ud-request">
                    {p.photo
                      ? <img className="ud-avatar" src={p.photo} alt="" />
                      : <span className="ud-avatar">{initials(p.name)}</span>}
                    <span className="ud-request-text">
                      <strong>{p.name}</strong>
                      <small>{p.role}</small>
                    </span>
                    <span className={'ud-status ' + (p.status === 'wfh' ? 's-wfh' : 's-leave')}>{awayText(p)}</span>
                  </li>
                ))}
                {awayPeople.length > 5 && (
                  <li className="ud-team-more"><Link to="/leaveRegister">+{awayPeople.length - 5} more</Link></li>
                )}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
