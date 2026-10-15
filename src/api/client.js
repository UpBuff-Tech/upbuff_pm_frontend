// Talks to the Spring Boot backend. This replaces Meteor.call / Meteor.subscribe.
//
//   Meteor.call('tickets.assign', ticketId, userId, (error, result) => { ... })
// becomes
//   api.call('tickets.assign', ticketId, userId, (error, result) => { ... })
// or, with async/await:
//   const result = await api.call('tickets.assign', ticketId, userId);   // throws the error
//
// The error object has the same fields as before: error.error, error.reason, error.message.

import { stringify, parse } from './ejson';
import { UNBLOCKED_METHODS } from './unblockedMethods';

// Address of the backend. Empty in development (the Vite dev server proxies /rpc, /auth, ...);
// the production build sets it in .env.production.
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

const TOKEN_KEY = 'Meteor.loginToken';
const USER_ID_KEY = 'Meteor.userId';

// ---------------------------------------------------------------- login token

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
}

export function getStoredUserId() {
  try { return localStorage.getItem(USER_ID_KEY); } catch (e) { return null; }
}

export function storeLogin(userId, token) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_ID_KEY, userId);
}

export function clearLogin() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
}

// ---------------------------------------------------------------- connection status (Meteor.status().connected)

let connected = true;
const connectionListeners = new Set();

export function isConnected() {
  return connected;
}

/** Calls listener(connected) whenever the server becomes reachable / unreachable. Returns an unsubscribe function. */
export function onConnectionChange(listener) {
  connectionListeners.add(listener);
  return () => connectionListeners.delete(listener);
}

function setConnected(value) {
  if (connected === value) return;
  connected = value;
  connectionListeners.forEach((listener) => listener(value));
}

// ---------------------------------------------------------------- "data changed" signal
// Meteor pushed data changes to the browser automatically. Here, lists that must stay fresh
// (usePublication / usePagination) simply reload after any method call finishes.

const dataChangeListeners = new Set();

export function onDataChanged(listener) {
  dataChangeListeners.add(listener);
  return () => dataChangeListeners.delete(listener);
}

let dataChangeTimer = null;
function notifyDataChanged() {
  clearTimeout(dataChangeTimer);
  dataChangeTimer = setTimeout(() => dataChangeListeners.forEach((listener) => listener()), 100);
}

// ---------------------------------------------------------------- HTTP

/** Sends one request and returns the parsed result, or throws an error with error/reason/message. */
export async function request(method, url, body) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;

  let response;
  try {
    response = await fetch(API_URL + url, { method, headers, body: body === undefined ? undefined : stringify(body) });
  } catch (networkError) {
    setConnected(false);
    const error = new Error('Network error');
    error.error = 'network-error';
    error.reason = 'Unable to reach the server';
    throw error;
  }
  // 502/503/504 come from the proxy when the backend is down.
  setConnected(![502, 503, 504].includes(response.status));

  const text = await response.text();
  let data;
  try { data = parse(text); } catch (e) { data = undefined; }

  if (!response.ok) {
    const error = new Error((data && data.message) || 'Internal server error [500]');
    error.error = data && data.error !== undefined ? data.error : response.status;
    error.reason = data && data.reason !== undefined ? data.reason : 'Internal server error';
    error.errorType = 'Meteor.Error';
    throw error;
  }
  return data === null ? undefined : data;
}

// Meteor ran one client's method calls one after another, in the order they were made, unless the
// method called this.unblock(). We keep the same rule so pages behave exactly as before
// (e.g. "save" followed by "reload list" always sees the saved data).
// Only writes form the queue: a read waits for the writes made before it, but reads never wait
// for each other - otherwise a page's 5 initial loads cost 5 server round-trips one after another.
let queue = Promise.resolve();

function runInOrder(name, work) {
  if (UNBLOCKED_METHODS.has(name)) return work();
  const result = queue.then(work, work);
  if (!isReadOnlyMethod(name)) queue = result.catch(() => {});
  return result;
}

/** 'projectTasks.getKanbanColumnCount' -> true: the method only reads data. */
function isReadOnlyMethod(name) {
  const action = name.slice(name.lastIndexOf('.') + 1);
  return /^(get|list|count|find|search|fetch)|Count$/.test(action);
}

/**
 * Calls a server method by its old Meteor name.
 * Pass a callback (error, result) as the last argument, or use the returned Promise.
 */
export function call(name, ...args) {
  let callback = null;
  if (args.length && typeof args[args.length - 1] === 'function') callback = args.pop();

  // undefined arguments are sent as null so the positions stay correct.
  const body = args.map((arg) => (arg === undefined ? null : arg));
  let promise = runInOrder(name, () => request('POST', '/rpc/' + name, body));
  // Only a call that may have changed data makes the live lists reload; a read (getX, list...)
  // re-fetching every list would just flood the server with requests.
  if (!isReadOnlyMethod(name)) promise = promise.finally(notifyDataChanged);

  if (!callback) return promise;
  promise.then((result) => callback(undefined, result), (error) => callback(error));
  return undefined;
}

/** Loads the documents of a former publication: api.publication('attendance.myToday', ...args). */
export function publication(name, ...args) {
  return request('POST', '/pub/' + name, args.map((arg) => (arg === undefined ? null : arg)));
}

/** Loads one page of a paginated collection: { docs, totalItems, totalPages }. */
export function paginate(name, settings) {
  return request('POST', '/pagination/' + name, [settings]);
}

const api = { call, publication, paginate, request };
export default api;
