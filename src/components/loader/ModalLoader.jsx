import './loader.css';

export default function ModalLoader() {
  return (
    <div className="modal-loader" style={{ display: 'none' }}>
      <div className="modal-loader-backdrop"></div>
      <div className="modal-loader-content">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2 mb-0">Loading...</p>
      </div>
    </div>
  );
}
