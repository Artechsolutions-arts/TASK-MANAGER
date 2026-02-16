# Deployment Guide

## Production Deployment

### Prerequisites

- Docker and Docker Compose installed
- Domain name (optional, for production)
- SSL certificate (for HTTPS in production)

### Step 1: Environment Configuration

1. **Backend Environment Variables**

Create `backend/.env` with production values:

```bash
DATABASE_URL=postgresql://user:password@postgres:5432/taskmanager
REDIS_URL=redis://redis:6379/0
SECRET_KEY=<generate-a-strong-secret-key-min-32-chars>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
ENVIRONMENT=production
DEBUG=False
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2
```

2. **Frontend Environment Variables**

Create `frontend/.env.production`:

```bash
VITE_API_URL=https://api.yourdomain.com
```

### Step 2: Build and Deploy

1. **Build Frontend**

```bash
cd frontend
npm install
npm run build
```

2. **Start Services**

```bash
docker-compose --profile production up -d
```

3. **Run Migrations**

```bash
docker-compose exec backend alembic upgrade head
```

4. **Seed Initial Data (Optional)**

```bash
docker-compose exec backend python scripts/seed_data.py
```

### Step 3: Nginx Configuration for Production

Update `nginx/nginx.conf` for production:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # Frontend
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Step 4: Health Checks

Verify services are running:

```bash
# Backend health
curl http://localhost:8000/health

# Frontend (via Nginx)
curl http://localhost/health
```

### Step 5: Monitoring

Set up monitoring for:
- Database connections
- Redis memory usage
- Application logs
- Error rates

### Scaling

To scale horizontally:

1. **Backend**: Run multiple backend containers behind a load balancer
2. **Celery**: Scale worker containers based on queue length
3. **Database**: Use read replicas for analytics queries
4. **Redis**: Use Redis Cluster for high availability

### Backup Strategy

1. **Database Backups**

```bash
# Daily backup script
docker-compose exec postgres pg_dump -U postgres taskmanager > backup_$(date +%Y%m%d).sql
```

2. **Redis Persistence**

Ensure Redis persistence is configured in `docker-compose.yml`:

```yaml
redis:
  volumes:
    - redis_data:/data
  command: redis-server --appendonly yes
```

### Security Checklist

- [ ] Change all default passwords
- [ ] Use strong SECRET_KEY
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure CORS properly
- [ ] Set up firewall rules
- [ ] Enable database SSL connections
- [ ] Regular security updates
- [ ] Monitor audit logs
- [ ] Set up rate limiting
- [ ] Configure backup retention

### Troubleshooting

**Backend won't start:**
- Check database connection
- Verify environment variables
- Check logs: `docker-compose logs backend`

**Frontend build fails:**
- Check Node version (requires Node 18+)
- Clear node_modules and reinstall
- Check for TypeScript errors

**Database connection errors:**
- Verify PostgreSQL is running
- Check DATABASE_URL format
- Ensure database exists

**Redis connection errors:**
- Verify Redis is running
- Check REDIS_URL format
- Check Redis logs
