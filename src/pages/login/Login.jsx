import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { loginUser } from './utility';
import './login.css';

const MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024;

function fileSizeLabel(file) {
  const sizeKB = (file.size / 1024).toFixed(1);
  return sizeKB > 1024 ? (file.size / (1024 * 1024)).toFixed(1) + ' MB' : sizeKB + ' KB';
}

/** One selected attachment of the suggestion form (images get a small preview). */
function AttachmentFile({ file, index, onRemove }) {
  const isImage = file.type && file.type.startsWith('image/');
  const [preview, setPreview] = useState('');

  useEffect(() => {
    if (!isImage) return;
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
  }, [file, isImage]);

  return (
    <div className="d-flex align-items-center border rounded px-2 py-1 mb-1" data-file-index={index}>
      {isImage ? (
        <div id={'attachPreview_' + index} className="me-2 flex-shrink-0" style={{ width: '36px', height: '36px', overflow: 'hidden', borderRadius: '4px' }}>
          {preview && <img src={preview} style={{ width: '36px', height: '36px', objectFit: 'cover' }} />}
        </div>
      ) : (
        <i className="bx bx-file me-2 text-primary"></i>
      )}
      <span className="small text-truncate flex-grow-1" style={{ maxWidth: '200px' }} title={file.name}>{file.name}</span>
      <small className="text-muted ms-2 flex-shrink-0">{fileSizeLabel(file)}</small>
      <button type="button" className="btn btn-sm text-danger removeFileBtn ms-2 p-0 flex-shrink-0" data-index={index} title="Remove"
        onClick={(event) => onRemove(event, index)}><i className="bx bx-x"></i></button>
    </div>
  );
}

export default function Login() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const [signingIn, setSigningIn] = useState(false);
  const [remark, setRemark] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);

  useEffect(() => {
    // Add login-page class to body for styling
    document.body.classList.add('login-page');
    return () => {
      // Remove login-page class when leaving login page
      document.body.classList.remove('login-page');
    };
  }, []);

  const submitLogin = (event) => {
    event.preventDefault();
    loginUser(event.target, { login, logout, navigate, setSigningIn });
  };

  // The theme script (main.js) may also switch this field when the icon itself is clicked,
  // so the current state is read from the input, as before.
  const togglePassword = (event) => {
    const passwordInput = $('#password');
    const icon = $(event.currentTarget).find('i');
    if (passwordInput.attr('type') === 'password') {
      passwordInput.attr('type', 'text');
      icon.removeClass('bx-hide').addClass('bx-show');
    } else {
      passwordInput.attr('type', 'password');
      icon.removeClass('bx-show').addClass('bx-hide');
    }
  };

  const openSuggestionModal = (event) => {
    event.preventDefault();
    setRemark('');
    setSelectedFiles([]);
    $('#suggestionModal').modal('show');
  };

  const addAttachments = (event) => {
    const newFiles = Array.from(event.target.files);
    setSelectedFiles(selectedFiles.concat(newFiles));
    event.target.value = '';
  };

  const removeAttachment = (event, index) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedFiles(selectedFiles.filter((file, fileIndex) => fileIndex !== index));
  };

  const sendSuggestion = (data) => {
    api.call('suggestions.create', data, (error) => {
      setSubmittingSuggestion(false);

      if (error) {
        toastr.error(error.reason || 'Failed to submit suggestion');
        return;
      }

      toastr.success('Thank you! Your suggestion has been submitted.');
      $('#suggestionModal').modal('hide');
      setRemark('');
    });
  };

  const submitSuggestion = (event) => {
    event.preventDefault();
    const remarkText = remark.trim();

    if (!remarkText) {
      toastr.error('Please enter your suggestion');
      return;
    }

    setSubmittingSuggestion(true);

    const files = selectedFiles;

    if (files.length > 0) {
      const attachments = [];
      let processed = 0;
      let hasError = false;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > MAX_ATTACHMENT_SIZE) {
          toastr.error(file.name + ' exceeds 50MB limit');
          setSubmittingSuggestion(false);
          return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
          attachments.push({
            name: file.name,
            data: e.target.result,
            type: file.type,
            size: file.size
          });
          processed++;
          if (processed === files.length && !hasError) {
            sendSuggestion({ remark: remarkText, attachments: attachments });
          }
        };
        reader.onerror = function () {
          hasError = true;
          toastr.error('Failed to read file: ' + file.name);
          setSubmittingSuggestion(false);
        };
        reader.readAsDataURL(file);
      }
    } else {
      sendSuggestion({ remark: remarkText });
    }
  };

  return (
    <>
      <div className="login-container">
        {/* Sign-in side */}
        <section className="login-form-section">
          <div className="login-brand-name">Fiëro</div>

          <div className="login-form-wrapper">
            <div className="login-brand">
              <img src="/img/logo.png" alt="Fiëro" className="login-brand-logo" />
            </div>

            <h1 className="login-title">Welcome back</h1>
            <p className="login-subtitle">Sign in to continue to your workspace</p>

            <form id="users_login" className="users_login login-form-content" onSubmit={submitLogin}>
              <div className="mb-3">
                <label htmlFor="email" className="form-label">Email or username</label>
                <div className="login-field">
                  <i className="bx bx-envelope login-field-icon"></i>
                  <input type="text" className="form-control login-input" id="email" required name="username"
                    placeholder="you@company.com" autoComplete="username" autoFocus />
                </div>
              </div>
              <div className="mb-3 form-password-toggle">
                <div className="d-flex justify-content-between align-items-center">
                  <label className="form-label" htmlFor="password">Password</label>
                  <a href="" className="forgot-password-link" onClick={(event) => event.preventDefault()}>
                    Forgot password?
                  </a>
                </div>
                <div className="login-field">
                  <i className="bx bx-lock-alt login-field-icon"></i>
                  <input type="password" id="password" className="form-control login-input login-input-password" name="password"
                    placeholder="Enter your password" autoComplete="current-password"
                    aria-describedby="password" required />
                  <button type="button" className="login-password-toggle" onClick={togglePassword} aria-label="Show password">
                    <i className="bx bx-hide"></i>
                  </button>
                </div>
              </div>
              <div className="mb-4">
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="remember-me" />
                  <label className="form-check-label" htmlFor="remember-me">Keep me signed in</label>
                </div>
              </div>
              <button className="btn w-100 login-btn" type="submit" disabled={signingIn}>
                <span className="signin-text" style={{ display: signingIn ? 'none' : undefined }}>
                  Sign in <i className="bx bx-right-arrow-alt"></i>
                </span>
                <span className="signin-loader" style={{ display: signingIn ? undefined : 'none' }}>
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Signing in…
                </span>
              </button>
            </form>

            <div className="login-divider"><span>Need help?</span></div>

            <button type="button" className="login-suggestion-btn" id="suggestionBtn" onClick={openSuggestionModal}>
              <i className="bx bx-message-rounded-dots"></i>Share a suggestion
            </button>
          </div>

          <footer className="login-footer">
            <span>© {new Date().getFullYear()} Fiëro</span>
            <span>Powered by <a href="http://upbuff.com" target="_blank" rel="noopener noreferrer">Upbuff Technologies</a></span>
          </footer>
        </section>

        {/* Brand side: message + illustration (hidden on small screens) */}
        <aside className="login-panel" aria-hidden="true">
          <span className="login-panel-shape login-panel-shape-1"></span>
          <span className="login-panel-shape login-panel-shape-2"></span>
          <span className="login-panel-dots"></span>

          <div className="login-panel-content">
            <span className="login-chip"><span className="login-chip-dot"></span>Project management for growing teams</span>
            <h2 className="login-panel-title">Plan smarter.<br />Deliver <span>on time.</span></h2>
            <p className="login-panel-text">Projects, tasks, time tracking and client tickets — together in one simple workspace.</p>

            <ul className="login-points">
              <li><span><i className="bx bx-task"></i></span>Kanban boards, Gantt charts &amp; calendars</li>
              <li><span><i className="bx bx-time-five"></i></span>Live time tracking and attendance</li>
              <li><span><i className="bx bx-support"></i></span>Client portal with tickets &amp; documents</li>
            </ul>

            {/* Illustration: a small task board */}
            <div className="login-illustration">
              <div className="li-board">
                <div className="li-col">
                  <div className="li-col-head"><i className="li-dot li-amber"></i>To do<b>3</b></div>
                  <div className="li-card"><span className="li-line w80"></span><span className="li-line w50"></span><span className="li-tag li-tag-amber">Design</span></div>
                  <div className="li-card"><span className="li-line w60"></span><span className="li-line w40"></span></div>
                </div>
                <div className="li-col">
                  <div className="li-col-head"><i className="li-dot li-blue"></i>In progress<b>2</b></div>
                  <div className="li-card li-card-active">
                    <span className="li-line w70"></span><span className="li-line w50"></span>
                    <div className="li-card-foot"><span className="li-avatars"><i></i><i></i></span><span className="li-timer"><em className="bx bx-time-five"></em>02:14</span></div>
                  </div>
                  <div className="li-card"><span className="li-line w50"></span><span className="li-tag li-tag-blue">API</span></div>
                </div>
                <div className="li-col">
                  <div className="li-col-head"><i className="li-dot li-green"></i>Done<b>8</b></div>
                  <div className="li-card li-card-done"><span className="li-check"><em className="bx bx-check"></em></span><span className="li-line w60"></span></div>
                  <div className="li-card li-card-done"><span className="li-check"><em className="bx bx-check"></em></span><span className="li-line w40"></span></div>
                </div>
              </div>

              <div className="li-float li-progress">
                <svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" /><circle cx="22" cy="22" r="18" className="li-progress-arc" /></svg>
                <div><strong>78%</strong><span>Sprint done</span></div>
              </div>

              <div className="li-float li-toast">
                <span className="li-toast-icon"><em className="bx bx-check"></em></span>
                <div><strong>Task completed</strong><span>Homepage redesign · just now</span></div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Suggestion Modal */}
      <div className="modal fade" id="suggestionModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="bx bx-message-rounded-dots me-2"></i>Submit a Suggestion
              </h5>
              <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
            </div>
            <form id="suggestionForm" onSubmit={submitSuggestion}>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-bold" htmlFor="suggestionRemark">Your Suggestion <span className="text-danger">*</span></label>
                  <textarea className="form-control" id="suggestionRemark" rows="4" placeholder="Share your feedback or suggestion..." required
                    value={remark} onChange={(event) => setRemark(event.target.value)}></textarea>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold" htmlFor="suggestionAttachment">Attachment <span className="text-muted fw-normal">(Optional)</span></label>
                  <label className="d-block border border-dashed rounded p-2 text-center" htmlFor="suggestionAttachment" style={{ cursor: 'pointer', transition: 'background .2s' }}
                    onMouseOver={(event) => { event.currentTarget.style.background = '#f8f9fa'; }}
                    onMouseOut={(event) => { event.currentTarget.style.background = 'transparent'; }}>
                    <i className="bx bx-cloud-upload text-primary" style={{ fontSize: '1.5rem' }}></i>
                    <small className="text-muted ms-1">Click to upload or drag & drop</small>
                    <span className={'d-block mt-1 text-primary fw-bold small' + (selectedFiles.length > 0 ? '' : ' d-none')} id="attachmentFileName">
                      {selectedFiles.length > 0 ? selectedFiles.length + ' file(s) selected' : ''}
                    </span>
                  </label>
                  <input type="file" className="d-none" id="suggestionAttachment" accept="image/*,.pdf,.doc,.docx,.txt" multiple onChange={addAttachments} />
                  <div id="attachmentFileList" className="mt-2">
                    {selectedFiles.map((file, index) => (
                      <AttachmentFile key={index + ':' + file.name + ':' + file.size} file={file} index={index} onRemove={removeAttachment} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
                <button type="submit" className="btn btn-primary" id="submitSuggestionBtn" disabled={submittingSuggestion}>
                  <span className={'spinner-border spinner-border-sm me-1' + (submittingSuggestion ? '' : ' d-none')} id="suggestionSpinner"></span>
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
