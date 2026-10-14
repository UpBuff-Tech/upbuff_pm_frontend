/**
 * Send Email Modal (#staffSendEmailModal): staff write an email about a ticket.
 *
 *   openStaffSendEmailModal(ticket);
 */
import { useState } from 'react';
import api from '../../api/client';
import Select2 from './Select2';
import { createModalHandle, useModalHandle } from './modalHandle';
import { buildStaffEmailTemplates } from './ticketHelpers';

const modal = createModalHandle();

export function openStaffSendEmailModal(ticket) {
  modal.call('open', ticket);
}

const EMPTY_EMAIL = { ticketId: '', to: '', cc: '', subject: '', template: '', body: '' };

/** currentTicket = the ticket shown in the detail modal (the templates are filled in from it). */
export default function StaffSendEmailModal({ currentTicket }) {
  const [email, setEmail] = useState(EMPTY_EMAIL);
  const [ticketRef, setTicketRef] = useState('-');
  const [sending, setSending] = useState(false);

  const changeEmail = (changes) => setEmail((old) => ({ ...old, ...changes }));

  const open = (ticket) => {
    setEmail({
      ticketId: ticket._id,
      to: ticket.contactEmail || '',
      cc: '',
      subject: `Re: [${ticket.ticketId}] ${ticket.subject}`,
      template: '',
      body: ''
    });
    setTicketRef(`${ticket.ticketId} — ${ticket.subject}`);

    $('#staffSendEmailModal').modal('show');
  };

  useModalHandle(modal, { open });

  // Auto-fill body when a template is selected
  const handleTemplateChange = (template) => {
    const templates = buildStaffEmailTemplates(currentTicket, email.ticketId);
    changeEmail({ template, body: templates[template] || '' });
  };

  // Submit the email
  const sendEmail = (event) => {
    event.preventDefault();

    const ticketId = email.ticketId;
    const to = email.to.trim();
    const cc = email.cc.trim();
    const subject = email.subject.trim();
    const body = email.body.trim();

    if (!to) { toastr.error('Please enter a recipient email address'); return; }
    if (!subject) { toastr.error('Please enter a subject'); return; }
    if (!body) { toastr.error('Please enter a message'); return; }

    setSending(true);

    api.call('tickets.sendEmailFromStaff', { ticketId, to, cc: cc || null, subject, body }, (error) => {
      setSending(false);

      if (error) {
        toastr.error(error.reason || 'Failed to send email');
        return;
      }

      toastr.success('Email sent successfully');
      $('#staffSendEmailModal').modal('hide');
    });
  };

  return (
    <div className="modal fade" id="staffSendEmailModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fa fa-envelope me-2"></i>Send Email
            </h5>
            <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <div className="alert alert-light border py-2 px-3 mb-3 d-flex align-items-center gap-2" style={{ fontSize: '0.85rem' }}>
              <i className="fa fa-ticket text-primary flex-shrink-0"></i>
              <span>Ticket: <strong id="staffEmailTicketRef">{ticketRef}</strong></span>
            </div>
            <div className="mb-3">
              <label className="form-label fw-bold" htmlFor="staffEmailTo">To <span className="text-danger">*</span></label>
              <input type="email" className="form-control" id="staffEmailTo" placeholder="recipient@example.com"
                value={email.to} onChange={(event) => changeEmail({ to: event.target.value })} />
            </div>
            <div className="mb-3">
              <label className="form-label fw-bold" htmlFor="staffEmailCc">CC <span className="text-muted fw-normal">(optional)</span></label>
              <input type="email" className="form-control" id="staffEmailCc" placeholder="cc@example.com"
                value={email.cc} onChange={(event) => changeEmail({ cc: event.target.value })} />
            </div>
            <div className="mb-3">
              <label className="form-label fw-bold" htmlFor="staffEmailSubject">Subject <span className="text-danger">*</span></label>
              <input type="text" className="form-control" id="staffEmailSubject" placeholder="Email subject"
                value={email.subject} onChange={(event) => changeEmail({ subject: event.target.value })} />
            </div>
            <div className="mb-3">
              <label className="form-label fw-bold" htmlFor="staffEmailTemplate">Template</label>
              <Select2 className="form-select" id="staffEmailTemplate" placeholder="-- No Template --"
                value={email.template} onChange={handleTemplateChange}>
                <option value="">-- No Template --</option>
                <option value="status_update">Status Update</option>
                <option value="followup">Follow-up Request</option>
                <option value="resolution">Resolution Notice</option>
                <option value="info_required">Information Required</option>
                <option value="in_review">Awaiting Client Review</option>
              </Select2>
            </div>
            <div className="mb-3">
              <label className="form-label fw-bold" htmlFor="staffEmailBody">Message <span className="text-danger">*</span></label>
              <textarea className="form-control" id="staffEmailBody" rows="10" placeholder="Type your message here..."
                value={email.body} onChange={(event) => changeEmail({ body: event.target.value })}></textarea>
            </div>
            <input type="hidden" id="staffEmailTicketId" value={email.ticketId} readOnly />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
            <button type="button" className="btn btn-primary" id="staffSendEmailSubmitBtn" disabled={sending} onClick={sendEmail}>
              <span className={`spinner-border spinner-border-sm me-1 ${sending ? '' : 'd-none'}`} id="staffEmailSpinner"></span>
              <i className={`fa fa-paper-plane me-1 ${sending ? 'd-none' : ''}`} id="staffEmailIcon"></i>Send Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
