/**
 * Styled replacements for window.confirm / window.alert.
 *
 *   if (!(await fxConfirm('Delete this task?', { tone: 'danger', confirmText: 'Delete' }))) return;
 *   await fxAlert('UUID generation complete', { title: 'Done', tone: 'success' });
 *
 * Plain DOM (no React) so it can be called from components, hooks and helpers alike.
 * Styles: .fx-dialog in styles/theme.css.
 */

const ICONS = {
  danger: 'bx-trash',
  warning: 'bx-error',
  primary: 'bx-help-circle',
  success: 'bx-check',
  info: 'bx-info-circle',
};

const CONFIRM_BUTTON = {
  danger: 'btn-danger',
  warning: 'btn-warning',
  primary: 'btn-primary',
  success: 'btn-primary',
  info: 'btn-primary',
};

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function openDialog({ message, title, tone, confirmText, cancelText }) {
  return new Promise((resolve) => {
    const previousFocus = document.activeElement;

    const overlay = element('div', 'fx-dialog-overlay');
    const dialog = element('div', 'fx-dialog fx-dialog-' + tone);
    dialog.setAttribute('role', cancelText ? 'alertdialog' : 'dialog');
    dialog.setAttribute('aria-modal', 'true');

    const icon = element('div', 'fx-dialog-icon');
    icon.appendChild(element('i', 'bx ' + (ICONS[tone] || ICONS.primary)));

    const heading = element('h5', 'fx-dialog-title', title);
    heading.id = 'fx-dialog-title-' + Date.now();
    dialog.setAttribute('aria-labelledby', heading.id);

    const body = element('p', 'fx-dialog-message', message);

    const actions = element('div', 'fx-dialog-actions');
    let cancelButton = null;
    if (cancelText) {
      cancelButton = element('button', 'btn btn-secondary', cancelText);
      cancelButton.type = 'button';
      actions.appendChild(cancelButton);
    }
    const confirmButton = element('button', 'btn ' + (CONFIRM_BUTTON[tone] || 'btn-primary'), confirmText);
    confirmButton.type = 'button';
    actions.appendChild(confirmButton);

    dialog.append(icon, heading, body, actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const close = (result) => {
      document.removeEventListener('keydown', onKey, true);
      overlay.classList.remove('is-open');
      setTimeout(() => overlay.remove(), 160);
      if (previousFocus && previousFocus.focus) previousFocus.focus();
      resolve(result);
    };

    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close(false);
      } else if (event.key === 'Tab') {
        // Keep focus inside the dialog
        const buttons = cancelButton ? [cancelButton, confirmButton] : [confirmButton];
        const index = buttons.indexOf(document.activeElement);
        event.preventDefault();
        buttons[(index + (event.shiftKey ? buttons.length - 1 : 1)) % buttons.length].focus();
      }
    };

    confirmButton.addEventListener('click', () => close(true));
    if (cancelButton) cancelButton.addEventListener('click', () => close(false));
    overlay.addEventListener('mousedown', (event) => {
      if (event.target === overlay) close(false);
    });
    document.addEventListener('keydown', onKey, true);

    requestAnimationFrame(() => overlay.classList.add('is-open'));
    // A destructive action should not be one Enter press away: focus Cancel there.
    (tone === 'danger' && cancelButton ? cancelButton : confirmButton).focus();
  });
}

/** Resolves to true when the user confirms, false when they cancel. */
export function fxConfirm(message, options = {}) {
  return openDialog({
    message,
    title: options.title || 'Are you sure?',
    tone: options.tone || 'primary',
    confirmText: options.confirmText || 'Confirm',
    cancelText: options.cancelText || 'Cancel',
  });
}

/** Shows a message with a single button; resolves when it is dismissed. */
export function fxAlert(message, options = {}) {
  return openDialog({
    message,
    title: options.title || 'Notice',
    tone: options.tone || 'info',
    confirmText: options.confirmText || 'OK',
    cancelText: null,
  }).then(() => undefined);
}
