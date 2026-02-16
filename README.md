# Enterprise Task Management System

A production-ready, enterprise-grade task and project management system comparable to Jira, designed for large organizations.

## Features

- **User Hierarchy & RBAC**: CEO, Manager, Team Lead, Member roles with strict permission control
- **Project Management**: Full CRUD operations, status lifecycle, progress tracking
- **Task Hierarchy**: Project → Epic → Story → Task → Subtask
- **Kanban Board**: Drag-and-drop task management
- **Team Management**: Create teams, assign members, track workload
- **Time Tracking**: Log time per task and user
- **Analytics & Dashboards**: Role-specific dashboards, burndown charts, workload tracking
- **Audit Logging**: Complete audit trail for all critical actions
- **JWT Authentication**: Secure authentication with refresh tokens

## Tech Stack

### Backend
- Python 3.11+
- FastAPI
- SQLAlchemy 2.0
- PostgreSQL 15+
- Redis 7+
- Celery

### Frontend
- React 18+
- TypeScript 5+
- Vite 5+
- Tailwind CSS 3+
- React Query (TanStack Query)
- React Router 6+

### DevOps
- Docker & Docker Compose
- Nginx (reverse proxy)

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd Task
```

2. **Set up environment variables**
```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your configuration
```

3. **Start services with Docker Compose**
```bash
docker-compose up -d
```

4. **Run database migrations**
```bash
docker-compose exec backend alembic upgrade head
```

5. **Seed initial data**
```bash
docker-compose exec backend python scripts/seed_data.py
```

6. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/api/docs

### Demo Users

After seeding, you can login with:
- **CEO**: ceo@demo.com / ceo123
- **Manager**: manager@demo.com / manager123
- **Team Lead**: teamlead@demo.com / lead123
- **Member**: member@demo.com / member123

## Development Setup

### Backend Development

1. **Install dependencies**
```bash
cd backend
pip install -r requirements.txt
```

2. **Set up database**
```bash
# Create .env file with DATABASE_URL
# Run migrations
alembic upgrade head

# Seed data
python scripts/seed_data.py
```

3. **Run development server**
```bash
uvicorn app.main:app --reload
```

### Frontend Development

1. **Install dependencies**
```bash
cd frontend
npm install
```

2. **Run development server**
```bash
npm run dev
```

## Project Structure

```
Task/
├── backend/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── core/         # Core configuration
│   │   ├── models/       # Database models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Business logic
│   │   └── main.py       # FastAPI app
│   ├── alembic/          # Database migrations
│   ├── scripts/          # Utility scripts
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API client
│   │   ├── hooks/        # Custom hooks
│   │   └── types/        # TypeScript types
│   └── package.json
├── nginx/                # Nginx configuration
├── docker-compose.yml
└── README.md
```

## API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

## Database Schema

See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for complete database schema documentation.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system architecture documentation.

## Role-Based Access Control

### Roles
- **CEO**: Full system access, organization-wide visibility
- **Manager**: Can manage projects and teams, multi-project visibility
- **Team Lead**: Can manage team tasks and sprints, team-level visibility
- **Member**: Can manage assigned tasks, personal task visibility

### Permissions
Permissions are enforced at both API and UI layers. Each role has specific permissions for:
- Users (create, read, update, delete)
- Projects (create, read, update, delete)
- Tasks (create, read, update, delete)
- Teams (create, read, update, delete)
- Time tracking (create, read, update, delete)

## Production Deployment

### Environment Variables

Set the following environment variables in production:

```bash
SECRET_KEY=<strong-secret-key-min-32-chars>
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://host:6379/0
ENVIRONMENT=production
DEBUG=False
CORS_ORIGINS=https://yourdomain.com
```

### Build for Production

1. **Build frontend**
```bash
cd frontend
npm run build
```

2. **Use production profile**
```bash
docker-compose --profile production up -d
```

### Health Checks

- Backend: http://localhost:8000/health
- Frontend: http://localhost:80/health (via Nginx)

## Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Ensure tests pass
4. Submit a pull request

## License

[Your License Here]

## Support

For issues and questions, please open an issue on the repository.
