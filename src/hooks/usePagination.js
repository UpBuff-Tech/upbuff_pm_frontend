// Replacement for `new Meteor.Pagination(Collection, settings)` (kurounin:pagination).
//
//   const pagination = usePagination('client', { filters: {}, sort: { createdAt: -1 }, perPage: 20 });
//   pagination.getPage()        -> the documents of the current page
//   pagination.ready()          -> false while the first load is running
//   pagination.currentPage()    -> current page number;  pagination.currentPage(3) goes to page 3
//   pagination.totalPages(), pagination.totalItems()
//   pagination.filters(query), pagination.sort(sortSpec), pagination.perPage(n)  -> change and reload
//   pagination.settings.set('filters', query)                                    -> same, old style
//
// The first argument is the MongoDB collection name the old code passed as a Collection object
// (Clients -> 'client', Project -> 'project', Meteor.users -> 'users', Meteor.roles -> 'jalik-roles'...).
// Like the Meteor version, the list reloads by itself after any api.call finishes.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api, { onDataChanged } from '../api/client';
import { stringify } from '../api/ejson';

export function usePagination(name, initialSettings = {}) {
  const [settings, setSettings] = useState({
    page: initialSettings.page || 1,
    perPage: initialSettings.perPage || 10,
    filters: initialSettings.filters || {},
    sort: initialSettings.sort || {},
    fields: initialSettings.fields || {},
  });
  const [result, setResult] = useState({ docs: [], totalItems: 0, totalPages: 0 });
  const [ready, setReady] = useState(false);
  const latestRequest = useRef(0);
  const lastResultKey = useRef(null);

  const load = useCallback(() => {
    const requestNumber = ++latestRequest.current;
    api.paginate(name, settings)
      .then((data) => {
        if (requestNumber !== latestRequest.current) return; // a newer request is on its way
        const next = data || { docs: [], totalItems: 0, totalPages: 0 };
        // Like Meteor, only hand the page new data when something actually changed - otherwise a page
        // that reacts to the list (and calls the server) would make the list reload again and again.
        const nextKey = stringify(next);
        if (nextKey !== lastResultKey.current) {
          lastResultKey.current = nextKey;
          setResult(next);
        }
        setReady(true);
        // If the list shrank (e.g. after filtering), fall back to the last existing page.
        if (data && data.totalPages > 0 && settings.page > data.totalPages) {
          setSettings((old) => ({ ...old, page: data.totalPages }));
        }
      })
      .catch((error) => {
        if (requestNumber !== latestRequest.current) return;
        console.error('Pagination "' + name + '" failed:', error);
        setReady(true);
      });
  }, [name, settings]);

  // Load when the settings change, and again whenever some data was changed by a method call.
  useEffect(() => {
    load();
    return onDataChanged(load);
  }, [load]);

  return useMemo(() => {
    const change = (key, value) => setSettings((old) => ({ ...old, [key]: value }));
    return {
      ready: () => ready,
      getPage: () => result.docs,
      totalItems: () => result.totalItems,
      totalPages: () => result.totalPages,
      currentPage: (page) => {
        if (page === undefined) return settings.page;
        if (page >= 1) change('page', page);
        return page;
      },
      perPage: (value) => (value === undefined ? settings.perPage : change('perPage', value)),
      filters: (value) => (value === undefined ? settings.filters : change('filters', value)),
      sort: (value) => (value === undefined ? settings.sort : change('sort', value)),
      fields: (value) => (value === undefined ? settings.fields : change('fields', value)),
      settings: { set: change, get: (key) => settings[key] },
      refresh: load,
    };
  }, [ready, result, settings, load]);
}
