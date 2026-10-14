// The page-number bar under paginated tables. Same markup and behaviour as the
// {{> defaultBootstrapPaginator pagination=... limit=12 containerClass="text-center" onClick=...}}
// template of the kurounin:pagination-blaze package.

import { useEffect, useState } from 'react';

function range(min, max) {
  const result = [];
  for (let i = min; i < max; ++i) result.push(i);
  return result;
}

export default function Paginator({ pagination, limit = 10, containerClass = '', paginationClass = 'pagination', itemClass = 'page-item', onClick }) {
  const [displayedPages, setDisplayedPages] = useState([]);
  const pageCount = pagination ? pagination.totalPages() : 0;
  const current = pagination ? pagination.currentPage() : 1;
  const isReady = pagination ? pagination.ready() : false;

  // Slice the page numbers so they fit in one line.
  useEffect(() => {
    if (!isReady) return;
    if (pageCount > limit) {
      let min = 0;
      if (current > limit / 2) {
        min = current > pageCount - limit / 2 ? pageCount - limit : Math.floor(current - limit / 2);
      }
      setDisplayedPages(range(min + 1, min + 1 + limit));
    } else {
      setDisplayedPages(range(1, pageCount + 1));
    }
  }, [isReady, pageCount, current, limit]);

  const hasPages = pagination && pageCount > 1 && limit;

  const goTo = (event, page) => {
    if (typeof onClick === 'function') onClick(event, page);
    else event.preventDefault();
    pagination.currentPage(page);
  };

  const showPrevious = (event) => {
    event.preventDefault();
    const min = Math.max(1, displayedPages[0] - limit);
    setDisplayedPages(range(min, min + limit));
  };

  const showNext = (event) => {
    event.preventDefault();
    const min = Math.min(pageCount - limit, displayedPages[displayedPages.length - 1]) + 1;
    setDisplayedPages(range(min, min + limit));
  };

  const previousHidden = displayedPages.length > 0 && displayedPages[0] > 1;
  const nextHidden = displayedPages.length > 0 && displayedPages[displayedPages.length - 1] < pageCount;

  return (
    <div className={'pagination-container ' + containerClass}>
      {hasPages ? (
        <ul className={paginationClass}>
          <li className={(current === 1 ? 'disabled ' : '') + itemClass}>
            <a href="#" className="page-link previous-page" title="Previous page" onClick={(e) => goTo(e, current - 1)}> &lt; </a>
          </li>

          {previousHidden && (
            <>
              <li className={itemClass}>
                <a href="#" className="page-link" title="Go to page 1" onClick={(e) => goTo(e, 1)}> 1 </a>
              </li>
              <li className={itemClass}>
                <a href="#" className="page-link show-prev" title="Show previous pages" onClick={showPrevious}> ... </a>
              </li>
            </>
          )}

          {displayedPages.map((page) => (
            <li key={page} className={(page === current ? 'active ' : '') + itemClass}>
              <a href="#" className="page-link" title={'page ' + page} onClick={(e) => goTo(e, page)}>{page}</a>
            </li>
          ))}

          {nextHidden && (
            <>
              <li className={itemClass}>
                <a href="#" className="page-link show-next" title="Show next pages" onClick={showNext}> ... </a>
              </li>
              <li className={itemClass}>
                <a href="#" className="page-link" title={'Go to page ' + pageCount} onClick={(e) => goTo(e, pageCount)}> {pageCount} </a>
              </li>
            </>
          )}

          <li className={(current === pageCount ? 'disabled ' : '') + itemClass}>
            <a href="#" className="page-link next-page" title="Next page" onClick={(e) => goTo(e, current + 1)}> &gt; </a>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
