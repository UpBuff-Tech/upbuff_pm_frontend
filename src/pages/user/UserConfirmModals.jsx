// The three "Are you sure ...?" modals of the user list page:
//   #userDelConfirmation     - block (deactivate) a user
//   #companyDelConfirmation  - delete a user
//   #userActiveConfirmation  - activate a user
//
//   confirm - what the page put into the modals: { confirmedUuid, userNameDup, userHeader,
//             confirmedUuids, userNameDups, userHeaders }
//   onUserRemove, onCompanyRemove, onUserActivate - handlers of the "Yes please!" buttons

import { closeParentModal } from './userFormHelpers';

export default function UserConfirmModals({ confirm, onUserRemove, onCompanyRemove, onUserActivate }) {
  return (
    <>
      <div className="modal fade" id="userDelConfirmation" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog " role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="userHeaderBookiong"></h5>
              <button type="button" className="close btn-close" data-dismiss="modal" aria-label="Close" onClick={closeParentModal}></button>
            </div>
            <div className="modal-body">
              <div id="usersBody">
                <p className="danger-color">
                  Are you sure to block Business Partner- &apos;<span id="userNameDup" className="text-bold">{confirm.userNameDup}</span>&apos; ?
                </p>
              </div>
              <input type="hidden" id="confirmedUuid" value={confirm.confirmedUuid} readOnly />
            </div>
            <div className="modal-footer">
              <button id="userRemove" className="btn btn-danger" onClick={onUserRemove}>Yes please!</button>
              <button type="button" className="btn btn-secondary" data-dismiss="modal" id="userClose" onClick={closeParentModal}>Not
                now</button>
            </div>
          </div>
        </div>
      </div>


      <div className="modal fade" id="companyDelConfirmation" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog " role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="userHeader">{confirm.userHeader}</h5>
              <button type="button" className="close btn-close" data-dismiss="modal" aria-label="Close" onClick={closeParentModal}></button>
            </div>
            <div className="modal-body">
              <div id="usersBody">
                <p className="danger-color">
                  Are you sure to delete Company- &apos;<span id="userNameDuplication" className="text-bold"></span>&apos; ?
                </p>
              </div>
              <input type="hidden" id="confirmedUuid" />
            </div>
            <div className="modal-footer">
              <button id="companyRemove" className="btn btn-danger" onClick={onCompanyRemove}>Yes please!</button>
              <button type="button" className="btn btn-default" data-dismiss="modal" id="userClose" onClick={closeParentModal}>Not
                now</button>
            </div>
          </div>
        </div>
      </div>


      <div className="modal fade" id="userActiveConfirmation" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog " role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="userHeaders">{confirm.userHeaders}</h5>
              <button type="button" className="close btn-close" data-dismiss="modal" aria-label="Close" onClick={closeParentModal}></button>
            </div>
            <div className="modal-body">
              <div id="usersBody">
                <p className="success-color">
                  Are you sure to activate Company- &apos;<span id="userNameDups" className="text-bold">{confirm.userNameDups}</span>&apos; ?
                </p>
              </div>
              <input type="hidden" id="confirmedUuids" value={confirm.confirmedUuids} readOnly />
            </div>
            <div className="modal-footer">
              <button id="userActivate" className="btn btn-success" onClick={onUserActivate}>Yes please!</button>
              <button type="button" className="btn btn-default" data-dismiss="modal" id="userClose" onClick={closeParentModal}>Not
                now</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
