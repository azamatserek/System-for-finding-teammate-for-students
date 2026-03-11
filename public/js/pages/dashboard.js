async function renderDashboard() {
  const user = App.getUser();
  const main = document.getElementById('page-dashboard');

  main.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Welcome back, ${user.name.split(' ')[0]} 👋</div>
        <div class="page-subtitle">${user.group ? `Group: ${user.group.name}` : user.role === 'teacher' ? 'Teacher account' : 'No group assigned'}</div>
      </div>
      ${user.role === 'student' ? `<button class="btn btn-primary" id="create-team-btn">+ Create Team</button>` : ''}
    </div>
    <div id="dashboard-content"><div style="color:var(--text2)">Loading...</div></div>`;

  if (user.role === 'student') {
    document.getElementById('create-team-btn')?.addEventListener('click', () => openCreateTeamModal());
  }

  try {
    const [myTeams, recs] = await Promise.all([
      user.role === 'student' ? API.myTeams() : Promise.resolve(null),
      user.role === 'student' ? API.getRecommendations() : Promise.resolve([])
    ]);

    let html = '';

    if (user.role === 'student') {
      // Stats
      const totalCreated = myTeams.created.length;
      const totalJoined = myTeams.joined.filter(t => t.member_status === 'accepted').length;
      const pendingApps = myTeams.joined.filter(t => t.member_status === 'pending').length;
      html += `
        <div class="stat-grid">
          <div class="stat-card"><div class="stat-value" style="color:var(--accent)">${totalCreated}</div><div class="stat-label">Teams Created</div></div>
          <div class="stat-card"><div class="stat-value" style="color:var(--green)">${totalJoined}</div><div class="stat-label">Teams Joined</div></div>
          <div class="stat-card"><div class="stat-value" style="color:var(--orange)">${pendingApps}</div><div class="stat-label">Pending Requests</div></div>
        </div>`;

      // Recommendations
      if (recs.length) {
        html += `
          <div class="mb-24">
            <div class="rec-header">
              <div>
                <div class="rec-title">✨ Recommended for You</div>
                <div class="rec-subtitle">Based on your skills and group</div>
              </div>
            </div>
            <div class="rec-scroll" id="rec-scroll"></div>
          </div>`;
      }

      // My teams
      if (myTeams.created.length) {
        html += `<div class="section-title">📋 Teams I Created</div>
          <div class="card-grid" id="created-teams"></div>`;
      }

      if (myTeams.joined.filter(t => t.member_status === 'accepted').length) {
        html += `<div class="section-title" style="margin-top:24px">🤝 Teams I Joined</div>
          <div class="card-grid" id="joined-teams"></div>`;
      }

      if (!totalCreated && !totalJoined && !recs.length) {
        html += `<div class="empty-state">
          <div class="empty-icon">🚀</div>
          <div class="empty-title">Start building your team!</div>
          <div class="empty-desc">Create a team request or browse available teams to find your squad.</div>
        </div>`;
      }
    } else if (user.role === 'teacher') {
      const [subjects, groups] = await Promise.all([API.getSubjects(), API.getGroups()]);
      html += `
        <div class="stat-grid">
          <div class="stat-card"><div class="stat-value" style="color:var(--accent)">${subjects.length}</div><div class="stat-label">Subjects</div></div>
          <div class="stat-card"><div class="stat-value" style="color:var(--green)">${groups.length}</div><div class="stat-label">Groups</div></div>
        </div>
        <div class="section-title">Quick Actions</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="App.navigate('teams')">👥 View All Teams</button>
          <button class="btn btn-secondary" onclick="App.navigate('admin')">⚙️ Manage Subjects & Groups</button>
        </div>`;
    } else {
      html += `
        <div class="section-title">Admin Overview</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="App.navigate('admin')">⚙️ Admin Panel</button>
          <button class="btn btn-secondary" onclick="App.navigate('teams')">📋 All Teams</button>
        </div>`;
    }

    document.getElementById('dashboard-content').innerHTML = html;

    // Render recs
    if (recs.length) {
      const recScroll = document.getElementById('rec-scroll');
      if (recScroll) recs.forEach(t => recScroll.appendChild(teamCard(t, openTeamDetail, true)));
    }

    // Render my teams
    const createdEl = document.getElementById('created-teams');
    if (createdEl && myTeams) {
      myTeams.created.forEach(t => createdEl.appendChild(teamCard(t, openTeamDetail)));
    }

    const joinedEl = document.getElementById('joined-teams');
    if (joinedEl && myTeams) {
      myTeams.joined.filter(t => t.member_status === 'accepted').forEach(t => joinedEl.appendChild(teamCard(t, openTeamDetail)));
    }

  } catch(e) {
    document.getElementById('dashboard-content').innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Error loading dashboard</div><div class="empty-desc">${e.message}</div></div>`;
  }
}
