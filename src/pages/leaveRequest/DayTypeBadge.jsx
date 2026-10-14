// "Half Day" / "Full Day" badge of the request tables.
export default function DayTypeBadge({ dayType }) {
  if (dayType === 'half') {
    return <span className="badge bg-label-secondary">Half Day</span>;
  }
  return <span className="badge bg-label-primary">Full Day</span>;
}
