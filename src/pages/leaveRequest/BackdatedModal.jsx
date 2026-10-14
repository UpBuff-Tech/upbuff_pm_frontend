import { getLeaveTypeLabel } from '../../lib/shared/leaveRequests';
import { requestListHelpers, todayDateStr } from './utils';
import { LEAVE_TYPE_OPTIONS, leaveTypeBadgeClass } from './leaveRequestHelpers';
import BackdatedEntryRow from './BackdatedEntryRow';

const { formatDate } = requestListHelpers;

/**
 * Backdated Entries Modal: multi-row entry, then review + confirm.
 * `rows` are the entry rows ([{ key, defaults }]), `review` the validated entries
 * under review (null while editing).
 */
export default function BackdatedModal({
  rows, review, users, lockEmployee, isConfirmed, isSaving,
  onAddRow, onRemoveRow, onReview, onBack, onConfirmChange, onSave
}) {
  const isBackdatedReview = !!review;
  const reviewEntries = review || [];

  return (
    <div className="modal fade" id="backdatedModal" tabIndex="-1" aria-hidden="true" data-backdrop="static">
      <div className="modal-dialog modal-xl" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bx bx-history me-2"></i>{isBackdatedReview ? 'Confirm Backdated Entries' : 'Backdated Leave Entries'}
            </h5>
            <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            {/* Step 1: entry rows (hidden, not destroyed, during review so typed values are kept) */}
            <div className={isBackdatedReview ? 'd-none' : ''}>
              <div className="alert alert-info py-2 mb-3">
                <i className="bx bx-info-circle me-1"></i>
                Record past leaves that were missed. Entries are saved as approved and marked <strong>Backdated</strong>.
              </div>
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-2">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th style={{ minWidth: '180px' }}>Employee</th>
                      <th style={{ minWidth: '140px' }}>Type</th>
                      <th style={{ minWidth: '110px' }}>Day Type</th>
                      <th style={{ minWidth: '140px' }}>From</th>
                      <th style={{ minWidth: '140px' }}>To</th>
                      <th style={{ minWidth: '180px' }}>Reason</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody id="backdatedRows">
                    {/* Rows are kept by position, as before: the fields of a row stay on screen
                        when the list changes above them, only the last row disappears. */}
                    {rows.map((row, index) => (
                      <BackdatedEntryRow
                        key={index}
                        rowKey={row.key}
                        rowNumber={index + 1}
                        users={users}
                        types={LEAVE_TYPE_OPTIONS}
                        maxDate={todayDateStr()}
                        lockEmployee={lockEmployee}
                        defaults={row.defaults}
                        onRemove={(event) => onRemoveRow(event, row.key)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="btn btn-sm btn-outline-primary" id="addBackdatedRowBtn" onClick={onAddRow}>
                <i className="bx bx-plus me-1"></i>Add Row
              </button>
            </div>

            {/* Step 2: review + explicit confirmation */}
            {isBackdatedReview && (
              <>
                <div className="alert alert-warning py-2 mb-3">
                  <i className="bx bx-error me-1"></i>
                  You are adding <strong>{reviewEntries.length} backdated entr{reviewEntries.length === 1 ? 'y' : 'ies'}</strong>.
                  They will be saved as <strong>approved</strong> immediately, without the approval flow. Please check every row.
                </div>
                <div className="table-responsive">
                  <table className="table table-sm table-bordered mb-3">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Employee</th>
                        <th>Type</th>
                        <th>Day Type</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Days</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewEntries.map((entry) => (
                        <tr key={entry.rowNumber}>
                          <td>{entry.rowNumber}</td>
                          <td>{entry.employeeName}</td>
                          <td><span className={'badge ' + leaveTypeBadgeClass(entry.type)}>{getLeaveTypeLabel(entry.type)}</span></td>
                          <td>{entry.dayType === 'half' ? 'Half Day' : 'Full Day'}</td>
                          <td>{formatDate(entry.fromDate)}</td>
                          <td>{formatDate(entry.toDate)}</td>
                          <td>{entry.totalDays}</td>
                          <td>{entry.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="backdatedConfirmCheck"
                    checked={isConfirmed} onChange={onConfirmChange} />
                  <label className="form-check-label fw-bold" htmlFor="backdatedConfirmCheck">
                    I confirm these leaves were already taken and should be recorded as backdated, approved entries.
                  </label>
                </div>
              </>
            )}
          </div>
          <div className="modal-footer">
            {isBackdatedReview ? (
              <>
                <button type="button" className="btn btn-secondary" id="backdatedBackBtn" disabled={isSaving} onClick={onBack}>
                  <i className="bx bx-arrow-back me-1"></i>Back to Edit
                </button>
                <button type="button" className="btn btn-primary" id="backdatedSaveBtn" disabled={!isConfirmed || isSaving} onClick={onSave}>
                  <span className={'spinner-border spinner-border-sm me-1' + (isSaving ? '' : ' d-none')} id="backdatedSaveSpinner"></span>
                  Confirm &amp; Save
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
                <button type="button" className="btn btn-primary" id="backdatedReviewBtn" onClick={onReview}>
                  Review Entries<i className="bx bx-right-arrow-alt ms-1"></i>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
