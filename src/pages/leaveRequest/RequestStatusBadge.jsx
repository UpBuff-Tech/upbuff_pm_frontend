import BackdatedBadge from './BackdatedBadge';

// Status badge for any leave / early-leave request; approved backdated entries show "Backdated"
export default function RequestStatusBadge({ status, isBackdated }) {
  if (status === 'pending') {
    return <span className="badge bg-warning">Pending</span>;
  }
  if (status === 'approved') {
    if (isBackdated) {
      return <BackdatedBadge title="Recorded after the leave date by an approver" />;
    }
    return <span className="badge bg-success">Approved</span>;
  }
  if (status === 'cancelled') {
    return <span className="badge bg-secondary">Cancelled</span>;
  }
  return <span className="badge bg-danger">Rejected</span>;
}
