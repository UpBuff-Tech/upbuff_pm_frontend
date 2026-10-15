/**
 * Suggestions List Page
 */
import { useEffect, useState } from 'react';
import moment from 'moment';
import api from '../../api/client';
import { initializeSelect2 } from '../../lib/customFunctions';
import { TableSkeleton } from '../../components/skeleton/Skeleton';
import { destroySelect2 } from '../../lib/destroySelect2';

function truncate(text, length) {
  if (!text) return '-';
  return text.length > length ? text.substring(0, length) + '...' : text;
}

function formatDateTime(date) {
  if (!date) return '-';
  return moment(date).format('MMM DD, YYYY HH:mm');
}

/** The coloured badge of a suggestion status (the list and the details modal show the same one). */
function StatusBadge({ status }) {
  if (status === 'new') return <span className="badge bg-warning">New</span>;
  if (status === 'reviewed') return <span className="badge bg-info">Reviewed</span>;
  return <span className="badge bg-success">Resolved</span>;
}

export default function Suggestions() {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('new');
  // The suggestion shown in the View Suggestion modal (nothing until the first "View" click)
  const [viewedSuggestion, setViewedSuggestion] = useState(null);

  const loadSuggestions = () => {
    setIsLoading(true);
    api.call('suggestions.getList', (error, result) => {
      setIsLoading(false);
      if (error) {
        toastr.error('Failed to load suggestions');
        return;
      }
      setSuggestions(result || []);
    });
  };

  useEffect(() => {
    loadSuggestions();
  }, []);

  // The status filter is a select2 dropdown, which announces a choice through jQuery only.
  useEffect(() => {
    initializeSelect2([
      { id: 'statusFilter', placeholder: 'All Status' }
    ]);

    const select = $('#statusFilter');
    const onChange = () => setStatusFilter(select.val());
    select.on('change', onChange);
    return () => {
      select.off('change', onChange);
      destroySelect2(select);
    };
  }, []);

  const filteredSuggestions = statusFilter
    ? suggestions.filter(s => s.status === statusFilter)
    : suggestions;
  const hasSuggestions = filteredSuggestions.length > 0;

  /* ---------------------------------------------------------------- events */

  const handleView = (event, suggestionId) => {
    event.preventDefault();

    api.call('suggestions.getById', suggestionId, (error, result) => {
      if (error) {
        toastr.error('Failed to load suggestion');
        return;
      }

      if (result) {
        setViewedSuggestion(result);
        $('#viewSuggestionModal').modal('show');
      }
    });
  };

  /** "Mark Reviewed" / "Mark Resolved": change the status, then reload the list. */
  const updateStatus = (event, suggestionId, status) => {
    event.preventDefault();
    api.call('suggestions.updateStatus', suggestionId, status, (error) => {
      if (error) {
        toastr.error(error.reason || 'Failed to update status');
        return;
      }
      toastr.success('Marked as ' + status);
      loadSuggestions();
    });
  };

  const viewedAttachments = (viewedSuggestion && viewedSuggestion.attachments) || [];

  /* ---------------------------------------------------------------- page */

  return (
    <>
      <div className="container-xxl flex-grow-1 container-p-y">
        {/* Page Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-bold mb-1">Suggestions</h4>
            <p className="text-muted mb-0">View and manage user suggestions</p>
          </div>
        </div>

        {/* Filter */}
        <div className="card mb-3">
          <div className="card-body py-2">
            <div className="row g-2 align-items-center">
              <div className="col-md-3">
                <select className="form-select form-select-sm" id="statusFilter" style={{ width: '100%' }} defaultValue="new">
                  <option value="">All Status</option>
                  <option value="new">New</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Suggestions List */}
        <div className="card">
          <div className="card-body">
            {isLoading ? (
              <TableSkeleton rows={6} columns={5} label="Loading suggestions…" />
            ) : hasSuggestions ? (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Remark</th>
                      <th>Attachment</th>
                      <th>Status</th>
                      <th>Submitted On</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSuggestions.map((suggestion, index) => (
                      <tr key={suggestion._id}>
                        <td>{index + 1}</td>
                        <td>
                          <span title={suggestion.remark}>{truncate(suggestion.remark, 50)}</span>
                        </td>
                        <td>
                          {suggestion.attachments && suggestion.attachments.length ? (
                            <span className="badge bg-label-info"><i className="bx bx-paperclip me-1"></i>{suggestion.attachments.length} file(s)</span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={suggestion.status} />
                        </td>
                        <td>{formatDateTime(suggestion.createdAt)}</td>
                        <td>
                          <button className="btn btn-sm btn-outline-primary viewSuggestionBtn" data-id={suggestion._id} title="View"
                            onClick={(event) => handleView(event, suggestion._id)}>
                            <i className="bx bx-show"></i>
                          </button>
                          {' '}
                          {suggestion.status === 'new' && (
                            <>
                              <button className="btn btn-sm btn-outline-info markReviewedBtn" data-id={suggestion._id} title="Mark Reviewed"
                                onClick={(event) => updateStatus(event, suggestion._id, 'reviewed')}>
                                <i className="bx bx-check"></i>
                              </button>
                              {' '}
                            </>
                          )}
                          {suggestion.status !== 'resolved' && (
                            <button className="btn btn-sm btn-outline-success markResolvedBtn" data-id={suggestion._id} title="Mark Resolved"
                              onClick={(event) => updateStatus(event, suggestion._id, 'resolved')}>
                              <i className="bx bx-check-double"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-5">
                <i className="bx bx-message-rounded-dots text-muted" style={{ fontSize: '48px' }}></i>
                <p className="text-muted mt-3">No suggestions found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Suggestion Modal */}
      <div className="modal fade" id="viewSuggestionModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-lg" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="bx bx-message-rounded-dots me-2"></i>Suggestion Details
              </h5>
              <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label fw-bold">Remark</label>
                <p id="viewSuggestionRemark" className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{viewedSuggestion ? viewedSuggestion.remark : '-'}</p>
              </div>
              <div className="mb-3" id="viewAttachmentSection" style={viewedAttachments.length > 0 ? undefined : { display: 'none' }}>
                <label className="form-label fw-bold">Attachments</label>
                <div id="viewAttachmentsList">
                  {viewedAttachments.map((att, index) => (
                    <div className="border rounded p-2 mb-2" key={index}>
                      <div className="d-flex align-items-center justify-content-between">
                        <span><i className="bx bx-file me-2 text-primary"></i>{att.name}</span>
                        <a href={att.data} download={att.name} className="btn btn-sm btn-outline-primary"><i className="bx bx-download"></i></a>
                      </div>
                      {att.type && att.type.startsWith('image/') && (
                        <img src={att.data} className="img-fluid rounded mt-2" style={{ maxHeight: '200px' }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Status</label>
                  <p id="viewSuggestionStatus" className="mb-0">{viewedSuggestion ? <StatusBadge status={viewedSuggestion.status} /> : '-'}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Submitted On</label>
                  <p id="viewSuggestionDate" className="mb-0">{viewedSuggestion ? moment(viewedSuggestion.createdAt).format('MMM DD, YYYY HH:mm') : '-'}</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
