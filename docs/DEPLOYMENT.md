# Deployment Guide

## Local Development

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (optional, for local development)
- Git

### Setup

1. **Clone/create the project**

```bash
cd backend
```

2. **Create `.env` file**

```bash
cp .env.example .env
```

3. **Update `.env` with secure values**

```env
JWT_SECRET=your-super-secret-key-change-this
NODE_ENV=development
POSTGRES_PASSWORD=your-secure-password
```

4. **Start services**

```bash
docker-compose up --build
```

5. **Verify services**

```bash
# API Gateway health check
curl http://localhost:3000/health

# All services should return { "status": "ok", ... }
```

### Local Development (without Docker)

If you want to develop services locally:

```bash
# For auth-service (runs on port 3001)
cd services/auth-service
npm install
npm run dev

# In another terminal, for postgres
docker run -p 5432:5432 \
  -e POSTGRES_DB=globetrotter \
  -e POSTGRES_USER=globetrotter_user \
  -e POSTGRES_PASSWORD=globetrotter_pass \
  postgres:15-alpine
```

---

## Docker Build & Push

### Build images locally

```bash
cd backend

# Build all services
docker-compose build

# Or build specific service
docker-compose build auth-service
```

### Push to registry

```bash
# Login to registry (example: Docker Hub)
docker login

# Tag images
docker tag globetrotter-backend_auth-service:latest myregistry/globetrotter-auth:v1.0.0
docker tag globetrotter-backend_catalog-service:latest myregistry/globetrotter-catalog:v1.0.0
# ... repeat for all services

# Push
docker push myregistry/globetrotter-auth:v1.0.0
docker push myregistry/globetrotter-catalog:v1.0.0
# ... etc.
```

---

## Production Deployment

### Environment Setup

```bash
# Create production .env
JWT_SECRET=<generate-strong-random-key>
NODE_ENV=production
POSTGRES_PASSWORD=<secure-password>
POSTGRES_USER=globetrotter_user
POSTGRES_DB=globetrotter

# Update service URLs to match your domain
AUTH_SERVICE_URL=https://api.globetrotter.com/auth
CATALOG_SERVICE_URL=https://api.globetrotter.com/catalog
# ... etc.
```

### Using Docker Compose (Simple Production)

```bash
# On production server
docker-compose -f docker-compose.yml up -d

# Or with overrides
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Create `docker-compose.prod.yml`

```yaml
version: '3.8'

services:
  postgres:
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data_prod:/var/lib/postgresql/data
    restart: always

  api-gateway:
    restart: always
    environment:
      NODE_ENV: production
    # Add reverse proxy (nginx) in front

  auth-service:
    restart: always
    environment:
      NODE_ENV: production

  catalog-service:
    restart: always
    environment:
      NODE_ENV: production

  # ... repeat for all services
```

### Using Kubernetes

**Prerequisites:** kubectl configured, Docker images pushed to registry

**1. Create namespace**

```bash
kubectl create namespace globetrotter
```

**2. Create secrets**

```bash
kubectl create secret generic globetrotter-secrets \
  --from-literal=jwt-secret=<generate-key> \
  --from-literal=postgres-password=<password> \
  -n globetrotter
```

**3. Create ConfigMap for environment**

```bash
kubectl create configmap globetrotter-config \
  --from-literal=NODE_ENV=production \
  -n globetrotter
```

**4. Deploy PostgreSQL**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: globetrotter
spec:
  ports:
    - port: 5432
  selector:
    app: postgres
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: globetrotter
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          value: globetrotter
        - name: POSTGRES_USER
          value: globetrotter_user
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: globetrotter-secrets
              key: postgres-password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: globetrotter
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

Apply:
```bash
kubectl apply -f postgres-deployment.yaml
```

**5. Deploy services**

Create `services-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: globetrotter
spec:
  replicas: 2  # Scale horizontally
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: myregistry/globetrotter-auth:v1.0.0
        env:
        - name: PORT
          value: "3001"
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: globetrotter-config
              key: NODE_ENV
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: globetrotter-secrets
              key: jwt-secret
        - name: DATABASE_URL
          value: "postgresql://globetrotter_user:$(POSTGRES_PASSWORD)@postgres:5432/globetrotter?schema=auth"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: globetrotter-secrets
              key: postgres-password
        ports:
        - containerPort: 3001
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: globetrotter
spec:
  ports:
    - port: 3001
  selector:
    app: auth-service
---
# Repeat for catalog-service, itinerary-service, etc.
```

Apply:
```bash
kubectl apply -f services-deployment.yaml
```

**6. Deploy API Gateway with Ingress**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: globetrotter
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: myregistry/globetrotter-api-gateway:v1.0.0
        env:
        - name: PORT
          value: "3000"
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: globetrotter-config
              key: NODE_ENV
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: globetrotter-secrets
              key: jwt-secret
        - name: AUTH_SERVICE_URL
          value: http://auth-service:3001
        - name: CATALOG_SERVICE_URL
          value: http://catalog-service:3002
        # ... other services
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: globetrotter
spec:
  type: LoadBalancer  # or NodePort for internal
  ports:
    - port: 80
      targetPort: 3000
  selector:
    app: api-gateway
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: globetrotter-ingress
  namespace: globetrotter
spec:
  rules:
  - host: api.globetrotter.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 3000
```

---

## Monitoring & Logging

### Docker Compose

View logs:
```bash
docker-compose logs -f [service-name]
```

Monitor services:
```bash
docker-compose ps
```

### Kubernetes

View logs:
```bash
kubectl logs -f deployment/auth-service -n globetrotter
```

View events:
```bash
kubectl get events -n globetrotter
```

Monitor resources:
```bash
kubectl top nodes
kubectl top pods -n globetrotter
```

---

## Backup & Recovery

### PostgreSQL Backup

```bash
# Full backup
docker-compose exec postgres pg_dump -U globetrotter_user globetrotter > backup_$(date +%Y%m%d).sql

# Compressed backup
docker-compose exec postgres pg_dump -U globetrotter_user globetrotter | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Restore

```bash
# From backup
docker-compose exec postgres psql -U globetrotter_user globetrotter < backup_20260817.sql

# Or from compressed
gunzip < backup_20260817.sql.gz | docker-compose exec -T postgres psql -U globetrotter_user globetrotter
```

---

## Scaling Strategy

### Phase 1 (MVP)

- Single instance of each service (Docker Compose locally)
- PostgreSQL on single server

### Phase 2+

- **Horizontal scaling:** Multiple instances per service (Kubernetes)
- **Load balancing:** Nginx or K8s Service
- **Database scaling:** Read replicas for analytics queries

### Connection pooling

Add PgBouncer for connection pooling:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: pgbouncer-config
  namespace: globetrotter
data:
  pgbouncer.ini: |
    [databases]
    globetrotter = host=postgres port=5432 dbname=globetrotter user=globetrotter_user

    [pgbouncer]
    pool_mode = transaction
    max_client_conn = 1000
    default_pool_size = 25
```

---

## CI/CD Pipeline

### Example GitHub Actions

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2

    - name: Build Docker images
      run: |
        docker-compose build

    - name: Push to registry
      env:
        DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}
        DOCKER_PASSWORD: ${{ secrets.DOCKER_PASSWORD }}
      run: |
        echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin
        docker tag globetrotter-backend_auth-service:latest $DOCKER_USERNAME/globetrotter-auth:$GITHUB_SHA
        docker push $DOCKER_USERNAME/globetrotter-auth:$GITHUB_SHA

    - name: Deploy to Kubernetes
      run: |
        kubectl set image deployment/auth-service \
          auth-service=$DOCKER_USERNAME/globetrotter-auth:$GITHUB_SHA \
          -n globetrotter
```

---

## Health Checks & Alerting

All services include healthchecks:

```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
# ... etc.
```

For production, configure:
- **Prometheus:** Scrape `/metrics` endpoints (to implement)
- **Grafana:** Dashboard visualization
- **AlertManager:** Alert on failures

---

## Security Checklist

- [ ] Change `JWT_SECRET` in production
- [ ] Enable HTTPS/TLS (reverse proxy, cert)
- [ ] Restrict CORS to known domains
- [ ] Use network policies (K8s)
- [ ] Audit logging for admin actions
- [ ] Regular backups (automated)
- [ ] Database encryption at rest
- [ ] Secrets management (K8s Secrets, vault)
- [ ] API rate limiting
- [ ] Input validation on all endpoints

---

## Troubleshooting Production

### Services not communicating

Check service URLs in environment variables:

```bash
kubectl exec -it deployment/auth-service -n globetrotter -- \
  curl http://catalog-service:3002/health
```

### Database connection pool exhausted

Check active connections:

```sql
SELECT count(*) FROM pg_stat_activity;
```

Increase pool size in PgBouncer config.

### Out of memory

Scale pods to more replicas:

```bash
kubectl scale deployment auth-service --replicas=5 -n globetrotter
```

Or increase resource limits:

```yaml
resources:
  limits:
    memory: "512Mi"
    cpu: "500m"
  requests:
    memory: "256Mi"
    cpu: "250m"
```

---

See `README.md` for development setup and `DATABASE.md` for schema documentation.
