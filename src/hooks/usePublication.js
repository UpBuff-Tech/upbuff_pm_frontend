// Replacement for `instance.subscribe('name', ...args)` followed by reading the collection.
//
//   const { docs, ready } = usePublication('notifications.forUser', [50]);
//
// `upToDate` is true once the documents of the CURRENT arguments have arrived (after an argument
// change `docs` still holds the previous result until then - it may even be the same list, e.g.
// empty before and after, so watching `docs` for a change is not enough).
//
// Meteor pushed changes live. Here the documents are reloaded after any api.call finishes and
// every `intervalMs` milliseconds, so the screen stays up to date in the same way.
// Pass `enabled: false` to wait (for example until the user id is known).

import { useEffect, useRef, useState } from 'react';
import api, { onDataChanged } from '../api/client';
import { stringify } from '../api/ejson';

export function usePublication(name, args = [], { intervalMs = 5000, enabled = true } = {}) {
  const [docs, setDocs] = useState([]);
  const [ready, setReady] = useState(false);
  const [loadedArgsKey, setLoadedArgsKey] = useState(null);
  const latestRequest = useRef(0);
  const lastDocsKey = useRef(null);
  const argsKey = stringify(args); // reload when the argument values change

  useEffect(() => {
    if (!enabled) return undefined;
    let stopped = false;

    const load = () => {
      const requestNumber = ++latestRequest.current;
      api.publication(name, ...args)
        .then((data) => {
          if (stopped || requestNumber !== latestRequest.current) return;
          // Like Meteor, only hand the page new documents when something actually changed.
          const nextKey = stringify(data || []);
          if (nextKey !== lastDocsKey.current) {
            lastDocsKey.current = nextKey;
            setDocs(data || []);
          }
          setReady(true);
          setLoadedArgsKey(argsKey);
        })
        .catch((error) => console.error('Publication "' + name + '" failed:', error));
    };

    load();
    const unsubscribe = onDataChanged(load);
    const timer = setInterval(load, intervalMs);
    return () => {
      stopped = true;
      unsubscribe();
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, argsKey, intervalMs, enabled]);

  return { docs, ready, upToDate: ready && loadedArgsKey === argsKey };
}
