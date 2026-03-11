async function renderTeams() {
  const user = App.getUser();
  const main = document.getElementById('page-teams');

  main.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Browse Teams</div>
        <div class="page-subtitle">Find a team to join${user.group ? ` in ${user.group?.name}` : ''}</div>
      </div>
      ${user.role === 'student' ? `<button class="btn btn-primary" id="create-team-btn2">+ Create Team</button>` : ''}
    </div>
    <div class="filter-bar">
      <div class="search-bar" style="flex:1;min-width:200px">
        <span class="icon">🔍</span>
        <input type="text" id="search-input" placeholder="Search teams...">
      </div>
      <select class="form-select" id="type-filter" style="width:160px">
        <option value="">All Types</option>
        <option value="project">🚀 Project</option>
        <option value="assignment">📝 Assignment</option>
        <option value="lab">🔬 Lab</option>
        <option value="exam_prep">📖 Exam Prep</option>
        <option value="other">💡 Other</option>
      </select>
      <select class="form-select" id="subject-filter" style="width:180px">
        <option value="">All Subjects</option>
      </select>
      <select class="form-select" id="status-filter" style="width:130px">
        <option value="open">Open</option>
        <option value="full">Full</option>
        <option value="">All</option>
      </select>
    </div>
    <div class="card-grid" id="teams-grid"></div>`;

  document.getElementById('create-team-btn2')?.addEventListener('click', () => openCreateTeamModal());

  let subjects = [];
  try { subjects = await API.getSubjects(); } catch(e) {}

  const subjSel = document.getElementById('subject-filter');
  subjects.forEach(s => { const o = document.createElement('option'); o.value = s.id; o.textContent = `${s.code} - ${s.name}`; subjSel.appendChild(o); });

  let debounce;
  const load = () => {
    clearTimeout(debounce);
    debounce = setTimeout(async () => {
      const q = {
        search: document.getElementById('search-input').value,
        type: document.getElementById('type-filter').value,
        subject_id: document.getElementById('subject-filter').value,
        status: document.getElementById('status-filter').value,
      };
      try {
        const teams = await API.getTeams(q);
        const grid = document.getElementById('teams-grid');
        if (!grid) return;
        grid.innerHTML = '';
        if (!teams.length) {
          grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔍</div><div class="empty-title">No teams found</div><div class="empty-desc">Try different filters or create a new team</div></div>';
          return;
        }
        teams.forEach(t => grid.appendChild(teamCard(t, openTeamDetail)));
      } catch(e) { showToast(e.message, 'error'); }
    }, 300);
  };

  ['search-input','type-filter','subject-filter','status-filter'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', load);
    document.getElementById(id)?.addEventListener('change', load);
  });
  load();
}

async function openTeamDetail(team) {
  let detail;
  try { detail = await API.getTeam(team.id); } catch(e) { showToast(e.message, 'error'); return; }
  const user = App.getUser();
  const spots = detail.max_members - (detail.members.filter(m => m.status === 'accepted').length + 1);
  const isCreator = detail.creator_id === user.id;
  const myMembership = detail.members.find(m => m.user_id === user.id);
  const pendingMembers = detail.members.filter(m => m.status === 'pending');
  const acceptedMembers = detail.members.filter(m => m.status === 'accepted');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:680px">
      <div class="modal-header">
        <div style="display:flex;align-items:center;gap:10px">
          ${typeBadge(detail.type)}
          <span class="badge ${detail.status === 'open' ? 'badge-green' : detail.status === 'full' ? 'badge-red' : 'badge-gray'}">${detail.status}</span>
        </div>
        <button class="modal-close" id="close-detail">✕</button>
      </div>
      <div style="padding-bottom:20px;border-bottom:1px solid var(--border);margin-bottom:20px">
        <div class="detail-title">${detail.title}</div>
        ${detail.description ? `<p style="color:var(--text2);margin-top:8px;line-height:1.6">${detail.description}</p>` : ''}
        <div class="detail-meta">
          <span class="detail-meta-item">📚 ${detail.subject_name} (${detail.subject_code})</span>
          <span class="detail-meta-item">👥 ${detail.group_name}</span>
          <span class="detail-meta-item">👤 ${detail.max_members} max members</span>
          ${detail.deadline ? `<span class="detail-meta-item">📅 ${new Date(detail.deadline).toLocaleDateString()}</span>` : ''}
        </div>
        ${detail.required_skills?.length ? `
          <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:6px">
            <span style="font-size:12px;color:var(--text2);margin-right:4px">Required skills:</span>
            ${detail.required_skills.map(s => `<span class="skill-tag accent">${s}</span>`).join('')}
          </div>` : ''}
      </div>
      
      <div class="section-title">Team Leader</div>
      <div class="member-row mb-16">
        ${avatar(detail.creator_name, detail.creator_color, 'md')}
        <div class="member-row-info">
          <div class="member-row-name">${detail.creator_name} 👑</div>
          <div class="member-row-role">${detail.creator_bio || 'Team creator'}</div>
        </div>
        <span class="badge badge-purple">Creator</span>
      </div>
      
      ${acceptedMembers.length ? `
        <div class="section-title">Members (${acceptedMembers.length}/${detail.max_members - 1})</div>
        <div class="members-list" id="accepted-list">
          ${acceptedMembers.map(m => `
            <div class="member-row">
              ${avatar(m.name, m.avatar_color, 'md')}
              <div class="member-row-info">
                <div class="member-row-name">${m.name}</div>
                <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">${(JSON.parse(m.skills || '[]')).map(s => `<span class="skill-tag">${s}</span>`).join('')}</div>
              </div>
              ${isCreator ? `<button class="btn btn-danger btn-sm" onclick="rejectMember('${detail.id}','${m.user_id}')">Remove</button>` : ''}
            </div>`).join('')}
        </div>` : ''}
      
      ${isCreator && pendingMembers.length ? `
        <div class="section-title" style="margin-top:16px">⏳ Pending Requests (${pendingMembers.length})</div>
        <div class="members-list" id="pending-list">
          ${pendingMembers.map(m => `
            <div class="member-row" id="pending-${m.user_id}">
              ${avatar(m.name, m.avatar_color, 'md')}
              <div class="member-row-info">
                <div class="member-row-name">${m.name}</div>
                <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">${(JSON.parse(m.skills || '[]')).map(s => `<span class="skill-tag">${s}</span>`).join('')}</div>
              </div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-green btn-sm" onclick="acceptMember('${detail.id}','${m.user_id}')">✓ Accept</button>
                <button class="btn btn-danger btn-sm" onclick="rejectMember('${detail.id}','${m.user_id}')">✕ Decline</button>
              </div>
            </div>`).join('')}
        </div>` : ''}
      
      <div class="modal-footer">
        ${isCreator ? `
          <button class="btn btn-danger btn-sm" onclick="deleteTeam('${detail.id}')">Delete Team</button>
          <button class="btn btn-secondary btn-sm" onclick="editTeamStatus('${detail.id}','${detail.status}')">Change Status</button>
        ` : user.role === 'student' && !myMembership && detail.status === 'open' && spots > 0 ? `
          <button class="btn btn-primary" id="join-btn">Request to Join →</button>
        ` : myMembership ? `
          <span class="badge ${myMembership.status === 'accepted' ? 'badge-green' : myMembership.status === 'pending' ? 'badge-orange' : 'badge-red'}">
            ${myMembership.status === 'accepted' ? '✅ You are a member' : myMembership.status === 'pending' ? '⏳ Request pending' : '❌ Request declined'}
          </span>
        ` : ''}
        <button class="btn btn-ghost" id="close-detail2">Close</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));
  
  const close = () => { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 200); };
  overlay.querySelector('#close-detail').onclick = close;
  overlay.querySelector('#close-detail2').onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  
  overlay.querySelector('#join-btn')?.addEventListener('click', async (e) => {
    e.target.disabled = true; e.target.textContent = 'Sending...';
    try { await API.joinTeam(detail.id); showToast('Join request sent! 📬'); close(); }
    catch(err) { showToast(err.message, 'error'); e.target.disabled = false; e.target.textContent = 'Request to Join →'; }
  });
}

window.acceptMember = async (teamId, userId) => {
  try { await API.acceptMember(teamId, userId); showToast('Member accepted! 🎉'); document.getElementById(`pending-${userId}`)?.remove(); }
  catch(e) { showToast(e.message, 'error'); }
};

window.rejectMember = async (teamId, userId) => {
  try { await API.rejectMember(teamId, userId); showToast('Request declined'); document.getElementById(`pending-${userId}`)?.remove(); }
  catch(e) { showToast(e.message, 'error'); }
};

window.deleteTeam = async (teamId) => {
  if (!confirm('Delete this team?')) return;
  try { await API.deleteTeam(teamId); showToast('Team deleted'); document.querySelector('.modal-overlay')?.click(); App.navigate('teams'); }
  catch(e) { showToast(e.message, 'error'); }
};

window.editTeamStatus = (teamId, currentStatus) => {
  createModal('Change Team Status', `
    <div class="form-group">
      <label class="form-label">Status</label>
      <select class="form-select" id="new-status">
        <option value="open" ${currentStatus==='open'?'selected':''}>Open</option>
        <option value="full" ${currentStatus==='full'?'selected':''}>Full</option>
        <option value="closed" ${currentStatus==='closed'?'selected':''}>Closed</option>
      </select>
    </div>`, async (modal) => {
    const status = modal.querySelector('#new-status').value;
    await API.updateTeam(teamId, { status });
    showToast('Status updated');
    App.navigate('teams');
  }, 'Update');
};

async function openCreateTeamModal() {
  let subjects = [];
  try { subjects = await API.getSubjects(); } catch(e) {}
  
  if (!subjects.length) {
    showToast('No subjects available. Ask your teacher to add subjects.', 'error'); return;
  }

  const subjectOptions = subjects.map(s => `<option value="${s.id}">${s.code} - ${s.name}</option>`).join('');
  
  const modal = createModal('Create Team Request', `
    <div class="form-group">
      <label class="form-label">Title</label>
      <input class="form-input" id="ct-title" placeholder="e.g. Web Dev Project Team">
    </div>
    <div class="form-group">
      <label class="form-label">Subject</label>
      <select class="form-select" id="ct-subject"><option value="">Select subject...</option>${subjectOptions}</select>
    </div>
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Type</label>
        <select class="form-select" id="ct-type">
          <option value="project">🚀 Project</option>
          <option value="assignment">📝 Assignment</option>
          <option value="lab">🔬 Lab</option>
          <option value="exam_prep">📖 Exam Prep</option>
          <option value="other">💡 Other</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Max Members</label>
        <input class="form-input" id="ct-max" type="number" min="2" max="10" value="4">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Deadline (optional)</label>
      <input class="form-input" id="ct-deadline" type="date">
    </div>
    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea class="form-textarea" id="ct-desc" placeholder="Describe your project, goals, what you're looking for..."></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Required Skills</label>
      <div id="ct-skills-wrap"></div>
    </div>`,
    async (modal) => {
      const title = modal.querySelector('#ct-title').value;
      const subject_id = modal.querySelector('#ct-subject').value;
      if (!title || !subject_id) throw new Error('Title and subject are required');
      const body = {
        title, subject_id,
        type: modal.querySelector('#ct-type').value,
        max_members: parseInt(modal.querySelector('#ct-max').value),
        deadline: modal.querySelector('#ct-deadline').value || null,
        description: modal.querySelector('#ct-desc').value,
        required_skills: modal.querySelector('[data-id]')?.skillsInputRef?.getSkills() || [],
      };
      await API.createTeam(body);
      showToast('Team created! 🚀');
      App.navigate('teams');
    }, 'Create Team');

  // Add skills input to modal
  const wrap = document.getElementById('ct-skills-wrap');
  if (wrap) {
    const si = skillsInput('ct-skills', []);
    wrap.appendChild(si);
    // Attach reference for retrieval
    si.dataset.id = 'ct-skills-ref';
    // Override the onSubmit to get skills
    const submitBtn = modal.querySelector('[data-submit]');
    const origClick = submitBtn.onclick;
    submitBtn.onclick = null;
    submitBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      submitBtn.disabled = true; submitBtn.textContent = 'Creating...';
      const title = modal.querySelector('#ct-title').value;
      const subject_id = modal.querySelector('#ct-subject').value;
      if (!title || !subject_id) { showToast('Title and subject are required', 'error'); submitBtn.disabled = false; submitBtn.textContent = 'Create Team'; return; }
      try {
        await API.createTeam({
          title, subject_id,
          type: modal.querySelector('#ct-type').value,
          max_members: parseInt(modal.querySelector('#ct-max').value),
          deadline: modal.querySelector('#ct-deadline').value || null,
          description: modal.querySelector('#ct-desc').value,
          required_skills: si.getSkills(),
        });
        showToast('Team created! 🚀');
        modal.classList.remove('open'); setTimeout(() => modal.remove(), 200);
        App.navigate('teams');
      } catch(err) { showToast(err.message, 'error'); submitBtn.disabled = false; submitBtn.textContent = 'Create Team'; }
    });
  }
}
