/**
 * The card with the list table of a tab: skeleton while loading, then the table, or the "nothing found" text.
 *   <InvoiceListCard idPrefix="invoice" list={list} columns={['Invoice No.', ...]} emptyMessage="No invoices found">
 *     {list.invoices.map((invoice) => <tr key={invoice._id}>...</tr>)}
 *   </InvoiceListCard>
 * idPrefix "invoice" gives #invoiceListLoader, #invoiceListContent, #invoiceTableBody, #invoiceEmptyState.
 */
import { TableSkeleton } from '../../components/skeleton/Skeleton';

export default function InvoiceListCard({ idPrefix, list, columns, emptyMessage, children }) {
  return (
    <div className="card">
      <div className="card-body p-0">
        <div id={idPrefix + 'ListLoader'} style={{ display: list.isLoading ? undefined : 'none' }}>
          <TableSkeleton rows={5} columns={Math.min(columns.length, 6) || 5} />
        </div>
        <div id={idPrefix + 'ListContent'} style={{ display: list.isLoading ? 'none' : undefined }}>
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  {columns.map((column) => (
                    <th style={{ fontSize: '12px' }} key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody id={idPrefix + 'TableBody'}>{children}</tbody>
            </table>
          </div>
          <div id={idPrefix + 'EmptyState'} className="text-center py-4 text-muted" style={{ display: list.isEmpty ? undefined : 'none' }}>
            <i className="bx bx-file" style={{ fontSize: '2rem' }}></i>
            <p className="mt-2 mb-0">{emptyMessage}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
