const API_PREFIX = `${import.meta.env.VITE_API_BASE_URL || ''}/api/v1`;

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_PREFIX}${path}`, {
    method: options.method || 'GET',
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error?.message || 'Não foi possível concluir a operação.');
    error.code = data.error?.code || 'request_failed';
    error.details = data.error?.details;
    throw error;
  }

  return data;
}

export const api = {
  plans: () => apiRequest('/plans'),
  me: () => apiRequest('/auth/me'),
  register: (body) => apiRequest('/auth/register', { method: 'POST', body }),
  login: (body) => apiRequest('/auth/login', { method: 'POST', body }),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  createCheckoutSession: (planId) =>
    apiRequest('/checkout/sessions', { method: 'POST', body: { planId } }),
  syncCheckoutSession: (sessionId) => apiRequest(`/checkout/sessions/${sessionId}/sync`),
  orders: () => apiRequest('/orders')
};
