async function renderProfile() {
  const user = App.getUser();
  const main = document.getElementById('page-profile');

  main.innerHTML = `
    <div class="page-header">
      <div class="page-title">My Profile</div>
    </div>
    <div style="display:grid;grid-template-columns:300px 1fr;gap:24px;align-items:start">
      <div class="card" style="text-align:center;padding:32px">
        ${avatar(user.name, user.avatar_color, 'xl')}
        <div style="margin-top:16px;font-family:'Syne',sans-serif;font-size:20px;font-weight:600">${user.name}</div>
        <div style="font-size:13px;color:var(--text2);margin-top:4px">${user.email}</div>
        <div style="margin-top:8px">
          <span class="badge ${user.role === 'admin' ? 'badge-red' : user.role === 'teacher' ? 'badge-orange' : 'badge-purple'}">
            ${user.role === 'admin' ? '🔑 Admin' : user.role === 'teacher' ? '🎓 Teacher' : '🎒 Student'}
          </span>
        </div>
        ${user.group ? `<div style="margin-top:12px;font-size:13px;color:var(--text2)">👥 ${user.group.name}</div>` : ''}
        <div style="margin-top:16px;display:flex;flex-wrap:wrap;gap:6px;justify-content:center">
          ${(user.skills || []).map(s => `<span class="skill-tag accent">${s}</span>`).join('') || '<span class="text-muted text-sm">No skills added</span>'}
        </div>
      </div>
      
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <div class="section-title">Edit Profile</div>
          <div style="display:flex;flex-direction:column;gap:16px">
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input class="form-input" id="prof-name" value="${user.name}">
            </div>
            <div class="form-group">
              <label class="form-label">Bio</label>
              <textarea class="form-textarea" id="prof-bio" placeholder="Tell others about yourself...">${user.bio || ''}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Skills</label>
              <div id="prof-skills-wrap"></div>
            </div>
            <button class="btn btn-primary" id="save-profile">Save Changes</button>
          </div>
        </div>
        
        <div class="card" id="my-teams-card">
          <div class="section-title">My Teams</div>
          <div id="profile-teams-list"><div style="color:var(--text2)">Loading...</div></div>
        </div>
      </div>
    </div>`;

  const skillsWrap = document.getElementById('prof-skills-wrap');
  const si = skillsInput('prof-skills', user.skills || []);
  skillsWrap.appendChild(si);

  document.getElementById('save-profile').onclick = async () => {
    const btn = document.getElementById('save-profile');
    btn.disabled = true; btn.textContent = 'Saving...';
    try {
      const updated = await API.updateProfile({
        name: document.getElementById('prof-name').value,
        bio: document.getElementById('prof-bio').value,
        skills: si.getSkills(),
      });
      App.setUser({ ...App.getUser(), ...updated });
      showToast('Profile updated! ✅');
      App.updateSidebarUser();
    } catch(e) { showToast(e.message, 'error'); }
    btn.disabled = false; btn.textContent = 'Save Changes';
  };

  // Load my teams
  try {
    const { created, joined } = await API.myTeams();
    const all = [
      ...created.map(t => ({ ...t, role: 'creator' })),
      ...joined.map(t => ({ ...t, role: t.member_status }))
    ];
    const list = document.getElementById('profile-teams-list');
    if (!all.length) { list.innerHTML = '<div class="empty-state" style="padding:32px 0"><div class="empty-icon">📋</div><div class="empty-title">No teams yet</div></div>'; return; }
    list.innerHTML = all.map(t => `
      <div class="member-row" style="cursor:pointer" onclick="openTeamDetail({id:'${t.id}'})">
        <div style="width:40px;height:40px;border-radius:10px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:20px">${t.type === 'project' ? '🚀' : t.type === 'assignment' ? '📝' : t.type === 'lab' ? '🔬' : '📖'}</div>
        <div class="member-row-info">
          <div class="member-row-name">${t.title}</div>
          <div class="member-row-role">${t.subject_name} • ${t.group_name}</div>
        </div>
        <span class="badge ${t.role === 'creator' ? 'badge-purple' : t.role === 'accepted' ? 'badge-green' : t.role === 'pending' ? 'badge-orange' : 'badge-red'}">
          ${t.role === 'creator' ? '👑 Creator' : t.role === 'accepted' ? '✅ Member' : t.role === 'pending' ? '⏳ Pending' : '❌ Declined'}
        </span>
      </div>`).join('');
  } catch(e) {}
}
