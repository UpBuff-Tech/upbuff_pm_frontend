// Replacement for Meteor's Session (and the persistent-session package).
//   Session.set / Session.get            -> kept in memory for this page load
//   Session.setPersistent                -> also saved in localStorage, survives a refresh
// In a component, use the useSession(key) hook so the component re-renders when the value changes.

import { useSyncExternalStore } from 'react';

const STORAGE_PREFIX = 'session:';
const values = {};
const persistentKeys = new Set(); // keys set with setPersistent (or read back from localStorage)
const listeners = new Set();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readPersistent(key) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch (e) {
    return undefined;
  }
}

export const Session = {
  get(key) {
    if (key in values) return values[key];
    const stored = readPersistent(key);
    if (stored !== undefined) {
      values[key] = stored;
      persistentKeys.add(key);
    }
    return stored;
  },

  set(key, value) {
    values[key] = value;
    notify();
  },

  setPersistent(key, value) {
    values[key] = value;
    persistentKeys.add(key);
    try { localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value)); } catch (e) { /* storage blocked */ }
    notify();
  },

  equals(key, value) {
    return Session.get(key) === value;
  },

  /** Removes every persistent value (Session.clearPersistent). */
  clearPersistent() {
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith(STORAGE_PREFIX))
        .forEach((key) => localStorage.removeItem(key));
    } catch (e) { /* storage blocked */ }
    persistentKeys.forEach((key) => delete values[key]);
    persistentKeys.clear();
    notify();
  },
};

/** React hook: the current value of a Session key (re-renders on change). */
export function useSession(key) {
  return useSyncExternalStore(subscribe, () => Session.get(key));
}
