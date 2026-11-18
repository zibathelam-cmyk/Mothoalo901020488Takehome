const BASE = import.meta.env.VITE_API_BASE || '/api/v1';

const toQuery = (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : '';
};

async function request(path, { method = 'GET', body, signal } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    signal,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    // A non-JSON response still needs to surface as a useful error.
  }

  if (!response.ok) {
    throw new Error(payload?.error?.message || `Request failed (${response.status})`);
  }

  return payload.data;
}

export const api = {
  meta: () => request('/meta'),
  signIn: (credentials) => request('/auth/signin', { method: 'POST', body: credentials }),

  getBooks: (filters) => request(`/books${toQuery(filters)}`),
  addBook: (book) => request('/books', { method: 'POST', body: book }),
  updateBook: (id, changes) => request(`/books/${id}`, { method: 'PATCH', body: changes }),
  removeBook: (id) => request(`/books/${id}`, { method: 'DELETE' }),

  getMembers: () => request('/users'),
  addMember: (member) => request('/users', { method: 'POST', body: member }),
  updateMember: (id, changes) => request(`/users/${id}`, { method: 'PATCH', body: changes }),
  removeMember: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  getMovements: (filters) => request(`/transactions${toQuery(filters)}`),
  recordMovement: (entry) => request('/transactions', { method: 'POST', body: entry }),
  updateMovement: (id, changes) => request(`/transactions/${id}`, { method: 'PATCH', body: changes }),
  removeMovement: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),
};
