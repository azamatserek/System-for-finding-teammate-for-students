const API = {
  async request(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include' };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch('/api' + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },
  get: (p) => API.request('GET', p),
  post: (p, b) => API.request('POST', p, b),
  put: (p, b) => API.request('PUT', p, b),
  delete: (p) => API.request('DELETE', p),

  // Auth
  login: (b) => API.post('/auth/login', b),
  register: (b) => API.post('/auth/register', b),
  logout: () => API.post('/auth/logout'),
  me: () => API.get('/auth/me'),

  // Groups & Subjects
  getGroups: () => API.get('/groups'),
  createGroup: (b) => API.post('/groups', b),
  deleteGroup: (id) => API.delete(`/groups/${id}`),
  getGroupMembers: (id) => API.get(`/groups/${id}/members`),
  getSubjects: () => API.get('/subjects'),
  createSubject: (b) => API.post('/subjects', b),
  deleteSubject: (id) => API.delete(`/subjects/${id}`),

  // Teams
  getTeams: (q = {}) => API.get('/teams?' + new URLSearchParams(q)),
  getRecommendations: () => API.get('/teams/recommendations'),
  getTeam: (id) => API.get(`/teams/${id}`),
  createTeam: (b) => API.post('/teams', b),
  updateTeam: (id, b) => API.put(`/teams/${id}`, b),
  deleteTeam: (id) => API.delete(`/teams/${id}`),
  joinTeam: (id) => API.post(`/teams/${id}/join`),
  acceptMember: (tid, uid) => API.post(`/teams/${tid}/members/${uid}/accept`),
  rejectMember: (tid, uid) => API.post(`/teams/${tid}/members/${uid}/reject`),
  myTeams: () => API.get('/teams/users/me/teams'),
  updateProfile: (b) => API.put('/teams/users/me/profile', b),

  // Notifications
  getNotifications: () => API.get('/teams/notifications/mine'),
  markRead: () => API.post('/teams/notifications/read'),

  // Admin
  getUsers: () => API.get('/teams/admin/users'),
  updateUserRole: (id, role) => API.put(`/teams/admin/users/${id}/role`, { role }),
  deleteUser: (id) => API.delete(`/teams/admin/users/${id}`),
};
