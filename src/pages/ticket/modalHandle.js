/**
 * Lets a page open a modal with a plain function call, as the old page did with
 * openEditModal(...), openDetailModal(...) and so on.
 *
 * In the modal's file:
 *
 *   const modal = createModalHandle();
 *   export function openDeleteTicketModal(ticket) { modal.call('open', ticket); }
 *
 *   export default function DeleteTicketModal() {
 *     const open = (ticket) => { ... };
 *     useModalHandle(modal, { open });      // the functions of the modal that is on screen
 *     ...
 *   }
 */
import { useEffect } from 'react';

export function createModalHandle() {
  const handle = {
    functions: null,
    call(name, ...args) {
      if (handle.functions) handle.functions[name](...args);
    }
  };
  return handle;
}

export function useModalHandle(handle, functions) {
  // After every render, so the functions always see the latest state and props
  useEffect(() => {
    handle.functions = functions;
    return () => {
      if (handle.functions === functions) handle.functions = null;
    };
  });
}
