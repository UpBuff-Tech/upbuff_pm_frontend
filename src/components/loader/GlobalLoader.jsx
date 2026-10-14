import './loader.css';

export default function GlobalLoader() {
  return (
    <div id="globalLoader" className="global-loader" style={{ display: 'none' }}>
      <div className="loader-backdrop"></div>
      <div className="loader-content">
        <div className="loader-spinner">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
        <p className="loader-text mt-3">Loading...</p>
      </div>
    </div>
  );
}
