/**
 * Client Detail View Modal (#clientDetailPage) of the Clients page.
 *
 *   <ClientDetailModal loading={detailLoading} detail={detail} />
 *
 * `detail` is what buildClientDetail() returns (null until a client was opened).
 */
import moment from 'moment';
import { DetailHeader, DetailSection, DetailGrid, DetailField, Pill, Person, EmptyState } from '../../components/detailModal/DetailModal';
import { Skeleton, SkeletonText } from '../../components/skeleton/Skeleton';

function periodLabel(period) {
  if (period && period.startDate && period.endDate) {
    const start = moment(period.startDate).format('MMM DD, YYYY');
    const end = moment(period.endDate).format('MMM DD, YYYY');
    return `${start} - ${end}`;
  }
  return '';
}

/**
 * Turns a client document into what the modal shows. Missing texts are '' (the modal shows "Not provided").
 *   products      = [{ name, date }]         date is 'MMM DD, YYYY' or ''
 *   assignedUsers = [{ id, name, email }]
 * `usersMap` is { userId: user } of the users that can be assigned.
 */
export function buildClientDetail(res, usersMap) {
  // Products
  const products = [];
  if (res.productsPurchased && res.productsPurchased.length > 0) {
    res.productsPurchased.forEach(p => {
      products.push({
        name: p.productName,
        date: p.purchaseDate ? moment(p.purchaseDate).format('MMM DD, YYYY') : ''
      });
    });
  }

  // Assigned Users
  const assignedUsers = [];
  if (res.members && res.members.length > 0) {
    res.members.forEach(userId => {
      const user = usersMap[userId];
      if (user) {
        const userName = `${user.profile.firstName} ${user.profile.lastName}`;
        const userEmail = user.emails && user.emails[0] ? user.emails[0].address : '';
        assignedUsers.push({ id: userId, name: userName, email: userEmail });
      }
    });
  }

  return {
    clientId: res.clientId || '',
    clientName: res.clientName || '',
    email: res.email || '',
    phone: res.phone || '',
    address: res.address || '',
    gstNumber: res.gstNumber || '',
    clientPhase: res.clientPhase || '',
    amcDetails: periodLabel(res.amcDetails),
    sapAmcDetails: periodLabel(res.sapAmcDetails),
    products,
    assignedUsers
  };
}

function DetailSkeleton() {
  return (
    <div id="clientDetailLoader" className="dm-section" role="status" aria-busy="true">
      <span className="visually-hidden">Loading client details...</span>
      <Skeleton width="35%" height={14} />
      <div className="mt-3"><SkeletonText lines={4} /></div>
      <div className="mt-4"><SkeletonText lines={3} /></div>
    </div>
  );
}

export default function ClientDetailModal({ loading, detail }) {
  const name = detail ? detail.clientName : '';

  return (
    <div className="modal fade dm-modal" id="clientDetailPage" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-lg modal-dialog-scrollable" role="document">
        <div className="modal-content">
          <DetailHeader
            icon={name ? undefined : 'bx-buildings'}
            avatar={name || undefined}
            tone="indigo"
            eyebrow={detail && detail.clientId ? 'Client · ' + detail.clientId : 'Client'}
            title={loading ? 'Client Details' : (name || 'Client Details')}
            titleId="clientH"
            meta={!loading && detail && (detail.clientPhase || detail.email) ? (
              <>
                {detail.clientPhase && <Pill tone="cyan" dot>{detail.clientPhase}</Pill>}
                {detail.email && <span className="dm-meta"><i className="bx bx-envelope"></i>{detail.email}</span>}
              </>
            ) : null}
            closeProps={{ className: 'close closen btn-close' }}
          />
          <div className="modal-body p-0">
            <div className="dm-body">
              {loading || !detail ? (
                <DetailSkeleton />
              ) : (
                <>
                  <DetailSection title="Contact" icon="bx-phone">
                    <DetailGrid>
                      <DetailField label="Client ID" id="detailClientId">{detail.clientId}</DetailField>
                      <DetailField label="Client Name" id="detailClientName">{detail.clientName}</DetailField>
                      <DetailField label="Email" icon="bx-envelope" id="detailEmail">{detail.email}</DetailField>
                      <DetailField label="Phone" icon="bx-phone" id="detailPhone">{detail.phone}</DetailField>
                      <DetailField label="GST Number" id="detailGstNumber">{detail.gstNumber}</DetailField>
                      <DetailField label="Client Phase" id="detailClientPhase">{detail.clientPhase}</DetailField>
                      <DetailField label="Address" icon="bx-map" wide text id="detailAddress">{detail.address}</DetailField>
                    </DetailGrid>
                  </DetailSection>

                  <DetailSection title="Contracts" icon="bx-calendar-check">
                    <DetailGrid>
                      <DetailField label="AMC Period" id="detailAmcDetails" empty="No AMC">{detail.amcDetails}</DetailField>
                      <DetailField label="SAP AMC Period" id="detailSapAmcDetails" empty="No SAP AMC">{detail.sapAmcDetails}</DetailField>
                    </DetailGrid>
                  </DetailSection>

                  <DetailSection title="Products Purchased" icon="bx-package" count={detail.products.length}>
                    <div id="detailProducts">
                      {detail.products.length ? (
                        <div className="dm-tags">
                          {detail.products.map((product, index) => (
                            <span className="dm-tag" key={index}>
                              {product.name}
                              {product.date && <small>{product.date}</small>}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <EmptyState icon="bx-package">No products purchased</EmptyState>
                      )}
                    </div>
                  </DetailSection>

                  <DetailSection title="Assigned Users" icon="bx-group" count={detail.assignedUsers.length}>
                    <div id="detailAssignedUsers">
                      {detail.assignedUsers.length ? (
                        <div className="dm-people">
                          {detail.assignedUsers.map((user) => (
                            <Person key={user.id} name={user.name} sub={user.email} />
                          ))}
                        </div>
                      ) : (
                        <EmptyState icon="bx-user-x">No users assigned</EmptyState>
                      )}
                    </div>
                  </DetailSection>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
