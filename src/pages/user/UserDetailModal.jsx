// The "Details of ..." modal of the user list page (#userDetailPage).
//   detail     - { user, roleName } from user.dataGets, or null before the first user was opened
//   printLoad  - true while the loading skeleton must be shown
//   onClosen   - the page's handler of the .closen buttons

import moment from 'moment';
import { DetailHeader, DetailSection, DetailGrid, DetailField, Pill, FileItem, EmptyState } from '../../components/detailModal/DetailModal';
import { Skeleton, SkeletonText } from '../../components/skeleton/Skeleton';

function DetailSkeleton() {
  return (
    <div className="dm-section" role="status" aria-busy="true">
      <span className="visually-hidden">Loading user details...</span>
      <Skeleton width="35%" height={14} />
      <div className="mt-3"><SkeletonText lines={4} /></div>
      <div className="mt-4"><SkeletonText lines={3} /></div>
    </div>
  );
}

export default function UserDetailModal({ detail, printLoad, onClosen }) {
  const user = detail ? detail.user : null;
  const roleName = detail ? detail.roleName : '';

  const fullName = user ? `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() : '';
  const profilePhoto = user ? (user.logo || user.profile?.image) : '';
  const displayName = user ? (fullName || user.username || '') : '';
  const active = user ? user.active !== false : true;
  const attachments = user && user.attachments ? user.attachments : [];
  const date = (value) => (value ? moment(value).format('DD-MM-YYYY') : '');

  return (
    <div className="modal fade dm-modal" id="userDetailPage" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-lg modal-dialog-scrollable" role="document">
        <div className="modal-content">
          <DetailHeader
            icon={displayName ? undefined : 'bx-user'}
            avatar={displayName || undefined}
            photo={profilePhoto || undefined}
            round
            tone="indigo"
            eyebrow={user ? 'Details of ' + $.trim(user.profile?.firstName || user.username) : 'User'}
            title={displayName || 'User Details'}
            titleId="userH"
            meta={user ? (
              <>
                {roleName && <span className="dm-meta" id="detailRole"><i className="bx bx-id-card"></i>{roleName}</span>}
                <span id="detailStatus">
                  {active ? <Pill tone="green" dot>Active</Pill> : <Pill tone="red" dot>Inactive</Pill>}
                </span>
              </>
            ) : null}
            closeProps={{ className: 'close closen btn-close', onClick: onClosen }}
          />
          <div className="modal-body p-0">
            <div className="dm-body">
              {printLoad || !user ? (
                <DetailSkeleton />
              ) : (
                <>
                  <div className="dm-columns">
                    <DetailSection title="Personal Information" icon="bx-user">
                      <DetailGrid cols={1}>
                        <DetailField label="Name" id="detailName">{displayName}</DetailField>
                        <DetailField label="Contact" icon="bx-phone" id="detailContact">{user.contactNo || user.profile?.contact}</DetailField>
                        <DetailField label="Personal Email" icon="bx-envelope" id="detailPersonalEmail">{user.emails?.[0]?.address || user.emailAddress}</DetailField>
                        <DetailField label="Company Email" icon="bx-buildings" id="detailCompanyEmail">{user.companyEmail}</DetailField>
                        <DetailField label="Address" icon="bx-map" text id="detailAddress">{user.address}</DetailField>
                      </DetailGrid>
                    </DetailSection>

                    <DetailSection title="Employment Information" icon="bx-briefcase">
                      <DetailGrid cols={1}>
                        <DetailField label="Username" id="detailUsername">{user.username}</DetailField>
                        <DetailField label="Role">{roleName}</DetailField>
                        <DetailField label="Joined Date" icon="bx-calendar" id="detailJoinedDate">{date(user.joinedDate)}</DetailField>
                        <DetailField label="Leaving Date" icon="bx-calendar-x" id="detailLeavingDate" empty="—">{date(user.leavingDate)}</DetailField>
                        <DetailField label="Salary" icon="bx-wallet" id="detailSalary">{user.salaryAmount ? `₹${user.salaryAmount}` : ''}</DetailField>
                      </DetailGrid>
                    </DetailSection>
                  </div>

                  <DetailSection title="Attachments" icon="bx-paperclip" count={attachments.length}>
                    {attachments.length > 0 ? (
                      <div id="detailAttachments" className="dm-files">
                        {attachments.map((att, index) => (
                          <FileItem key={index} href={`${att.url || att}`} name={att.name || att.fileName || 'Attachment'} />
                        ))}
                      </div>
                    ) : (
                      <div id="detailAttachments"><EmptyState icon="bx-paperclip">No attachments</EmptyState></div>
                    )}
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
