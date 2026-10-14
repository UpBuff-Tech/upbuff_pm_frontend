import { getLeaveTypeLabel } from '../../lib/shared/leaveRequests';
import { leaveTypeBadgeClass } from './leaveRequestHelpers';

// Display label and badge colour for a request type (Leave / WFH / Optional Leave).
export default function LeaveTypeBadge({ type }) {
  return <span className={'badge ' + leaveTypeBadgeClass(type)}>{getLeaveTypeLabel(type)}</span>;
}
