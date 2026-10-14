import './loader.css';

export default function ButtonLoader() {
  return (
    <span className="button-loader">
      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
      <span>Loading...</span>
    </span>
  );
}
