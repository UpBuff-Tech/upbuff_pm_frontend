/**
 * Leave Request Page
 * Manage leave and work from home requests
 * @author Claude
 */
import { useEffect, useRef, useState } from 'react';
import moment from 'moment';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { getUserDisplayName, readBackdatedRows, resolveActiveTab } from './leaveRequestHelpers';
import { useLeavePolicy, describeRequestDays } from './useLeavePolicy';
import { PolicySummary, HolidayCalendarTab } from './LeavePolicyPanels';
import EarlyLeaveTab from './EarlyLeaveTab';
import MyRequestsTab from './MyRequestsTab';
import PendingApprovalsTab from './PendingApprovalsTab';
import ApprovedListTab from './ApprovedListTab';
import NewRequestModal from './NewRequestModal';
import BackdatedModal from './BackdatedModal';
import ViewRequestModal from './ViewRequestModal';
import ApprovalModal from './ApprovalModal';
import CancelApprovedModal from './CancelApprovedModal';
import ApprovedItemDetailModal from './ApprovedItemDetailModal';
import ApprovalDetailModal from './ApprovalDetailModal';
import { fxConfirm } from '../../components/dialog/dialog';

const PAGE_STYLES = `
    .leave-action-btns {
      display: flex;
      flex-wrap: nowrap;
      gap: 0.25rem;
      align-items: center;
    }
    .leave-action-btns .btn {
      padding: 0.25rem 0.4rem;
      line-height: 1;
    }
    .leave-action-btns .btn i {
      font-size: 0.9rem;
    }
    /* Backdated entries: distinct colour from every other status so they stand out */
    .badge-backdated {
      background-color: #7c3aed;
      color: #fff;
      box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.2);
    }
    tr.leave-row-backdated > td {
      background-color: rgba(124, 58, 237, 0.07);
    }
    tr.leave-row-backdated > td:first-child {
      box-shadow: inset 4px 0 0 #7c3aed;
    }
  `;

// Minimum date for the request form's date inputs
const todayIsoDate = () => new Date().toISOString().split('T')[0];

const emptyRequestForm = () => ({
  editId: '',
  type: 'leave',
  dayType: 'full',
  fromDate: '',
  toDate: '',
  reason: '',
  ownDays: 0, // flexi days of the request being edited (already counted in the balance)
  fromMin: todayIsoDate(),
  toMin: todayIsoDate()
});

export default function LeaveRequest() {
  const { user, userId } = useAuth();
  const policy = useLeavePolicy();
  const holidayTabRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingApprovals, setIsLoadingApprovals] = useState(true);
  const [isLoadingApprovedList, setIsLoadingApprovedList] = useState(true);
  const [myRequests, setMyRequests] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [approvedList, setApprovedList] = useState([]);
  const [approvedFilter, setApprovedFilter] = useState({ status: '', month: moment().format('YYYY-MM'), userId: '' });
  const [employeeList, setEmployeeList] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [canApprove, setCanApprove] = useState(false);
  const [initialTab] = useState(() => new URLSearchParams(window.location.search).get('tab') || '');
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, wfh: 0 });

  // Backdated entries modal
  const [backdatedRows, setBackdatedRows] = useState([]);
  const [backdatedReview, setBackdatedReview] = useState(null); // entries under review, null while editing
  const [isBackdatedConfirmed, setIsBackdatedConfirmed] = useState(false);
  const [isSavingBackdated, setIsSavingBackdated] = useState(false);
  const backdatedRowSeq = useRef(0);

  // New / edit request modal
  const [requestForm, setRequestForm] = useState(emptyRequestForm);
  const [daysInfo, setDaysInfo] = useState({ visible: false, text: '', warning: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View / approval / cancel modals
  const [viewingRequest, setViewingRequest] = useState(null);
  const [approval, setApproval] = useState({ requestId: '', action: '' });
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);
  const [cancelApprovedId, setCancelApprovedId] = useState('');
  const [cancelApprovedRemarks, setCancelApprovedRemarks] = useState('');
  const [isCancellingApproved, setIsCancellingApproved] = useState(false);
  const [detailRequest, setDetailRequest] = useState(null);
  const [detailRemarks, setDetailRemarks] = useState('');
  const [detailBusyAction, setDetailBusyAction] = useState(null);
  const [approvedItem, setApprovedItem] = useState(null);

  // The filter values as last chosen, so a reload started from a server callback uses the current ones.
  const approvedFilterRef = useRef(approvedFilter);

  // Load my requests
  const loadMyRequests = () => {
    setIsLoading(true);
    policy.reload(); // the flexi balance follows the requests

    api.call('leaveRequests.getMyRequests', {}, (error, result) => {
      setIsLoading(false);

      if (error) {
        toastr.error('Failed to load requests');
        return;
      }

      if (result && result.data) {
        setMyRequests(result.data);

        // Calculate stats
        const newStats = {
          pending: 0,
          approved: 0,
          rejected: 0,
          wfh: 0
        };

        result.data.forEach(req => {
          if (req.status === 'pending') newStats.pending++;
          else if (req.status === 'approved') {
            newStats.approved++;
            if (req.type === 'wfh') newStats.wfh += req.totalDays;
          }
          else if (req.status === 'rejected') newStats.rejected++;
        });

        setStats(newStats);
      }
    });
  };

  // Load pending approvals
  const loadPendingApprovals = () => {
    setIsLoadingApprovals(true);

    api.call('leaveRequests.getPendingApprovals', {}, (error, result) => {
      setIsLoadingApprovals(false);

      if (error) {
        toastr.error('Failed to load pending approvals');
        return;
      }

      if (result && result.data) {
        setPendingApprovals(result.data);
      }
    });
  };

  // Load approved/rejected list
  const loadApprovedList = () => {
    setIsLoadingApprovedList(true);

    const options = {};
    const statusFilter = approvedFilterRef.current.status;
    if (statusFilter) {
      options.status = statusFilter;
    }

    const monthFilter = approvedFilterRef.current.month;
    if (monthFilter) {
      const [year, month] = monthFilter.split('-').map(Number);
      options.month = month;
      options.year = year;
    }

    const employeeFilter = approvedFilterRef.current.userId;
    if (employeeFilter) {
      options.userId = employeeFilter;
    }

    api.call('leaveRequests.getApprovedHistory', options, (error, result) => {
      setIsLoadingApprovedList(false);

      if (error) {
        toastr.error('Failed to load approved list');
        return;
      }

      if (result && result.data) {
        setApprovedList(result.data);
      }
    });
  };

  // The three lists an approval / rejection changes
  const reloadAfterProcessing = () => {
    loadPendingApprovals();
    loadApprovedList();
    loadMyRequests();
  };

  useEffect(() => {
    // Check if user can approve
    api.call('leaveRequests.canApprove', (error, result) => {
      if (!error) {
        setCanApprove(result);
        if (result) {
          loadPendingApprovals();
          loadApprovedList();
          // Load employee list for filter dropdown
          api.call('leaveRequests.getEmployeesWithRequests', (err, employees) => {
            if (!err && employees) {
              setEmployeeList(employees);
            }
          });
          // All active employees for the backdated entry picker
          api.call('user.getActiveUsers', (err, users) => {
            if (!err && users) {
              setActiveUsers(users.map(activeUser => ({ _id: activeUser._id, name: getUserDisplayName(activeUser) })));
            }
          });
        }
      }
    });

    // Initial load
    loadMyRequests();
  }, []);

  // ------------------------------------------------------------ new / edit request

  // Refresh the "N working days" note of the request form (weekends, my holidays and the flexi balance)
  const updateDaysInfo = (form) => {
    const info = describeRequestDays({ ...form, policy });
    if (!info) {
      setDaysInfo((old) => ({ ...old, visible: false }));
    } else {
      setDaysInfo({ visible: true, text: info.text, warning: info.warning });
    }
  };

  const changeRequestForm = (name, value) => {
    const next = { ...requestForm, [name]: value };

    // Update toDate min when fromDate changes
    if (name === 'fromDate') {
      next.toMin = value;
      if (next.toDate && next.toDate < value) {
        next.toDate = value;
      }
    }
    setRequestForm(next);

    if (name === 'fromDate' || name === 'toDate' || name === 'dayType' || name === 'type') {
      updateDaysInfo(next);
    }
  };

  const openNewRequest = (event) => {
    event.preventDefault();
    setRequestForm(emptyRequestForm());
    setDaysInfo((old) => ({ ...old, visible: false }));
    $('#newRequestModal').modal('show');
  };

  const submitRequest = (event) => {
    event.preventDefault();

    const type = requestForm.type;
    const dayType = requestForm.dayType;
    const fromDate = new Date(requestForm.fromDate);
    const toDate = new Date(requestForm.toDate);
    const reason = requestForm.reason.trim();

    if (!reason) {
      toastr.error('Please enter a reason');
      return;
    }

    setIsSubmitting(true);

    const editId = requestForm.editId;
    const methodName = editId ? 'leaveRequests.update' : 'leaveRequests.create';
    const methodArgs = editId
      ? [editId, { type, dayType, fromDate, toDate, reason }]
      : [{ type, dayType, fromDate, toDate, reason }];

    api.call(methodName, ...methodArgs, (error, result) => {
      setIsSubmitting(false);

      if (error) {
        toastr.error(error.reason || (editId ? 'Failed to update request' : 'Failed to create request'));
        return;
      }

      toastr.success(editId ? 'Request updated successfully' : 'Request submitted successfully');
      $('#newRequestModal').modal('hide');
      loadMyRequests();
    });
  };

  const editRequest = (event, requestId) => {
    event.preventDefault();
    const request = myRequests.find(r => r._id === requestId);

    if (!request || request.status !== 'pending') {
      toastr.error('Only pending requests can be edited');
      return;
    }

    // Populate the form with existing data
    const fromDateStr = moment(request.fromDate).format('YYYY-MM-DD');
    const toDateStr = moment(request.toDate).format('YYYY-MM-DD');
    const form = {
      editId: request._id,
      type: request.type,
      dayType: request.dayType || 'full',
      fromDate: fromDateStr,
      toDate: toDateStr,
      reason: request.reason,
      ownDays: request.type === 'leave' ? Number(request.totalDays) || 0 : 0,
      fromMin: todayIsoDate(),
      toMin: fromDateStr
    };
    setRequestForm(form);

    // Show days info
    updateDaysInfo(form);

    $('#newRequestModal').modal('show');
  };

  // ------------------------------------------------------------ backdated entries

  const openBackdatedEntries = (event) => {
    event.preventDefault();
    // Requesters can only record their own leave, so their name is the only option
    if (!canApprove) {
      setActiveUsers([{ _id: userId, name: getUserDisplayName(user || {}) }]);
    }
    // Start the backdated modal fresh with a single empty row.
    setBackdatedReview(null);
    setBackdatedRows([{ key: ++backdatedRowSeq.current }]);
    $('#backdatedModal').modal('show');
  };

  // Append a backdated entry row. Employee/type/day type are copied from the
  // last row so several dates for the same employee are quick to enter.
  const addBackdatedRow = (event) => {
    event.preventDefault();
    const $last = $('#backdatedRows .backdated-row').last();
    const row = { key: ++backdatedRowSeq.current };

    if ($last.length) {
      row.defaults = {
        employee: $last.find('.bd-employee').val(),
        type: $last.find('.bd-type').val(),
        dayType: $last.find('.bd-dayType').val()
      };
    }
    setBackdatedRows([...backdatedRows, row]);
  };

  const removeBackdatedRow = (event, key) => {
    event.preventDefault();
    const remaining = backdatedRows.filter(row => row.key !== key);
    setBackdatedRows(remaining.length ? remaining : [{ key: ++backdatedRowSeq.current }]);
  };

  const reviewBackdatedEntries = (event) => {
    event.preventDefault();
    const { entries, errors } = readBackdatedRows(activeUsers);

    if (errors.length) {
      toastr.error(errors.join('<br>'), 'Please fix these rows');
      return;
    }
    if (!entries.length) {
      toastr.error('Add at least one entry');
      return;
    }
    setIsBackdatedConfirmed(false);
    setBackdatedReview(entries);
  };

  const backToBackdatedRows = (event) => {
    event.preventDefault();
    setBackdatedReview(null);
  };

  const saveBackdatedEntries = (event) => {
    event.preventDefault();
    const review = backdatedReview || [];
    if (!review.length || !isBackdatedConfirmed) return;

    const payload = review.map(entry => ({
      userId: entry.userId,
      type: entry.type,
      dayType: entry.dayType,
      fromDate: moment(entry.fromDate, 'YYYY-MM-DD').toDate(),
      toDate: moment(entry.toDate, 'YYYY-MM-DD').toDate(),
      reason: entry.reason
    }));

    setIsSavingBackdated(true);

    api.call('leaveRequests.createBackdated', payload, (error, count) => {
      setIsSavingBackdated(false);

      if (error) {
        // Nothing was saved; return to the rows so the flagged one can be fixed
        toastr.error(error.reason || 'Failed to save backdated entries');
        setBackdatedReview(null);
        return;
      }

      toastr.success(`${count} backdated entr${count === 1 ? 'y' : 'ies'} saved`);
      $('#backdatedModal').modal('hide');
      setBackdatedRows([]);
      setBackdatedReview(null);
      loadMyRequests();
      if (canApprove) {
        loadApprovedList();
      }
    });
  };

  // ------------------------------------------------------------ my requests

  const viewRequest = (event, requestId) => {
    event.preventDefault();
    const request = myRequests.find(r => r._id === requestId);

    if (request) {
      setViewingRequest(request);
      $('#viewRequestModal').modal('show');
    }
  };

  const cancelRequest = async (event, requestId) => {
    event.preventDefault();

    if (await fxConfirm('Are you sure you want to cancel this request?', { tone: 'danger', title: 'Cancel request?', confirmText: 'Cancel request' })) {
      api.call('leaveRequests.cancel', requestId, (error, result) => {
        if (error) {
          toastr.error(error.reason || 'Failed to cancel request');
          return;
        }
        toastr.success('Request cancelled');
        loadMyRequests();
      });
    }
  };

  // Used by both "cancel approved" buttons (my requests and approved list)
  const openCancelApproved = (event, requestId) => {
    event.preventDefault();
    setCancelApprovedId(requestId);
    setCancelApprovedRemarks('');
    $('#cancelApprovedModal').modal('show');
  };

  const confirmCancelApproved = (event) => {
    event.preventDefault();
    const requestId = cancelApprovedId;
    const remarks = cancelApprovedRemarks || '';

    setIsCancellingApproved(true);

    api.call('leaveRequests.cancelApproved', requestId, remarks, (error) => {
      setIsCancellingApproved(false);

      if (error) {
        toastr.error(error.reason || 'Failed to cancel request');
        return;
      }
      toastr.success('Approved request cancelled');
      $('#cancelApprovedModal').modal('hide');
      loadApprovedList();
      loadMyRequests();
    });
  };

  // ------------------------------------------------------------ pending approvals

  const viewApproval = (event, requestId) => {
    event.preventDefault();
    const request = pendingApprovals.find(r => r._id === requestId);

    if (request) {
      setDetailRequest(request);
      // Clear remarks
      setDetailRemarks('');

      $('#approvalDetailModal').modal('show');
    }
  };

  // Approve / reject from the detail modal
  const processDetailRequest = (event, action) => {
    event.preventDefault();
    const requestId = detailRequest ? detailRequest._id : '';
    const remarks = detailRemarks.trim();
    const isApprove = action === 'approve';

    setDetailBusyAction(action);

    api.call(isApprove ? 'leaveRequests.approve' : 'leaveRequests.reject', requestId, remarks, (error, result) => {
      setDetailBusyAction(null);

      if (error) {
        toastr.error(error.reason || (isApprove ? 'Failed to approve request' : 'Failed to reject request'));
        return;
      }

      toastr.success(isApprove ? 'Request approved successfully' : 'Request rejected successfully');
      $('#approvalDetailModal').modal('hide');
      reloadAfterProcessing();
    });
  };

  // Approve / reject from the table row: prompt for remarks first
  const openApproval = (event, requestId, action) => {
    event.preventDefault();
    setApproval({ requestId, action });
    setApprovalRemarks('');
    $('#approvalModal').modal('show');
  };

  const confirmApproval = (event) => {
    event.preventDefault();

    const requestId = approval.requestId;
    const action = approval.action;
    const remarks = approvalRemarks.trim();

    setIsProcessingApproval(true);

    const methodName = action === 'approve' ? 'leaveRequests.approve' : 'leaveRequests.reject';

    api.call(methodName, requestId, remarks, (error, result) => {
      setIsProcessingApproval(false);

      if (error) {
        toastr.error(error.reason || 'Failed to process request');
        return;
      }

      toastr.success(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      $('#approvalModal').modal('hide');
      reloadAfterProcessing();
    });
  };

  // ------------------------------------------------------------ approved list

  const changeApprovedFilter = (changes) => {
    const next = { ...approvedFilterRef.current, ...changes };
    approvedFilterRef.current = next;
    setApprovedFilter(next);
    loadApprovedList();
  };

  const clearApprovedFilters = (event) => {
    event.preventDefault();
    changeApprovedFilter({ status: '', month: moment().format('YYYY-MM'), userId: '' });
  };

  const viewApprovedItem = (event, requestId) => {
    event.preventDefault();
    const request = approvedList.find(r => r._id === requestId);

    if (request) {
      setApprovedItem(request);
      $('#approvedItemDetailModal').modal('show');
    }
  };

  const activeTab = resolveActiveTab(initialTab, canApprove);
  const myRequestsActive = activeTab === 'myRequests';
  const earlyLeaveActive = activeTab === 'earlyLeave';
  const holidayCalendarActive = activeTab === 'holidayCalendar';
  const pendingApprovalsActive = activeTab === 'pendingApprovals';
  const hasPendingApprovals = pendingApprovals.length > 0;

  return (
    <>
      <style>{PAGE_STYLES}</style>
      <div className="container-xxl flex-grow-1 container-p-y">
        {/* Page Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-bold mb-1">Leave Requests</h4>
            <p className="text-muted mb-0">Flexi leave, work from home and your holiday calendar</p>
          </div>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-outline-primary" id="backdatedEntryBtn" title="Record a past leave that was missed"
              onClick={openBackdatedEntries}>
              <i className="bx bx-history me-1"></i>Backdated Entry
            </button>
            <button type="button" className="btn btn-primary" id="newRequestBtn" onClick={openNewRequest}>
              <i className="bx bx-plus me-1"></i>New Request
            </button>
          </div>
        </div>

        {/* Leave balance under the holiday policy + my request counts */}
        <PolicySummary policy={policy} stats={stats} onChooseOptional={() => holidayTabRef.current && holidayTabRef.current.click()} />

        {/* Tabs */}
        <ul className="nav nav-tabs mb-3" role="tablist">
          <li className="nav-item">
            <button className={'nav-link' + (myRequestsActive ? ' active' : '')} data-bs-toggle="tab" data-bs-target="#myRequests" type="button">
              <i className="bx bx-user me-1"></i>My Requests
            </button>
          </li>
          <li className="nav-item">
            <button className={'nav-link' + (holidayCalendarActive ? ' active' : '')} data-bs-toggle="tab" data-bs-target="#holidayCalendar" type="button" ref={holidayTabRef}>
              <i className="bx bx-calendar-star me-1"></i>Holiday Calendar
            </button>
          </li>
          <li className="nav-item">
            <button className={'nav-link' + (earlyLeaveActive ? ' active' : '')} data-bs-toggle="tab" data-bs-target="#earlyLeave" type="button">
              <i className="bx bx-run me-1"></i>Early Leaving
            </button>
          </li>
          {canApprove && (
            <>
              <li className="nav-item">
                <button className={'nav-link' + (pendingApprovalsActive ? ' active' : '')} data-bs-toggle="tab" data-bs-target="#pendingApprovals" type="button">
                  <i className="bx bx-check-circle me-1"></i>Pending Approvals
                  {hasPendingApprovals && (
                    <span className="badge bg-danger ms-1">{pendingApprovals.length}</span>
                  )}
                </button>
              </li>
              <li className="nav-item">
                <button className="nav-link" data-bs-toggle="tab" data-bs-target="#approvedList" type="button">
                  <i className="bx bx-history me-1"></i>Approved List
                </button>
              </li>
            </>
          )}
        </ul>

        <div className="tab-content">
          {/* My Requests Tab */}
          <div className={'tab-pane fade' + (myRequestsActive ? ' show active' : '')} id="myRequests" role="tabpanel">
            <div className="card">
              <div className="card-body">
                <MyRequestsTab
                  isLoading={isLoading}
                  requests={myRequests}
                  onNewRequest={openNewRequest}
                  onView={viewRequest}
                  onEdit={editRequest}
                  onCancel={cancelRequest}
                  onCancelApproved={openCancelApproved}
                />
              </div>
            </div>
          </div>

          {/* Holiday Calendar Tab: fixed holidays and my optional picks */}
          <div className={'tab-pane fade' + (holidayCalendarActive ? ' show active' : '')} id="holidayCalendar" role="tabpanel">
            <HolidayCalendarTab policy={policy} />
          </div>

          {/* Early Leaving Tab */}
          <div className={'tab-pane fade' + (earlyLeaveActive ? ' show active' : '')} id="earlyLeave" role="tabpanel">
            <EarlyLeaveTab canApprove={canApprove} employees={activeUsers} />
          </div>

          {canApprove && (
            <>
              {/* Pending Approvals Tab */}
              <div className={'tab-pane fade' + (pendingApprovalsActive ? ' show active' : '')} id="pendingApprovals" role="tabpanel">
                <div className="card">
                  <div className="card-body">
                    <PendingApprovalsTab
                      isLoading={isLoadingApprovals}
                      requests={pendingApprovals}
                      onView={viewApproval}
                      onApprove={(event, requestId) => openApproval(event, requestId, 'approve')}
                      onReject={(event, requestId) => openApproval(event, requestId, 'reject')}
                    />
                  </div>
                </div>
              </div>

              {/* Approved List Tab */}
              <div className="tab-pane fade" id="approvedList" role="tabpanel">
                <div className="card">
                  <div className="card-body">
                    <ApprovedListTab
                      isLoading={isLoadingApprovedList}
                      requests={approvedList}
                      filter={approvedFilter}
                      employees={employeeList}
                      onFilterChange={changeApprovedFilter}
                      onClearFilters={clearApprovedFilters}
                      onView={viewApprovedItem}
                      onCancel={openCancelApproved}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <NewRequestModal
        form={requestForm}
        daysInfo={daysInfo}
        isSubmitting={isSubmitting}
        onChange={changeRequestForm}
        onSubmit={submitRequest}
      />

      <BackdatedModal
        rows={backdatedRows}
        review={backdatedReview}
        users={activeUsers}
        lockEmployee={!canApprove}
        isConfirmed={isBackdatedConfirmed}
        isSaving={isSavingBackdated}
        onAddRow={addBackdatedRow}
        onRemoveRow={removeBackdatedRow}
        onReview={reviewBackdatedEntries}
        onBack={backToBackdatedRows}
        onConfirmChange={(event) => setIsBackdatedConfirmed(event.currentTarget.checked)}
        onSave={saveBackdatedEntries}
      />

      <ViewRequestModal request={viewingRequest} />

      <ApprovalModal
        requestId={approval.requestId}
        action={approval.action}
        remarks={approvalRemarks}
        isProcessing={isProcessingApproval}
        onRemarksChange={setApprovalRemarks}
        onConfirm={confirmApproval}
      />

      <CancelApprovedModal
        requestId={cancelApprovedId}
        remarks={cancelApprovedRemarks}
        isCancelling={isCancellingApproved}
        onRemarksChange={setCancelApprovedRemarks}
        onConfirm={confirmCancelApproved}
      />

      <ApprovedItemDetailModal request={approvedItem} />

      <ApprovalDetailModal
        request={detailRequest}
        remarks={detailRemarks}
        busyAction={detailBusyAction}
        onRemarksChange={setDetailRemarks}
        onApprove={(event) => processDetailRequest(event, 'approve')}
        onReject={(event) => processDetailRequest(event, 'reject')}
      />
    </>
  );
}
