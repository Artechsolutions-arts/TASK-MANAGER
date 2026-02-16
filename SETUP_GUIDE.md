# Setup Guide

## Local Development Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional, for containerized setup)

### Option 1: Docker Setup (Recommended)

1. **Clone and navigate to project**
```bash
cd Task
```

2. **Start services**
```bash
docker-compose up -d
```

3. **Run migrations**
```bash
docker-compose exec backend alembic upgrade head
```

4. **Seed data**
```bash
docker-compose exec backend python scripts/seed_data.py
```

5. **Access application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/api/docs

### Option 2: Manual Setup

#### Backend Setup

1. **Create virtual environment**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

3. **Set up environment**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. **Set up database**
```bash
# Create database
createdb taskmanager

# Run migrations
alembic upgrade head

# Seed data
python scripts/seed_data.py
```

5. **Start backend**
```bash
uvicorn app.main:app --reload
```

#### Frontend Setup

1. **Install dependencies**
```bash
cd frontend
npm install
```

2. **Set up environment**
```bash
# Create .env file
echo "VITE_API_URL=http://localhost:8000" > .env
```

3. **Start frontend**
```bash
npm run dev
```

### Database Setup

#### PostgreSQL

1. **Install PostgreSQL** (if not using Docker)
2. **Create database**
```sql
CREATE DATABASE taskmanager;
```

3. **Update DATABASE_URL in backend/.env**
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/taskmanager
```

#### Redis

1. **Install Redis** (if not using Docker)
2. **Start Redis**
```bash
redis-server
```

3. **Update REDIS_URL in backend/.env**
```
REDIS_URL=redis://localhost:6379/0
```

### Running Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

### Testing

#### Backend Tests
```bash
cd backend
pytest
```

#### Frontend Tests
```bash
cd frontend
npm test
```

### Common Issues

**Port already in use:**
- Change ports in docker-compose.yml or kill existing processes

**Database connection errors:**
- Verify PostgreSQL is running
- Check DATABASE_URL format
- Ensure database exists

**Module not found errors:**
- Ensure virtual environment is activated
- Run `pip install -r requirements.txt` again

**Frontend build errors:**
- Clear node_modules: `rm -rf node_modules && npm install`
- Check Node.js version (requires 18+)

### Development Tips

1. **Hot Reload**: Both frontend and backend support hot reload in development
2. **API Documentation**: Visit http://localhost:8000/api/docs for interactive API docs
3. **Database Admin**: Use pgAdmin or DBeaver to inspect database
4. **Redis CLI**: Use `redis-cli` to inspect Redis data

### Next Steps

After setup:
1. Login with demo credentials (see README.md)
2. Explore the API documentation
3. Create your first project
4. Add tasks and manage them via Kanban board
