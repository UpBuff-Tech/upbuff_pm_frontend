// The table view of the client list: one row per client, the same data and actions as ClientCard.
//
//   <ClientTableView clients={clientList} hiddenClientIds={[...]} onView={...} onEdit={...} onDelete={...} />
//
// `hiddenClientIds` are the rows the search box filtered out.

import { useAuth } from '../../auth/AuthContext';
import { formatDate } from './utility';

const CELL_STYLE = { wordWrap: 'break-word' };
const HIDDEN = { display: 'none' };

/** "01-01-2026 → 31-12-2026", or "-" when there is no period. */
function periodText(details) {
  if (!details || !details.startDate) return '-';
  return `${formatDate(details.startDate)} → ${formatDate(details.endDate)}`;
}

export default function ClientTableView({ clients, hiddenClientIds, onView, onEdit, onDelete }) {
  const { userCan } = useAuth();
  const canUpdate = userCan('client_update');
  const canDelete = userCan('client_delete');

  return (
    <div className="table-responsive text-nowrap"
      style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
      <table className="table table-hover table-striped">
        <thead>
          <tr>
            <th style={CELL_STYLE}>Sl No</th>
            <th style={CELL_STYLE}>Client</th>
            <th style={CELL_STYLE}>Phase</th>
            <th style={CELL_STYLE}>Products</th>
            <th style={CELL_STYLE}>Phone</th>
            <th style={CELL_STYLE}>Email</th>
            <th style={CELL_STYLE}>AMC Period</th>
            <th style={CELL_STYLE}>Status</th>
            <th className="text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="table-border-bottom-0">
          {clients.map((client, index) => {
            const products = client.productsPurchased || [];
            return (
              <tr key={client._id} style={hiddenClientIds.includes(client._id) ? HIDDEN : undefined}>
                <td style={CELL_STYLE}>{index + 1}</td>
                <td style={CELL_STYLE}>
                  <a href="#" className="fw-semibold text-dark" onClick={(event) => onView(event, client)}>{client.clientName}</a>
                  <div><small className="text-muted">ID: {client.clientId}</small></div>
                </td>
                <td style={CELL_STYLE}>
                  {client.clientPhase ? <span className="badge bg-label-info">{client.clientPhase}</span> : '-'}
                </td>
                <td style={CELL_STYLE}>
                  {products.length > 0 ? (
                    <div className="d-flex flex-wrap gap-1">
                      {products.map((product, i) => (
                        <span className="badge bg-label-primary" key={i}>{product.productName}</span>
                      ))}
                    </div>
                  ) : '-'}
                </td>
                <td style={CELL_STYLE}>
                  {client.phone ? <a href={`tel:${client.phone}`} className="text-dark">{client.phone}</a> : '-'}
                </td>
                <td style={CELL_STYLE}>
                  {client.email ? <a href={`mailto:${client.email}`} className="text-dark">{client.email}</a> : '-'}
                </td>
                <td style={CELL_STYLE}>
                  {periodText(client.amcDetails)}
                  {client.sapAmcDetails && client.sapAmcDetails.startDate && (
                    <div><small className="text-muted">SAP: {periodText(client.sapAmcDetails)}</small></div>
                  )}
                </td>
                <td style={CELL_STYLE}>
                  {client.active ? (
                    <span className="badge bg-label-success">Active</span>
                  ) : (
                    <span className="badge bg-label-secondary">Inactive</span>
                  )}
                </td>
                <td className="text-center">
                  <div className="dropdown">
                    <button type="button" className="btn btn-sm btn-icon dropdown-toggle hide-arrow" data-bs-toggle="dropdown">
                      <i className="bx bx-dots-vertical-rounded"></i>
                    </button>
                    <div className="dropdown-menu">
                      <a className="dropdown-item" href="#" onClick={(event) => onView(event, client)}>
                        <i className="bx bx-show me-1"></i> View
                      </a>
                      {canUpdate && (
                        <a className="dropdown-item" href="#" onClick={(event) => onEdit(event, client)}>
                          <i className="bx bx-edit me-1"></i> Edit
                        </a>
                      )}
                      {canDelete && (
                        <a className="dropdown-item text-danger" href="#" onClick={(event) => onDelete(event, client)}>
                          <i className="bx bx-trash me-1"></i> Delete
                        </a>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
