import moment from 'moment';
import { displayStyle, todayDateStr } from './utils';

/**
 * The "Optional Holiday" choice of the new request form: the year's optional-holiday pool,
 * with my picks marked and passed dates locked. Picking one needs no approval
 * (it is saved straight to my optional holidays, same as the Holiday Calendar tab).
 */
function OptionalHolidayPicker({ calendar, value, onChange }) {
  if (!calendar) {
    return <p className="text-muted small mb-3">Loading the holiday calendar...</p>;
  }
  if (!calendar.defined) {
    return (
      <div className="alert alert-warning py-2 small">
        <i className="bx bx-calendar-x me-1"></i>No holiday calendar has been published for {calendar.year} yet, so there are no optional holidays to choose.
      </div>
    );
  }

  const today = todayDateStr();
  const chosen = calendar.mySelection || [];
  const allowed = calendar.optionalAllowed;
  const left = Math.max(0, allowed - chosen.length);
  const available = calendar.optional.filter((h) => h.date >= today && !chosen.includes(h.date));

  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <label className="form-label fw-bold mb-0">Optional Holiday <span className="text-danger">*</span></label>
        <span className={'badge ' + (left > 0 ? 'bg-label-primary' : 'bg-label-secondary')}>{left} of {allowed} left</span>
      </div>

      {left === 0 && (
        <div className="alert alert-warning py-2 small">
          <i className="bx bx-info-circle me-1"></i>You have already chosen all {allowed} optional holidays for {calendar.year}. To change one, use the <strong>Holiday Calendar</strong> tab.
        </div>
      )}
      {left > 0 && available.length === 0 && (
        <div className="alert alert-warning py-2 small">
          <i className="bx bx-info-circle me-1"></i>There are no upcoming optional holidays left to choose in {calendar.year}.
        </div>
      )}

      <div className="list-group">
        {calendar.optional.map((h) => {
          const isChosen = chosen.includes(h.date);
          const isPast = h.date < today;
          const disabled = isChosen || isPast || left === 0;
          return (
            <label key={h.date} className={'list-group-item d-flex align-items-center gap-2' + (disabled ? ' text-muted' : '')}>
              <input className="form-check-input m-0" type="radio" name="optionalDate" value={h.date}
                checked={value === h.date} disabled={disabled} onChange={() => onChange(h.date)} />
              <span className="flex-grow-1">
                <strong>{h.name}</strong>
                <small className="d-block">{moment(h.date).format('ddd, MMM DD, YYYY')}</small>
              </span>
              {isChosen && <span className="badge bg-label-success">Chosen</span>}
              {!isChosen && isPast && <span className="badge bg-label-secondary">Passed</span>}
            </label>
          );
        })}
      </div>
      <small className="text-muted d-block mt-2">
        <i className="bx bx-info-circle me-1"></i>No approval needed: the date is added to your holidays as soon as you submit.
      </small>
    </div>
  );
}

/**
 * New / Edit leave request modal.
 * `form` holds the field values ({ editId, type, dayType, fromDate, toDate, reason, optionalDate, fromMin, toMin }),
 * `daysInfo` the "N working days" note ({ visible, text, warning }),
 * `calendar` the year's holiday calendar (for the "Optional Holiday" choice).
 */
export default function NewRequestModal({ form, daysInfo, calendar, isSubmitting, onChange, onSubmit }) {
  const fieldChanged = (name) => (event) => onChange(name, event.currentTarget.value);
  const isOptionalHoliday = form.type === 'optionalHoliday';

  return (
    <div className="modal fade" id="newRequestModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="newRequestModalTitle">
              {form.editId ? (
                <><i className="bx bx-edit me-2"></i>Edit Leave Request</>
              ) : (
                <><i className="bx bx-calendar-plus me-2"></i>New Leave Request</>
              )}
            </h5>
            <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
          </div>
          <form id="newRequestForm" onSubmit={onSubmit}>
            <input type="hidden" id="editRequestId" value={form.editId} />
            <div className="modal-body">

              {/* Request Type */}
              <div className="mb-3">
                <label className="form-label fw-bold">Request Type <span className="text-danger">*</span></label>
                <div className="d-flex gap-4">
                  <div className="form-check">
                    <input className="form-check-input" type="radio" name="requestType" id="typeLeave" value="leave"
                      checked={form.type === 'leave'} onChange={fieldChanged('type')} />
                    <label className="form-check-label" htmlFor="typeLeave">
                      <i className="bx bx-calendar-minus me-1"></i>Flexi Leave
                    </label>
                  </div>
                  <div className="form-check">
                    <input className="form-check-input" type="radio" name="requestType" id="typeWFH" value="wfh"
                      checked={form.type === 'wfh'} onChange={fieldChanged('type')} />
                    <label className="form-check-label" htmlFor="typeWFH">
                      <i className="bx bx-home me-1"></i>Work From Home
                    </label>
                  </div>
                  {/* A new optional holiday is saved straight to my picks (no request), so it can't be chosen while editing */}
                  {!form.editId && (
                    <div className="form-check">
                      <input className="form-check-input" type="radio" name="requestType" id="typeOptionalHoliday" value="optionalHoliday"
                        checked={isOptionalHoliday} onChange={fieldChanged('type')} />
                      <label className="form-check-label" htmlFor="typeOptionalHoliday">
                        <i className="bx bx-calendar-star me-1"></i>Optional Holiday
                      </label>
                    </div>
                  )}
                  {/* Old requests of type 'optional' (from before optional holidays were self-service) */}
                  {form.type === 'optional' && (
                    <div className="form-check">
                      <input className="form-check-input" type="radio" name="requestType" id="typeOptional" value="optional"
                        checked onChange={fieldChanged('type')} />
                      <label className="form-check-label" htmlFor="typeOptional">
                        <i className="bx bx-calendar-star me-1"></i>Optional Leave
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {isOptionalHoliday ? (
                <OptionalHolidayPicker calendar={calendar} value={form.optionalDate} onChange={(date) => onChange('optionalDate', date)} />
              ) : form.type === 'optional' ? (
                <div className="alert alert-warning py-2 small">
                  <i className="bx bx-info-circle me-1"></i>Optional holidays are now chosen in the <strong>Holiday Calendar</strong> tab. Change this request to Flexi Leave or WFH, or cancel it and pick the date there.
                </div>
              ) : (
                <p className="text-muted small mb-3">
                  <i className="bx bx-info-circle me-1"></i>Flexi leave covers sick and personal leave. Weekends and holidays aren't counted; days beyond your flexi balance are Loss of Pay.
                </p>
              )}

              {!isOptionalHoliday && (<>
              {/* Day Type */}
              <div className="mb-3">
                <label className="form-label fw-bold">Day Type <span className="text-danger">*</span></label>
                <div className="d-flex gap-4">
                  <div className="form-check">
                    <input className="form-check-input" type="radio" name="dayType" id="dayTypeFull" value="full"
                      checked={form.dayType === 'full'} onChange={fieldChanged('dayType')} />
                    <label className="form-check-label" htmlFor="dayTypeFull">
                      <i className="bx bx-calendar me-1"></i>Full Day
                    </label>
                  </div>
                  <div className="form-check">
                    <input className="form-check-input" type="radio" name="dayType" id="dayTypeHalf" value="half"
                      checked={form.dayType === 'half'} onChange={fieldChanged('dayType')} />
                    <label className="form-check-label" htmlFor="dayTypeHalf">
                      <i className="bx bx-adjust me-1"></i>Half Day
                    </label>
                  </div>
                </div>
              </div>

              {/* Date Range */}
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-bold" htmlFor="fromDate">From Date <span className="text-danger">*</span></label>
                  <input type="date" className="form-control" id="fromDate" required min={form.fromMin}
                    value={form.fromDate} onChange={fieldChanged('fromDate')} />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold" htmlFor="toDate">To Date <span className="text-danger">*</span></label>
                  <input type="date" className="form-control" id="toDate" required min={form.toMin}
                    value={form.toDate} onChange={fieldChanged('toDate')} />
                </div>
              </div>

              {/* Days Count Info */}
              <div className="mb-3">
                <div className={'alert py-2 ' + (daysInfo.warning ? 'alert-warning' : 'alert-info')} id="daysInfo" style={displayStyle(daysInfo.visible)}>
                  <i className="bx bx-info-circle me-1"></i>
                  <span id="daysInfoText">{daysInfo.text}</span>
                </div>
              </div>

              {/* Reason */}
              <div className="mb-3">
                <label className="form-label fw-bold" htmlFor="reason">Reason <span className="text-danger">*</span></label>
                <textarea className="form-control" id="reason" rows="3" placeholder="Enter reason for your request..." required
                  value={form.reason} onChange={fieldChanged('reason')}></textarea>
              </div>
              </>)}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
              <button type="submit" className="btn btn-primary" id="submitRequestBtn" disabled={isSubmitting}>
                <span className={'spinner-border spinner-border-sm me-1' + (isSubmitting ? '' : ' d-none')} id="submitSpinner"></span>
                <span id="submitBtnText">{form.editId ? 'Update Request' : isOptionalHoliday ? 'Add Optional Holiday' : 'Submit Request'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
