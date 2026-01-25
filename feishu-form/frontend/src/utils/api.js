const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const api = {
  // Forms
  getForms: () => request('/forms'),
  getForm: (id) => request(`/forms/${id}`),
  createForm: (data) => request('/forms', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateForm: (id, data) => request(`/forms/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteForm: (id) => request(`/forms/${id}`, {
    method: 'DELETE',
  }),
  
  // Submissions
  submitForm: (formId, data) => request(`/forms/${formId}/submit`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getSubmissions: (formId) => request(`/forms/${formId}/submissions`),
  getStats: (formId) => request(`/forms/${formId}/stats`),
};

// 生成简单 ID
export function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// 格式化日期
export function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// 字段类型配置
export const FIELD_TYPES = [
  { value: 'text', label: '单行文本', icon: '📝' },
  { value: 'textarea', label: '多行文本', icon: '📄' },
  { value: 'number', label: '数字', icon: '🔢' },
  { value: 'email', label: '邮箱', icon: '📧' },
  { value: 'phone', label: '手机号', icon: '📱' },
  { value: 'date', label: '日期', icon: '📅' },
  { value: 'radio', label: '单选', icon: '⭕' },
  { value: 'checkbox', label: '多选', icon: '☑️' },
  { value: 'select', label: '下拉选择', icon: '📋' },
];
