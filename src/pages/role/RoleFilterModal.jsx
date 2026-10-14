/**
 * @author Nithin
 */

// "Filter Search" modal of the role list (#filterModal).

/**
 * @param onSubmit   submit of the filter form
 * @param onClose    click on the close (x) button
 */
export default function RoleFilterModal({ onSubmit, onClose }) {
  return (
    <div className="modal fade" id="filterModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog " role="document">
        <form autoComplete="off" className="userFilter" id="userFilter" onSubmit={onSubmit}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="filterHeader"></h5>
              <button type="button" className="close btn-close" data-dismiss="modal" aria-label="Close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <div style={{ padding: '5px' }}>
                <label htmlFor="EMPcode" className="form-label">Name</label>
                <input type="text" className="form-control validation" name="name" placeholder="Role Name" id="name" />
                <label htmlFor="Firstname" className="form-label">Description</label>
                <input type="text" className="form-control validation" placeholder="Description" id="description"
                  name="description" />
              </div>
            </div>
            <div className="modal-footer">
              <button id="searchFilter" type="submit" className="btn btn-success">Search</button>
              <button type="button" className="btn btn-secondary" data-dismiss="modal" id="close">Close</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
