/**
 * One client card of the Clients page (the body of {{#each clientList}} in the old client.html).
 *
 *   <ClientCard client={client} hidden={false} onView={...} onEdit={...} onDelete={...} />
 *
 * `hidden` is true when the search box filtered this card out.
 */
import { useAuth } from '../../auth/AuthContext';
import { formatDate } from './utility';

const HIDDEN = { display: 'none' };
const GREY_BOX = { backgroundColor: '#F3F4F6' };

/** "Product A,Product B," - the text the search box looks through (the old data-products attribute). */
export function productNamesText(client) {
  return (client.productsPurchased || []).map((product) => `${product.productName || ''},`).join('');
}

export default function ClientCard({ client, hidden, onView, onEdit, onDelete }) {
  const { userCan } = useAuth();
  const canUpdate = userCan('client_update');
  const canDelete = userCan('client_delete');

  const products = client.productsPurchased || [];
  const amcDetails = client.amcDetails || {};
  const sapAmcDetails = client.sapAmcDetails || {};

  return (
    <div className="col-md-6 col-lg-3 client-card-item"
      data-client-name={client.clientName || ''}
      data-client-id={client.clientId || ''}
      data-email={client.email || ''}
      data-phone={client.phone || ''}
      data-products={productNamesText(client)}
      style={hidden ? HIDDEN : undefined}>
      <div className="card h-100 client-card border-0 shadow-sm" style={{ padding: '10px', borderRadius: '10px' }}>
        <div className="card-header p-2 border-0 bg-transparent">
          <div className="d-flex justify-content-between align-items-start">
            <div className="flex-grow-1" style={{ minWidth: 0 }}>
              <h6 className="card-title mb-0 fw-bolder text-dark view text-truncate" id={client._id} style={{ cursor: 'pointer' }}
                onClick={(event) => onView(event, client)}>{client.clientName}</h6>
              <small className="text-muted">ID: {client.clientId}</small>
            </div>
            <div className="d-flex align-items-center gap-2">
              {client.active ? (
                <span className="badge small" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>Active</span>
              ) : (
                <span className="badge small" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>Inactive</span>
              )}
              {(canUpdate || canDelete) && (
                <div className="dropdown">
                  <button className="btn btn-sm btn-text p-0" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <i className="fa fa-ellipsis-v"></i>
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end">
                    {canUpdate && (
                      <li><a className="dropdown-item edit" href="#" id={client._id} onClick={(event) => onEdit(event, client)}><i className="fa fa-pencil me-2"></i>Edit</a></li>
                    )}
                    {canDelete && (
                      <li><a className="dropdown-item text-danger deactivate" href="#" id={client._id} onClick={(event) => onDelete(event, client)}><i className="fa fa-trash me-2"></i>Delete</a></li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="card-body p-2 d-flex flex-column">
          {client.address && (
            <div className="mb-2">
              <div className="d-flex align-items-start">
                <i className="fa fa-map-marker me-2 mt-1 flex-shrink-0" style={{ fontSize: '0.75rem', color: '#EF4444' }}></i>
                <small className="text-muted client-address">{client.address}</small>
              </div>
            </div>
          )}

          {/* Client Phase */}
          {client.clientPhase && (
            <div className="mb-2">
              <span className="badge bg-label-info small">{client.clientPhase}</span>
            </div>
          )}

          {/* Products */}
          {products.length > 0 && (
            <div className="mb-2">
              <small className="text-muted d-block mb-1">Products:</small>
              <div className="d-flex flex-wrap gap-1">
                {products.map((product, index) => (
                  <span className="badge bg-label-primary small" key={index}>{product.productName}</span>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Status Line: Phone, Email */}
          <div className="border-top pt-2 mt-auto">
            <div className="d-flex align-items-center flex-wrap gap-1" style={{ fontSize: '0.7rem' }}>
              {/* Phone */}
              {client.phone && (
                <div className="rounded px-2 py-1 flex-shrink-0" style={GREY_BOX}>
                  <i className="fa fa-phone me-1 text-muted"></i>
                  <a href={`tel:${client.phone}`} className="text-decoration-none text-dark">{client.phone}</a>
                </div>
              )}

              {/* Email */}
              {client.email && (
                <div className="rounded px-2 py-1 text-truncate" style={{ backgroundColor: '#F3F4F6', minWidth: 0 }}>
                  <i className="fa fa-envelope me-1 text-muted"></i>
                  <a href={`mailto:${client.email}`} className="text-decoration-none text-dark">{client.email}</a>
                </div>
              )}
            </div>

            {/* AMC Period Line */}
            {amcDetails.startDate && (
              <div className="d-flex justify-content-between align-items-center mt-2 gap-2" style={{ fontSize: '0.7rem' }}>
                {/* AMC Period */}
                <div className="rounded px-2 py-1 flex-grow-1" style={GREY_BOX}>
                  <span className="fw-bold text-muted">AMC Period:</span>
                  <span className="text-dark ms-1">{formatDate(amcDetails.startDate)} <i className="fa fa-long-arrow-right mx-1"></i> {formatDate(amcDetails.endDate)}</span>
                </div>

                {/* SAP AMC Period */}
                {sapAmcDetails.startDate && (
                  <div className="rounded px-2 py-1 flex-grow-1" style={GREY_BOX}>
                    <span className="fw-bold text-muted">SAP AMC:</span>
                    <span className="text-dark ms-1">{formatDate(sapAmcDetails.startDate)} <i className="fa fa-long-arrow-right mx-1"></i> {formatDate(sapAmcDetails.endDate)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
