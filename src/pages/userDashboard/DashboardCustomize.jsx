/**
 * The "Customize" button of My Dashboard: a small dropdown with one checkbox per dashboard section.
 * The parent keeps the list of hidden section keys and saves it (see UserDashboard).
 */
import { useEffect, useRef, useState } from 'react';

/** Every section of My Dashboard. The key is what gets saved on the user, so never rename one. */
export const DASHBOARD_SECTIONS = [
  { key: 'tiles', label: 'Today tiles', detail: 'Attendance, task hours, flexi days, next holiday' },
  { key: 'myWork', label: 'My tasks & tickets', detail: 'Open work assigned to you' },
  { key: 'timeOff', label: 'Time off balance', detail: 'Fixed, optional and flexi days' },
  { key: 'optionalHolidays', label: 'Optional holiday picker', detail: 'Choose your optional holidays' },
  { key: 'calendar', label: 'My calendar', detail: 'Holidays, leave and attendance' },
  { key: 'upcomingHolidays', label: 'Upcoming holidays', detail: 'The next holidays of the year' },
  { key: 'leaveRequests', label: 'My leave requests', detail: 'Your latest 5 requests' },
];

export default function DashboardCustomize({ hidden, onChange }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  // Close the dropdown when clicking anywhere outside it
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const visibleCount = DASHBOARD_SECTIONS.filter((s) => !hidden.includes(s.key)).length;

  const toggle = (key) => {
    if (hidden.includes(key)) {
      onChange(hidden.filter((k) => k !== key));
      return;
    }
    if (visibleCount <= 1) {
      toastr.warning('Keep at least one section on your dashboard');
      return;
    }
    onChange([...hidden, key]);
  };

  return (
    <div className="ud-customize" ref={boxRef}>
      <button type="button" className="btn btn-outline-secondary" onClick={() => setOpen(!open)} aria-expanded={open}>
        <i className="bx bx-customize me-1"></i>Customize
      </button>
      {open && (
        <div className="ud-customize-menu">
          <div className="ud-customize-head">
            <strong>Show on my dashboard</strong>
            <small>{visibleCount} of {DASHBOARD_SECTIONS.length} sections</small>
          </div>
          {DASHBOARD_SECTIONS.map((section) => {
            const checked = !hidden.includes(section.key);
            return (
              <label key={section.key} className="ud-customize-row">
                <input type="checkbox" className="form-check-input" checked={checked}
                  disabled={checked && visibleCount <= 1} onChange={() => toggle(section.key)} />
                <span>
                  <strong>{section.label}</strong>
                  <small>{section.detail}</small>
                </span>
              </label>
            );
          })}
          <div className="ud-customize-foot">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onChange([])} disabled={hidden.length === 0}>
              Reset to default
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
