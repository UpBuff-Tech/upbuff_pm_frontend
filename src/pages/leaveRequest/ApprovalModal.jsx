/**
 * Approval Modal: remarks prompt for the quick Approve / Reject buttons of the pending list.
 * `action` is '' until one of them was clicked, then 'approve' or 'reject'.
 */
export default function ApprovalModal({ requestId, action, remarks, isProcessing, onRemarksChange, onConfirm }) {
  let title = <><i className="bx bx-check-circle me-2"></i>Approve Request</>;
  if (action === 'approve') title = <><i className="bx bx-check-circle me-2 text-success"></i>Approve Request</>;
  if (action === 'reject') title = <><i className="bx bx-x-circle me-2 text-danger"></i>Reject Request</>;

  return (
    <div className="modal fade" id="approvalModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="approvalModalTitle">
              {title}
            </h5>
            <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <input type="hidden" id="approvalRequestId" value={requestId} />
            <input type="hidden" id="approvalAction" value={action} />
            <div className="mb-3">
              <label className="form-label fw-bold" htmlFor="approvalRemarks">Remarks (Optional)</label>
              <textarea className="form-control" id="approvalRemarks" rows="3" placeholder="Enter any remarks..."
                value={remarks} onChange={(event) => onRemarksChange(event.currentTarget.value)}></textarea>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
            {action ? (
              <button type="button" className={'btn btn-primary ' + (action === 'approve' ? 'btn-success' : 'btn-danger')}
                id="confirmApprovalBtn" disabled={isProcessing} onClick={onConfirm}>
                {action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            ) : (
              <button type="button" className="btn btn-primary" id="confirmApprovalBtn" disabled={isProcessing} onClick={onConfirm}>
                <span className={'spinner-border spinner-border-sm me-1' + (isProcessing ? '' : ' d-none')} id="approvalSpinner"></span>
                Confirm
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
