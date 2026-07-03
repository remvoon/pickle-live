/**
 * API client for pickle-live
 */

const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('pickle_live_token');
}

async function request(method, path, body = null, auth = false) {
  const headers = { 'Content-Type': 'application/json' };
  
  if (auth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const options = { method, headers };
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, options);
  
  if (response.status === 204) {
    return null;
  }

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  
  return data;
}

function upload(path, file, auth = true) {
  const token = getToken();
  const headers = {};
  if (auth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const formData = new FormData();
  formData.append('image', file);

  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  }).then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  });
}

// Auth
export const authApi = {
  login: (password) => request('POST', '/auth/login', { password }),
};

// Events
export const eventsApi = {
  get: (slug) => request('GET', `/events/${slug}`),
  getLive: (slug) => request('GET', `/events/${slug}/matches/live`),
  create: (data) => request('POST', '/admin/events', data, true),
  update: (slug, data) => request('PUT', `/admin/events/${slug}`, data, true),
  uploadBanner: (slug, file) => upload(`/admin/events/${slug}/banner`, file),
  getShareUrl: (slug) => request('GET', `/admin/events/${slug}/share`, null, true),
};

// Participants
export const participantsApi = {
  list: (slug) => request('GET', `/admin/events/${slug}/participants`, null, true),
  create: (slug, data) => request('POST', `/admin/events/${slug}/participants`, data, true),
  update: (slug, id, data) => request('PUT', `/admin/events/${slug}/participants/${id}`, data, true),
  delete: (slug, id) => request('DELETE', `/admin/events/${slug}/participants/${id}`, null, true),
};

// Teams
export const teamsApi = {
  list: (slug) => request('GET', `/admin/events/${slug}/teams`, null, true),
  create: (slug, data) => request('POST', `/admin/events/${slug}/teams`, data, true),
  update: (slug, id, data) => request('PUT', `/admin/events/${slug}/teams/${id}`, data, true),
  delete: (slug, id) => request('DELETE', `/admin/events/${slug}/teams/${id}`, null, true),
};

// Groups
export const groupsApi = {
  list: (slug) => request('GET', `/admin/events/${slug}/groups`, null, true),
  create: (slug, data) => request('POST', `/admin/events/${slug}/groups`, data, true),
  delete: (slug, id) => request('DELETE', `/admin/events/${slug}/groups/${id}`, null, true),
  addTeam: (slug, groupId, teamId) => 
    request('POST', `/admin/events/${slug}/groups/${groupId}/teams`, { team_id: teamId }, true),
  removeTeam: (slug, groupId, teamId) => 
    request('DELETE', `/admin/events/${slug}/groups/${groupId}/teams/${teamId}`, null, true),
};

// Stages
export const stagesApi = {
  list: (slug) => request('GET', `/admin/events/${slug}/stages`, null, true),
  create: (slug, data) => request('POST', `/admin/events/${slug}/stages`, data, true),
  delete: (slug, id) => request('DELETE', `/admin/events/${slug}/stages/${id}`, null, true),
  assignGroups: (slug, stageId, groupIds) => 
    request('POST', `/admin/events/${slug}/stages/${stageId}/groups`, { group_ids: groupIds }, true),
};

// Matches
export const matchesApi = {
  list: (slug) => request('GET', `/admin/events/${slug}/matches`, null, true),
  create: (slug, data) => request('POST', `/admin/events/${slug}/matches`, data, true),
  update: (slug, id, data) => request('PUT', `/admin/events/${slug}/matches/${id}`, data, true),
  delete: (slug, id) => request('DELETE', `/admin/events/${slug}/matches/${id}`, null, true),
  autoGenerate: (slug, data) => request('POST', `/admin/events/${slug}/matches/auto-generate`, data, true),
  start: (slug, id) => request('POST', `/admin/events/${slug}/matches/${id}/start`, {}, true),
  recordPoint: (slug, id, data) => request('POST', `/admin/events/${slug}/matches/${id}/point`, data, true),
  undo: (slug, id) => request('POST', `/admin/events/${slug}/matches/${id}/undo`, {}, true),
  complete: (slug, id, data) => request('POST', `/admin/events/${slug}/matches/${id}/complete`, data, true),
  walkover: (slug, id, winnerTeamId) => 
    request('POST', `/admin/events/${slug}/matches/${id}/walkover`, { winner_team_id: winnerTeamId }, true),
  advance: (slug, data) => request('POST', `/admin/events/${slug}/matches/advance`, data, true),
};
