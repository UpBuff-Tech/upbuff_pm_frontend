/**
 * Early Leaving tab of the Leave Requests page
 * Employees request to leave the office early; approvers review the team list.
 * Props: { canApprove: Boolean, employees: [{ _id, name }] }
 * @author Claude
 */
import { useEffect, useRef, useState } from 'react';
import moment from 'moment';
import api from '../../api/client';
import {
  OFFICE_START_TIME,
  OFFICE_END_TIME,
  REQUIRED_WORK_MINUTES,
  formatLeavingTime,
  getMinutesWorkedUntilLeaving,
  getShortfallMinutes,
  getLeavingTimeError
} from '../../lib/shared/earlyLeaveRequests';
import { requestListHelpers, callWithSpinner, formatDuration } from './utils';
import RequestStatusBadge from './RequestStatusBadge';
import EarlyLeavePunchIn from './EarlyLeavePunchIn';
import EarlyLeaveWorked from './EarlyLeaveWorked';
import { fxConfirm } from '../../components/dialog/dialog';
import { TableSkeleton } from '../../components/skeleton/Skeleton';

const { formatDate, formatDateTime, truncate, isPending, isApproved, isCancelled } = requestListHelpers;

const DEFAULT_TEAM_FILTER = { status: 'pending', month: '', userId: '' };

const STATUS_FILTER_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: '', label: 'All Status' }
];

// Remarks-prompt configuration per action (quick approve/reject, cancel approved)
const ACTIONS = {
  approve: {
    method: 'earlyLeaveRequests.approve',
    title: 'Approve Early Leaving',
    icon: 'bx-check-circle text-success',
    buttonClass: 'btn-success',
    buttonLabel: 'Approve',
    remarksLabel: 'Remarks (Optional)',
    successMessage: 'Early leaving approved',
    errorMessage: 'Failed to approve request'
  },
  reject: {
    method: 'earlyLeaveRequests.reject',
    title: 'Reject Early Leaving',
    icon: 'bx-x-circle text-danger',
    buttonClass: 'btn-danger',
    buttonLabel: 'Reject',
    remarksLabel: 'Remarks (Optional)',
    successMessage: 'Early leaving rejected',
    errorMessage: 'Failed to reject request'
  },
  cancelApproved: {
    method: 'earlyLeaveRequests.cancelApproved',
    title: 'Cancel Approved Early Leaving',
    icon: 'bx-x-circle text-danger',
    buttonClass: 'btn-danger',
    buttonLabel: 'Cancel Request',
    remarksLabel: 'Reason for Cancellation (Optional)',
    warning: 'This will cancel the approved early leaving. This action cannot be undone.',
    successMessage: 'Approved early leaving cancelled',
    errorMessage: 'Failed to cancel request'
  }
};

// Client-side check mirroring the server rules, for instant feedback.
// Requests are always for today.
function validateEarlyLeaveForm(leavingTime, reason, punchInTime) {
  if (!leavingTime) return 'Select the leaving time';
  const day = moment().day();
  if (day === 0 || day === 6) return 'Early leaving cannot be requested for weekends';
  const timeError = getLeavingTimeError(leavingTime);
  if (timeError) return timeError;
  if (leavingTime <= moment().format('HH:mm')) return 'Leaving time has already passed';
  if (punchInTime && leavingTime <= moment(punchInTime).format('HH:mm')) return 'Leaving time must be after your punch-in time';
  if (!reason) return 'Please enter a reason';
  return null;
}

const isTodayRequest = request => moment(request.date).isSame(moment(), 'day');

// Only today's pending requests can still be changed
const canEdit = request => request.status === 'pending' && isTodayRequest(request);

const workedUntilLeaving = request => formatDuration(getMinutesWorkedUntilLeaving(request));

// "short by 1h 45m" when leaving before the required working time is complete
function shortfall(request) {
  const minutes = getShortfallMinutes(request);
  return minutes ? formatDuration(minutes) : null;
}

// Load a list via a method into state, toggling its loading flag
function loadInto(method, options, setList, setLoading, errorMessage) {
  setLoading(true);
  api.call(method, options, (error, result) => {
    setLoading(false);
    if (error) {
      toastr.error(errorMessage);
      return;
    }
    setList((result && result.data) || []);
  });
}

export default function EarlyLeaveTab({ canApprove, employees }) {
  const [myRequests, setMyRequests] = useState([]);
  const [isLoadingMine, setIsLoadingMine] = useState(true);
  const [teamRequests, setTeamRequests] = useState([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  const [teamFilter, setTeamFilter] = useState({ ...DEFAULT_TEAM_FILTER });
  const [editingId, setEditingId] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [punchInTime, setPunchInTime] = useState(null); // today's punch-in, while still punched in

  // Form fields and "server call running" flags of the three modals
  const [leavingTime, setLeavingTime] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewRemarks, setViewRemarks] = useState('');
  const [processingKind, setProcessingKind] = useState(null); // 'approve' / 'reject' while running
  const [actionRemarks, setActionRemarks] = useState('');
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);

  // The filter values as last chosen, so a reload started from a server callback uses the current ones.
  const teamFilterRef = useRef(teamFilter);

  /**
   * Early leave needs an open punch-in for today. Re-checks attendance each
   * time (the user may punch in after the page loaded), then runs onReady.
   */
  const whenPunchedIn = (onReady) => {
    api.call('attendance.getTodayStatus', (error, result) => {
      if (error) {
        toastr.error('Could not check your attendance for today');
        return;
      }
      const record = result && result.record;
      if (!record || !record.punchInTime) {
        setPunchInTime(null);
        toastr.warning('Please punch in before requesting early leaving');
        return;
      }
      if (result.status !== 'punched_in') {
        setPunchInTime(null);
        toastr.warning('You have already punched out today');
        return;
      }
      setPunchInTime(record.punchInTime);
      onReady();
    });
  };

  const loadMyRequests = () => {
    loadInto('earlyLeaveRequests.getMyRequests', {}, setMyRequests, setIsLoadingMine,
      'Failed to load early leaving requests');
  };

  const loadTeamRequests = () => {
    loadInto('earlyLeaveRequests.getAll', teamFilterRef.current, setTeamRequests, setIsLoadingTeam,
      'Failed to load team early leaving requests');
  };

  const reloadAll = () => {
    loadMyRequests();
    if (canApprove) {
      loadTeamRequests();
    }
  };

  const findRequest = (requestId) => {
    return myRequests.find(r => r._id === requestId)
      || teamRequests.find(r => r._id === requestId);
  };

  const updateTeamFilter = (changes) => {
    const next = { ...teamFilterRef.current, ...changes };
    teamFilterRef.current = next;
    setTeamFilter(next);
    loadTeamRequests();
  };

  useEffect(() => {
    loadMyRequests();
  }, []);

  // canApprove arrives asynchronously from the parent page
  useEffect(() => {
    if (canApprove) {
      loadTeamRequests();
    }
  }, [canApprove]);

  // ------------------------------------------------------------ events

  const newEarlyLeave = (event) => {
    event.preventDefault();
    whenPunchedIn(() => {
      setEditingId(null);
      setLeavingTime('');
      setReason('');
      $('#earlyLeaveFormModal').modal('show');
    });
  };

  const editEarlyLeave = (event, requestId) => {
    event.preventDefault();
    const request = findRequest(requestId);
    if (!request || request.status !== 'pending' || !isTodayRequest(request)) {
      toastr.error("Only today's pending requests can be edited");
      return;
    }
    whenPunchedIn(() => {
      setEditingId(request._id);
      setLeavingTime(request.leavingTime);
      setReason(request.reason);
      $('#earlyLeaveFormModal').modal('show');
    });
  };

  const submitEarlyLeave = (event) => {
    event.preventDefault();
    const trimmedReason = reason.trim();

    const validationError = validateEarlyLeaveForm(leavingTime, trimmedReason, punchInTime);
    if (validationError) {
      toastr.error(validationError);
      return;
    }

    const data = { leavingTime, reason: trimmedReason };
    const editId = editingId;

    callWithSpinner({
      method: editId ? 'earlyLeaveRequests.update' : 'earlyLeaveRequests.create',
      args: editId ? [editId, data] : [data],
      setBusy: setIsSubmitting,
      successMessage: editId ? 'Early leaving request updated' : 'Early leaving request submitted',
      errorMessage: editId ? 'Failed to update request' : 'Failed to create request',
      onSuccess: () => {
        $('#earlyLeaveFormModal').modal('hide');
        reloadAll();
      }
    });
  };

  const withdrawEarlyLeave = async (event, requestId) => {
    event.preventDefault();
    if (!(await fxConfirm('Are you sure you want to cancel this early leaving request?', { tone: 'danger', title: 'Cancel request?', confirmText: 'Cancel request' }))) return;

    api.call('earlyLeaveRequests.cancel', requestId, (error) => {
      if (error) {
        toastr.error(error.reason || 'Failed to cancel request');
        return;
      }
      toastr.success('Early leaving request cancelled');
      reloadAll();
    });
  };

  const viewEarlyLeave = (event, requestId) => {
    event.preventDefault();
    const request = findRequest(requestId);
    if (!request) return;
    setViewing(request);
    setViewRemarks('');
    $('#earlyLeaveViewModal').modal('show');
  };

  // Approve/reject from the view modal
  const processViewing = (event, kind) => {
    event.preventDefault();
    const request = viewing;
    const action = ACTIONS[kind];
    if (!request || !action) return;

    callWithSpinner({
      method: action.method,
      args: [request._id, viewRemarks.trim()],
      setBusy: (busy) => setProcessingKind(busy ? kind : null),
      successMessage: action.successMessage,
      errorMessage: action.errorMessage,
      onSuccess: () => {
        $('#earlyLeaveViewModal').modal('hide');
        reloadAll();
      }
    });
  };

  // Approve/reject from the table row (kind 'approve' / 'reject') and cancelling an
  // approved request (kind 'cancelApproved'): prompt for remarks first
  const promptAction = (event, kind, requestId) => {
    event.preventDefault();
    setPendingAction({ ...ACTIONS[kind], kind, requestId });
    setActionRemarks('');
    $('#earlyLeaveActionModal').modal('show');
  };

  const confirmAction = (event) => {
    event.preventDefault();
    const action = pendingAction;
    if (!action) return;

    callWithSpinner({
      method: action.method,
      args: [action.requestId, actionRemarks.trim()],
      setBusy: setIsConfirmingAction,
      successMessage: action.successMessage,
      errorMessage: action.errorMessage,
      onSuccess: () => {
        $('#earlyLeaveActionModal').modal('hide');
        reloadAll();
      }
    });
  };

  const clearFilters = (event) => {
    event.preventDefault();
    updateTeamFilter({ ...DEFAULT_TEAM_FILTER });
  };

  // ------------------------------------------------------------ values for rendering

  const officeStartTime = formatLeavingTime(OFFICE_START_TIME);
  const officeEndTime = formatLeavingTime(OFFICE_END_TIME);
  const requiredWorkHours = formatDuration(REQUIRED_WORK_MINUTES);
  const punchInLabel = punchInTime ? moment(punchInTime).format('hh:mm A') : '-';
  const todayLabel = moment().format('ddd, MMM DD, YYYY');

  // Pending count only makes sense while the list is showing pending requests
  const pendingCount = teamFilter.status !== 'pending' ? 0 : teamRequests.length;

  const canProcessViewing = !!(viewing && viewing.status === 'pending' && canApprove);

  return (
    <>
      {/* My Early Leave Requests */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">My Early Leaving Requests</h5>
            <small className="text-muted">Request to leave the office before {officeEndTime} today</small>
          </div>
          <button type="button" className="btn btn-primary" id="newEarlyLeaveBtn" onClick={newEarlyLeave}>
            <i className="bx bx-plus me-1"></i>New Early Leaving
          </button>
        </div>
        <div className="card-body">
          {isLoadingMine ? (
            <TableSkeleton rows={5} columns={5} label="Loading early leaving requests…" />
          ) : myRequests.length ? (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Leaving At</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Requested On</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myRequests.map((request) => (
                    <tr key={request._id}>
                      <td>{formatDate(request.date)}</td>
                      <td><span className="badge bg-label-primary">{formatLeavingTime(request.leavingTime)}</span></td>
                      <td><span title={request.reason}>{truncate(request.reason, 30)}</span></td>
                      <td><RequestStatusBadge status={request.status} /></td>
                      <td>{formatDateTime(request.createdAt)}</td>
                      <td>
                        <div className="leave-action-btns">
                          <button className="btn btn-sm btn-outline-primary el-view" data-id={request._id} title="View Details"
                            onClick={(event) => viewEarlyLeave(event, request._id)}>
                            <i className="bx bx-show"></i>
                          </button>
                          {canEdit(request) && (
                            <button className="btn btn-sm btn-outline-warning el-edit" data-id={request._id} title="Edit Request"
                              onClick={(event) => editEarlyLeave(event, request._id)}>
                              <i className="bx bx-edit"></i>
                            </button>
                          )}
                          {isPending(request.status) && (
                            <button className="btn btn-sm btn-outline-danger el-withdraw" data-id={request._id} title="Cancel Request"
                              onClick={(event) => withdrawEarlyLeave(event, request._id)}>
                              <i className="bx bx-x"></i>
                            </button>
                          )}
                          {isApproved(request.status) && (
                            <button className="btn btn-sm btn-outline-danger el-cancel-approved" data-id={request._id} title="Cancel Approved Request"
                              onClick={(event) => promptAction(event, 'cancelApproved', request._id)}>
                              <i className="bx bx-x"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-5">
              <i className="bx bx-run text-muted" style={{ fontSize: '48px' }}></i>
              <p className="text-muted mt-3">No early leaving requests found</p>
            </div>
          )}
        </div>
      </div>

      {/* Team Early Leave Requests (approvers) */}
      {canApprove && (
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">
              Team Early Leaving Requests
              {pendingCount ? <span className="badge bg-danger ms-1">{pendingCount} pending</span> : null}
            </h5>
          </div>
          <div className="card-body">
            <div className="row mb-3 g-2">
              <div className="col-md-3">
                <label className="form-label small text-muted">Status</label>
                <select className="form-select" id="elStatusFilter" value={teamFilter.status}
                  onChange={(event) => updateTeamFilter({ status: event.currentTarget.value })}>
                  {STATUS_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small text-muted">Month</label>
                <input type="month" className="form-control" id="elMonthFilter" value={teamFilter.month}
                  onChange={(event) => updateTeamFilter({ month: event.currentTarget.value })} />
              </div>
              <div className="col-md-3">
                <label className="form-label small text-muted">Employee</label>
                <select className="form-select" id="elEmployeeFilter" value={teamFilter.userId}
                  onChange={(event) => updateTeamFilter({ userId: event.currentTarget.value })}>
                  <option value="">All Employees</option>
                  {employees.map((employee) => (
                    <option key={employee._id} value={employee._id}>{employee.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3 d-flex align-items-end">
                <button className="btn btn-outline-secondary" id="elClearFilters" title="Clear Filters" onClick={clearFilters}>
                  <i className="bx bx-reset me-1"></i>Clear
                </button>
              </div>
            </div>

            {isLoadingTeam ? (
              <TableSkeleton rows={5} columns={6} label="Loading team requests…" />
            ) : teamRequests.length ? (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Date</th>
                      <th>Punch In</th>
                      <th>Leaving At</th>
                      <th>Worked Till Leaving</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Requested On</th>
                      <th>Processed By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamRequests.map((request) => (
                      <tr key={request._id}>
                        <td>{request.userName}</td>
                        <td>{formatDate(request.date)}</td>
                        <td><EarlyLeavePunchIn time={request.punchInTime} /></td>
                        <td><span className="badge bg-label-primary">{formatLeavingTime(request.leavingTime)}</span></td>
                        <td><EarlyLeaveWorked worked={workedUntilLeaving(request)} shortfall={shortfall(request)} /></td>
                        <td><span title={request.reason}>{truncate(request.reason, 30)}</span></td>
                        <td><RequestStatusBadge status={request.status} /></td>
                        <td>{formatDateTime(request.createdAt)}</td>
                        <td>{request.approvedByName ? request.approvedByName : '-'}</td>
                        <td>
                          <div className="leave-action-btns">
                            <button className="btn btn-sm btn-outline-primary el-view" data-id={request._id} title="View Details"
                              onClick={(event) => viewEarlyLeave(event, request._id)}>
                              <i className="bx bx-show"></i>
                            </button>
                            {isPending(request.status) && (
                              <>
                                <button className="btn btn-sm btn-success el-quick-process" data-id={request._id} data-action="approve" title="Approve"
                                  onClick={(event) => promptAction(event, 'approve', request._id)}>
                                  <i className="bx bx-check"></i>
                                </button>
                                <button className="btn btn-sm btn-danger el-quick-process" data-id={request._id} data-action="reject" title="Reject"
                                  onClick={(event) => promptAction(event, 'reject', request._id)}>
                                  <i className="bx bx-x"></i>
                                </button>
                              </>
                            )}
                            {isApproved(request.status) && (
                              <button className="btn btn-sm btn-outline-danger el-cancel-approved" data-id={request._id} title="Cancel"
                                onClick={(event) => promptAction(event, 'cancelApproved', request._id)}>
                                <i className="bx bx-x"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-5">
                <i className="bx bx-check-circle text-success" style={{ fontSize: '48px' }}></i>
                <p className="text-muted mt-3">No early leaving requests match these filters</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New / Edit Early Leave Modal */}
      <div className="modal fade" id="earlyLeaveFormModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {editingId ? (
                  <><i className="bx bx-edit me-2"></i>Edit Early Leaving Request</>
                ) : (
                  <><i className="bx bx-run me-2"></i>New Early Leaving Request</>
                )}
              </h5>
              <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
            </div>
            <form id="earlyLeaveForm" onSubmit={submitEarlyLeave}>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Date</label>
                    <div className="form-control bg-light">{todayLabel}</div>
                    <small className="text-muted">Early leaving can only be requested for today</small>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Punched In At</label>
                    <div className="form-control bg-light">{punchInLabel}</div>
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold" htmlFor="elLeavingTime">Leaving At <span className="text-danger">*</span></label>
                    <input type="time" className="form-control" id="elLeavingTime" min={OFFICE_START_TIME} max={OFFICE_END_TIME} required
                      value={leavingTime} onChange={(event) => setLeavingTime(event.currentTarget.value)} />
                  </div>
                </div>
                <div className="alert alert-info py-2 mb-3">
                  <i className="bx bx-info-circle me-1"></i>
                  Regular office hours are {officeStartTime} to {officeEndTime} ({requiredWorkHours} working hours). Your approver will be notified by email.
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold" htmlFor="elReason">Reason <span className="text-danger">*</span></label>
                  <textarea className="form-control" id="elReason" rows="3" placeholder="Why do you need to leave early?" required
                    value={reason} onChange={(event) => setReason(event.currentTarget.value)}></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
                <button type="submit" className="btn btn-primary" id="elSubmitBtn" disabled={isSubmitting}>
                  <span className={'spinner-border spinner-border-sm me-1' + (isSubmitting ? '' : ' d-none')} id="elSubmitSpinner"></span>
                  {editingId ? 'Update Request' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* View / Approve Early Leave Modal */}
      <div className="modal fade" id="earlyLeaveViewModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title"><i className="bx bx-detail me-2"></i>Early Leaving Details</h5>
              <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
            </div>
            {viewing && (
              <>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-6 mb-3">
                      <label className="form-label fw-bold">Employee</label>
                      <p className="mb-0">{viewing.userName}</p>
                    </div>
                    <div className="col-6 mb-3">
                      <label className="form-label fw-bold">Status</label>
                      <p className="mb-0"><RequestStatusBadge status={viewing.status} /></p>
                    </div>
                    <div className="col-6 mb-3">
                      <label className="form-label fw-bold">Date</label>
                      <p className="mb-0">{formatDate(viewing.date)}</p>
                    </div>
                    <div className="col-6 mb-3">
                      <label className="form-label fw-bold">Leaving At</label>
                      <p className="mb-0">{formatLeavingTime(viewing.leavingTime)}</p>
                    </div>
                    <div className="col-6 mb-3">
                      <label className="form-label fw-bold">Punch In</label>
                      <p className="mb-0"><EarlyLeavePunchIn time={viewing.punchInTime} /></p>
                    </div>
                    <div className="col-6 mb-3">
                      <label className="form-label fw-bold">Worked Till Leaving</label>
                      <p className="mb-0"><EarlyLeaveWorked worked={workedUntilLeaving(viewing)} shortfall={shortfall(viewing)} /></p>
                    </div>
                    <div className="col-12 mb-3">
                      <label className="form-label fw-bold">Reason</label>
                      <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{viewing.reason}</p>
                    </div>
                    <div className="col-12 mb-3">
                      <label className="form-label fw-bold">Requested On</label>
                      <p className="mb-0">{formatDateTime(viewing.createdAt)}</p>
                    </div>
                    {viewing.approvedBy && (
                      <>
                        <div className="col-12 mb-3">
                          <hr />
                          <label className="form-label fw-bold">Processed By</label>
                          <p className="mb-0">{viewing.approvedByName} on {formatDateTime(viewing.approvedAt)}</p>
                        </div>
                        {viewing.approverRemarks && (
                          <div className="col-12 mb-3">
                            <label className="form-label fw-bold">Remarks</label>
                            <p className="mb-0">{viewing.approverRemarks}</p>
                          </div>
                        )}
                      </>
                    )}
                    {isCancelled(viewing.status) && (
                      <>
                        <div className="col-12 mb-3">
                          <hr />
                          <label className="form-label fw-bold text-danger"><i className="bx bx-x-circle me-1"></i>Cancelled By</label>
                          <p className="mb-0">{viewing.cancelledByName} on {formatDateTime(viewing.cancelledAt)}</p>
                        </div>
                        {viewing.cancelRemarks && (
                          <div className="col-12 mb-3">
                            <label className="form-label fw-bold text-danger">Cancellation Reason</label>
                            <p className="mb-0">{viewing.cancelRemarks}</p>
                          </div>
                        )}
                      </>
                    )}
                    {canProcessViewing && (
                      <div className="col-12">
                        <label className="form-label fw-bold" htmlFor="elViewRemarks">Remarks (Optional)</label>
                        <textarea className="form-control" id="elViewRemarks" rows="2" placeholder="Enter any remarks..."
                          value={viewRemarks} onChange={(event) => setViewRemarks(event.currentTarget.value)}></textarea>
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
                  {canProcessViewing && (
                    <>
                      <button type="button" className="btn btn-danger el-process" data-action="reject" disabled={!!processingKind}
                        onClick={(event) => processViewing(event, 'reject')}>
                        <span className={'spinner-border spinner-border-sm me-1 el-process-spinner' + (processingKind === 'reject' ? '' : ' d-none')}></span>
                        <i className="bx bx-x me-1"></i>Reject
                      </button>
                      <button type="button" className="btn btn-success el-process" data-action="approve" disabled={!!processingKind}
                        onClick={(event) => processViewing(event, 'approve')}>
                        <span className={'spinner-border spinner-border-sm me-1 el-process-spinner' + (processingKind === 'approve' ? '' : ' d-none')}></span>
                        <i className="bx bx-check me-1"></i>Approve
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Remarks prompt for quick approve/reject and cancelling approved requests */}
      <div className="modal fade" id="earlyLeaveActionModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            {pendingAction && (
              <>
                <div className="modal-header">
                  <h5 className="modal-title"><i className={'bx ' + pendingAction.icon + ' me-2'}></i>{pendingAction.title}</h5>
                  <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
                </div>
                <div className="modal-body">
                  {pendingAction.warning && (
                    <div className="alert alert-warning py-2 mb-3">
                      <i className="bx bx-info-circle me-1"></i>{pendingAction.warning}
                    </div>
                  )}
                  <label className="form-label fw-bold" htmlFor="elActionRemarks">{pendingAction.remarksLabel}</label>
                  <textarea className="form-control" id="elActionRemarks" rows="3" placeholder="Enter remarks..."
                    value={actionRemarks} onChange={(event) => setActionRemarks(event.currentTarget.value)}></textarea>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
                  <button type="button" className={'btn ' + pendingAction.buttonClass} id="elConfirmActionBtn" disabled={isConfirmingAction}
                    onClick={confirmAction}>
                    <span className={'spinner-border spinner-border-sm me-1' + (isConfirmingAction ? '' : ' d-none')} id="elConfirmActionSpinner"></span>
                    {pendingAction.buttonLabel}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
