async function renderAdmin() {
  const user = App.getUser();
  const main = document.getElementById('page-admin');

  if (user.role === 'student') {
    main.innerHTML = '<div class="empty-state"><div class="empty-icon">🔒</div><div class="empty-title">Access Denied</div></div>';
    return;
  }

  main.innerHTML = `
    <div class="page-header">
      <div class="page-title">${user.role === 'admin' ? '🔑 Admin Panel' : '🎓 Teacher Panel'}</div>
    </div>
    <div class="tabs" id="admin-tabs">
      ${user.role === 'admin' ? '<div class="tab active" data-tab="users">Users</div>' : ''}
      <div class="tab ${user.role === 'teacher' ? 'active' : ''}" data-tab="groups">Groups</div>
      <div class="tab" data-tab="subjects">Subjects</div>
    </div>
    <div id="admin-content"></div>`;

  let currentTab = user.role === 'admin' ? 'users' : 'groups';

  main.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
      main.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.tab;
      loadTab(currentTab);
    };
  });

  async function loadTab(tab) {
    const content = document.getElementById('admin-content');
    content.innerHTML = '<div style="color:var(--text2);padding:20px">Loading...</div>';

    if (tab === 'users') {
      const users = await API.getUsers();
      content.innerHTML = `
        <div class="card" style="overflow:auto">
          <table class="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Group</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td>${avatar(u.name, '#6C63FF', 'sm')} <span style="margin-left:8px">${u.name}</span></td>
                  <td class="text-muted">${u.email}</td>
                  <td>
                    <select class="form-select" style="padding:4px 8px;font-size:12px;width:100px" onchange="changeRole('${u.id}',this.value)">
                      <option ${u.role==='student'?'selected':''} value="student">Student</option>
                      <option ${u.role==='teacher'?'selected':''} value="teacher">Teacher</option>
                      <option ${u.role==='admin'?'selected':''} value="admin">Admin</option>
                    </select>
                  </td>
                  <td class="text-muted">${u.group_id || '—'}</td>
                  <td class="text-muted">${new Date(u.created_at).toLocaleDateString()}</td>
                  <td><button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}')">Delete</button></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;

    } else if (tab === 'groups') {
      const groups = await API.getGroups();
      content.innerHTML = `
        <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
          <button class="btn btn-primary btn-sm" id="add-group-btn">+ Add Group</button>
        </div>
        <div class="card" style="overflow:auto">
          <table class="data-table">
            <thead><tr><th>Name</th><th>Members</th><th>Teacher</th><th>Actions</th></tr></thead>
            <tbody>
              ${groups.map(g => `
                <tr>
                  <td><strong>${g.name}</strong>${g.description ? `<div class="text-muted text-sm">${g.description}</div>` : ''}</td>
                  <td>${g.member_count || 0}</td>
                  <td class="text-muted">${g.teacher_name || '—'}</td>
                  <td><button class="btn btn-danger btn-sm" onclick="deleteGroup('${g.id}')">Delete</button></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;

      document.getElementById('add-group-btn').onclick = () => {
        createModal('Add Group', `
          <div class="form-group"><label class="form-label">Group Name</label><input class="form-input" id="g-name" placeholder="e.g. CS-2301"></div>
          <div class="form-group"><label class="form-label">Description</label><input class="form-input" id="g-desc" placeholder="Optional description"></div>`,
          async (modal) => {
            const name = modal.querySelector('#g-name').value;
            if (!name) throw new Error('Name required');
            await API.createGroup({ name, description: modal.querySelector('#g-desc').value });
            showToast('Group created! ✅');
            loadTab('groups');
          }, 'Create Group');
      };

    } else if (tab === 'subjects') {
      const subjects = await API.getSubjects();
      content.innerHTML = `
        <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
          <button class="btn btn-primary btn-sm" id="add-subject-btn">+ Add Subject</button>
        </div>
        <div class="card" style="overflow:auto">
          <table class="data-table">
            <thead><tr><th>Code</th><th>Name</th><th>Teacher</th><th>Actions</th></tr></thead>
            <tbody>
              ${subjects.map(s => `
                <tr>
                  <td><span class="badge badge-purple">${s.code}</span></td>
                  <td><strong>${s.name}</strong></td>
                  <td class="text-muted">${s.teacher_name || '—'}</td>
                  <td><button class="btn btn-danger btn-sm" onclick="deleteSubject('${s.id}')">Delete</button></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;

      document.getElementById('add-subject-btn').onclick = () => {
        createModal('Add Subject', `
          <div class="form-grid">
            <div class="form-group"><label class="form-label">Code</label><input class="form-input" id="s-code" placeholder="CS101"></div>
            <div class="form-group"><label class="form-label">Name</label><input class="form-input" id="s-name" placeholder="Introduction to CS"></div>
          </div>
          <div class="form-group"><label class="form-label">Description</label><input class="form-input" id="s-desc" placeholder="Optional"></div>`,
          async (modal) => {
            const code = modal.querySelector('#s-code').value;
            const name = modal.querySelector('#s-name').value;
            if (!code || !name) throw new Error('Code and name required');
            await API.createSubject({ code, name, description: modal.querySelector('#s-desc').value });
            showToast('Subject created! ✅');
            loadTab('subjects');
          }, 'Create Subject');
      };
    }
  }

  loadTab(currentTab);
}

window.changeRole = async (userId, role) => {
  try { await API.updateUserRole(userId, role); showToast(`Role updated to ${role}`); }
  catch(e) { showToast(e.message, 'error'); }
};

window.deleteUser = async (id) => {
  if (!confirm('Delete this user?')) return;
  try { await API.deleteUser(id); showToast('User deleted'); renderAdmin(); }
  catch(e) { showToast(e.message, 'error'); }
};

window.deleteGroup = async (id) => {
  if (!confirm('Delete this group?')) return;
  try { await API.deleteGroup(id); showToast('Group deleted'); renderAdmin(); }
  catch(e) { showToast(e.message, 'error'); }
};

window.deleteSubject = async (id) => {
  if (!confirm('Delete this subject?')) return;
  try { await API.deleteSubject(id); showToast('Subject deleted'); renderAdmin(); }
  catch(e) { showToast(e.message, 'error'); }
};
