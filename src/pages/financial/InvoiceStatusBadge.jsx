//   <InvoiceStatusBadge status={invoice.status} colors={PROFORMA_STATUS_COLORS} />
export default function InvoiceStatusBadge({ status, colors }) {
  return (
    <span className={'badge ' + (colors[status] || 'bg-secondary')}>{status || 'Draft'}</span>
  );
}
