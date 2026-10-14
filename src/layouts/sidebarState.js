// Sidebar state, kept as classes on <html> so plain CSS can lay out the page:
//   fx-sidebar-collapsed  desktop: icon-only rail (remembered across visits)
//   fx-sidebar-open       below 1200px: the sidebar slides in over the page

const COLLAPSED_KEY = 'fx-sidebar-collapsed';
const DESKTOP_QUERY = '(min-width: 1200px)';

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch (e) {
    return false;
  }
}

export function restoreSidebar() {
  document.documentElement.classList.toggle('fx-sidebar-collapsed', readCollapsed());
}

export function isSidebarCollapsed() {
  return document.documentElement.classList.contains('fx-sidebar-collapsed') && window.matchMedia(DESKTOP_QUERY).matches;
}

export function toggleSidebar() {
  const html = document.documentElement;
  if (window.matchMedia(DESKTOP_QUERY).matches) {
    const collapsed = !html.classList.contains('fx-sidebar-collapsed');
    html.classList.toggle('fx-sidebar-collapsed', collapsed);
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch (e) {
      // Private mode: the choice just isn't remembered.
    }
    // Charts size themselves on window resize; the page width changes after the 0.2s transition.
    setTimeout(() => window.dispatchEvent(new Event('resize')), 220);
  } else {
    html.classList.toggle('fx-sidebar-open');
  }
}

export function closeMobileSidebar() {
  document.documentElement.classList.remove('fx-sidebar-open');
}
