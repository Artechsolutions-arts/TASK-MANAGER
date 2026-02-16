# Complete Project Overview - Enterprise Task Management System

## 📋 Project Summary

**Appotime** is a production-ready, enterprise-grade task and project management system designed for large organizations. It provides a comprehensive solution for managing projects, tasks, teams, and workflows with role-based access control, similar to Jira or Asana.

---

## 🏗️ Architecture

### System Architecture
- **Frontend**: React 18 + TypeScript + Vite (SPA)
- **Backend**: FastAPI (Python) REST API
- **Database**: MongoDB 7.0 (NoSQL)
- **Cache/Queue**: Redis 7 (for Celery tasks)
- **Task Queue**: Celery (async background tasks)
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx (production)

### Architecture Pattern
- **Backend**: RESTful API with MVC-like structure
- **Frontend**: Component-based architecture with React Router
- **State Management**: React Query (TanStack Query) for server state
- **Authentication**: JWT tokens (access + refresh tokens)
- **Authorization**: Role-Based Access Control (RBAC)

---

## 🛠️ Technology Stack

### Backend Technologies
```
- Python 3.11+
- FastAPI 0.104.1
- Beanie 1.23.6 (MongoDB ODM)
- Motor 3.3.2 (Async MongoDB driver)
- Pydantic 2.5.0 (Data validation)
- Python-JOSE (JWT handling)
- Passlib + Bcrypt (Password hashing)
- Celery 5.3.4 (Async task queue)
- Redis 5.0.1 (Cache & message broker)
```

### Frontend Technologies
```
- React 18.2.0
- TypeScript 5.2.2
- Vite 5.0.8 (Build tool)
- React Router 6.20.0
- TanStack Query 5.12.0 (Data fetching)
- Tailwind CSS 3.3.6 (Styling)
- Lucide React 0.563.0 (Icons)
- date-fns 2.30.0 (Date utilities)
- @dnd-kit (Drag & drop for Kanban)
- Axios 1.6.2 (HTTP client)
- Recharts 2.10.3 (Charts)
```

### DevOps & Infrastructure
```
- Docker & Docker Compose
- MongoDB 7.0
- Redis 7-alpine
- Nginx (Production)
```

---

## ✨ Key Features

### 1. **User Management & Authentication**
- JWT-based authentication with refresh tokens
- User registration and profile management
- Password hashing with bcrypt
- Session management
- Dev login page for quick testing

### 2. **Role-Based Access Control (RBAC)**
Four hierarchical roles with different permissions:

#### **CEO** (Top Management)
- Full system access
- Organization-wide visibility
- Can view all projects, teams, and tasks
- Can manage all users and teams

#### **Manager** (Project Managers)
- Can create and manage projects
- Multi-project visibility
- Can assign team leads
- Can view all team activities
- Can manage teams

#### **Team Lead** (Team Leaders)
- Can manage team tasks
- Team-level visibility
- Can create tasks for team members
- Can view team member workloads
- Can only see assigned projects

#### **Member** (Team Members)
- Can manage assigned tasks
- Personal task visibility
- Can submit reports
- Can only see assigned projects and tasks
- Cannot create projects

### 3. **Project Management**
- Create, edit, delete projects
- Project status tracking (Planning, In Progress, Completed, Blocked)
- Progress percentage tracking
- Start and end dates
- Team assignment
- Team lead assignment
- Work type specification
- Project archiving

### 4. **Task Hierarchy**
Five-level task structure:
```
Project
  └── Epic
      └── Story
          └── Task
              └── Subtask
```

- **Epic**: Large features or initiatives
- **Story**: User stories or feature requirements
- **Task**: Individual work items
- **Subtask**: Breakdown of tasks
- Each level supports:
  - Status tracking (Backlog, To Do, In Progress, Review, Done)
  - Priority levels (Low, Medium, High, Critical)
  - Assignee assignment
  - Due dates
  - Estimated hours
  - Descriptions

### 5. **Kanban Board**
- Drag-and-drop task management
- Visual status columns
- Real-time updates
- Project-specific boards
- Task filtering

### 6. **Team Management**
- Create and manage teams
- Add/remove team members
- Assign team leads
- Team member details view
- Team workload tracking
- Team-specific project assignment

### 7. **Calendar View** ⭐ (Recently Added)
- Google Calendar-style interface
- Month view with task visualization
- Tasks displayed on their due dates
- Color-coded by priority
- Status indicators
- Click date to see detailed task list
- Navigate between months
- "Today" button for quick navigation
- Overdue task indicators

### 8. **Team Discussion** ⭐ (Recently Enhanced)
- Real-time team discussions
- Comment system with threading
- **Image Attachments**: Upload and view images in comments
- **Person Tagging**: Tag team members with @ mentions
- User picker dropdown when typing @
- Image previews (click to view full size)
- Tagged user badges
- Comments appear below input
- Modern scrollbar styling

### 9. **Project Detail Page** ⭐ (Recently Enhanced)
- Two-column layout:
  - **Left**: Team Members with task statistics
    - Click member to see their tasks
    - Shows: Assigned, In Progress, Completed counts
    - Expandable task details
    - Unassigned tasks section
    - Modern scrollbar
  - **Right**: Team Discussion section
    - Comment input with image/tag options
    - All team discussions
    - Image attachments
    - Person tagging

### 10. **Time Tracking**
- Log time per task
- Track hours worked
- Time entry management
- Project and task time reports

### 11. **Reports & Analytics**
- Role-specific dashboards
- Project progress tracking
- Task completion metrics
- Team workload analysis
- Burndown charts
- Overdue tasks tracking
- Report submission system

### 12. **Activity & Audit Logging**
- Complete activity feed
- Comment history
- Task change tracking
- Audit trail for all actions
- User activity monitoring

### 13. **Backlog Management**
- View all backlog items
- Filter by project, status, priority
- Epic and story management

### 14. **Settings & Profile**
- User profile management
- Avatar upload
- Password change
- Theme preferences (Light/Dark mode)
- Account settings

---

## 📁 Project Structure

```
Task/
├── backend/                          # Backend API
│   ├── app/
│   │   ├── api/v1/                   # API endpoints
│   │   │   ├── auth.py               # Authentication
│   │   │   ├── users.py              # User management
│   │   │   ├── projects.py           # Project CRUD
│   │   │   ├── tasks.py              # Task CRUD
│   │   │   ├── teams.py              # Team management
│   │   │   ├── time_tracking.py       # Time entries
│   │   │   ├── analytics.py           # Analytics & dashboards
│   │   │   ├── reports.py            # Reports
│   │   │   └── activity.py           # Activity feed
│   │   ├── models/                   # MongoDB models
│   │   │   ├── user.py               # User model
│   │   │   ├── project.py            # Project model
│   │   │   ├── task.py               # Task hierarchy models
│   │   │   ├── team.py               # Team models
│   │   │   ├── time_tracking.py      # Time entry model
│   │   │   ├── report.py             # Report model
│   │   │   ├── activity.py           # Activity model
│   │   │   └── audit.py              # Audit log model
│   │   ├── schemas/                   # Pydantic schemas
│   │   │   ├── auth.py               # Auth schemas
│   │   │   ├── user.py               # User schemas
│   │   │   ├── project.py            # Project schemas
│   │   │   ├── task.py               # Task schemas
│   │   │   └── ...
│   │   ├── services/                  # Business logic
│   │   │   ├── permission_service.py # RBAC logic
│   │   │   ├── audit_service.py      # Audit logging
│   │   │   └── activity_service.py   # Activity tracking
│   │   ├── core/                      # Core configuration
│   │   │   ├── config.py             # Settings
│   │   │   ├── database.py            # DB connection
│   │   │   ├── security.py           # JWT & password
│   │   │   └── dependencies.py       # FastAPI dependencies
│   │   ├── celery_app.py              # Celery configuration
│   │   └── main.py                    # FastAPI app entry
│   ├── scripts/
│   │   └── seed_data.py               # Database seeding
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/                          # Frontend React App
│   ├── src/
│   │   ├── pages/                     # Page components
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── ProjectsPage.tsx
│   │   │   ├── ProjectDetailPage.tsx  # Enhanced with 2-column layout
│   │   │   ├── CreateProjectPage.tsx
│   │   │   ├── EditProjectPage.tsx
│   │   │   ├── TasksPage.tsx
│   │   │   ├── CreateTaskPage.tsx
│   │   │   ├── BoardPage.tsx           # Kanban board
│   │   │   ├── CalendarPage.tsx         # Calendar view
│   │   │   ├── TeamsPage.tsx
│   │   │   ├── TeamDetailPage.tsx
│   │   │   ├── BacklogPage.tsx
│   │   │   ├── ReportsPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   ├── components/                 # Reusable components
│   │   │   ├── Layout.tsx              # Main layout
│   │   │   ├── Sidebar.tsx             # Navigation sidebar
│   │   │   ├── Header.tsx               # Top header
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── TaskCard.tsx
│   │   │   ├── KanbanBoard.tsx         # Drag & drop board
│   │   │   ├── TeamDiscussionSection.tsx # Enhanced discussion
│   │   │   ├── ActivitySection.tsx
│   │   │   └── ...
│   │   ├── context/                     # React contexts
│   │   │   ├── AuthContext.tsx         # Authentication state
│   │   │   └── ThemeContext.tsx         # Dark/light theme
│   │   ├── services/
│   │   │   └── api.ts                   # API client (Axios)
│   │   ├── types/
│   │   │   └── index.ts                 # TypeScript types
│   │   ├── utils/
│   │   │   └── permissions.ts           # Permission helpers
│   │   ├── App.tsx                      # Main app component
│   │   └── main.tsx                     # Entry point
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml                  # Docker orchestration
├── nginx/                              # Nginx config (production)
└── README.md                           # Main documentation
```

---

## 🗄️ Database Schema (MongoDB)

### Collections

1. **users** - User accounts
   - email, password_hash, first_name, last_name
   - organization_id, is_active, roles

2. **roles** - Role definitions
   - name, permissions

3. **user_roles** - User-role assignments
   - user_id, role_id, scope_type, scope_id

4. **organizations** - Organization data
   - name, slug

5. **projects** - Project data
   - name, description, status, progress_percentage
   - start_date, end_date, manager_id, team_lead_id
   - team_ids, work_type

6. **teams** - Team data
   - name, description, team_lead_id

7. **team_members** - Team membership
   - team_id, user_id

8. **epics** - Epic level tasks
   - title, description, project_id, status, priority
   - assignee_id, reporter_id, due_date

9. **stories** - Story level tasks
   - title, description, epic_id, status, priority
   - assignee_id, reporter_id, due_date, estimated_hours

10. **tasks** - Task level items
    - title, description, story_id, status, priority
    - assignee_id, reporter_id, due_date, estimated_hours

11. **subtasks** - Subtask items
    - title, description, task_id, status, priority
    - assignee_id, due_date

12. **time_entries** - Time tracking
    - user_id, task_id, project_id, hours, date

13. **reports** - Work reports
    - user_id, project_id, task_id, report_type
    - content, status, progress_percentage

14. **activities** - Activity feed
    - entity_type, entity_id, activity_type
    - user_id, content, metadata

15. **audit_logs** - Audit trail
    - action, resource_type, resource_id
    - user_id, ip_address, user_agent

---

## 🔌 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - User logout

### Users
- `GET /api/v1/users` - List users
- `GET /api/v1/users/me` - Get current user
- `POST /api/v1/users` - Create user (requires permission)

### Projects
- `GET /api/v1/projects` - List projects (filtered by role)
- `GET /api/v1/projects/{id}` - Get project details
- `POST /api/v1/projects` - Create project
- `PUT /api/v1/projects/{id}` - Update project
- `DELETE /api/v1/projects/{id}` - Delete project
- `GET /api/v1/projects/{id}/team-members` - Get project team members

### Tasks
- `GET /api/v1/tasks` - List tasks (filtered by role)
- `GET /api/v1/tasks/{id}` - Get task details
- `POST /api/v1/tasks` - Create task
- `PUT /api/v1/tasks/{id}` - Update task
- `DELETE /api/v1/tasks/{id}` - Delete task
- `GET /api/v1/tasks/epics` - List epics
- `GET /api/v1/tasks/stories` - List stories
- `GET /api/v1/tasks/{id}/subtasks` - List subtasks

### Teams
- `GET /api/v1/teams` - List teams
- `GET /api/v1/teams/{id}` - Get team details
- `POST /api/v1/teams` - Create team
- `PUT /api/v1/teams/{id}` - Update team
- `DELETE /api/v1/teams/{id}` - Delete team
- `POST /api/v1/teams/{id}/members` - Add team member
- `DELETE /api/v1/teams/{id}/members/{user_id}` - Remove member

### Activity
- `GET /api/v1/activity` - List activities/comments
- `POST /api/v1/activity` - Create activity/comment

### Analytics
- `GET /api/v1/analytics/dashboard` - Get dashboard data
- `GET /api/v1/analytics/workload` - Get workload data
- `GET /api/v1/analytics/burndown/{project_id}` - Burndown chart

### Reports
- `GET /api/v1/reports` - List reports
- `POST /api/v1/reports` - Create report
- `POST /api/v1/reports/{id}/submit` - Submit report

### Time Tracking
- `GET /api/v1/time` - List time entries
- `POST /api/v1/time` - Create time entry
- `PUT /api/v1/time/{id}` - Update time entry

---

## 🎨 Frontend Pages & Routes

### Public Routes
- `/login` - Login page
- `/dev-login` - Quick dev login (development only)

### Protected Routes (Require Authentication)
- `/` - Dashboard (role-specific)
- `/projects` - Projects list
- `/projects/new` - Create project
- `/projects/:id` - Project detail (with team discussion)
- `/projects/:id/edit` - Edit project
- `/tasks` - Tasks list
- `/tasks/new` - Create task
- `/board` - Kanban board
- `/calendar` - Calendar view ⭐
- `/teams` - Teams list
- `/teams/:id` - Team detail
- `/backlog` - Backlog view
- `/reports` - Reports page
- `/settings` - User settings

---

## 🔐 Security Features

1. **Authentication**
   - JWT access tokens (30 min expiry)
   - Refresh tokens (7 days expiry)
   - Secure password hashing (bcrypt)
   - Token refresh mechanism

2. **Authorization**
   - Role-based access control (RBAC)
   - Permission-based API access
   - Frontend route protection
   - Data filtering by role

3. **Data Security**
   - CORS configuration
   - Input validation (Pydantic)
   - SQL injection prevention (MongoDB)
   - XSS protection (React)

4. **Audit Trail**
   - Complete audit logging
   - User action tracking
   - IP address logging
   - Timestamp tracking

---

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Git

### Quick Start
```bash
# 1. Clone repository
git clone <repo-url>
cd Task

# 2. Start all services
docker-compose up -d

# 3. Seed initial data (optional)
docker-compose exec backend python scripts/seed_data.py

# 4. Access application
# Frontend: http://localhost:5173
# Backend API: http://localhost:8001
# API Docs: http://localhost:8001/api/docs
```

### Demo Users
After seeding:
- **CEO**: ceo@demo.com / ceo123
- **Manager**: manager@demo.com / manager123
- **Team Lead**: teamlead@demo.com / lead123
- **Member**: member@demo.com / member123

---

## 📊 Recent Enhancements

### 1. Calendar Feature (Latest)
- Google Calendar-style month view
- Task visualization on due dates
- Color-coded priorities
- Date selection for detailed view
- Navigation controls

### 2. Enhanced Team Discussion
- Image attachments (base64 storage)
- Person tagging with @ mentions
- User picker dropdown
- Image previews
- Tagged user badges
- Modern UI/UX

### 3. Project Detail Page Redesign
- Two-column layout
- Team members with task statistics
- Expandable task details
- Integrated team discussion
- Modern scrollbars

### 4. Role-Based Filtering
- Projects filtered by assignment
- Tasks filtered by team lead creation
- Dashboard data filtered by role
- Secure data access

---

## 🔄 Data Flow

### Task Creation Flow
1. User creates task via frontend
2. Frontend sends POST to `/api/v1/tasks`
3. Backend validates permissions
4. Backend creates task in MongoDB
5. Backend logs audit entry
6. Frontend invalidates cache
7. UI updates with new task

### Authentication Flow
1. User submits credentials
2. Backend validates credentials
3. Backend generates JWT tokens
4. Frontend stores tokens
5. Frontend includes token in requests
6. Backend validates token on each request

### Permission Check Flow
1. User requests resource
2. Backend extracts user from JWT
3. Backend checks user roles
4. Backend checks permissions
5. Backend filters data by role
6. Backend returns filtered data

---

## 🎯 Key Design Decisions

1. **MongoDB over PostgreSQL**: Chosen for flexible schema and scalability
2. **FastAPI**: Modern async Python framework for high performance
3. **React Query**: Efficient server state management
4. **JWT Tokens**: Stateless authentication for scalability
5. **Docker Compose**: Easy development and deployment
6. **Role-Based Filtering**: Data security at API level
7. **Base64 Images**: Simple storage without file system

---

## 📈 Performance Considerations

- **Caching**: Redis for frequently accessed data
- **Async Operations**: Celery for background tasks
- **Database Indexing**: MongoDB indexes on frequently queried fields
- **React Query**: Automatic caching and refetching
- **Code Splitting**: Vite for optimized builds
- **Lazy Loading**: React Router code splitting

---

## 🧪 Testing

### Backend Testing
```bash
cd backend
pytest
```

### Frontend Testing
```bash
cd frontend
npm test
```

---

## 📝 Development Workflow

1. **Make Changes**: Edit code in frontend/ or backend/
2. **Hot Reload**: Changes auto-reload (Docker volumes)
3. **Test**: Check in browser at http://localhost:5173
4. **Restart Servers**: `docker-compose restart frontend backend`
5. **Check Logs**: `docker-compose logs -f [service]`

---

## 🐛 Known Issues & Limitations

1. **Image Storage**: Currently using base64 (not ideal for production)
   - **Solution**: Implement file storage service (S3, local filesystem)

2. **Real-time Updates**: No WebSocket support yet
   - **Solution**: Add WebSocket for live updates

3. **File Attachments**: Only images supported
   - **Solution**: Add support for other file types

---

## 🔮 Future Enhancements

- [ ] WebSocket for real-time updates
- [ ] File storage service (S3/local)
- [ ] Email notifications
- [ ] Advanced search
- [ ] Export reports (PDF/Excel)
- [ ] Mobile app (React Native)
- [ ] Two-factor authentication
- [ ] Advanced analytics
- [ ] Custom workflows
- [ ] Integration with external tools

---

## 📞 Support & Documentation

- **API Documentation**: http://localhost:8001/api/docs
- **ReDoc**: http://localhost:8001/api/redoc
- **Architecture**: See `ARCHITECTURE.md`
- **Database Schema**: See `DATABASE_SCHEMA.md`
- **Setup Guide**: See `SETUP_GUIDE.md`

---

## 📄 License

[Your License Here]

---

## 👥 Contributors

[Your Team/Contributors]

---

**Last Updated**: February 2026
**Version**: 1.0.0
**Status**: Production Ready
