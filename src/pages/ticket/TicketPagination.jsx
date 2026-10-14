/**
 * Pagination of the ticket list: Previous, a window of page links (with … gaps), Next.
 * onPageClick(page) is called for every link; the page decides whether that page exists.
 */

/** The page numbers to show: first, last, and two either side of the current one. */
function pageWindow(currentPage, totalPages) {
  const pages = new Set([1, totalPages]);
  for (let p = currentPage - 2; p <= currentPage + 2; p++) {
    if (p >= 1 && p <= totalPages) pages.add(p);
  }
  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push('gap-' + page);
    result.push(page);
  });
  return result;
}

export default function TicketPagination({ currentPage, totalPages, onPageClick }) {
  if (!(totalPages > 1)) return null;

  const pageLink = (page, label, ariaLabel) => (
    <a className="page-link" href="#" data-page={page} aria-label={ariaLabel}
      onClick={(event) => { event.preventDefault(); onPageClick(page); }}>{label}</a>
  );

  return (
    <nav className="tk-pagination" aria-label="Ticket pages">
      <span className="tk-page-info">Page <strong>{currentPage}</strong> of {totalPages}</span>
      <ul className="pagination mb-0">
        <li className={`page-item ${currentPage > 1 ? '' : 'disabled'}`}>
          {pageLink(currentPage - 1, <i className="bx bx-chevron-left"></i>, 'Previous page')}
        </li>
        {pageWindow(currentPage, totalPages).map((page) => (typeof page === 'string' ? (
          <li key={page} className="page-item disabled tk-page-gap"><span className="page-link">…</span></li>
        ) : (
          <li key={page} className={`page-item ${page === currentPage ? 'active' : ''}`}>
            {pageLink(page, page)}
          </li>
        )))}
        <li className={`page-item ${currentPage < totalPages ? '' : 'disabled'}`}>
          {pageLink(currentPage + 1, <i className="bx bx-chevron-right"></i>, 'Next page')}
        </li>
      </ul>
    </nav>
  );
}
