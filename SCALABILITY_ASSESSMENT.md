# Scalability Assessment & Optimization Plan

## Current Status: ⚠️ Needs Optimization for 1000+ Users

### ✅ What Works Well (50-100 users)
- **Pagination**: Most endpoints support pagination (skip/limit)
- **Database Indexes**: Basic indexes on key fields (email, organization_id, deleted_at)
- **Soft Deletes**: Efficient soft-delete pattern
- **Async Architecture**: FastAPI async/await for concurrent requests
- **MongoDB**: Good choice for flexible schema and horizontal scaling

### ❌ Critical Issues for 1000+ Users

#### 1. **N+1 Query Problems** 🔴 CRITICAL
**Current Code Issues:**
- `list_projects()`: Loads ALL projects, then filters in Python
- `list_tasks()`: Loads ALL tasks, then filters in Python  
- `list_stories()`: Loads ALL stories, then filters in Python
- `list_epics()`: Loads ALL epics, then filters in Python

**Impact:**
- For 1000 users with 100 projects, 10,000 tasks → loads 10,000+ records into memory
- Memory usage: ~50-100MB per request
- Response time: 2-5 seconds for large datasets
- Database load: Full table scans

**Example from `backend/app/api/v1/tasks.py`:**
```python
# BAD: Loads ALL tasks, then filters
all_tasks = await Task.find(Task.deleted_at == None).to_list()
tasks = [t for t in all_tasks if t.project_id in project_ids]
```

#### 2. **Pagination Limit Too Small** 🟡 MEDIUM
- Current max: 100 items per page
- For 1000+ users: Need 500-1000 items per page option
- Frontend may need infinite scroll or virtual scrolling

#### 3. **No Caching** 🟡 MEDIUM
- Redis is configured but NOT used for caching
- User roles, permissions, projects list fetched on every request
- Should cache: user roles, project lists, team memberships

#### 4. **Inefficient Permission Filtering** 🟡 MEDIUM
- Permission checks load ALL team members, ALL project teams, then filter in Python
- Should use MongoDB aggregation pipelines

#### 5. **Missing Compound Indexes** 🟡 MEDIUM
- Need indexes for common query patterns:
  - `(organization_id, deleted_at, status)`
  - `(project_id, deleted_at, status, assignee_id)`
  - `(user_id, deleted_at, created_at)`

---

## Optimization Plan

### Phase 1: Critical Fixes (Immediate - Required for 1000+)

#### 1.1 Fix N+1 Queries - Use MongoDB Query Filters

**File: `backend/app/api/v1/tasks.py`**
```python
# BEFORE (BAD):
all_tasks = await Task.find(Task.deleted_at == None).to_list()
tasks = [t for t in all_tasks if t.project_id in project_ids]

# AFTER (GOOD):
tasks = await Task.find(
    Task.project_id.in_(project_ids),
    Task.deleted_at == None
).skip(skip).limit(limit).sort([("position", 1), ("-created_at", -1)]).to_list()
```

**File: `backend/app/api/v1/projects.py`**
```python
# BEFORE (BAD):
all_projects = await Project.find(...).to_list()
projects = [p for p in all_projects if p.manager_id == current_user.id]

# AFTER (GOOD):
projects = await Project.find(
    Project.organization_id == current_user.organization_id,
    Project.manager_id == current_user.id,
    Project.deleted_at == None
).skip(skip).limit(limit).sort(-Project.created_at).to_list()
```

#### 1.2 Increase Pagination Limits

**File: `backend/app/api/v1/users.py`**
```python
limit: int = Query(100, ge=1, le=1000),  # Increase max to 1000
```

**Apply to all list endpoints:**
- `list_users`: 100 → 1000 max
- `list_projects`: 100 → 500 max
- `list_tasks`: 100 → 500 max
- `list_stories`: 100 → 500 max
- `list_epics`: 100 → 500 max

#### 1.3 Add Compound Database Indexes

**File: `backend/app/models/project.py`**
```python
indexes = [
    [("organization_id", 1), ("deleted_at", 1)],
    [("organization_id", 1), ("manager_id", 1), ("deleted_at", 1)],
    [("organization_id", 1), ("status", 1), ("deleted_at", 1)],
]
```

**File: `backend/app/models/task.py`**
```python
indexes = [
    [("project_id", 1), ("deleted_at", 1), ("status", 1)],
    [("project_id", 1), ("assignee_id", 1), ("deleted_at", 1)],
    [("organization_id", 1), ("deleted_at", 1)],  # If you add org_id to tasks
]
```

### Phase 2: Performance Enhancements (High Priority)

#### 2.1 Implement Redis Caching

**Create: `backend/app/services/cache_service.py`**
```python
import redis.asyncio as redis
from app.core.config import settings
import json
from typing import Optional, Any

class CacheService:
    def __init__(self):
        self.redis_client = None
    
    async def connect(self):
        self.redis_client = await redis.from_url(settings.REDIS_URL)
    
    async def get(self, key: str) -> Optional[Any]:
        if not self.redis_client:
            return None
        data = await self.redis_client.get(key)
        return json.loads(data) if data else None
    
    async def set(self, key: str, value: Any, ttl: int = 300):
        if not self.redis_client:
            return
        await self.redis_client.setex(key, ttl, json.dumps(value))
    
    async def delete(self, key: str):
        if not self.redis_client:
            return
        await self.redis_client.delete(key)

cache_service = CacheService()
```

**Use in API endpoints:**
```python
# Cache user roles for 5 minutes
cache_key = f"user_roles:{user_id}"
roles = await cache_service.get(cache_key)
if not roles:
    roles = await permission_service.get_user_roles(user_id)
    await cache_service.set(cache_key, roles, ttl=300)
```

#### 2.2 Optimize Permission Filtering with Aggregation

**File: `backend/app/api/v1/projects.py`**
```python
# Use MongoDB aggregation instead of loading all records
from beanie.operators import In

if "Team Lead" in role_names:
    led_teams = await Team.find(
        Team.team_lead_id == current_user.id,
        Team.deleted_at == None
    ).to_list()
    led_team_ids = [t.id for t in led_teams]
    
    if led_team_ids:
        # Use aggregation to get project IDs efficiently
        project_teams = await ProjectTeam.find(
            ProjectTeam.team_id.in_(led_team_ids)
        ).to_list()
        team_project_ids = [pt.project_id for pt in project_teams]
        
        # Query projects directly with IDs
        projects = await Project.find(
            Project.id.in_(team_project_ids),
            Project.organization_id == current_user.organization_id,
            Project.deleted_at == None
        ).skip(skip).limit(limit).sort(-Project.created_at).to_list()
```

### Phase 3: Architecture Improvements (Medium Priority)

#### 3.1 Add Database Connection Pooling

**File: `backend/app/core/database.py`**
```python
async def init_db():
    global mongodb_client
    
    # Configure connection pool for high concurrency
    mongodb_client = AsyncIOMotorClient(
        settings.DATABASE_URL,
        maxPoolSize=50,  # Increase from default 100
        minPoolSize=10,
        maxIdleTimeMS=45000,
        serverSelectionTimeoutMS=5000
    )
```

#### 3.2 Add Response Compression

**File: `backend/app/main.py`**
```python
from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(GZipMiddleware, minimum_size=1000)
```

#### 3.3 Frontend: Implement Virtual Scrolling — **DONE**
- **Tasks page**: Overdue / Today / Upcoming columns use `react-window` `FixedSizeList` via `VirtualTaskList` component; only visible rows are rendered for 1000+ tasks per section.
- Optional: Add virtual lists to Projects/Users pages if needed for very large orgs.

---

## Expected Performance Improvements

### Before Optimization (1000 users, 100 projects, 10,000 tasks):
- **List Tasks**: 3-5 seconds, 100MB memory
- **List Projects**: 2-3 seconds, 50MB memory
- **Dashboard Load**: 5-8 seconds

### After Optimization:
- **List Tasks**: 200-500ms, <10MB memory
- **List Projects**: 100-300ms, <5MB memory  
- **Dashboard Load**: 1-2 seconds (with caching)

---

## Scalability Targets

### ✅ 50-100 Users (Current - Works)
- No changes needed
- Current architecture handles this well

### ⚠️ 100-500 Users (Needs Phase 1)
- Fix N+1 queries
- Increase pagination limits
- Add compound indexes

### ⚠️ 500-1000 Users (Needs Phase 1 + 2)
- All Phase 1 fixes
- Add Redis caching
- Optimize permission queries

### ⚠️ 1000+ Users (Needs All Phases)
- All optimizations
- Consider:
  - MongoDB sharding
  - Read replicas
  - CDN for static assets
  - Load balancer for backend
  - Horizontal scaling (multiple backend instances)

---

## Implementation Priority

1. **CRITICAL (Do First)**: Fix N+1 queries in `list_tasks`, `list_projects`, `list_stories` — **DONE**
2. **HIGH**: Increase pagination limits — **DONE** (users 1000, projects/tasks/epics/stories 500, teams 500, notifications 200)
3. **HIGH**: Add compound indexes — **DONE** (Project, Task, Epic, Story models)
4. **MEDIUM**: Implement Redis caching — **DONE** (cache_service.py, user roles cached 5 min, invalidated on user update)
5. **MEDIUM**: Optimize permission filtering — **DONE** (time_tracking list uses In() and DB-level filters)
6. **LOW**: Connection pooling, compression, frontend virtual scrolling — **DONE** (MongoDB pool + GZip middleware)

### Phase 3 (Additional)
7. **Analytics dashboard** — **DONE** (projects/tasks/team members use In() and DB-level filters; no load-all)
8. **Projects: get team members & get_project access** — **DONE** (TeamMember.find(In(team_id)), User.find(In(id)); Member uses TeamMember.find(user_id) for access check)
9. **Health/readiness** — **DONE** (`/health` liveness, `/ready` readiness with MongoDB ping for k8s/load balancers)

---

## Monitoring Recommendations

For production with 1000+ users:
- **MongoDB**: Monitor query performance, slow queries, connection pool usage
- **Redis**: Monitor memory usage, hit rate
- **Backend**: Monitor response times, error rates, memory usage
- **Frontend**: Monitor bundle size, render performance

Tools:
- MongoDB Atlas Performance Advisor
- Redis monitoring (redis-cli INFO)
- Application Performance Monitoring (APM) tool
- Browser DevTools Performance tab
