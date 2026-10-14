/**
 * Global Loader Utility
 * Provides reusable loading indicators for the entire application
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import api from '../../api/client';
import GlobalLoader from './GlobalLoader';
import './loader.css';

/**
 * Show global full-screen loader
 * @param {String} message - Optional loading message
 */
export const showGlobalLoader = (message = 'Loading...') => {
  let loader = $('#globalLoader');

  // Create loader if it doesn't exist
  if (loader.length === 0) {
    $('body').append(renderToStaticMarkup(createElement(GlobalLoader)));
    loader = $('#globalLoader');
  }

  // Update message
  loader.find('.loader-text').text(message);

  // Show loader
  loader.addClass('show').show();
  $('body').addClass('loader-active');
};

/**
 * Hide global loader
 */
export const hideGlobalLoader = () => {
  const loader = $('#globalLoader');

  loader.removeClass('show').addClass('hide');
  $('body').removeClass('loader-active');

  // Remove after animation
  setTimeout(() => {
    loader.removeClass('hide').hide();
  }, 200);
};

/**
 * Show loader inside a modal
 * @param {String} modalId - Modal selector (e.g., '#projectFormModal')
 * @param {String} message - Optional loading message
 */
export const showModalLoader = (modalId, message = 'Loading...') => {
  const modal = $(modalId);

  if (modal.length === 0) {
    console.warn(`Modal ${modalId} not found`);
    return;
  }

  // Remove existing loader if any
  modal.find('.modal-loader').remove();

  // Add loader
  const loaderHtml = `
    <div class="modal-loader show">
      <div class="modal-loader-backdrop"></div>
      <div class="modal-loader-content">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2 mb-0">${message}</p>
      </div>
    </div>
  `;

  modal.find('.modal-content').css('position', 'relative').append(loaderHtml);
};

/**
 * Hide modal loader
 * @param {String} modalId - Modal selector
 */
export const hideModalLoader = (modalId) => {
  const modal = $(modalId);
  const loader = modal.find('.modal-loader');

  loader.removeClass('show').addClass('hide');

  setTimeout(() => {
    loader.remove();
    modal.find('.modal-content').css('position', '');
  }, 200);
};

/**
 * Show loader in a button
 * @param {String} buttonSelector - Button selector
 * @param {String} loadingText - Text to show while loading
 * @returns {Function} Function to restore button state
 */
export const showButtonLoader = (buttonSelector, loadingText = 'Loading...') => {
  const button = $(buttonSelector);

  if (button.length === 0) {
    console.warn(`Button ${buttonSelector} not found`);
    return () => {};
  }

  // Store original state. The original nodes are kept (not their HTML text) so a button
  // rendered by React gets back the very same elements React is managing.
  const originalContent = button.contents().detach();
  const wasDisabled = button.prop('disabled');

  // Show loader
  const loaderHtml = `
    <span class="button-loader">
      <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
      <span>${loadingText}</span>
    </span>
  `;

  button.html(loaderHtml).prop('disabled', true);

  // Return function to restore button
  return () => {
    button.empty().append(originalContent).prop('disabled', wasDisabled);
  };
};

/**
 * Show loader in a specific container
 * @param {String} containerSelector - Container selector
 * @param {String} message - Optional loading message
 */
export const showContainerLoader = (containerSelector, message = 'Loading...') => {
  const container = $(containerSelector);

  if (container.length === 0) {
    console.warn(`Container ${containerSelector} not found`);
    return;
  }

  // Store original content (the nodes themselves, see showButtonLoader)
  container.data('original-content', container.contents().detach());

  // Show loader
  const loaderHtml = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="text-muted mt-3">${message}</p>
    </div>
  `;

  container.html(loaderHtml);
};

/**
 * Hide container loader and restore original content
 * @param {String} containerSelector - Container selector
 */
export const hideContainerLoader = (containerSelector) => {
  const container = $(containerSelector);
  const originalContent = container.data('original-content');

  if (originalContent) {
    container.empty().append(originalContent);
    container.removeData('original-content');
  }
};

/**
 * Wrap a server call with loading indicator
 * @param {Object} options - Configuration options
 * @param {String} options.method - Server method name
 * @param {Array} options.params - Method parameters
 * @param {String} options.loaderType - 'global', 'modal', 'button', or 'container'
 * @param {String} options.target - Target selector for modal/button/container
 * @param {String} options.loadingMessage - Loading message
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onError - Error callback
 */
export const callWithLoader = (options) => {
  const {
    method,
    params = [],
    loaderType = 'global',
    target = null,
    loadingMessage = 'Loading...',
    onSuccess = () => {},
    onError = (error) => toastr.error(error.reason || 'Operation failed')
  } = options;

  let restoreButton = null;

  // Show appropriate loader
  switch (loaderType) {
    case 'global':
      showGlobalLoader(loadingMessage);
      break;
    case 'modal':
      if (target) showModalLoader(target, loadingMessage);
      break;
    case 'button':
      if (target) restoreButton = showButtonLoader(target, loadingMessage);
      break;
    case 'container':
      if (target) showContainerLoader(target, loadingMessage);
      break;
  }

  // Make the server call
  api.call(method, ...params, (error, result) => {
    // Hide loader
    switch (loaderType) {
      case 'global':
        hideGlobalLoader();
        break;
      case 'modal':
        if (target) hideModalLoader(target);
        break;
      case 'button':
        if (restoreButton) restoreButton();
        break;
      case 'container':
        if (target) hideContainerLoader(target);
        break;
    }

    // Handle result
    if (error) {
      onError(error);
    } else {
      onSuccess(result);
    }
  });
};
