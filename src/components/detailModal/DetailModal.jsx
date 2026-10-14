// Building blocks for the read-only "details" modals, so every one of them looks alike.
// Styles: detailModal.css (loaded globally from main.jsx). Put `dm-modal` on the .modal element.
//
//   <div className="modal fade dm-modal" id="...">
//     <div className="modal-dialog modal-lg modal-dialog-scrollable"><div className="modal-content">
//       <DetailHeader icon="bx-user" tone="indigo" eyebrow="Client" title="Acme" meta={<Pill tone="green" dot>Active</Pill>} />
//       <div className="modal-body p-0"><div className="dm-body">
//         <DetailSection title="Contact" icon="bx-phone">
//           <DetailGrid>
//             <DetailField label="Email">{email}</DetailField>
//             <DetailField label="Address" wide text>{address}</DetailField>
//           </DetailGrid>
//         </DetailSection>
//       </div></div>
//     </div></div>
//   </div>

const AVATAR_COLORS = ['#4f46e5', '#0891b2', '#16a34a', '#d97706', '#db2777', '#7c3aed', '#0d9488', '#ea580c'];

/** A stable colour per name, so a person / project keeps the same avatar colour everywhere. */
export function colorFor(text) {
  let hash = 0;
  for (let i = 0; i < (text || '').length; i++) hash = text.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** "Jane Doe" -> "JD" */
export function initialsOf(name) {
  if (!name) return '?';
  const words = String(name).split(/\s+/).filter((part) => /^[\p{L}\p{N}]/u.test(part));
  return (words.length ? words : [String(name)]).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase();
}

const isEmpty = (value) => value === null || value === undefined || value === '' || value === '-' || value === 'N/A'
  || (Array.isArray(value) && value.length === 0);

/**
 * Modal header: icon (or avatar / photo), optional small eyebrow line, title, meta row and the close button.
 * `closeProps` is spread on the close button (for pages that need a class or onClick on it).
 */
export function DetailHeader({ icon, tone = 'indigo', avatar, photo, round = false, eyebrow, title, titleId, meta, closeProps, children }) {
  return (
    <div className={'dm-header dm-tone-' + tone}>
      <div className="dm-header-main">
        {photo || avatar ? (
          <span className={'dm-header-avatar' + (round ? ' is-round' : '')} style={{ '--c': colorFor(avatar || title) }}>
            {photo ? <img src={photo} alt="" /> : initialsOf(avatar)}
          </span>
        ) : icon ? (
          <span className="dm-header-icon"><i className={'bx ' + icon}></i></span>
        ) : null}
        <div className="dm-header-text">
          {eyebrow && <span className="dm-eyebrow">{eyebrow}</span>}
          <h5 className="dm-title" id={titleId}>{title}</h5>
          {meta && <div className="dm-header-meta">{meta}</div>}
        </div>
      </div>
      {children}
      <button type="button" className="close btn-close" data-dismiss="modal" aria-label="Close" {...closeProps}></button>
    </div>
  );
}

export function DetailSection({ title, icon, count, actions, flush = false, className = '', children }) {
  return (
    <section className={'dm-section' + (flush ? ' is-flush' : '') + (className ? ' ' + className : '')}>
      {(title || actions) && (
        <div className="dm-section-head">
          {title && (
            <h6 className="dm-section-title">
              {icon && <i className={'bx ' + icon}></i>}
              {title}
              {count !== undefined && <span className="dm-count">{count}</span>}
            </h6>
          )}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function DetailGrid({ cols = 2, children }) {
  return <div className="dm-grid" style={{ '--dm-cols': cols }}>{children}</div>;
}

/**
 * One label + value. Empty values ('', null, '-', 'N/A', []) show `empty` in a muted style.
 * `text` = long free text (keeps line breaks), `wide` = spans the whole grid row.
 */
export function DetailField({ label, icon, wide = false, text = false, empty = 'Not provided', id, children }) {
  const blank = isEmpty(children);
  return (
    <div className={'dm-field' + (wide ? ' is-wide' : '')}>
      <div className="dm-label">{icon && <i className={'bx ' + icon}></i>}{label}</div>
      <div className={'dm-value' + (blank ? ' is-empty' : text ? ' is-text' : '')} id={id}>{blank ? empty : children}</div>
    </div>
  );
}

export function StatTile({ icon, tone = 'indigo', label, value, sub }) {
  return (
    <div className={'dm-stat dm-tone-' + tone}>
      {icon && <span className="dm-stat-icon"><i className={'bx ' + icon}></i></span>}
      <div className="dm-stat-text">
        <span className="dm-stat-label">{label}</span>
        <span className="dm-stat-value">{value}</span>
        {sub && <span className="dm-stat-sub">{sub}</span>}
      </div>
    </div>
  );
}

/** Coloured status pill. tone: green | amber | red | blue | indigo | cyan | purple | pink | gray */
export function Pill({ tone = 'gray', dot = false, icon, className = '', children }) {
  return (
    <span className={'dm-pill dm-tone-' + tone + (dot ? ' has-dot' : '') + (className ? ' ' + className : '')}>
      {icon && <i className={'bx ' + icon}></i>}{children}
    </span>
  );
}

export function Person({ name, sub, photo, inline = false }) {
  const label = name || 'Unknown';
  return (
    <div className={'dm-person' + (inline ? ' is-inline' : '')} title={sub || label}>
      <span className="dm-person-avatar" style={{ '--c': colorFor(label) }}>
        {photo ? <img src={photo} alt="" /> : initialsOf(label)}
      </span>
      <span className="dm-person-text">
        <strong>{label}</strong>
        {sub && <small>{sub}</small>}
      </span>
    </div>
  );
}

/** A file row. Pass `href` for a link, or `onClick` for a button. */
export function FileItem({ name, size, icon = 'bx bx-file', href, onClick, download }) {
  const body = (
    <>
      <span className="dm-file-icon"><i className={icon}></i></span>
      <span className="dm-file-meta">
        <strong title={name}>{name || 'Attachment'}</strong>
        {size && <small>{size}</small>}
      </span>
      {(href || onClick) && <i className="bx bx-download dm-file-action"></i>}
    </>
  );
  if (href) return <a className="dm-file" href={href} target="_blank" rel="noreferrer" download={download}>{body}</a>;
  if (onClick) return <button type="button" className="dm-file" onClick={onClick}>{body}</button>;
  return <div className="dm-file">{body}</div>;
}

export function EmptyState({ icon = 'bx-info-circle', children }) {
  return (
    <div className="dm-empty">
      <i className={'bx ' + icon}></i>
      <p>{children}</p>
    </div>
  );
}
