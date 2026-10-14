import { collectId } from './modals';

//   <ErrorModal id="userErrorModal" section="user" />
// Callers replace the text of .modal-body, so the icon and title live outside it.
export default function ErrorModal({ id, section }) {
  return (
    <div className="modal fade fx-status-modal fx-status-error" id={collectId(id, 'errorModal')} tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered modal-sm" role="document">
        <div className="modal-content">
          <div className="fx-status-icon"><i className="bx bx-x"></i></div>
          <div className="modal-header">
            <h4 className="modal-title">Something went wrong</h4>
          </div>
          <div className="modal-body">
            <p id="message">Unable to register the {section}. Please try again</p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary w-100" data-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
