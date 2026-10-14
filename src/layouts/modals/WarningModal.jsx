import { useEffect } from 'react';
import { collectId } from './modals';

//   <WarningModal id="notificationWarnigModal" section="Warning" />
export default function WarningModal({ id }) {
  useEffect(() => {
    $('.modal-backdrop').css('z-index', '1000');
  });

  return (
    <div className="example-modal">
      <div className="modal fx-status-modal fx-status-warning" id={collectId(id, 'warningModal')} style={{ zIndex: 1500 }}>
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content">
            <div className="fx-status-icon"><i className="bx bx-error"></i></div>
            <div className="modal-header">
              <h4 className="modal-title">Warning</h4>
            </div>
            <div className="modal-body">
              <p>Notification</p>
              <p></p>
            </div>
            <div className="modal-footer">
              <button type="button" id="closeWarnig" className="btn btn-secondary w-100" data-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
