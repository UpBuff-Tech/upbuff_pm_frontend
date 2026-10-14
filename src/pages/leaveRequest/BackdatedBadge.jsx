// Status badge shown instead of "Approved" for backdated entries.
export default function BackdatedBadge({ title }) {
  return (
    <span className="badge badge-backdated" title={title}>
      <i className="bx bx-history me-1"></i>Backdated
    </span>
  );
}
