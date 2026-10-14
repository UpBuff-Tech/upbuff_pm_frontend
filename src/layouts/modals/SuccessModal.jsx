import { collectId } from './modals';

//   <SuccessModal id="userSuccessModal" section="user" />
// Callers replace the text of .modal-body, so the icon and title live outside it.
export default function SuccessModal({ id }) {
  return (
    <div className="modal fade fx-status-modal fx-status-success" id={collectId(id, 'successModal')} tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered modal-sm" role="document">
        <div className="modal-content">
          <div className="fx-status-icon"><i className="bx bx-check"></i></div>
          <div className="modal-header">
            <h4 className="modal-title">Success</h4>
          </div>
          <div className="modal-body">
            <p>Your registeration has done successfully. Please check you mail for your Visitor Card.</p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-primary w-100" data-dismiss="modal">Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}
