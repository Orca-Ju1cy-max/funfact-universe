

const Sidebar = (() => {

  // --- State ---
  let isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
  let isMobile    = window.innerWidth <= 768;

  // --- Init ---
  function init() {
    const sidebar   = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const navItems  = document.querySelectorAll('.nav-item');

    if (!sidebar || !toggleBtn) return;

    // Apply saved collapse state (tanpa animasi)
    if (isCollapsed && !isMobile) {
      _applyCollapsed(sidebar, true, false);
    }

    // Tombol toggle
    toggleBtn.addEventListener('click', () => {
      if (isMobile) {
        _toggleMobile(sidebar, toggleBtn);
      } else {
        isCollapsed = !isCollapsed;
        _applyCollapsed(sidebar, isCollapsed, true);
        localStorage.setItem('sidebar-collapsed', isCollapsed);
      }
    });

    // Highlight halaman aktif
    _setActive(navItems);

    // Mobile: klik di luar sidebar → tutup
    document.addEventListener('click', (e) => {
      if (
        isMobile &&
        sidebar.classList.contains('mobile-open') &&
        !sidebar.contains(e.target) &&
        e.target !== toggleBtn
      ) {
        _closeMobile(sidebar, toggleBtn);
      }
    });

    // Resize handler
    window.addEventListener('resize', () => {
      const wasMobile = isMobile;
      isMobile = window.innerWidth <= 768;

      // Desktop → Mobile
      if (!wasMobile && isMobile) {
        sidebar.classList.remove('collapsed');
        document.body.classList.remove('sidebar-collapsed');
        toggleBtn.textContent = '☰';
      }

      // Mobile → Desktop
      if (wasMobile && !isMobile) {
        sidebar.classList.remove('mobile-open');
        toggleBtn.textContent = isCollapsed ? '›' : '‹';
        _applyCollapsed(sidebar, isCollapsed, false);
      }
    });
  }

  // --- Collapse (desktop) ---
  function _applyCollapsed(sidebar, collapsed, animate) {
    if (!animate) {
      sidebar.style.transition = 'none';
      document.body.style.transition = 'none';
    }

    sidebar.classList.toggle('collapsed', collapsed);
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    document.getElementById('sidebar-toggle').textContent = collapsed ? '›' : '‹';

    if (!animate) {
      sidebar.offsetHeight; // force reflow
      sidebar.style.transition = '';
      document.body.style.transition = '';
    }
  }

  // --- Mobile ---
  function _toggleMobile(sidebar, toggleBtn) {
    sidebar.classList.contains('mobile-open')
      ? _closeMobile(sidebar, toggleBtn)
      : _openMobile(sidebar, toggleBtn);
  }

  function _openMobile(sidebar, toggleBtn) {
    sidebar.classList.add('mobile-open');
    toggleBtn.textContent = '✕';
  }

  function _closeMobile(sidebar, toggleBtn) {
    sidebar.classList.remove('mobile-open');
    toggleBtn.textContent = '☰';
  }

  // --- Active Nav --- 
  function _setActive(navItems) {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    navItems.forEach(item => {
      const href = (item.getAttribute('href') || '').split('/').pop();
      item.classList.toggle('active', href === currentPage);
    });
  }

  return { init };

})();

// Auto init
document.addEventListener('DOMContentLoaded', Sidebar.init);