import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor - attach JWT token & normalize params
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('taiyi_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Normalize pagination params: page->pageNum, size->pageSize
  if (config.params) {
    if (config.params.page !== undefined && config.params.pageNum === undefined) {
      config.params.pageNum = config.params.page;
      delete config.params.page;
    }
    if (config.params.size !== undefined && config.params.pageSize === undefined) {
      config.params.pageSize = config.params.size;
      delete config.params.size;
    }
  }
  return config;
});

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => {
    const body = response.data;
    // 业务码校验：后端 Result.code 成功值为 200，非 200 视为业务失败，统一 reject
    // 杜绝“HTTP 200 但业务失败”被前端乐观当成成功的假成功问题
    if (body && typeof body === 'object' && 'code' in body && (body as any).code !== 200) {
      return Promise.reject(body);
    }
    return body;
  },
  (error) => {
    if (error.response?.status === 401) {
      // 如果当前已在登录页，不做任何处理
      if (window.location.pathname === '/login') {
        return Promise.reject(error.response?.data || error);
      }
      // 立即清除token，阻止后续轮询请求携带无效token
      localStorage.removeItem('taiyi_token');
      localStorage.removeItem('taiyi_role');
      localStorage.removeItem('taiyi_user');
      // 防止多个请求同时触发多次弹窗（只弹一次，不重置）
      if (!(window as any).__session_expired_shown) {
        (window as any).__session_expired_shown = true;
        setTimeout(() => {
          window.alert('登录会话已过期，请重新登录。');
          window.location.href = '/login';
        }, 50);
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);

// ============ Auth ============
export const authApi = {
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
};

// ============ Projects ============
export const projectApi = {
  list: (params?: any) => api.get('/projects', { params }),
  detail: (id: number) => api.get(`/projects/${id}`),
  create: (data: any) => api.post('/projects', data),
  update: (id: number, data: any) => api.put(`/projects/${id}`, data),
  changeStatus: (id: number, data: any) => api.put(`/projects/${id}/status`, data),
  changeGear: (id: number, data: any) => api.put(`/projects/${id}/gear`, data),
  // Sprints
  sprintList: (projectId: number) => api.get(`/projects/${projectId}/sprints`),
  sprintCreate: (projectId: number, data: any) => api.post(`/projects/${projectId}/sprints`, data),
  sprintStatus: (projectId: number, sprintId: number, data: any) => api.put(`/projects/${projectId}/sprints/${sprintId}/status`, data),
  // Members
  listMembers: (projectId: number) => api.get(`/projects/${projectId}/members`),
  addMember: (projectId: number, data: any) => api.post(`/projects/${projectId}/members`, data),
  removeMember: (projectId: number, userId: number) => api.delete(`/projects/${projectId}/members/${userId}`),
  // Statistics
  statistics: (id: number) => api.get(`/projects/${id}/statistics`),
  // Delete
  delete: (id: number) => api.delete(`/projects/${id}`),
  // Related data
  listRequirements: (id: number, params?: any) => api.get(`/projects/${id}/requirements`, { params }),
  listTasks: (id: number, params?: any) => api.get(`/projects/${id}/tasks`, { params }),
  listBugs: (id: number, params?: any) => api.get(`/projects/${id}/bugs`, { params }),
  listTestCases: (id: number, params?: any) => api.get(`/projects/${id}/test-cases`, { params }),
};

// ============ Requirements ============
export const requirementApi = {
  list: (params?: any) => api.get('/requirements', { params }),
  detail: (id: number) => api.get(`/requirements/${id}`),
  create: (data: any) => api.post('/requirements', data),
  update: (id: number, data: any) => api.put(`/requirements/${id}`, data),
  changeStatus: (id: number, data: any) => api.put(`/requirements/${id}/status`, data),
  submitReview: (id: number, data: any) => api.post(`/requirements/${id}/submit-review`, data),
  review: (id: number, data: any) => api.post(`/requirements/${id}/review`, data),
  markDeveloped: (id: number) => api.post(`/requirements/${id}/mark-developed`),
  delete: (id: number) => api.delete(`/requirements/${id}`),
  downloadImportTemplate: () => api.get('/requirements/import-template', { responseType: 'blob' }),
  importFile: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/requirements/import', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// ============ Tasks ============
export const taskApi = {
  list: (params?: any) => api.get('/tasks', { params }),
  detail: (id: number) => api.get(`/tasks/${id}`),
  create: (data: any) => api.post('/tasks', data),
  update: (id: number, data: any) => api.put(`/tasks/${id}`, data),
  changeStatus: (id: number, data: any) => api.put(`/tasks/${id}/status`, data),
  logHours: (id: number, data: any) => api.post(`/tasks/${id}/hours`, data),
};

// ============ Bugs ============
export const bugApi = {
  list: (params?: any) => api.get('/bugs', { params }),
  detail: (id: number) => api.get(`/bugs/${id}`),
  create: (data: any) => api.post('/bugs', data),
  changeStatus: (id: number, data: any) => api.put(`/bugs/${id}/status`, data),
  reassign: (id: number, data: any) => api.put(`/bugs/${id}/reassign`, data),
};

// ============ Test Cases ============
export const testCaseApi = {
  list: (params?: any) => api.get('/test-cases', { params }),
  detail: (id: number) => api.get(`/test-cases/${id}`),
  create: (data: any) => api.post('/test-cases', data),
  update: (id: number, data: any) => api.put(`/test-cases/${id}`, data),
  lock: (id: number) => api.put(`/test-cases/${id}/lock`),
  execute: (id: number, data: any) => api.put(`/test-cases/${id}/execute`, data),
  downloadImportTemplate: () => api.get('/test-cases/import-template', { responseType: 'blob' }),
  importFile: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/test-cases/import', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// ============ Submit Tests ============
export const submitTestApi = {
  list: (params?: any) => api.get('/submit-tests', { params }),
  create: (data: any) => api.post('/submit-tests', data),
  approve: (id: number) => api.put(`/submit-tests/${id}/approve`),
  reject: (id: number, data: any) => api.put(`/submit-tests/${id}/reject`, data),
};

// ============ Change Requests ============
export const changeRequestApi = {
  list: (params?: any) => api.get('/change-requests', { params }),
  create: (data: any) => api.post('/change-requests', data),
  approve: (id: number) => api.put(`/change-requests/${id}/approve`),
  reject: (id: number, data: any) => api.put(`/change-requests/${id}/reject`, data),
};

// ============ Tech Debt ============
export const techDebtApi = {
  list: (params?: any) => api.get('/tech-debts', { params }),
  create: (data: any) => api.post('/tech-debts', data),
  update: (id: number, data: any) => api.put(`/tech-debts/${id}`, data),
  schedule: (id: number, data: any) => api.put(`/tech-debts/${id}/schedule`, data),
  resolve: (id: number) => api.put(`/tech-debts/${id}/resolve`),
};

// ============ Knowledge ============
export const knowledgeApi = {
  list: (params?: any) => api.get('/knowledge', { params }),
  detail: (id: number) => api.get(`/knowledge/${id}`),
  create: (data: any) => api.post('/knowledge', data),
  update: (id: number, data: any) => api.put(`/knowledge/${id}`, data),
  delete: (id: number) => api.delete(`/knowledge/${id}`),
};

// ============ Notifications ============
export const notificationApi = {
  list: (params?: any) => api.get('/notifications', { params }),
  markRead: (id: number) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  unreadCount: () => api.get('/notifications/unread-count'),
};

// ============ Notification Settings ============
export const notificationSettingApi = {
  list: () => api.get('/notification-settings'),
  save: (data: any) => api.post('/notification-settings', data),
  batchSave: (data: any[]) => api.put('/notification-settings/batch', data),
  delete: (channel: string) => api.delete(`/notification-settings/${channel}`),
  testWebhook: (data: { channel: string; webhookUrl: string }) => api.post('/notification-settings/test-webhook', data),
};

// ============ Audit Logs ============
export const auditLogApi = {
  list: (params?: any) => api.get('/audit-logs', { params }),
};

// ============ Dependencies ============
export const dependencyApi = {
  list: (params?: any) => api.get('/dependencies', { params }),
  create: (data: any) => api.post('/dependencies', data),
  update: (id: number, data: any) => api.put(`/dependencies/${id}`, data),
  resolve: (id: number) => api.put(`/dependencies/${id}/resolve`),
};

// ============ Dashboard / Metrics ============
export const dashboardApi = {
  overview: () => api.get('/dashboard/overview'),
  myTodo: () => api.get('/dashboard/my-todo'),
  myTasks: () => api.get('/dashboard/my-tasks'),
  myBugs: () => api.get('/dashboard/my-bugs'),
  teamWorkload: () => api.get('/metrics/team-workload'),
  deliveryMetrics: () => api.get('/metrics/delivery'),
  bugTrend: () => api.get('/metrics/bug-trend'),
  sprintBurndown: (sprintId: number) => api.get(`/metrics/sprint-burndown/${sprintId}`),
};

// ============ Users ============
export const userApi = {
  list: (params?: any) => api.get('/users', { params }),
  listWithRoles: () => api.get('/users/with-roles'),
  create: (data: any) => api.post('/users', data),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  resetPassword: (id: number, newPassword: string) => api.put(`/users/${id}/password`, { newPassword }),
  toggleStatus: (id: number) => api.put(`/users/${id}/toggle-status`),
  delete: (id: number) => api.delete(`/users/${id}`),
};

// ============ Roles ============
export const roleApi = {
  list: () => api.get('/roles'),
  allPermissions: () => api.get('/roles/permissions'),
  create: (data: any) => api.post('/roles', data),
  update: (id: number, data: any) => api.put(`/roles/${id}`, data),
  delete: (id: number) => api.delete(`/roles/${id}`),
  assignPermissions: (id: number, permissionIds: number[]) => api.put(`/roles/${id}/permissions`, { permissionIds }),
  myPermissions: () => api.get('/roles/my-permissions'),
};

export default api;

export const metricsApi = {
  getOverview: (params?: any) => api.get("/metrics/project/1", { params }),
  getTeamWorkload: (params?: any) => api.get("/metrics/workload", { params }),
  getBurndown: (sprintId: number) => api.get(`/metrics/sprint/${sprintId}/burndown`),
  getVelocity: (projectId: number) => api.get(`/metrics/project/${projectId}`),
  getQuality: (projectId: number) => api.get(`/metrics/project/${projectId}`),
};

export const sprintApi = {
  list: (params?: any) => api.get("/sprints", { params }),
  getById: (id: number) => api.get(`/sprints/${id}`),
  create: (data: any) => api.post("/sprints", data),
  update: (id: number, data: any) => api.put(`/sprints/${id}`, data),
  delete: (id: number) => api.delete(`/sprints/${id}`),
  start: (id: number) => api.put(`/sprints/${id}/start`),
  complete: (id: number) => api.put(`/sprints/${id}/complete`),
};

// ============ System Config ============
export const systemConfigApi = {
  list: (group?: string) => api.get("/system-config", { params: { group } }),
  update: (key: string, value: string) => api.put(`/system-config/${key}`, { value }),
  getPublic: (key: string) => api.get(`/system-config/public/${key}`),
};
