// Removes Select2 from the given element(s), skipping any that are not (or no longer) Select2
// dropdowns. select2('destroy') throws "Cannot read properties of undefined (reading 'destroy')"
// on such an element - e.g. when a page's clean-up runs after the page was mounted again and
// its #id selector now finds the new, not-yet-initialised <select>.
//
//   destroySelect2('#clientSelect, #projectSelect');
//   destroySelect2(select);   // a jQuery object

export function destroySelect2(target) {
  $(target).each(function () {
    if ($(this).data('select2')) $(this).select2('destroy');
  });
}
