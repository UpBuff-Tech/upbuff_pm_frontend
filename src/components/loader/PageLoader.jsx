import './loader.css';

/**
 * Full-screen loader: the brand mark inside a spinning gradient ring.
 *   <PageLoader label="Reconnecting…" />
 */
export default function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="fx-page-loader" role="status" aria-live="polite">
      <div className="fx-page-loader-inner">
        <div className="fx-orbit">
          <span className="fx-orbit-ring"></span>
          <img src="/img/logo.png" alt="" className="fx-orbit-mark" />
        </div>
        {label && <p className="fx-page-loader-label">{label}</p>}
      </div>
    </div>
  );
}
