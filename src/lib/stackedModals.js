// Stacked modal support (the old imports/startup/client/stackedModals.js).
// Bootstrap gives every modal the same z-index, so a modal opened on top of an already-open one
// would render behind it. Each additional modal is lifted above the ones already open.

const STACK_STEP = 20;
const FALLBACK_MODAL_Z_INDEX = 1090;

function topOpenModalZIndex(exclude) {
  const open = $('.modal.show').not(exclude);
  if (!open.length) return null;
  return open.toArray().reduce((highest, element) => {
    const value = parseInt($(element).css('z-index'), 10);
    return isNaN(value) ? highest : Math.max(highest, value);
  }, FALLBACK_MODAL_Z_INDEX);
}

export function setupStackedModals() {
  $(document).on('show.bs.modal', '.modal', function () {
    const baseZIndex = topOpenModalZIndex(this);
    if (baseZIndex === null) return; // first modal - nothing to stack above
    const zIndex = baseZIndex + STACK_STEP;
    $(this).css('z-index', zIndex);
    setTimeout(function () {
      $('.modal-backdrop:not(.modal-stacked)').last().addClass('modal-stacked').css('z-index', zIndex - 1);
    }, 0);
  });

  $(document).on('hidden.bs.modal', '.modal', function () {
    $(this).css('z-index', '');
    if ($('.modal.show').length) {
      $('body').addClass('modal-open');
    }
  });
}
