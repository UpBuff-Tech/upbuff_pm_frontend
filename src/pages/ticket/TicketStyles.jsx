/**
 * The <style> block of the ticket page (it was part of the old template, so the rules
 * are on the page only while the ticket page is shown).
 */
const TICKET_STYLES = `
    /* ---- Header ---- */
    .tk-header {
      display: flex; align-items: flex-end; justify-content: space-between;
      flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;
    }
    .tk-view-toggle {
      display: inline-flex; padding: 3px; gap: 2px;
      border: 1px solid var(--fx-border); border-radius: 10px; background: var(--fx-surface);
    }
    .tk-view-toggle button {
      display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 12px;
      border: 0; border-radius: 7px; background: transparent;
      color: var(--fx-text-muted); font-size: 0.8125rem; font-weight: 500; cursor: pointer;
    }
    .tk-view-toggle button i { font-size: 1.05rem; }
    .tk-view-toggle button:hover { color: var(--fx-text); }
    .tk-view-toggle button.active { background: var(--fx-primary-soft); color: var(--fx-primary); }

    /* ---- Status overview ---- */
    .tk-overview { margin-bottom: 1rem; overflow: hidden; }
    .tk-distribution { display: flex; height: 4px; gap: 2px; background: var(--fx-surface-hover); }
    .tk-dist-seg { display: block; height: 100%; }
    .tk-status-tabs { display: flex; gap: 4px; padding: 8px; overflow-x: auto; }
    .tk-status-tab {
      --st: var(--fx-text-muted);
      flex: 1 0 auto; display: flex; align-items: center; gap: 10px;
      padding: 8px 12px; border: 1px solid transparent; border-radius: 12px;
      background: transparent; text-align: left; cursor: pointer;
      transition: background-color 0.15s ease, border-color 0.15s ease;
    }
    .tk-status-tab:hover { background: var(--fx-surface-alt); }
    .tk-status-tab.active {
      border-color: color-mix(in srgb, var(--st) 35%, transparent);
      background: color-mix(in srgb, var(--st) 7%, #fff);
    }
    .tk-status-icon {
      display: inline-flex; align-items: center; justify-content: center;
      width: 34px; height: 34px; flex-shrink: 0; border-radius: 10px;
      background: color-mix(in srgb, var(--st) 12%, #fff); color: var(--st); font-size: 1.15rem;
    }
    .tk-status-text { display: flex; flex-direction: column; line-height: 1.2; }
    .tk-status-count { font-size: 1.125rem; font-weight: 700; color: var(--fx-text); }
    .tk-status-label { font-size: 0.75rem; color: var(--fx-text-muted); white-space: nowrap; }

    /* Status colours (shared by tabs, the distribution bar, badges and cards) */
    .st-all { --st: #4f46e5; }
    .st-open { --st: #d97706; }
    .st-assigned { --st: #4f46e5; }
    .st-in_progress { --st: #0891b2; }
    .st-in_review { --st: #eb6834; }
    .st-on_hold { --st: #64748b; }
    .st-closed { --st: #16a34a; }
    .tk-dist-seg { background: var(--st); }

    /* ---- Filters ---- */
    .tk-filters { margin-bottom: 1rem; padding: 14px 16px; }
    .tk-filters-top { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
    .tk-search { position: relative; flex: 1 1 320px; max-width: 460px; }
    .tk-search i { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--fx-text-subtle); font-size: 1.15rem; pointer-events: none; }
    .tk-search .form-control { padding-left: 38px; height: 40px; border-radius: 10px; }
    .tk-filters-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
    .tk-clear {
      display: inline-flex; align-items: center; gap: 4px;
      border: 1px solid #fecaca !important; background: #fef2f2 !important; color: #b91c1c !important;
    }
    .tk-clear:hover { background: #fee2e2 !important; }
    .tk-clear i { font-size: 1rem; }
    .tk-clear-count {
      min-width: 18px; padding: 0 5px; margin-left: 2px; border-radius: 999px;
      background: #dc2626; color: #fff; font-size: 0.6875rem; line-height: 18px; text-align: center;
    }
    .tk-filter-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
    .tk-filter { display: flex; flex-direction: column; gap: 4px; margin: 0; min-width: 0; }
    .tk-filter-label { font-size: 0.75rem; font-weight: 500; color: var(--fx-text-muted); }
    @media (max-width: 1199.98px) { .tk-filter-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    @media (max-width: 767.98px) { .tk-filter-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

    /* ---- Badges ---- */
    .tk-status {
      --st: #64748b;
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 9px !important; border-radius: 999px !important;
      background: color-mix(in srgb, var(--st) 12%, #fff) !important;
      color: color-mix(in srgb, var(--st) 82%, #000) !important;
      font-weight: 600; text-transform: none;
    }
    .tk-status::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--st); }
    .ticket-status-open { --st: #d97706; }
    .ticket-status-assigned { --st: #4f46e5; }
    .ticket-status-inprogress { --st: #0891b2; }
    .ticket-status-onhold { --st: #64748b; }
    .ticket-status-inreview { --st: #eb6834; }
    .ticket-status-closed { --st: #16a34a; }

    .tk-priority {
      --p: #64748b;
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 8px !important; border-radius: 6px !important;
      background: color-mix(in srgb, var(--p) 10%, #fff) !important;
      color: color-mix(in srgb, var(--p) 82%, #000) !important;
      font-weight: 600; text-transform: none;
    }
    .tk-priority::before {
      content: ''; width: 8px; height: 8px; border-radius: 2px; background: var(--p);
    }
    .tk-priority.p-critical { --p: #dc2626; }
    .tk-priority.p-high { --p: #ea580c; }
    .tk-priority.p-medium { --p: #0284c7; }
    .tk-priority.p-low { --p: #64748b; }

    .tk-type {
      --t: #4f46e5;
      display: inline-block; padding: 2px 8px; border-radius: 6px;
      background: color-mix(in srgb, var(--t) 10%, #fff) !important;
      color: color-mix(in srgb, var(--t) 80%, #000) !important;
      font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.03em;
    }
    .tk-type.bg-primary { --t: #4f46e5; }
    .tk-type.bg-info { --t: #0891b2; }
    .tk-type.bg-success { --t: #16a34a; }
    .tk-type.bg-warning { --t: #d97706; }
    .tk-type.bg-danger { --t: #dc2626; }
    .tk-type.bg-dark { --t: #0f172a; }
    .tk-type.bg-secondary { --t: #64748b; }
    .tk-type.ticket-type-purple { --t: #7c3aed; }
    .tk-type.ticket-type-teal { --t: #0d9488; }
    .tk-type.ticket-type-pink { --t: #db2777; }

    /* ---- Table ---- */
    .tk-table-card { overflow: hidden; }
    .tk-table td { vertical-align: middle; font-size: 0.8125rem; }
    .ticket-row { cursor: pointer; }
    .ticket-row.is-closed td { opacity: 0.7; }
    .tk-ticket-cell { display: flex; flex-direction: column; gap: 1px; max-width: 320px; }
    .tk-ticket-id { font-size: 0.75rem; font-weight: 700; color: var(--fx-primary); text-decoration: none; }
    .tk-ticket-id:hover { text-decoration: underline; }
    .tk-ticket-subject {
      display: flex; align-items: center; gap: 4px;
      font-weight: 600; color: var(--fx-text);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .tk-ticket-subject i, .tk-card-subject i { color: var(--fx-text-subtle); flex-shrink: 0; }
    .tk-client { color: var(--fx-text-body); }
    .tk-assignee { display: inline-flex; align-items: center; gap: 6px; min-width: 0; white-space: nowrap; }
    .tk-assignee-name { overflow: hidden; text-overflow: ellipsis; }
    .tk-unassigned { color: var(--fx-text-subtle); }
    .tk-avatar {
      display: inline-flex; align-items: center; justify-content: center;
      width: 24px; height: 24px; flex-shrink: 0; border-radius: 50%;
      background: var(--fx-primary-soft); color: var(--fx-primary);
      font-size: 0.625rem; font-weight: 700;
    }
    .tk-unassigned .tk-avatar { background: var(--fx-surface-hover); color: var(--fx-text-subtle); font-size: 0.85rem; }
    .tk-created { color: var(--fx-text-muted); white-space: nowrap; }
    .tk-row-actions { display: inline-flex; align-items: center; gap: 4px; }
    .tk-icon-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; padding: 0; border: 1px solid transparent; border-radius: 8px;
      background: transparent; color: var(--fx-text-muted); font-size: 1.1rem; cursor: pointer;
    }
    .tk-icon-btn:hover { border-color: var(--fx-border); background: #fff; color: var(--fx-text); }

    /* ---- Cards ---- */
    .tk-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 12px; }
    .tk-card {
      position: relative; display: flex; flex-direction: column; gap: 8px;
      padding: 14px; border: 1px solid var(--fx-border); border-radius: 14px;
      background: #fff; box-shadow: var(--fx-shadow-xs); cursor: pointer;
      transition: box-shadow 0.15s ease, transform 0.15s ease, border-color 0.15s ease;
    }
    .tk-card::before {
      content: ''; position: absolute; left: -1px; top: 14px; height: 22px; width: 3px;
      border-radius: 0 3px 3px 0; background: var(--st, #64748b);
    }
    .tk-card:hover, .tk-card:focus-visible {
      outline: none; border-color: #d5dbe4; transform: translateY(-2px);
      box-shadow: 0 10px 24px -12px rgba(15, 23, 42, 0.25);
    }
    .tk-card.card-closed { opacity: 0.7; background: var(--fx-surface-alt); }
    .tk-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .tk-card-subject {
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
      font-size: 0.9375rem; font-weight: 600; line-height: 1.35; color: var(--fx-text);
    }
    .tk-card-client { display: flex; align-items: center; gap: 4px; margin-top: -4px; font-size: 0.75rem; color: var(--fx-text-muted); }
    .tk-card-badges { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
    .tk-card-progress { display: flex; align-items: center; gap: 8px; }
    .tk-progress-track { flex: 1; height: 6px; border-radius: 999px; background: var(--fx-surface-hover); overflow: hidden; }
    .tk-progress-track span { display: block; height: 100%; border-radius: inherit; background: #0891b2; }
    .tk-card-progress.is-hold .tk-progress-track span { background: #64748b; }
    .tk-card-progress.is-over .tk-progress-track span { background: #dc2626; }
    .tk-progress-label { font-size: 0.6875rem; font-weight: 600; color: var(--fx-text-muted); white-space: nowrap; }
    .tk-card-progress.is-over .tk-progress-label { color: #b91c1c; }
    .tk-card-footer {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      margin-top: auto; padding-top: 10px; border-top: 1px solid #f1f5f9; font-size: 0.75rem;
    }
    .tk-card-footer .tk-created { display: inline-flex; align-items: center; gap: 3px; }

    /* ---- Pagination ---- */
    .tk-pagination { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-top: 1rem; }
    .tk-pagination .pagination { margin: 0; }
    .tk-page-info { font-size: 0.8125rem; color: var(--fx-text-muted); }
    .tk-page-gap .page-link { border: 0 !important; background: transparent !important; }

    /* ---- Empty + loading ---- */
    .tk-empty { padding: 4rem 1.5rem; text-align: center; }
    .tk-empty-icon {
      display: inline-flex; align-items: center; justify-content: center;
      width: 64px; height: 64px; margin-bottom: 1rem; border-radius: 50%;
      background: var(--fx-primary-soft); color: var(--fx-primary); font-size: 1.75rem;
      box-shadow: 0 0 0 10px color-mix(in srgb, var(--fx-primary) 5%, transparent);
    }
    .tk-empty h5 { margin-bottom: 0.25rem; font-size: 1.0625rem; }
    .tk-empty p { margin: 0; color: var(--fx-text-muted); font-size: 0.875rem; }
    .tk-loading { padding: 6px 16px; }
    .tk-skeleton-row { display: flex; align-items: center; gap: 16px; padding: 14px 0; border-bottom: 1px solid #f1f5f9; }
    .tk-skeleton-row:last-child { border-bottom: 0; }
    .tk-sk {
      display: block; height: 10px; border-radius: 6px;
      background: linear-gradient(90deg, #eef2f6 0%, #e2e8f0 40%, #eef2f6 80%);
      background-size: 300% 100%; animation: tk-shimmer 1.3s ease-in-out infinite;
    }
    .tk-sk-id { width: 70px; }
    .tk-sk-subject { flex: 1; max-width: 320px; height: 12px; }
    .tk-sk-pill { width: 70px; height: 20px; border-radius: 999px; }
    .tk-sk-avatar { width: 24px; height: 24px; border-radius: 50%; margin-left: auto; }
    .tk-skeleton-row:nth-child(2n) .tk-sk { animation-delay: 0.15s; }
    @keyframes tk-shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }
    @media (prefers-reduced-motion: reduce) { .tk-sk { animation: none; } }

    /* Attachment upload zone */
    .attachment-dropzone {
      border: 2px dashed #c7c9d9;
      border-radius: 10px;
      background: #f8f8ff;
      padding: 24px 16px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
    }
    .attachment-dropzone:hover, .attachment-dropzone.drag-over {
      border-color: #4f46e5;
      background: #ededff;
    }
    .attachment-dropzone-icon {
      font-size: 2rem;
      color: #a0a3b5;
      display: block;
      margin-bottom: 6px;
    }
    .attachment-dropzone-text {
      font-size: 0.9rem;
      color: #6c757d;
      margin-bottom: 4px;
    }
    .attachment-dropzone-hint {
      font-size: 0.75rem;
      color: #adb5bd;
      margin-top: 8px;
    }
    .attachment-file-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      margin-bottom: 6px;
      border-radius: 8px;
      border: 1px solid #e7e7e8;
      background: #fff;
      transition: background 0.15s;
    }
    .attachment-file-item:hover { background: #f8f8ff; }
    .attachment-file-icon {
      width: 34px;
      height: 34px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      flex-shrink: 0;
    }
    .attachment-file-icon.icon-image { background: #fff0f6; color: #e91e8c; }
    .attachment-file-icon.icon-pdf   { background: #fff3f0; color: #f44336; }
    .attachment-file-icon.icon-word  { background: #f0f4ff; color: #1565c0; }
    .attachment-file-icon.icon-excel { background: #f0fff4; color: #2e7d32; }
    .attachment-file-icon.icon-zip   { background: #fffde7; color: #f57f17; }
    .attachment-file-icon.icon-text  { background: #f5f5f5; color: #607d8b; }
    .attachment-file-icon.icon-other { background: #f3f0ff; color: #7c3aed; }
  `;

export default function TicketStyles() {
  return <style>{TICKET_STYLES}</style>;
}
