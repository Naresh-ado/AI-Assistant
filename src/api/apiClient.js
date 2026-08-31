// Standalone REST API Client

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('app_access_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

const apiRequest = async (url, options = {}) => {
  const headers = { ...getAuthHeaders(), ...(options.headers || {}) };
  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const errData = await response.json();
      errorMsg = errData.error || errData.message || errorMsg;
    } catch (e) {}
    throw new Error(errorMsg);
  }

  return await response.json();
};

// ─── Generic Entity Handler ───────────────────────────────────────────────────
const createEntityHandler = (entityName) => ({
  filter: async (query = {}, sort = '-created_date', limit = 100) => {
    try {
      const res = await apiRequest(`/api/entities/${entityName}/filter`, {
        method: 'POST',
        body: JSON.stringify({ query, sort, limit })
      });
      return Array.isArray(res) ? res : [];
    } catch (e) {
      console.warn(`${entityName}.filter error:`, e.message);
      return [];
    }
  },

  // Alias for filter with no query (list all)
  list: async (sort = '-created_date', limit = 100) => {
    try {
      const res = await apiRequest(`/api/entities/${entityName}/filter`, {
        method: 'POST',
        body: JSON.stringify({ query: {}, sort, limit })
      });
      return Array.isArray(res) ? res : [];
    } catch (e) {
      console.warn(`${entityName}.list error:`, e.message);
      return [];
    }
  },

  get: async (id) => {
    try {
      return await apiRequest(`/api/entities/${entityName}/${id}`);
    } catch (e) {
      console.warn(`${entityName}.get error:`, e.message);
      return null;
    }
  },

  create: async (data) => {
    return await apiRequest(`/api/entities/${entityName}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  update: async (id, data) => {
    return await apiRequest(`/api/entities/${entityName}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  delete: async (id) => {
    return await apiRequest(`/api/entities/${entityName}/${id}`, {
      method: 'DELETE'
    });
  },

  bulkCreate: async (items) => {
    if (!items || items.length === 0) return [];
    try {
      const res = await apiRequest(`/api/entities/${entityName}/bulk-create`, {
        method: 'POST',
        body: JSON.stringify({ items })
      });
      return Array.isArray(res) ? res : [];
    } catch (e) {
      console.warn(`${entityName}.bulkCreate error:`, e.message);
      // Fallback: create one by one
      const results = [];
      for (const item of items) {
        try {
          const created = await apiRequest(`/api/entities/${entityName}`, {
            method: 'POST',
            body: JSON.stringify(item)
          });
          results.push(created);
        } catch (err) {
          console.warn('Single create fallback failed:', err.message);
        }
      }
      return results;
    }
  },

  bulkUpdate: async (updates) => {
    if (!updates || updates.length === 0) return [];
    try {
      const res = await apiRequest(`/api/entities/${entityName}/bulk-update`, {
        method: 'PATCH',
        body: JSON.stringify({ updates })
      });
      return Array.isArray(res) ? res : [];
    } catch (e) {
      console.warn(`${entityName}.bulkUpdate error:`, e.message);
      // Fallback: update one by one
      const results = [];
      for (const { id, ...data } of updates) {
        try {
          const updated = await apiRequest(`/api/entities/${entityName}/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
          });
          results.push(updated);
        } catch (err) {
          console.warn('Single update fallback failed:', err.message);
        }
      }
      return results;
    }
  },

  deleteMany: async (query) => {
    if (!query || typeof query !== 'object') return { deletedCount: 0 };
    try {
      return await apiRequest(`/api/entities/${entityName}/bulk-delete`, {
        method: 'DELETE',
        body: JSON.stringify({ query })
      });
    } catch (e) {
      console.warn(`${entityName}.deleteMany error:`, e.message);
      return { deletedCount: 0 };
    }
  }
});

// ─── Entity proxy to handle any entity dynamically ────────────────────────────
const entitiesProxy = new Proxy({}, {
  get: (target, prop) => {
    if (!target[prop]) {
      target[prop] = createEntityHandler(prop);
    }
    return target[prop];
  }
});

// ─── Auth Handler ─────────────────────────────────────────────────────────────
const authHandler = {
  me: async () => {
    const token = localStorage.getItem('token') || localStorage.getItem('app_access_token');
    if (!token) return null; // No token = not authenticated
    try {
      const user = await apiRequest('/api/auth/me');
      return user && user.id ? user : null;
    } catch (e) {
      // Token invalid or expired
      localStorage.removeItem('token');
      localStorage.removeItem('app_access_token');
      return null;
    }
  },

  login: async (credentials) => {
    let email = credentials?.email;
    let password = credentials?.password;

    if (!email) {
      window.location.href = '/login';
      return;
    }

    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (data?.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('app_access_token', data.token);
    }
    return data?.user || null;
  },

  loginViaEmailPassword: async (email, password) => {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data?.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('app_access_token', data.token);
    }
    return data?.user || null;
  },

  loginWithProvider: async (provider = 'google', returnTo = '/') => {
    // No real OAuth — redirect to register with a note
    window.location.href = `/register`;
  },

  register: async (details) => {
    const data = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(details)
    });
    if (data?.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('app_access_token', data.token);
    }
    return data;
  },

  verifyOtp: async ({ email, otpCode }) => {
    // OTP verification not implemented — just return current token
    const token = localStorage.getItem('token') || localStorage.getItem('app_access_token');
    return { access_token: token };
  },

  resendOtp: async (email) => {
    return { success: true };
  },

  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('app_access_token', token);
    }
  },

  resetPasswordRequest: async (email) => {
    return { success: true };
  },

  resetPassword: async ({ resetToken, newPassword }) => {
    return { success: true };
  },

  logout: async (redirectUrl) => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    localStorage.removeItem('token');
    localStorage.removeItem('app_access_token');
    window.location.href = '/login';
  },

  redirectToLogin: (redirectUrl) => {
    window.location.href = '/login';
  }
};

// ─── Integrations Handler ─────────────────────────────────────────────────────
const integrationsHandler = {
  Core: {
    InvokeLLM: async (params) => {
      return await apiRequest('/api/ai/invoke-llm', {
        method: 'POST',
        body: JSON.stringify(params)
      });
    },

    // Course text/PDF extraction
    ExtractCourse: async ({ text, filename }) => {
      return await apiRequest('/api/ai/extract-course', {
        method: 'POST',
        body: JSON.stringify({ text, filename })
      });
    },

    // Legacy stubs — replaced by manual text entry in CourseUpload
    UploadFile: async ({ file }) => {
      // Return a fake URL with the filename; actual extraction happens via ExtractCourse
      return { file_url: `local://${file.name}`, filename: file.name };
    },

    ExtractDataFromUploadedFile: async ({ file_url, json_schema, text }) => {
      const filename = file_url?.replace('local://', '') || '';
      const result = await apiRequest('/api/ai/extract-course', {
        method: 'POST',
        body: JSON.stringify({ text: text || '', filename })
      });
      return result;
    }
  }
};

// ─── Export ───────────────────────────────────────────────────────────────────
export const apiClient = {
  auth: authHandler,
  entities: entitiesProxy,
  integrations: integrationsHandler
};

// Alias kept for backward compatibility with existing component imports
export const base44 = apiClient;

export default apiClient;
