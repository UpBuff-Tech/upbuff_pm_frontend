// Catches an error thrown while a page renders, so only the page area shows a message and the
// menu / top bar stay usable - without it React unmounts the whole app and the screen goes blank.
// The boundary resets when the user navigates to another page (resetKey = the path).

import { Component } from 'react';

export default class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, resetKey: props.resetKey };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey };
    return null;
  }

  componentDidCatch(error, info) {
    console.error('Page crashed:', error, info && info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    // A new deployment replaced the page's code file: a reload fetches the current one.
    const staleChunk = /dynamically imported module|Importing a module script failed|Loading chunk/i.test(String(error && error.message));
    return (
      <div className="container-xxl flex-grow-1 container-p-y">
        <div className="card">
          <div className="card-body text-center py-5">
            <h5 className="mb-2">{staleChunk ? 'A new version of the app is available' : 'This page could not be displayed'}</h5>
            <p className="text-muted mb-3">{staleChunk ? 'Reload to continue.' : String((error && error.message) || error)}</p>
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Reload</button>
          </div>
        </div>
      </div>
    );
  }
}
