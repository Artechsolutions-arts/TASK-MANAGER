# Database Schema Design

## ER Diagram Description

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│ Organizations│────────│    Users     │────────│    Roles    │
└─────────────┘         └──────┬───────┘         └─────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
            ┌───────▼──────┐      ┌───────▼──────┐
            │  User Roles  │      │  Permissions │
            └──────────────┘      └───────┬──────┘
                                          │
                                  ┌───────▼──────┐
                                  │ Role Perms   │
                                  └──────────────┘

┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  Projects   │────────│    Teams     │────────│ Team Members│
└──────┬──────┘         └──────────────┘         └──────┬──────┘
       │                                                 │
       │                                          ┌──────▼──────┐
       │                                          │    Users    │
       │                                          └─────────────┘
       │
┌──────▼──────┐
│    Epics    │
└──────┬──────┘
       │
┌──────▼──────┐
│   Stories   │
└──────┬──────┘
       │
┌──────▼──────┐
│    Tasks    │
└──────┬──────┘
       │
┌──────▼──────┐         ┌──────────────┐
│  Subtasks   │         │ Time Entries │
└─────────────┘         └──────┬───────┘
                               │
                        ┌──────▼──────┐
                        │    Users    │
                        └─────────────┘

┌─────────────┐
│ Audit Logs  │
└─────────────┘
```

## Table Definitions

### Core User & Organization Tables

#### organizations
- `id` (UUID, PK): Unique organization identifier
- `name` (VARCHAR(255)): Organization name
- `slug` (VARCHAR(100), UNIQUE): URL-friendly identifier
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp
- `deleted_at` (TIMESTAMP, NULL): Soft delete timestamp

**Indexes:**
- `idx_org_slug`: ON (slug)
- `idx_org_deleted`: ON (deleted_at)

#### users
- `id` (UUID, PK): Unique user identifier
- `email` (VARCHAR(255), UNIQUE): User email (login)
- `password_hash` (VARCHAR(255)): Bcrypt hashed password
- `first_name` (VARCHAR(100)): User first name
- `last_name` (VARCHAR(100)): User last name
- `is_active` (BOOLEAN): Account active status
- `organization_id` (UUID, FK → organizations.id): Organization membership
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp
- `deleted_at` (TIMESTAMP, NULL): Soft delete timestamp

**Indexes:**
- `idx_user_email`: ON (email)
- `idx_user_org`: ON (organization_id)
- `idx_user_deleted`: ON (deleted_at)

#### roles
- `id` (UUID, PK): Unique role identifier
- `name` (VARCHAR(50), UNIQUE): Role name (CEO, Manager, Team Lead, Member)
- `description` (TEXT): Role description
- `created_at` (TIMESTAMP): Creation timestamp

**Indexes:**
- `idx_role_name`: ON (name)

#### permissions
- `id` (UUID, PK): Unique permission identifier
- `name` (VARCHAR(100), UNIQUE): Permission identifier (e.g., "project:create")
- `description` (TEXT): Permission description
- `resource` (VARCHAR(50)): Resource type (project, task, team, etc.)
- `action` (VARCHAR(50)): Action type (create, read, update, delete, manage)
- `created_at` (TIMESTAMP): Creation timestamp

**Indexes:**
- `idx_perm_name`: ON (name)
- `idx_perm_resource_action`: ON (resource, action)

#### role_permissions
- `id` (UUID, PK): Unique identifier
- `role_id` (UUID, FK → roles.id): Role reference
- `permission_id` (UUID, FK → permissions.id): Permission reference
- `created_at` (TIMESTAMP): Creation timestamp

**Indexes:**
- `idx_role_perm_unique`: UNIQUE (role_id, permission_id)
- `idx_role_perm_role`: ON (role_id)
- `idx_role_perm_perm`: ON (permission_id)

#### user_roles
- `id` (UUID, PK): Unique identifier
- `user_id` (UUID, FK → users.id): User reference
- `role_id` (UUID, FK → roles.id): Role reference
- `scope_type` (VARCHAR(50)): Scope level (organization, project, team)
- `scope_id` (UUID, NULL): Scope entity ID (NULL for organization-wide)
- `created_at` (TIMESTAMP): Creation timestamp

**Indexes:**
- `idx_user_role_unique`: UNIQUE (user_id, role_id, scope_type, scope_id)
- `idx_user_role_user`: ON (user_id)
- `idx_user_role_role`: ON (role_id)
- `idx_user_role_scope`: ON (scope_type, scope_id)

### Project & Team Tables

#### projects
- `id` (UUID, PK): Unique project identifier
- `name` (VARCHAR(255)): Project name
- `description` (TEXT): Project description
- `status` (VARCHAR(50)): Status (Planned, In Progress, Blocked, Completed)
- `organization_id` (UUID, FK → organizations.id): Organization reference
- `manager_id` (UUID, FK → users.id): Project manager
- `team_lead_id` (UUID, FK → users.id, NULL): Team lead
- `start_date` (DATE, NULL): Project start date
- `end_date` (DATE, NULL): Project end date
- `progress_percentage` (DECIMAL(5,2), DEFAULT 0): Calculated progress
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp
- `deleted_at` (TIMESTAMP, NULL): Soft delete timestamp

**Indexes:**
- `idx_project_org`: ON (organization_id)
- `idx_project_manager`: ON (manager_id)
- `idx_project_team_lead`: ON (team_lead_id)
- `idx_project_status`: ON (status)
- `idx_project_deleted`: ON (deleted_at)

#### teams
- `id` (UUID, PK): Unique team identifier
- `name` (VARCHAR(255)): Team name
- `description` (TEXT): Team description
- `organization_id` (UUID, FK → organizations.id): Organization reference
- `team_lead_id` (UUID, FK → users.id): Team lead
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp
- `deleted_at` (TIMESTAMP, NULL): Soft delete timestamp

**Indexes:**
- `idx_team_org`: ON (organization_id)
- `idx_team_lead`: ON (team_lead_id)
- `idx_team_deleted`: ON (deleted_at)

#### team_members
- `id` (UUID, PK): Unique identifier
- `team_id` (UUID, FK → teams.id): Team reference
- `user_id` (UUID, FK → users.id): User reference
- `joined_at` (TIMESTAMP): Join timestamp
- `left_at` (TIMESTAMP, NULL): Leave timestamp

**Indexes:**
- `idx_team_member_unique`: UNIQUE (team_id, user_id) WHERE left_at IS NULL
- `idx_team_member_team`: ON (team_id)
- `idx_team_member_user`: ON (user_id)

#### project_teams
- `id` (UUID, PK): Unique identifier
- `project_id` (UUID, FK → projects.id): Project reference
- `team_id` (UUID, FK → teams.id): Team reference
- `created_at` (TIMESTAMP): Creation timestamp

**Indexes:**
- `idx_project_team_unique`: UNIQUE (project_id, team_id)
- `idx_project_team_project`: ON (project_id)
- `idx_project_team_team`: ON (team_id)

### Task Hierarchy Tables

#### epics
- `id` (UUID, PK): Unique epic identifier
- `title` (VARCHAR(255)): Epic title
- `description` (TEXT): Epic description
- `project_id` (UUID, FK → projects.id): Project reference
- `status` (VARCHAR(50)): Status (Backlog, Todo, In Progress, Review, Done)
- `priority` (VARCHAR(20)): Priority (Low, Medium, High, Critical)
- `assignee_id` (UUID, FK → users.id, NULL): Assigned user
- `reporter_id` (UUID, FK → users.id): Reporter user
- `due_date` (DATE, NULL): Due date
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp
- `deleted_at` (TIMESTAMP, NULL): Soft delete timestamp

**Indexes:**
- `idx_epic_project`: ON (project_id)
- `idx_epic_assignee`: ON (assignee_id)
- `idx_epic_status`: ON (status)
- `idx_epic_deleted`: ON (deleted_at)

#### stories
- `id` (UUID, PK): Unique story identifier
- `title` (VARCHAR(255)): Story title
- `description` (TEXT): Story description
- `epic_id` (UUID, FK → epics.id): Epic reference
- `status` (VARCHAR(50)): Status (Backlog, Todo, In Progress, Review, Done)
- `priority` (VARCHAR(20)): Priority (Low, Medium, High, Critical)
- `assignee_id` (UUID, FK → users.id, NULL): Assigned user
- `reporter_id` (UUID, FK → users.id): Reporter user
- `due_date` (DATE, NULL): Due date
- `estimated_hours` (DECIMAL(10,2), NULL): Estimated time
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp
- `deleted_at` (TIMESTAMP, NULL): Soft delete timestamp

**Indexes:**
- `idx_story_epic`: ON (epic_id)
- `idx_story_assignee`: ON (assignee_id)
- `idx_story_status`: ON (status)
- `idx_story_deleted`: ON (deleted_at)

#### tasks
- `id` (UUID, PK): Unique task identifier
- `title` (VARCHAR(255)): Task title
- `description` (TEXT): Task description
- `story_id` (UUID, FK → stories.id, NULL): Story reference (NULL if direct project task)
- `project_id` (UUID, FK → projects.id): Project reference
- `status` (VARCHAR(50)): Status (Backlog, Todo, In Progress, Review, Done)
- `priority` (VARCHAR(20)): Priority (Low, Medium, High, Critical)
- `assignee_id` (UUID, FK → users.id, NULL): Assigned user
- `reporter_id` (UUID, FK → users.id): Reporter user
- `due_date` (DATE, NULL): Due date
- `estimated_hours` (DECIMAL(10,2), NULL): Estimated time
- `position` (INTEGER): Position for Kanban ordering
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp
- `deleted_at` (TIMESTAMP, NULL): Soft delete timestamp

**Indexes:**
- `idx_task_story`: ON (story_id)
- `idx_task_project`: ON (project_id)
- `idx_task_assignee`: ON (assignee_id)
- `idx_task_status`: ON (status)
- `idx_task_position`: ON (project_id, status, position)
- `idx_task_deleted`: ON (deleted_at)

#### subtasks
- `id` (UUID, PK): Unique subtask identifier
- `title` (VARCHAR(255)): Subtask title
- `description` (TEXT): Subtask description
- `task_id` (UUID, FK → tasks.id): Task reference
- `status` (VARCHAR(50)): Status (Backlog, Todo, In Progress, Review, Done)
- `priority` (VARCHAR(20)): Priority (Low, Medium, High, Critical)
- `assignee_id` (UUID, FK → users.id, NULL): Assigned user
- `reporter_id` (UUID, FK → users.id): Reporter user
- `due_date` (DATE, NULL): Due date
- `estimated_hours` (DECIMAL(10,2), NULL): Estimated time
- `is_completed` (BOOLEAN, DEFAULT FALSE): Completion status
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp
- `deleted_at` (TIMESTAMP, NULL): Soft delete timestamp

**Indexes:**
- `idx_subtask_task`: ON (task_id)
- `idx_subtask_assignee`: ON (assignee_id)
- `idx_subtask_status`: ON (status)
- `idx_subtask_deleted`: ON (deleted_at)

### Time Tracking & Analytics

#### time_entries
- `id` (UUID, PK): Unique time entry identifier
- `user_id` (UUID, FK → users.id): User who logged time
- `task_id` (UUID, FK → tasks.id, NULL): Task reference (NULL for project-level)
- `subtask_id` (UUID, FK → subtasks.id, NULL): Subtask reference
- `project_id` (UUID, FK → projects.id): Project reference
- `hours` (DECIMAL(10,2)): Hours logged
- `date` (DATE): Date of work
- `description` (TEXT): Work description
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp
- `deleted_at` (TIMESTAMP, NULL): Soft delete timestamp

**Indexes:**
- `idx_time_user`: ON (user_id)
- `idx_time_task`: ON (task_id)
- `idx_time_subtask`: ON (subtask_id)
- `idx_time_project`: ON (project_id)
- `idx_time_date`: ON (date)
- `idx_time_deleted`: ON (deleted_at)

### Audit & Security

#### audit_logs
- `id` (UUID, PK): Unique audit log identifier
- `user_id` (UUID, FK → users.id, NULL): User who performed action
- `action` (VARCHAR(50)): Action type (create, update, delete, login, etc.)
- `resource_type` (VARCHAR(50)): Resource type (project, task, user, etc.)
- `resource_id` (UUID): Resource identifier
- `changes` (JSONB): Before/after changes (for updates)
- `ip_address` (VARCHAR(45)): IP address
- `user_agent` (TEXT): User agent string
- `created_at` (TIMESTAMP): Action timestamp

**Indexes:**
- `idx_audit_user`: ON (user_id)
- `idx_audit_resource`: ON (resource_type, resource_id)
- `idx_audit_action`: ON (action)
- `idx_audit_created`: ON (created_at)

### Refresh Tokens

#### refresh_tokens
- `id` (UUID, PK): Unique token identifier
- `user_id` (UUID, FK → users.id): User reference
- `token` (VARCHAR(255), UNIQUE): Refresh token
- `expires_at` (TIMESTAMP): Expiration timestamp
- `created_at` (TIMESTAMP): Creation timestamp

**Indexes:**
- `idx_refresh_user`: ON (user_id)
- `idx_refresh_token`: ON (token)
- `idx_refresh_expires`: ON (expires_at)

## Relationships Summary

1. **Organization → Users**: One-to-Many
2. **Users → Roles**: Many-to-Many (via user_roles)
3. **Roles → Permissions**: Many-to-Many (via role_permissions)
4. **Organization → Projects**: One-to-Many
5. **Projects → Teams**: Many-to-Many (via project_teams)
6. **Teams → Users**: Many-to-Many (via team_members)
7. **Projects → Epics**: One-to-Many
8. **Epics → Stories**: One-to-Many
9. **Stories → Tasks**: One-to-Many
10. **Tasks → Subtasks**: One-to-Many
11. **Users → Time Entries**: One-to-Many
12. **Tasks → Time Entries**: One-to-Many
13. **Users → Audit Logs**: One-to-Many

## Data Integrity Rules

1. **Cascading Deletes**: 
   - Deleting a project soft-deletes all related epics, stories, tasks, subtasks
   - Deleting a user sets assignee_id to NULL (preserve history)
   - Deleting a team removes team_members relationships

2. **Constraints**:
   - Email must be unique per organization
   - Role names must be unique
   - Permission names must be unique
   - User cannot be assigned to same role twice in same scope
   - Task must belong to either a story OR directly to a project (not both)

3. **Computed Fields**:
   - Project progress_percentage calculated from task completion
   - Task completion based on subtask completion status

## Migration Strategy

- Use Alembic for database migrations
- Version-controlled migration files
- Rollback support for each migration
- Seed data migrations for initial roles and permissions
