export interface User {
  id: string;
  username?: string | null;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  organization_id: string;
  avatar?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
}

export interface Project {
  id: string;
  name: string;
  company_name?: string | null;
  summary?: string | null;
  description?: string;
  work_type?: string | null;
  category?: string | null;
  status: string;
  organization_id: string;
  manager_id: string;
  reported_by_id?: string | null;
  team_lead_id?: string;
  start_date?: string;
  end_date?: string;
  progress_percentage: number;
  labels?: string[];
  url?: string | null;
  budget?: number | null;
  attachments?: Attachment[];
  original_estimated_days?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_data: string; // Base64
  file_size: number;
  uploaded_by?: string | null;
  uploaded_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  category?: string;
  project_id: string;
  story_id?: string;
  sprint_id?: string;  // Optional sprint assignment
  status: string;
  priority: string;
  assignee_id?: string;
  reporter_id: string;
  due_date?: string;
  estimated_hours?: number;
  story_points?: number;  // Story points for sprint planning
  position: number;
  labels?: string[];
  attachments?: Attachment[];
  created_at: string;
  updated_at: string;
}

export interface Epic {
  id: string;
  title: string;
  description?: string;
  project_id: string;
  status: string;
  priority: string;
  assignee_id?: string;
  reporter_id: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Story {
  id: string;
  title: string;
  description?: string;
  epic_id: string;
  status: string;
  priority: string;
  assignee_id?: string;
  reporter_id: string;
  due_date?: string;
  estimated_hours?: number;
  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: string;
  title: string;
  description?: string;
  task_id: string;
  status: string;
  priority: string;
  assignee_id?: string;
  reporter_id: string;
  due_date?: string;
  estimated_hours?: number;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  organization_id: string;
  team_lead_id: string;
  privacy?: 'private' | 'public';
  tags?: string[];
  default_task_status?: string;
  default_task_priority?: string;
  members?: TeamMember[];
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role?: string;
  joined_at: string;
  left_at?: string;
}

export interface TimeEntry {
  id: string;
  user_id: string;
  project_id: string;
  task_id?: string;
  subtask_id?: string;
  hours: number;
  date: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardData {
  total_projects: number;
  active_projects: number;
  total_tasks: number;
  completed_tasks: number;
  team_members: number;
  workload_data: WorkloadData[];
  recent_activities: any[];
}

export interface WorkloadData {
  user_id: string;
  user_name: string;
  total_hours: number;
  task_count: number;
  completed_task_count: number;
  overdue_task_count: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface ReportAttachment {
  file_name: string;
  file_type: string;
  file_data: string; // Base64 encoded
  file_size: number;
}

export interface Report {
  id: string;
  user_id: string;
  project_id?: string;
  task_id?: string;
  report_type: 'task' | 'project' | 'weekly' | 'monthly';
  status: 'draft' | 'submitted' | 'reviewed';
  content: string;
  progress_percentage?: number;
  submitted_to?: string; // User ID of the supervisor
  submitted_at?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  attachments?: ReportAttachment[];
}

export interface Activity {
  id: string;
  entity_type: 'task' | 'project' | 'story' | 'epic';
  entity_id: string;
  activity_type: 'comment' | 'history' | 'work_log';
  user_id: string;
  user_name: string;
  content?: string;
  action?: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  hours?: number;
  work_date?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ActivityListResponse {
  items: Activity[];
  total: number;
  skip: number;
  limit: number;
}

// Sprint Management
export interface Sprint {
  id: string;
  name: string;
  project_id: string;
  start_date: string;
  end_date: string;
  goal?: string;
  status: 'Planned' | 'Active' | 'Completed';
  committed_story_points: number;
  completed_story_points: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SprintCreate {
  name: string;
  project_id: string;
  start_date: string;
  end_date: string;
  goal?: string;
  committed_story_points?: number;
}

export interface SprintSummary {
  sprint: Sprint;
  total_tasks: number;
  completed_tasks: number;
  progress_percentage: number;
  story_points_progress: number;
}

// Task Dependencies
export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  type: 'blocks' | 'relates_to';
  created_at: string;
}

export interface TaskDependencyWithDetails extends TaskDependency {
  depends_on_task_title: string;
  depends_on_task_status: string;
  is_blocked: boolean;
}

export interface TaskDependencyCreate {
  depends_on_task_id: string;
  type?: 'blocks' | 'relates_to';
}

// Notifications
export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  reference_id?: string;
  reference_type?: string;
  is_read: boolean;
  created_at: string;
}

// Workflows
export interface WorkflowTransition {
  from_status: string;
  to_status: string;
  allowed_roles: string[];
}

export interface Workflow {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  statuses: string[];
  transitions: WorkflowTransition[];
  is_default: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowCreate {
  project_id: string;
  name: string;
  description?: string;
  statuses: string[];
  transitions: WorkflowTransition[];
  is_default?: boolean;
}

// AI
export interface AITaskSuggestion {
  suggested_priority: string;
  suggested_story_points?: number;
  confidence: number;
  reasoning?: string;
}

// Work Sheet
export interface WorkSheet {
  id: string;
  sheet_name: string;
  task_id: string;
  task_name: string;
  assigned_to: string;
  start_date?: string;
  due_date?: string;
  status: string;
  completion_percentage?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkSheetCreate {
  sheet_name: string;
  task_id: string;
  task_name: string;
  start_date?: string;
  due_date?: string;
  status?: string;
  completion_percentage?: number;
  notes?: string;
}

export interface WorkSheetUpdate {
  task_name?: string;
  start_date?: string;
  due_date?: string;
  status?: string;
  completion_percentage?: number;
  notes?: string;
}
