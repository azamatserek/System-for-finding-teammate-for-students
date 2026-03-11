// ─── TOAST ───────────────────────────────────────────
const toastContainer = document.createElement('div');
toastContainer.className = 'toast-container';
document.body.appendChild(toastContainer);

function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span class="toast-icon">${type === 'success' ? '✅' : '❌'}</span><span>${msg}</span>`;
  toastContainer.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

// ─── MODAL ───────────────────────────────────────────
function createModal(title, bodyHTML, onSubmit, submitLabel = 'Submit') {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">${title}</div>
        <button class="modal-close">✕</button>
      </div>
      <div class="modal-body">${bodyHTML}</div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-close>Cancel</button>
        <button class="btn btn-primary" data-submit>${submitLabel}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));

  const close = () => { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 200); };
  overlay.querySelector('.modal-close').onclick = close;
  overlay.querySelector('[data-close]').onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  overlay.querySelector('[data-submit]').onclick = async (e) => {
    const btn = e.target;
    btn.disabled = true; btn.textContent = 'Loading...';
    try { await onSubmit(overlay); close(); }
    catch (err) { showToast(err.message, 'error'); btn.disabled = false; btn.textContent = submitLabel; }
  };
  return overlay;
}

// ─── AVATAR ───────────────────────────────────────────
function avatar(name, color, size = 'md') {
  const initials = name?.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() || '?';
  return `<div class="avatar avatar-${size}" style="background:${color || '#6C63FF'}20;color:${color || '#6C63FF'}">${initials}</div>`;
}

// ─── TYPE BADGE ───────────────────────────────────────────
const typeLabels = { project: '🚀 Project', assignment: '📝 Assignment', lab: '🔬 Lab', exam_prep: '📖 Exam Prep', other: '💡 Other' };
function typeBadge(type) {
  return `<span class="team-card-type type-${type}">${typeLabels[type] || type}</span>`;
}

// ─── TIME AGO ───────────────────────────────────────────
function timeAgo(dateStr) {
  const d = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (d < 60) return 'just now';
  if (d < 3600) return `${Math.floor(d/60)}m ago`;
  if (d < 86400) return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
}

// ─── SKILLS INPUT ───────────────────────────────────────────
function skillsInput(id, initial = []) {
  const skills = [...initial];
  const wrap = document.createElement('div');
  wrap.className = 'skills-input-wrap';
  
  const render = () => {
    wrap.innerHTML = skills.map(s => `
      <span class="skill-tag accent skill-tag-removable" data-skill="${s}">
        ${s} <span class="skill-remove">×</span>
      </span>`).join('') + `<input type="text" placeholder="${skills.length ? '' : 'Add skill, press Enter...'}">`;
    
    wrap.querySelectorAll('[data-skill]').forEach(tag => {
      tag.onclick = () => { skills.splice(skills.indexOf(tag.dataset.skill), 1); render(); };
    });
    
    const input = wrap.querySelector('input');
    input.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ',') && input.value.trim()) {
        e.preventDefault();
        const val = input.value.trim().replace(',', '');
        if (val && !skills.includes(val)) skills.push(val);
        render();
      }
    });
    wrap.dataset.id = id;
  };
  
  render();
  wrap.getSkills = () => skills;
  return wrap;
}

// ─── TEAM CARD ───────────────────────────────────────────
function teamCard(t, onClick, showScore = false) {
  const spots = t.max_members - (t.current_members || 1);
  const div = document.createElement('div');
  div.className = 'card team-card';
  div.innerHTML = `
    <div class="team-card-header">
      ${typeBadge(t.type)}
      ${t.deadline ? `<span class="text-sm text-muted" style="margin-left:auto">📅 ${new Date(t.deadline).toLocaleDateString()}</span>` : ''}
    </div>
    <div class="team-card-title">${t.title}</div>
    ${t.description ? `<div class="team-card-desc">${t.description}</div>` : ''}
    <div class="team-card-meta">
      <span class="meta-tag">📚 ${t.subject_name} <span style="opacity:0.5">(${t.subject_code})</span></span>
      <span class="meta-tag">👥 ${t.group_name}</span>
    </div>
    ${t.required_skills?.length ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:10px">${t.required_skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}</div>` : ''}
    <div class="team-card-footer">
      <div style="display:flex;align-items:center;gap:8px">
        ${avatar(t.creator_name, t.creator_color, 'sm')}
        <span class="text-sm text-muted">${t.creator_name}</span>
      </div>
      <div>
        ${showScore && t.match_score !== undefined ? `
          <div class="match-score">
            <div class="match-score-bar"><div class="match-score-fill" style="width:${t.match_score}%"></div></div>
            <span style="color:var(--accent2)">${t.match_score}% match</span>
          </div>` : `
          <span class="spots-badge ${spots > 0 ? 'spots-open' : 'spots-full'}">
            ${spots > 0 ? `${spots} spot${spots>1?'s':''} left` : 'Full'}
          </span>`}
      </div>
    </div>`;
  div.onclick = () => onClick(t);
  return div;
}

// ─── NOTIFICATION PANEL ───────────────────────────────────────────
let notifPanel = null;
function openNotifPanel() {
  if (!notifPanel) {
    notifPanel = document.createElement('div');
    notifPanel.className = 'notif-panel';
    notifPanel.innerHTML = `
      <div class="notif-header">
        <div class="notif-title">Notifications</div>
        <button class="modal-close" id="close-notif">✕</button>
      </div>
      <div class="notif-list" id="notif-list">
        <div style="text-align:center;padding:40px;color:var(--text2)">Loading...</div>
      </div>`;
    document.body.appendChild(notifPanel);
    notifPanel.querySelector('#close-notif').onclick = () => { notifPanel.classList.remove('open'); };
  }
  notifPanel.classList.add('open');
  API.getNotifications().then(notifs => {
    API.markRead();
    App.updateNotifBadge(0);
    const list = notifPanel.querySelector('#notif-list');
    if (!notifs.length) { list.innerHTML = '<div class="empty-state"><div class="empty-icon">🔔</div><div class="empty-title">No notifications</div></div>'; return; }
    list.innerHTML = notifs.map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}">
        <div class="notif-item-title">${n.title}</div>
        <div class="notif-item-msg">${n.message}</div>
        <div class="notif-item-time">${timeAgo(n.created_at)}</div>
      </div>`).join('');
  }).catch(() => {});
}
