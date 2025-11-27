# Deployment Guide 🚀

This guide covers multiple deployment options for GraphX-OSINT.

## Table of Contents
- [Quick Deploy Options](#quick-deploy-options)
- [Docker Deployment](#docker-deployment)
- [Cloud Platform Deployment](#cloud-platform-deployment)
- [Manual Deployment](#manual-deployment)

---

## Quick Deploy Options

### Option 1: Railway (Recommended - Easiest)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

1. Click the button above
2. Connect your GitHub account
3. Select the GraphX-OSINT repository
4. Railway will automatically:
   - Deploy Neo4j database
   - Deploy Redis
   - Deploy Backend API
   - Deploy Frontend
5. Set environment variables in Railway dashboard
6. Your app will be live in ~5 minutes!

**Required Environment Variables:**
```
NEO4J_URI=neo4j://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
REDIS_URL=redis://redis:6379
SECRET_KEY=your_secret_key
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

---

### Option 2: Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

1. Click the button above
2. Connect your GitHub repository
3. Render will read `render.yaml` and deploy:
   - Backend service
   - Frontend service
   - Redis instance
   - Neo4j database (you'll need to set this up separately)
4. Configure environment variables
5. Deploy!

---

### Option 3: Vercel (Frontend Only)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/htrap1211/GraphX-OSINT)

**For Frontend:**
1. Click the button above
2. Import your repository
3. Set root directory to `frontend`
4. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.com
   ```
5. Deploy!

**Note:** You'll need to deploy the backend separately (Railway, Render, or DigitalOcean)

---

## Docker Deployment

### Using Docker Compose (Local/VPS)

```bash
# Clone the repository
git clone https://github.com/htrap1211/GraphX-OSINT.git
cd GraphX-OSINT

# Create environment file
cp backend/.env.example backend/.env

# Edit the .env file with your settings
nano backend/.env

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# Neo4j Browser: http://localhost:7474
```

### Using Docker Hub Images

```bash
# Pull images
docker pull ghcr.io/htrap1211/graphx-osint-backend:latest
docker pull ghcr.io/htrap1211/graphx-osint-frontend:latest

# Run backend
docker run -d \
  -p 8000:8000 \
  -e NEO4J_URI=neo4j://neo4j:7687 \
  -e NEO4J_USER=neo4j \
  -e NEO4J_PASSWORD=your_password \
  -e REDIS_URL=redis://redis:6379 \
  ghcr.io/htrap1211/graphx-osint-backend:latest

# Run frontend
docker run -d \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://localhost:8000 \
  ghcr.io/htrap1211/graphx-osint-frontend:latest
```

---

## Cloud Platform Deployment

### AWS (EC2 + ECS)

1. **Launch EC2 Instance:**
   - Ubuntu 22.04 LTS
   - t3.medium or larger
   - Open ports: 22, 80, 443, 3000, 8000

2. **Install Docker:**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker ubuntu
   ```

3. **Deploy with Docker Compose:**
   ```bash
   git clone https://github.com/htrap1211/GraphX-OSINT.git
   cd GraphX-OSINT
   docker-compose up -d
   ```

4. **Set up Nginx reverse proxy** (optional but recommended)

### Google Cloud Platform (Cloud Run)

1. **Build and push images:**
   ```bash
   gcloud builds submit --tag gcr.io/PROJECT_ID/graphx-backend ./backend
   gcloud builds submit --tag gcr.io/PROJECT_ID/graphx-frontend ./frontend
   ```

2. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy graphx-backend \
     --image gcr.io/PROJECT_ID/graphx-backend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated

   gcloud run deploy graphx-frontend \
     --image gcr.io/PROJECT_ID/graphx-frontend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

### DigitalOcean (App Platform)

1. Connect your GitHub repository
2. Select "Docker Compose" as deployment method
3. Configure environment variables
4. Deploy!

---

## Manual Deployment

### Backend (Python/FastAPI)

```bash
# Install Python 3.11+
sudo apt update
sudo apt install python3.11 python3-pip

# Clone and setup
git clone https://github.com/htrap1211/GraphX-OSINT.git
cd GraphX-OSINT/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export NEO4J_URI=neo4j://localhost:7687
export NEO4J_USER=neo4j
export NEO4J_PASSWORD=your_password
export REDIS_URL=redis://localhost:6379
export SECRET_KEY=your_secret_key

# Run with Gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000

# Or use systemd service (recommended)
sudo nano /etc/systemd/system/graphx-backend.service
```

### Frontend (Next.js)

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs

# Setup frontend
cd GraphX-OSINT/frontend
npm install

# Build for production
npm run build

# Run with PM2
npm install -g pm2
pm2 start npm --name "graphx-frontend" -- start
pm2 save
pm2 startup
```

---

## Environment Variables Reference

### Backend (.env)
```bash
# Neo4j Configuration
NEO4J_URI=neo4j://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_secure_password

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Security
SECRET_KEY=your_very_long_random_secret_key_here

# Optional: Celery Configuration
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
# or for production:
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## Post-Deployment Checklist

- [ ] All services are running
- [ ] Neo4j database is accessible
- [ ] Redis is connected
- [ ] Backend API responds at `/health`
- [ ] Frontend loads correctly
- [ ] Can create a new investigation
- [ ] Graph visualization works
- [ ] API keys can be saved
- [ ] Case management functions
- [ ] PDF reports generate

---

## Monitoring & Maintenance

### Health Checks
```bash
# Backend health
curl http://your-backend-url/health

# Check Neo4j
curl http://localhost:7474

# Check Redis
redis-cli ping
```

### Logs
```bash
# Docker logs
docker-compose logs -f backend
docker-compose logs -f frontend

# System logs
journalctl -u graphx-backend -f
journalctl -u graphx-frontend -f
```

### Backup Neo4j Database
```bash
docker exec neo4j neo4j-admin dump --database=neo4j --to=/backups/neo4j-backup.dump
```

---

## Troubleshooting

### Backend won't start
- Check Neo4j connection
- Verify Redis is running
- Check environment variables
- Review logs: `docker-compose logs backend`

### Frontend can't connect to backend
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check CORS settings in backend
- Ensure backend is accessible from frontend

### Graph not loading
- Check browser console for errors
- Verify Neo4j has data
- Check network tab for API calls

---

## Security Recommendations

1. **Use HTTPS** - Set up SSL certificates (Let's Encrypt)
2. **Firewall** - Only expose necessary ports
3. **Strong passwords** - For Neo4j and Redis
4. **Environment variables** - Never commit secrets
5. **Regular updates** - Keep dependencies updated
6. **Rate limiting** - Implement API rate limits
7. **Monitoring** - Set up error tracking (Sentry)

---

## Support

- **Issues:** https://github.com/htrap1211/GraphX-OSINT/issues
- **Discussions:** https://github.com/htrap1211/GraphX-OSINT/discussions
- **Email:** htrap1211@gmail.com

---

## License

MIT License - See LICENSE file for details
