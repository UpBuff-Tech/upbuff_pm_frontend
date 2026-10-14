import moment from 'moment';

// Requester's punch-in time for the request day
export default function EarlyLeavePunchIn({ time }) {
  if (time) {
    return (
      <span className="badge bg-label-success"><i className="bx bx-log-in me-1"></i>{moment(time).format('hh:mm A')}</span>
    );
  }
  return <span className="badge bg-label-secondary">Not punched in</span>;
}
