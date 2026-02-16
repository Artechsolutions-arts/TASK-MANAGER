import { useAuth } from '../context/AuthContext';

/**
 * Check if user has a specific role
 */
export const hasRole = (user: any, roleName: string): boolean => {
  if (!user || !user.roles) return false;
  return user.roles.some((role: any) => role.name === roleName);
};

/**
 * Check if user is a Member/Employee (lowest level)
 */
export const isMember = (user: any): boolean => {
  return hasRole(user, 'Member');
};

/**
 * Check if user is a Team Lead
 */
export const isTeamLead = (user: any): boolean => {
  return hasRole(user, 'Team Lead');
};

/**
 * Check if user is a Manager
 */
export const isManager = (user: any): boolean => {
  return hasRole(user, 'Manager');
};

/**
 * Check if user is a CEO
 */
export const isCEO = (user: any): boolean => {
  return hasRole(user, 'CEO');
};

/**
 * Check if user is an Admin (employee management only: create, change password, delete)
 */
export const isAdmin = (user: any): boolean => {
  return hasRole(user, 'Admin');
};

/**
 * Check if user can create projects
 * CEO and Manager can create projects
 * Team Lead and Member cannot
 */
export const canCreateProject = (user: any): boolean => {
  if (!user) return false;
  return hasRole(user, 'CEO') || hasRole(user, 'Manager');
};

/**
 * Check if user can create tasks
 * CEO, Manager, and Team Lead can create tasks
 * Member cannot create tasks
 */
export const canCreateTask = (user: any): boolean => {
  if (!user) return false;
  return hasRole(user, 'CEO') || hasRole(user, 'Manager') || hasRole(user, 'Team Lead');
};

/**
 * Check if user can delete projects
 */
export const canDeleteProject = (user: any): boolean => {
  if (!user) return false;
  return hasRole(user, 'CEO') || hasRole(user, 'Manager');
};

/**
 * Check if user can create employees (CEO or Admin)
 */
export const canCreateEmployee = (user: any): boolean => {
  if (!user) return false;
  return isCEO(user) || isAdmin(user);
};

/**
 * Check if user can delete any employee (CEO or Admin)
 */
export const canDeleteEmployee = (user: any): boolean => {
  if (!user) return false;
  return isCEO(user) || isAdmin(user);
};

/**
 * Check if user can change employee password (CEO or Admin)
 */
export const canChangeEmployeePassword = (user: any): boolean => {
  if (!user) return false;
  return isCEO(user) || isAdmin(user);
};

/**
 * Check if user can view all users
 * CEO can view all (managers, team leads, employees)
 * Manager can view team leads and members
 * Team Lead can view only their team members
 * Member can view no one
 * Admin can view all (for employee management)
 */
export const canViewUsers = (user: any): { all: boolean; teamLeads: boolean; members: boolean } => {
  if (!user) return { all: false, teamLeads: false, members: false };
  return {
    all: isCEO(user) || isAdmin(user),
    teamLeads: isCEO(user) || isAdmin(user) || isManager(user),
    members: isCEO(user) || isAdmin(user) || isManager(user) || isTeamLead(user),
  };
};

/**
 * Check if user can submit reports
 * All roles can submit reports to their supervisor
 */
export const canSubmitReport = (user: any): boolean => {
  if (!user) return false;
  return true; // All roles can submit reports
};

/**
 * Check if user can view reports
 * CEO can view reports from managers
 * Manager can view reports from team leads
 * Team Lead can view reports from members
 */
export const canViewReports = (user: any): boolean => {
  if (!user) return false;
  return isCEO(user) || isManager(user) || isTeamLead(user);
};

/**
 * Hook to get user role and permissions
 */
export const useUserRole = () => {
  const { user } = useAuth();
  const userRole = user?.roles?.[0]?.name || 'Member';
  return {
    userRole,
    isMember: isMember(user),
    isTeamLead: isTeamLead(user),
    isManager: isManager(user),
    isCEO: isCEO(user),
    isAdmin: isAdmin(user),
    canCreateProject: canCreateProject(user),
    canCreateTask: canCreateTask(user),
    canDeleteProject: canDeleteProject(user),
    canViewUsers: canViewUsers(user),
    canCreateEmployee: canCreateEmployee(user),
    canDeleteEmployee: canDeleteEmployee(user),
    canChangeEmployeePassword: canChangeEmployeePassword(user),
    canSubmitReport: canSubmitReport(user),
    canViewReports: canViewReports(user),
  };
};
