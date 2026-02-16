import axios from 'axios';
import type { 
  User, Project, Task, Epic, Story, Subtask, Team, TimeEntry,
  DashboardData, WorkloadData, LoginRequest, Token, Report, Activity, ActivityListResponse,
  Sprint, SprintCreate, SprintSummary, TaskDependency, TaskDependencyWithDetails, TaskDependencyCreate,
  Notification, Workflow, WorkflowCreate, WorkflowTransition, AITaskSuggestion,
  WorkSheet, WorkSheetCreate, WorkSheetUpdate
} from '../types';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8001').replace(/\/+$/, '');

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/api/v1/auth/refresh`, {
            refresh_token: refreshToken,
          });
          
          const { access_token } = response.data;
          localStorage.setItem('access_token', access_token);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          
          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (data: LoginRequest): Promise<Token> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },
  
  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
  
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/users/me');
    return response.data;
  },
};

// Users API
export const usersAPI = {
  list: async (params?: { skip?: number; limit?: number }): Promise<User[]> => {
    const response = await api.get('/users', { params });
    return response.data;
  },
  
  create: async (data: {
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    role: string;
    organization_id: string;
  }): Promise<User> => {
    const response = await api.post('/users', data);
    return response.data;
  },
  
  changePassword: async (userId: string, password: string): Promise<User> => {
    const response = await api.put(`/users/${userId}/password`, { password });
    return response.data;
  },
  
  delete: async (userId: string): Promise<void> => {
    await api.delete(`/users/${userId}`);
  },
};

// Projects API
export const projectsAPI = {
  list: async (params?: { status?: string; skip?: number; limit?: number }): Promise<Project[]> => {
    const response = await api.get('/projects', { params });
    return response.data;
  },
  
  get: async (id: string): Promise<Project> => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },
  
  create: async (data: Partial<Project>): Promise<Project> => {
    const response = await api.post('/projects', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<Project>): Promise<Project> => {
    const response = await api.put(`/projects/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`);
  },
  
  archive: async (id: string): Promise<Project> => {
    const response = await api.post(`/projects/${id}/archive`);
    return response.data;
  },
  
  getTeamMembers: async (projectId: string): Promise<Array<{ id: string; first_name: string; last_name: string; email: string; full_name: string }>> => {
    const response = await api.get(`/projects/${projectId}/team-members`);
    return response.data;
  },
  
  getTeams: async (projectId: string): Promise<string[]> => {
    const response = await api.get(`/projects/${projectId}/teams`);
    return response.data;
  },
};

// Tasks API
export const tasksAPI = {
  list: async (params?: {
    project_id?: string;
    story_id?: string;
    status?: string;
    assignee_id?: string;
    skip?: number;
    limit?: number;
  }): Promise<Task[]> => {
    const response = await api.get('/tasks', { params });
    // Ensure we always return an array
    return Array.isArray(response.data) ? response.data : [];
  },
  
  get: async (id: string): Promise<Task> => {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },
  
  create: async (data: Partial<Task>): Promise<Task> => {
    const response = await api.post('/tasks', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<Task>): Promise<Task> => {
    const response = await api.put(`/tasks/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/tasks/${id}`);
  },
};

// Epics API
export const epicsAPI = {
  list: async (params?: { project_id?: string; skip?: number; limit?: number }): Promise<Epic[]> => {
    const response = await api.get('/tasks/epics', { params });
    return response.data;
  },
  
  create: async (data: Partial<Epic>): Promise<Epic> => {
    const response = await api.post('/tasks/epics', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<Epic>): Promise<Epic> => {
    const response = await api.put(`/tasks/epics/${id}`, data);
    return response.data;
  },
};

// Stories API
export const storiesAPI = {
  list: async (params?: { epic_id?: string; skip?: number; limit?: number }): Promise<Story[]> => {
    const response = await api.get('/tasks/stories', { params });
    return response.data;
  },
  
  create: async (data: Partial<Story>): Promise<Story> => {
    const response = await api.post('/tasks/stories', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<Story>): Promise<Story> => {
    const response = await api.put(`/tasks/stories/${id}`, data);
    return response.data;
  },
};

// Subtasks API
export const subtasksAPI = {
  list: async (taskId: string): Promise<Subtask[]> => {
    const response = await api.get(`/tasks/${taskId}/subtasks`);
    return response.data;
  },
  
  create: async (taskId: string, data: Partial<Subtask>): Promise<Subtask> => {
    const response = await api.post(`/tasks/${taskId}/subtasks`, data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<Subtask>): Promise<Subtask> => {
    const response = await api.put(`/tasks/subtasks/${id}`, data);
    return response.data;
  },
};

// Teams API
export const teamsAPI = {
  list: async (params?: { skip?: number; limit?: number }): Promise<Team[]> => {
    const response = await api.get('/teams', { params });
    return response.data;
  },
  
  get: async (id: string): Promise<Team> => {
    const response = await api.get(`/teams/${id}`);
    return response.data;
  },
  
  create: async (data: Partial<Team>): Promise<Team> => {
    const response = await api.post('/teams', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<Team>): Promise<Team> => {
    const response = await api.put(`/teams/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/teams/${id}`);
  },
  
  addMember: async (teamId: string, userId: string): Promise<void> => {
    await api.post(`/teams/${teamId}/members`, { user_id: userId });
  },
  
  removeMember: async (teamId: string, userId: string): Promise<void> => {
    await api.delete(`/teams/${teamId}/members/${userId}`);
  },
};

// Time Tracking API
export const timeAPI = {
  list: async (params?: {
    project_id?: string;
    task_id?: string;
    user_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<TimeEntry[]> => {
    const response = await api.get('/time', { params });
    return response.data;
  },
  
  create: async (data: Partial<TimeEntry>): Promise<TimeEntry> => {
    const response = await api.post('/time', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<TimeEntry>): Promise<TimeEntry> => {
    const response = await api.put(`/time/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/time/${id}`);
  },
};

// Analytics API
export const analyticsAPI = {
  getDashboard: async (role?: string): Promise<DashboardData> => {
    const response = await api.get('/analytics/dashboard', { params: { role } });
    return response.data;
  },
  
  getWorkload: async (teamId?: string): Promise<WorkloadData[]> => {
    const response = await api.get('/analytics/workload', { params: { team_id: teamId } });
    return response.data;
  },
  
  getBurndown: async (projectId: string): Promise<any[]> => {
    const response = await api.get(`/analytics/burndown/${projectId}`);
    return response.data;
  },
};

// Reports API
export const reportsAPI = {
  list: async (params?: {
    project_id?: string;
    task_id?: string;
    report_type?: string;
    status?: string;
  }): Promise<any[]> => {
    const response = await api.get('/reports', { params });
    return response.data;
  },
  
  get: async (id: string): Promise<any> => {
    const response = await api.get(`/reports/${id}`);
    return response.data;
  },
  
  create: async (data: {
    project_id?: string;
    task_id?: string;
    report_type: string;
    content: string;
    progress_percentage?: number;
  }): Promise<any> => {
    const response = await api.post('/reports', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<any>): Promise<any> => {
    const response = await api.put(`/reports/${id}`, data);
    return response.data;
  },
  
  submit: async (id: string): Promise<any> => {
    const response = await api.post(`/reports/${id}/submit`);
    return response.data;
  },
};

// Activity API
export const activityAPI = {
  list: async (params: {
    entity_type: 'task' | 'project' | 'story' | 'epic';
    entity_id: string;
    activity_type?: 'comment' | 'history' | 'work_log';
    skip?: number;
    limit?: number;
  }): Promise<ActivityListResponse> => {
    const response = await api.get('/activity', { params });
    return response.data;
  },
  
  create: async (data: {
    entity_type: 'task' | 'project' | 'story' | 'epic';
    entity_id: string;
    activity_type: 'comment' | 'history' | 'work_log';
    content?: string;
    hours?: number;
    work_date?: string;
  }): Promise<Activity> => {
    const response = await api.post('/activity', data);
    return response.data;
  },
  
  get: async (id: string): Promise<Activity> => {
    const response = await api.get(`/activity/${id}`);
    return response.data;
  },
};

// Sprints API
export const sprintsAPI = {
  list: async (params?: { project_id?: string; status?: string; skip?: number; limit?: number }): Promise<Sprint[]> => {
    const response = await api.get('/sprints', { params });
    return response.data;
  },
  
  get: async (id: string): Promise<Sprint> => {
    const response = await api.get(`/sprints/${id}`);
    return response.data;
  },
  
  create: async (data: SprintCreate): Promise<Sprint> => {
    const response = await api.post('/sprints', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<SprintCreate>): Promise<Sprint> => {
    const response = await api.put(`/sprints/${id}`, data);
    return response.data;
  },
  
  start: async (id: string): Promise<Sprint> => {
    const response = await api.post(`/sprints/${id}/start`);
    return response.data;
  },
  
  complete: async (id: string): Promise<Sprint> => {
    const response = await api.post(`/sprints/${id}/complete`);
    return response.data;
  },
  
  getSummary: async (id: string): Promise<SprintSummary> => {
    const response = await api.get(`/sprints/${id}/summary`);
    return response.data;
  },
};

// Task Dependencies API
export const taskDependenciesAPI = {
  list: async (taskId: string): Promise<TaskDependencyWithDetails[]> => {
    const response = await api.get(`/tasks/${taskId}/dependencies`);
    return response.data;
  },
  
  create: async (taskId: string, data: TaskDependencyCreate): Promise<TaskDependency> => {
    const response = await api.post(`/tasks/${taskId}/dependencies`, data);
    return response.data;
  },
  
  delete: async (dependencyId: string): Promise<void> => {
    await api.delete(`/dependencies/${dependencyId}`);
  },
  
  getBlocking: async (taskId: string): Promise<Array<{ task_id: string; title: string; status: string }>> => {
    const response = await api.get(`/tasks/${taskId}/blocking`);
    return response.data;
  },
};

// Notifications API
export const notificationsAPI = {
  list: async (params?: { is_read?: boolean; skip?: number; limit?: number }): Promise<Notification[]> => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },
  
  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },
  
  markAsRead: async (id: string): Promise<Notification> => {
    const response = await api.post(`/notifications/${id}/read`);
    return response.data;
  },
  
  markAllAsRead: async (): Promise<{ marked_count: number }> => {
    const response = await api.post('/notifications/mark-all-read');
    return response.data;
  },
};

// Workflows API
export const workflowsAPI = {
  list: async (params?: { project_id?: string; skip?: number; limit?: number }): Promise<Workflow[]> => {
    const response = await api.get('/workflows', { params });
    return response.data;
  },
  
  get: async (projectId: string): Promise<Workflow | null> => {
    const response = await api.get(`/workflows/projects/${projectId}/default`);
    return response.data;
  },
  
  create: async (data: WorkflowCreate): Promise<Workflow> => {
    const response = await api.post('/workflows', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<WorkflowCreate>): Promise<Workflow> => {
    const response = await api.put(`/workflows/${id}`, data);
    return response.data;
  },
  
  getAvailableTransitions: async (projectId: string, currentStatus: string): Promise<string[]> => {
    const response = await api.get(`/workflows/projects/${projectId}/available-transitions`, {
      params: { current_status: currentStatus }
    });
    return response.data;
  },
};

// AI API
export const aiAPI = {
  suggestTask: async (data: { title: string; description?: string; project_id: string }): Promise<AITaskSuggestion> => {
    const response = await api.post('/ai/suggest-task', data);
    return response.data;
  },
  
  getDailySummary: async (date?: string): Promise<{ summary: string; key_metrics: Record<string, number>; highlights: string[]; concerns: string[]; generated_at: string }> => {
    const response = await api.get('/ai/daily-summary', { params: { summary_date: date } });
    return response.data;
  },
};

// Work Sheets API
export const workSheetsAPI = {
  list: async (params?: { assigned_to?: string; sheet_name?: string; status?: string; skip?: number; limit?: number }): Promise<WorkSheet[]> => {
    const response = await api.get('/work-sheets', { params });
    return response.data;
  },
  
  getAvailableSheets: async (params?: { assigned_to?: string }): Promise<string[]> => {
    const response = await api.get('/work-sheets/sheets', { params });
    return response.data;
  },
  
  get: async (id: string): Promise<WorkSheet> => {
    const response = await api.get(`/work-sheets/${id}`);
    return response.data;
  },
  
  create: async (data: WorkSheetCreate): Promise<WorkSheet> => {
    const response = await api.post('/work-sheets', data);
    return response.data;
  },
  
  update: async (id: string, data: WorkSheetUpdate): Promise<WorkSheet> => {
    const response = await api.put(`/work-sheets/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/work-sheets/${id}`);
  },
};
