

const Auth = (() => {

  let currentUser = null;

  // ============================================
  // INIT
  // ============================================
  async function init() {
    // Cek session yang masih aktif
    const session = await DB.getSession();
    if (session) {
      currentUser = session.user;
      _updateSidebarUI(currentUser);
    }

    // Listen perubahan auth (login/logout dari tab lain dll)
    DB.onAuthChange((user) => {
      currentUser = user;
      _updateSidebarUI(user);
    });

    // Klik avatar/nama di sidebar → logout menu
    const sidebarUser = document.getElementById('sidebar-user');
    if (sidebarUser) {
      sidebarUser.addEventListener('click', () => {
        if (currentUser) {
          _showLogoutConfirm();
        } else {
          showModal();
        }
      });
    }
  }

  // ============================================
  // MODAL LOGIN / REGISTER
  // ============================================
  function showModal(mode = 'login') {
    // Hapus modal lama kalau ada
    _removeModal();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'auth-modal';

    overlay.innerHTML = _buildModalHTML(mode);
    document.body.appendChild(overlay);

    // Close klik di luar box
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) _removeModal();
    });

    // Submit
    const form = overlay.querySelector('#auth-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      mode === 'login' ? _handleLogin() : _handleRegister();
    });

    // Switch mode
    overlay.querySelector('#auth-switch').addEventListener('click', () => {
      _removeModal();
      showModal(mode === 'login' ? 'register' : 'login');
    });

    // Focus email
    setTimeout(() => overlay.querySelector('#auth-email')?.focus(), 100);
  }

  function _buildModalHTML(mode) {
    const isLogin = mode === 'login';
    return `
      <div class="modal-box">
        <div class="modal-title">${isLogin ? 'WELCOME BACK' : 'JOIN THE UNIVERSE'}</div>
        <div class="modal-sub">${isLogin ? 'Login untuk publish funfact ke feed.' : 'Daftar gratis, mulai share funfact.'}</div>

        <form id="auth-form" autocomplete="off">
          ${!isLogin ? `
          <div class="modal-field">
            <label>Username</label>
            <input class="input" id="auth-username" type="text" placeholder="nama_kamu" required minlength="3" maxlength="20" />
          </div>` : ''}

          <div class="modal-field">
            <label>Email</label>
            <input class="input" id="auth-email" type="email" placeholder="kamu@email.com" required />
          </div>

          <div class="modal-field">
            <label>Password</label>
            <input class="input" id="auth-password" type="password" placeholder="••••••••" required minlength="6" />
          </div>

          <div id="auth-error" class="auth-error hidden"></div>

          <div class="modal-footer">
            <button type="submit" class="btn btn-primary" id="auth-submit" style="width:100%">
              ${isLogin ? 'Login' : 'Daftar'}
            </button>
            <div class="modal-switch">
              ${isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}
              <span id="auth-switch">${isLogin ? 'Daftar sekarang' : 'Login'}</span>
            </div>
          </div>
        </form>
      </div>

      <style>
        .auth-error {
          font-size: 13px;
          color: #ff6b6b;
          background: rgba(255,107,107,0.08);
          border: 1px solid rgba(255,107,107,0.2);
          border-radius: 8px;
          padding: 10px 14px;
          margin-top: 4px;
        }
      </style>
    `;
  }

  function _removeModal() {
    document.getElementById('auth-modal')?.remove();
  }

  // ============================================
  // HANDLE LOGIN
  // ============================================
  async function _handleLogin() {
    const email    = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const btn      = document.getElementById('auth-submit');
    const errEl    = document.getElementById('auth-error');

    _setLoading(btn, true, 'Login...');
    errEl.classList.add('hidden');

    try {
      await DB.login(email, password);
      _removeModal();
      Toast.show('Login berhasil! 🎉', 'success');
    } catch (err) {
      errEl.textContent = _friendlyError(err.message);
      errEl.classList.remove('hidden');
    } finally {
      _setLoading(btn, false, 'Login');
    }
  }

  // ============================================
  // HANDLE REGISTER
  // ============================================
  async function _handleRegister() {
    const username = document.getElementById('auth-username').value.trim();
    const email    = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const btn      = document.getElementById('auth-submit');
    const errEl    = document.getElementById('auth-error');

    _setLoading(btn, true, 'Mendaftar...');
    errEl.classList.add('hidden');

    try {
      await DB.register(email, password, username);
      _removeModal();
      Toast.show('Akun berhasil dibuat! Selamat datang ✨', 'success');
    } catch (err) {
      errEl.textContent = _friendlyError(err.message);
      errEl.classList.remove('hidden');
    } finally {
      _setLoading(btn, false, 'Daftar');
    }
  }

  // ============================================
  // LOGOUT CONFIRM
  // ============================================
  function _showLogoutConfirm() {
    _removeModal();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'auth-modal';
    overlay.innerHTML = `
      <div class="modal-box" style="max-width:340px; text-align:center;">
        <div style="font-size:32px; margin-bottom:12px;">👋</div>
        <div class="modal-title" style="font-size:22px;">LOGOUT?</div>
        <div class="modal-sub">Sampai jumpa, ${currentUser?.user_metadata?.username || 'kamu'}!</div>
        <div style="display:flex; gap:10px; margin-top:24px;">
          <button class="btn btn-ghost" id="logout-cancel" style="flex:1">Batal</button>
          <button class="btn btn-primary" id="logout-confirm" style="flex:1">Logout</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#logout-cancel').addEventListener('click', _removeModal);
    overlay.querySelector('#logout-confirm').addEventListener('click', async () => {
      await DB.logout();
      _removeModal();
      Toast.show('Berhasil logout.', 'info');
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) _removeModal();
    });
  }

  // ============================================
  // UPDATE SIDEBAR UI
  // ============================================
  function _updateSidebarUI(user) {
    const avatarEl = document.getElementById('sidebar-avatar');
    const nameEl   = document.getElementById('sidebar-username');
    const handleEl = document.getElementById('sidebar-handle');

    if (!avatarEl) return;

    if (user) {
      const username = user.user_metadata?.username || user.email.split('@')[0];
      const initial  = username.charAt(0).toUpperCase();

      avatarEl.textContent   = initial;
      nameEl.textContent     = username;
      handleEl.textContent   = '@' + username.toLowerCase();
    } else {
      avatarEl.textContent   = '?';
      nameEl.textContent     = 'Guest';
      handleEl.textContent   = 'Klik untuk login';
    }
  }

  // ============================================
  // HELPERS
  // ============================================
  function _setLoading(btn, loading, label) {
    btn.disabled     = loading;
    btn.textContent  = loading ? '...' : label;
  }

  function _friendlyError(msg) {
    if (msg.includes('Invalid login'))       return 'Email atau password salah.';
    if (msg.includes('already registered'))  return 'Email sudah terdaftar.';
    if (msg.includes('Password'))            return 'Password minimal 6 karakter.';
    if (msg.includes('valid email'))         return 'Format email tidak valid.';
    return msg;
  }

  function getUser()      { return currentUser; }
  function isLoggedIn()   { return !!currentUser; }

  return { init, showModal, getUser, isLoggedIn };

})();


const Toast = (() => {
  function show(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const icons = { success: '✓', error: '✕', info: '★' };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || '•'}</span> ${message}`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = '0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  return { show };
})();

// Auto init
document.addEventListener('DOMContentLoaded', Auth.init);