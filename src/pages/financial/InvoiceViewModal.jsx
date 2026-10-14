import { isValidElement } from 'react';
import { formatCurrency } from './financialUtils';
import { DetailHeader, DetailSection, DetailGrid, DetailField, StatTile, Pill, EmptyState } from '../../components/detailModal/DetailModal';

/** Bootstrap badge colour -> Pill tone */
const BADGE_TONES = { success: 'green', warning: 'amber', danger: 'red', info: 'cyan', primary: 'indigo', secondary: 'gray' };

/** "Invoice No:" -> "Invoice No" */
const labelOf = (label) => String(label || '').replace(/:\s*$/, '');

const isStatusRow = (row) => labelOf(row.label).toLowerCase() === 'status';

/** An <InvoiceStatusBadge status colors /> as a Pill (anything else is shown as it is). */
function statusPill(value) {
  const props = isValidElement(value) ? value.props : null;
  if (!props || !props.colors) return value;
  const badgeClass = (props.colors[props.status] || 'bg-secondary').replace(/^bg-/, '');
  return <Pill tone={BADGE_TONES[badgeClass] || 'gray'} dot>{props.status || 'Draft'}</Pill>;
}

const DATE_ICONS = { 'created': 'bx-calendar-plus', 'valid until': 'bx-calendar-check', 'invoice date': 'bx-calendar', 'due date': 'bx-calendar-exclamation', 'created by': 'bx-user' };

/**
 * A "View invoice" modal. Which details are shown at the top depends on the kind of invoice:
 *   infoRows / dateRows = [{ label: 'Invoice No:', value: invoice.invoiceNumber, bold: true }, ...]
 * `invoice` is null until an invoice has been opened (the body is empty then).
 */
export default function InvoiceViewModal({ modalId, titleId, bodyId, title, invoice, infoRows, dateRows }) {
  const statusRow = (infoRows || []).find(isStatusRow);
  const otherInfoRows = (infoRows || []).filter((row) => !isStatusRow(row));
  const items = invoice ? invoice.items || [] : [];

  return (
    <div className="modal fade dm-modal" id={modalId} tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-lg modal-dialog-scrollable" role="document">
        <div className="modal-content">
          <DetailHeader
            icon="bx-receipt"
            tone="indigo"
            eyebrow="Invoice"
            title={title}
            titleId={titleId}
            meta={statusRow ? statusPill(statusRow.value) : null}
          />
          <div className="modal-body p-0" id={bodyId}>
            {invoice && (
              <div className="dm-body">
                <div className="dm-stats">
                  <StatTile icon="bx-wallet" tone="indigo" label="Grand Total" value={formatCurrency(invoice.grandTotal)} />
                  {(dateRows || []).map((row) => {
                    const label = labelOf(row.label);
                    const blank = row.value === undefined || row.value === null || row.value === '' || row.value === '-' || row.value === 'N/A';
                    return (
                      <StatTile key={row.label} icon={DATE_ICONS[label.toLowerCase()] || 'bx-calendar'} tone="gray"
                        label={label} value={blank ? '—' : row.value} />
                    );
                  })}
                </div>

                <DetailSection title="Invoice Info" icon="bx-info-circle">
                  <DetailGrid>
                    {otherInfoRows.map((row) => (
                      <DetailField key={row.label} label={labelOf(row.label)}>{row.value}</DetailField>
                    ))}
                  </DetailGrid>
                </DetailSection>

                <DetailSection title="Items" icon="bx-list-ul" count={items.length} flush>
                  <div className="dm-table-wrap">
                    <table className="dm-table">
                      <thead>
                        <tr>
                          <th>#</th><th>Description</th><th className="is-num">Qty</th><th className="is-num">Unit Price</th>
                          <th className="is-num">Discount</th><th className="is-num">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => (
                          <tr key={index}>
                            <td className="text-muted">{item.slNo}</td>
                            <td>
                              <span className="fw-semibold">{item.description}</span>
                              {item.hsnSac && <><br /><small className="text-muted">{item.hsnSac}</small></>}
                            </td>
                            <td className="is-num">{item.quantity} {item.unit}</td>
                            <td className="is-num">{formatCurrency(item.unitPrice)}</td>
                            <td className="is-num">{formatCurrency(item.discount)}</td>
                            <td className="is-num fw-bold">{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                        {!items.length && (
                          <tr><td colSpan="6"><EmptyState icon="bx-list-ul">No items</EmptyState></td></tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="5" className="is-num text-muted fw-normal">Subtotal</td>
                          <td className="is-num">{formatCurrency(invoice.subtotal)}</td>
                        </tr>
                        <tr>
                          <td colSpan="5" className="is-num text-muted fw-normal">Discount</td>
                          <td className="is-num fw-normal">{formatCurrency(invoice.discount)}</td>
                        </tr>
                        <tr>
                          <td colSpan="5" className="is-num text-muted fw-normal">Tax ({invoice.taxPercent || 0}%)</td>
                          <td className="is-num fw-normal">{formatCurrency(invoice.taxAmount)}</td>
                        </tr>
                        <tr>
                          <td colSpan="5" className="is-num" style={{ fontSize: '15px' }}>Grand Total</td>
                          <td className="is-num text-primary" style={{ fontSize: '15px' }}>{formatCurrency(invoice.grandTotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </DetailSection>

                {invoice.notes ? (
                  <DetailSection title="Notes" icon="bx-note">
                    <div className="dm-callout">{invoice.notes}</div>
                  </DetailSection>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
