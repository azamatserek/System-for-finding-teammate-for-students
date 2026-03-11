const App = (() => {
  let currentUser = null;
  let notifCount = 0;

  const pages = {
    dashboard: { label: 'Dashboard', icon: '🏠', render: renderDashboard, roles: ['student', 'teacher', 'admin'] },
    teams: { label: 'Find Teams', icon: '🔍', render: renderTeams, roles: ['student', 'teacher', 'admin'] },
    profile: { label: 'My Profile', icon: '👤', render: renderProfile, roles: ['student'] },
    admin: { label: 'Manage', icon: '⚙️', render: renderAdmin, roles: ['teacher', 'admin'] },
  };

  function getUser() { return currentUser; }
  function setUser(user) { currentUser = user; }

  function updateSidebarUser() {
    if (!currentUser) return;
    const el = document.getElementById('sidebar-user');
    if (el) el.innerHTML = `
      ${avatar(currentUser.name, currentUser.avatar_color, 'sm')}
      <div class="user-card-info">
        <div class="user-card-name">${currentUser.name}</div>
        <div class="user-card-role">${currentUser.role}</div>
      </div>`;
  }

  function updateNotifBadge(count) {
    notifCount = count;
    const el = document.getElementById('notif-badge');
    if (el) { el.textContent = count; el.style.display = count > 0 ? 'inline' : 'none'; }
  }

  function renderLayout() {
    const app = document.getElementById('app');
    const visiblePages = Object.entries(pages).filter(([, p]) => p.roles.includes(currentUser?.role));

    app.innerHTML = `
      <div class="layout">
        <aside class="sidebar">
          <div class="sidebar-logo">TeamUp<span>Study Squad Finder</span></div>
          <nav class="nav-section">
            <div class="nav-label">Navigation</div>
            ${visiblePages.map(([key, p]) => `
              <div class="nav-item" data-page="${key}" id="nav-${key}">
                <span class="icon">${p.icon}</span> ${p.label}
                ${key === 'teams' ? `<span class="nav-badge" id="notif-badge" style="display:none">0</span>` : ''}
              </div>`).join('')}
          </nav>
          <div class="nav-section" style="margin-top:8px">
            <div class="nav-label">Account</div>
            <div class="nav-item" id="nav-notifs"><span class="icon">🔔</span> Notifications</div>
            <div class="nav-item" id="nav-logout"><span class="icon">🚪</span> Sign Out</div>
          </div>
          <div class="sidebar-bottom">
            <div class="user-card" id="sidebar-user-wrap" onclick="App.navigate('profile')">
              <div id="sidebar-user"></div>
            </div>
          </div>
        </aside>
        <main class="main">
          ${visiblePages.map(([key]) => `<div class="page" id="page-${key}"></div>`).join('')}
        </main>
      </div>`;

    updateSidebarUser();

    // Nav clicks
    visiblePages.forEach(([key]) => {
      document.getElementById(`nav-${key}`)?.addEventListener('click', () => navigate(key));
    });

    document.getElementById('nav-notifs')?.addEventListener('click', () => {
      openNotifPanel();
    });

    document.getElementById('nav-logout')?.addEventListener('click', async () => {
      await API.logout();
      currentUser = null;
      renderAuth();
    });

    // Load notification count
    loadNotifCount();
    setInterval(loadNotifCount, 30000);
  }

  async function loadNotifCount() {
    try {
      const notifs = await API.getNotifications();
      updateNotifBadge(notifs.filter(n => !n.read).length);
    } catch(e) {}
  }

  function navigate(page) {
    if (!pages[page]) return;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const pageEl = document.getElementById(`page-${page}`);
    const navEl = document.getElementById(`nav-${page}`);
    if (pageEl) pageEl.classList.add('active');
    if (navEl) navEl.classList.add('active');

    pages[page].render();
  }

  async function init() {
    try {
      const userData = await API.me();
      currentUser = userData;
      renderLayout();
      navigate('dashboard');
    } catch(e) {
      renderAuth();
    } finally {
      document.getElementById('loading-screen')?.style && (document.getElementById('loading-screen').style.display = 'none');
    }
  }

  return { init, getUser, setUser, navigate, updateSidebarUser, updateNotifBadge };
})();

// Expose for inline onclick handlers
window.App = App;
window.avatar = avatar;
window.openTeamDetail = (t) => {
  if (typeof t === 'object' && t.id) openTeamDetail(t);
};

document.addEventListener('DOMContentLoaded', () => App.init());
