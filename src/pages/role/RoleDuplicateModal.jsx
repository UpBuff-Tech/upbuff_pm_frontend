/**
 * @author Nithin
 */

// "Confirm Duplication" modal of a role (#duplicateConfirmation).

/**
 * @param role                  the word used for "Role" (config roleName)
 * @param duplicateName         the name typed for the copy
 * @param onDuplicateNameChange (value) => ...
 * @param onDuplicate           click on "Yes please!"
 * @param onClose               click on "Not now"
 */
export default function RoleDuplicateModal({ role, duplicateName, onDuplicateNameChange, onDuplicate, onClose }) {
  return (
    <div className="modal fade" id="duplicateConfirmation" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="categoryHeaders"></h5>
            <button type="button" className="closen btn-close" data-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <div id="categoryBodys">
              <div className="row gy-3">
                <div className="col-md mb-3 ">The {role}, '<span id="categoryNameDups" className="text-bold"></span>' contains
                  '<span id="roleTotals" className="text-bold"></span>' User(s).
                </div>
              </div>
              <div className="row gy-3">
                <div className="col-md mb-3 danger-color">
                  Are you sure to duplicate the role- '<span id="roleNameDups" className="text-bold"></span>' ? <br />
                </div>
              </div>
            </div>
            <div className="row gy-3">
              <div className="col-md mb-3">
                <label className="form-label"> Role </label>
                <input type="text" placeholder="Please enter new role" id="duplicateName"
                  className="duplicateName form-control"
                  value={duplicateName} onChange={(event) => onDuplicateNameChange(event.target.value)} />
              </div>
            </div>
            <input type="hidden" id="confirmedUuids" />
          </div>
          <div className="modal-footer">
            <button id="categoryDuplicate" className="btn btn-success" onClick={onDuplicate}>Yes please!</button>
            <button type="button" className="btn btn-secondary" data-dismiss="modal" id="closeDuplicate" onClick={onClose}>Not now</button>
          </div>
        </div>
      </div>
    </div>
  );
}
