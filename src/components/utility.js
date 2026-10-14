/**
 * @author Visakh
 */

// Shared list helpers (the old imports/ui/components/utility.js). They were implicit globals that
// reached the page through Template.instance(); here they are named exports and the page passes its
// `pagination` object (from usePagination) where the old code read `Template.instance().pagination`.

import { Session } from '../lib/session';

/**
 * Options of the inline "editable text" fields of a list.
 * @param collectionName
 * @returns {{collection: *, acceptEmpty: boolean, substitute: string, eventType: string}}
 */
export const globalOptionsHelper = (collectionName) => {
  return {
    collection: collectionName,
    acceptEmpty: false,
    substitute: '<i class="fa fa-pencil"></i>',
    eventType: 'dblclick'
  };
};

/**
 * Key handler of a list's search box: Enter filters the list by name, clearing the box shows everything.
 * @param event      the keyup event of the search input
 * @param instance   an object holding the page's pagination: { pagination }
 */
export const getSearchedResults = function (event, instance) {
  let value = $.trim(event.target.value);

  if (event.keyCode === 13) {
    instance.pagination.settings.set('filters', {});

    if (value) {
      setTimeout(function () {
        instance.pagination.settings.set('filters', { name: { $regex: new RegExp(value, 'i') } });
      }, 200);
    }
  }
  else if (event.keyCode === 8 && !$.trim(value)) {
    instance.pagination.settings.set('filters', {});
  }
};

/**
 * True when the list's first page has been loaded.
 * @returns {*|any}
 */
export const isReady = function (pagination) {
  return pagination.ready();
};

/**
 * The onClick of a <Paginator>: (event, clickedPage) => ...
 * @returns {Function}
 */
export const handleCommonPagination = function (pagination) {
  return function (e, clickedPage) {
    e.preventDefault();
    console.log('Changing page from ', pagination.currentPage(), ' to ', clickedPage);
  };
};

/**
 * Sort the list by the column header that was clicked.
 */
export const triggerSort = function (event, pagination) {
  let sort = getSortOptions(event);
  pagination.settings.set('sort', sort);
};

/**
 * @returns {*}
 */
export const getTemplatePagination = function (pagination) {
  return pagination;
};

/**
 * The documents of the current page.
 * @returns {*}
 */
export const getInstances = function (pagination) {
  return pagination.getPage();
};

/**
 * Puts the up/down arrow in front of the column header the list is sorted by.
 * The arrow is an extra element added to the header by jQuery, exactly as before.
 */
export const genericSortIcons = () => {
  let order = Session.get('order');
  let fieldName = Session.get('field');
  setTimeout(function () {
    $('#order').remove();
    if (order === 1) {
      $('#' + fieldName).prepend('<i id="order" class="fa fa-angle-double-up icon-align"></i>');
    }
    else {
      $('#' + fieldName).prepend('<i id="order" class="fa fa-angle-double-down icon-align"></i>');
    }
  }, 200);
};

/**
 * The sort to apply after a click on a column header (the header's id is the field name).
 * Clicking the same header again reverses the order.
 * @returns {{}}
 */
export const getSortOptions = (event) => {
  let fieldName = $(event.target).attr('id');
  let order = (Session.get('field') !== fieldName) ? null : Session.get('order');
  let sortOrder = order && order === 1 ? -1 : 1;

  Session.setPersistent('order', sortOrder);
  Session.setPersistent('field', fieldName);

  let sort = {};
  sort[fieldName] = sortOrder;

  return sort;
};
