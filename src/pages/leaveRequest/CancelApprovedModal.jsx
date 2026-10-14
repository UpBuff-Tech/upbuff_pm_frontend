// Cancel Approved Request Modal: asks for an optional reason before cancelling an approved request.
export default function CancelApprovedModal({ requestId, remarks, isCancelling, onRemarksChange, onConfirm }) {
  return (
    <div className="modal fade" id="cancelApprovedModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bx bx-x-circle me-2 text-danger"></i>Cancel Approved Request
            </h5>
            <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <input type="hidden" id="cancelApprovedRequestId" value={requestId} />
            <div className="alert alert-warning py-2 mb-3">
              <i className="bx bx-info-circle me-1"></i>
              This will cancel the approved leave request. This action cannot be undone.
            </div>
            <div className="mb-3">
              <label className="form-label fw-bold" htmlFor="cancelApprovedRemarks">Reason for Cancellation (Optional)</label>
              <textarea className="form-control" id="cancelApprovedRemarks" rows="3" placeholder="Enter reason for cancellation..."
                value={remarks} onChange={(event) => onRemarksChange(event.currentTarget.value)}></textarea>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
            <button type="button" className="btn btn-danger" id="confirmCancelApprovedBtn" disabled={isCancelling} onClick={onConfirm}>
              <span className={'spinner-border spinner-border-sm me-1' + (isCancelling ? '' : ' d-none')} id="cancelApprovedSpinner"></span>
              Cancel Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
