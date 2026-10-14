/**
 * Request type badge, shared by every surface that shows one (the old `taskRequestTypeBadge` template):
 *
 *   <TaskRequestTypeBadge requestType={task.requestType} fallback="-" className="task-id-badge" style={{ fontSize: '0.6rem' }} />
 *
 * `fallback` is what to print for a record with no request type (default: nothing).
 */
import { requestTypeBadgeClass } from '../lib/taskRequestType';

export default function TaskRequestTypeBadge({ requestType, fallback = '', className = '', style }) {
  if (!requestType) return <>{fallback}</>;

  return (
    <span className={`badge ${requestTypeBadgeClass(requestType)} ${className}`} style={style}>{requestType}</span>
  );
}
