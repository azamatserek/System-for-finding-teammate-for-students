function renderAuth() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="auth-layout">
      <div class="auth-left">
        <div class="auth-brand">
          <div class="auth-brand-logo">TeamUp</div>
          <div class="auth-brand-tagline">Find your perfect study squad</div>
          <div class="auth-brand-desc">Connect with students from your group, form teams for projects, assignments, lab work and exam prep.</div>
          <div class="auth-features">
            <div class="auth-feature"><div class="auth-feature-icon">🎯</div> Smart skill-based matching</div>
            <div class="auth-feature"><div class="auth-feature-icon">👥</div> Same-group team formation</div>
            <div class="auth-feature"><div class="auth-feature-icon">📬</div> Instant join requests & notifications</div>
            <div class="auth-feature"><div class="auth-feature-icon">🔐</div> Teacher & admin dashboards</div>
          </div>
        </div>
      </div>
      <div class="auth-right">
        <div class="auth-box">
          <div class="auth-tabs">
            <div class="auth-tab active" data-tab="login">Sign In</div>
            <div class="auth-tab" data-tab="register">Register</div>
          </div>
          <div id="auth-form-container"></div>
        </div>
      </div>
    </div>`;

  let currentTab = 'login';
  let groups = [];

  API.getGroups().then(g => { groups = g; }).catch(() => {});

  function renderLoginForm() {
    document.getElementById('auth-form-container').innerHTML = `
      <div class="auth-form">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-input" id="auth-email" type="email" placeholder="you@university.edu">
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input class="form-input" id="auth-password" type="password" placeholder="••••••••">
        </div>
        <div id="auth-error" class="form-error" style="display:none"></div>
        <button class="btn btn-primary btn-lg auth-submit" id="auth-btn">Sign In →</button>
      </div>`;
    
    document.getElementById('auth-btn').onclick = async () => {
      const email = document.getElementById('auth-email').value;
      const password = document.getElementById('auth-password').value;
      const errEl = document.getElementById('auth-error');
      errEl.style.display = 'none';
      const btn = document.getElementById('auth-btn');
      btn.disabled = true; btn.textContent = 'Signing in...';
      try {
        const data = await API.login({ email, password });
        App.setUser(data.user);
        App.navigate('dashboard');
      } catch (e) {
        errEl.textContent = e.message; errEl.style.display = 'block';
        btn.disabled = false; btn.textContent = 'Sign In →';
      }
    };

    document.getElementById('auth-password').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('auth-btn').click();
    });
  }

  function renderRegisterForm() {
    const groupOptions = groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
    document.getElementById('auth-form-container').innerHTML = `
      <div class="auth-form">
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input class="form-input" id="reg-name" placeholder="Aidan Bekzhanov">
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-input" id="reg-email" type="email" placeholder="you@university.edu">
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input class="form-input" id="reg-password" type="password" placeholder="Min 6 characters">
        </div>
        <div class="form-group">
          <label class="form-label">Role</label>
          <select class="form-select" id="reg-role">
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
        </div>
        <div class="form-group" id="group-field">
          <label class="form-label">Group</label>
          <select class="form-select" id="reg-group">
            <option value="">Select your group...</option>
            ${groupOptions}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Skills (optional)</label>
          <div id="skills-wrap"></div>
        </div>
        <div id="reg-error" class="form-error" style="display:none"></div>
        <button class="btn btn-primary btn-lg auth-submit" id="reg-btn">Create Account →</button>
      </div>`;

    const si = skillsInput('reg-skills', []);
    document.getElementById('skills-wrap').appendChild(si);

    document.getElementById('reg-role').onchange = (e) => {
      document.getElementById('group-field').style.display = e.target.value === 'student' ? 'flex' : 'none';
    };

    document.getElementById('reg-btn').onclick = async () => {
      const name = document.getElementById('reg-name').value;
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;
      const role = document.getElementById('reg-role').value;
      const group_id = document.getElementById('reg-group')?.value || null;
      const skills = si.getSkills();
      const errEl = document.getElementById('reg-error');
      errEl.style.display = 'none';
      const btn = document.getElementById('reg-btn');
      btn.disabled = true; btn.textContent = 'Creating...';
      try {
        const data = await API.register({ name, email, password, role, group_id: group_id || undefined, skills });
        App.setUser(data.user);
        App.navigate('dashboard');
      } catch (e) {
        errEl.textContent = e.message; errEl.style.display = 'block';
        btn.disabled = false; btn.textContent = 'Create Account →';
      }
    };
  }

  renderLoginForm();

  app.querySelectorAll('.auth-tab').forEach(tab => {
    tab.onclick = () => {
      app.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.tab;
      if (currentTab === 'login') renderLoginForm();
      else renderRegisterForm();
    };
  });
}
