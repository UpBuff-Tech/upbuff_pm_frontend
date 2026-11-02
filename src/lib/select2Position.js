// Select2 4.0.3 places an open dropdown relative to its dropdownParent (or that element's offset
// parent) but ignores how far that element has been scrolled. Inside a scrolled modal body the
// list therefore shows up that many pixels above (or left of) its field. Add the scroll back in.

export function setupSelect2Positioning() {
  if (!$.fn.select2 || !$.fn.select2.amd) return;
  const AttachBody = $.fn.select2.amd.require('select2/dropdown/attachBody');
  const positionDropdown = AttachBody.prototype._positionDropdown;

  AttachBody.prototype._positionDropdown = function () {
    positionDropdown.call(this);

    let $parent = this.$dropdownParent;
    if ($parent.css('position') === 'static') $parent = $parent.offsetParent();
    // <html>/<body> scroll with the window, which select2 already accounts for
    if ($parent.is('html, body')) return;

    const scrollTop = $parent.scrollTop();
    const scrollLeft = $parent.scrollLeft();
    if (!scrollTop && !scrollLeft) return;

    const css = this.$dropdownContainer.css(['top', 'left']);
    this.$dropdownContainer.css({
      top: parseFloat(css.top) + scrollTop,
      left: parseFloat(css.left) + scrollLeft,
    });
  };
}
