// The white overlay with loading dots that covers a modal body while `printLoad` is true.

import SpinnerGrow from './SpinnerGrow';

export default function LoadersSpin({ printLoad }) {
  if (!printLoad) {
    return <div className="loadersSpin"></div>;
  }
  return (
    <div className="loadersSpin" style={{ width: '98%', opacity: 0.9, position: 'absolute', top: 0, bottom: 0, right: 0, left: '3px', zIndex: 100000 }}>
      <div className="loader-lg" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        <SpinnerGrow />
      </div>
    </div>
  );
}
