/**
 * Client Delete Confirmation Modal (#clientDelConfirmation) of the Clients page.
 *
 *   <ClientDeleteModal header="Confirm Deletion" clientName="Acme" clientId={id} onConfirm={handleRemove} />
 */
export default function ClientDeleteModal({ header, clientName, clientId, onConfirm }) {
  return (
    <div className="modal fade" id="clientDelConfirmation" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="clientHeader">{header}</h5>
            <button type="button" className="close btn-close" data-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <div id="clientBody">
              <p className="danger-color">
                Are you sure to remove client &apos;<span id="clientNameDup" className="text-bold">{clientName}</span>&apos; ?
              </p>
            </div>
            <input type="hidden" id="confirmedClientId" value={clientId} readOnly />
          </div>
          <div className="modal-footer">
            <button id="clientRemove" className="btn btn-danger" onClick={onConfirm}>Yes please!</button>
            <button type="button" className="btn btn-default" data-dismiss="modal" id="clientClose">Not now</button>
          </div>
        </div>
      </div>
    </div>
  );
}
