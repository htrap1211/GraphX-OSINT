# 🛠️ Setup Guide - OSINT Intelligence Graph Explorer

Complete installation and configuration guide.

## 📋 Prerequisites

### Required Software
- **Docker** (20.10+) and **Docker Compose** (2.0+)
- **Node.js** (18+) and **npm** (9+)
- **Python** (3.11+) and **pip**
- **Git**

### System Requirements
- **RAM**: 4GB minimum, 8GB recommended
- **Disk**: 5GB free space
- **OS**: Linux, macOS, or Windows with WSL2

## 🚀 Installation

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/osint-graph-explorer.git
cd osint-graph-explorer
```

### 2. Start Infrastructure Services

Start Neo4j and Redis using Docker Compose:
```bash
docker-compose up -d
```

Verify services are running:
```bash
docker-compose ps
```

You should see:
- `osint-neo4j` - Up
- `osint-redis` - Up

**Access Neo4j Browser**: http://localhost:7474
- Username: `neo4j`
- Password: `osintpassword`

### 3. Backend Setup

#### Install Python Dependencies
```bash
cd backend
pip install -r requirements.txt
```

#### Configure Environment (Optional)
Create `backend/.env` file:
```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=osintpassword
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key-change-in-production
```

#### Start Backend Server
```bash
uvicorn app.main:app --reload
```

Backend will run on http://localhost:8000

Verify: http://localhost:8000 should return `{"status": "online"}`

### 4. Start Celery Worker

In a new terminal:
```bash
cd backend
celery -A app.celery_app worker --loglevel=info
```

You should see:
```
[tasks]
  . enrich_entity

celery@hostname ready.
```

### 5. Frontend Setup

#### Install Node Dependencies
```bash
cd frontend
npm install
```

#### Configure Environment (Optional)
Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### Start Development Server
```bash
npm run dev
```

Frontend will run on http://localhost:3000

### 6. Access Application

Open http://localhost:3000

**Default Login:**
- Username: `admin`
- Password: `admin`

## 🔑 API Key Configuration

### Free Providers (No API Key Required)
These work out of the box:
- ✅ DNS lookups
- ✅ WHOIS data
- ✅ GeoIP location

### Providers Requiring API Keys

#### 1. Hunter.io (Email Verification)
**Free Tier**: 50 requests/month

1. Sign up: https://hunter.io/users/sign_up
2. Get API key: https://hunter.io/api_keys
3. Add to Settings page in app

**What it provides:**
- Email deliverability scores
- Email verification status
- Domain email discovery

#### 2. VirusTotal (Malware & Reputation)
**Free Tier**: 500 requests/day

1. Sign up: https://www.virustotal.com/gui/join-us
2. Get API key: https://www.virustotal.com/gui/user/[username]/apikey
3. Add to Settings page

**What it provides:**
- Domain/IP reputation scores
- Malware detection
- Security vendor analysis

#### 3. URLScan.io (Website Analysis)
**Free Tier**: Unlimited public scans

1. Sign up: https://urlscan.io/user/signup
2. Get API key: https://urlscan.io/user/profile/
3. Add to Settings page

**What it provides:**
- Website screenshots
- Technology detection
- Malicious content analysis

#### 4. AlienVault OTX (Threat Intelligence)
**Free Tier**: Unlimited

1. Sign up: https://otx.alienvault.com/accounts/signup/
2. Get API key: https://otx.alienvault.com/api
3. Add to Settings page

**What it provides:**
- Threat intelligence pulses
- Malware indicators
- Attack patterns

#### 5. Shodan (Port Scanning)
**Paid**: $59/month or $5 for 100 queries

1. Sign up: https://account.shodan.io/register
2. Get API key: https://account.shodan.io/
3. Add to Settings page

**What it provides:**
- Open ports and services
- Vulnerabilities
- Device information

#### 6. Have I Been Pwned (Breach Data)
**Paid**: $3.50/month

1. Sign up: https://haveibeenpwned.com/API/Key
2. Get API key after payment
3. Add to Settings page

**What it provides:**
- Email breach history
- Compromised passwords
- Data exposure details

### Adding API Keys

**Method 1: Via Settings Page (Recommended)**
1. Login to application
2. Click "Settings" in top navigation
3. Enter API keys for each provider
4. Click "Save Settings"

**Method 2: Via Environment Variables**
Edit `backend/.env`:
```env
HUNTER_API_KEY=your_hunter_key
VIRUSTOTAL_API_KEY=your_vt_key
URLSCAN_API_KEY=your_urlscan_key
ALIENVAULT_API_KEY=your_otx_key
SHODAN_API_KEY=your_shodan_key
HIBP_API_KEY=your_hibp_key
```

Restart backend after changes.

## 🧪 Testing

### Test Backend
```bash
curl http://localhost:8000
# Should return: {"status":"online"}
```

### Test Neo4j Connection
```bash
curl http://localhost:7474
# Should return Neo4j browser HTML
```

### Test Worker
Check worker terminal for:
```
celery@hostname ready.
```

### Run Test Lookup
1. Go to http://localhost:3000
2. Enter: `8.8.8.8` (Google DNS)
3. Select "IP Address"
4. Click "Start Investigation"
5. Watch graph build with GeoIP data

## 🐛 Troubleshooting

### Backend Won't Start

**Error**: `ModuleNotFoundError`
```bash
cd backend
pip install -r requirements.txt
```

**Error**: `Connection refused` (Neo4j)
```bash
docker-compose up -d
docker-compose ps  # Verify neo4j is running
```

### Worker Won't Start

**Error**: `Cannot connect to Redis`
```bash
docker-compose ps  # Verify redis is running
docker-compose restart redis
```

**Error**: `celery: command not found`
```bash
pip install celery redis
```

### Frontend Won't Start

**Error**: `Module not found`
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Error**: `Port 3000 already in use`
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
# Or use different port
npm run dev -- -p 3001
```

### No Data Showing

**Issue**: Enrichment completes but no data displays

1. Check worker logs for errors
2. Verify API keys are correct
3. Check Neo4j browser: http://localhost:7474
4. Run query: `MATCH (n) RETURN n LIMIT 25`
5. If no nodes, enrichment failed - check worker logs

### API Key Issues

**Error**: `401 Unauthorized` or `403 Forbidden`

1. Verify API key is correct (no extra spaces)
2. Check provider's rate limits
3. Verify account is active
4. Try regenerating API key

## 🔄 Updating

### Update Code
```bash
git pull origin main
```

### Update Backend Dependencies
```bash
cd backend
pip install -r requirements.txt --upgrade
```

### Update Frontend Dependencies
```bash
cd frontend
npm install
```

### Update Docker Images
```bash
docker-compose pull
docker-compose up -d
```

## 🗑️ Cleanup

### Stop Services
```bash
docker-compose down
```

### Remove All Data
```bash
docker-compose down -v  # Removes volumes (Neo4j data)
```

### Reset Neo4j Database
```bash
# Connect to Neo4j browser: http://localhost:7474
# Run: MATCH (n) DETACH DELETE n
```

## 🚀 Production Deployment

### Environment Variables
Set these in production:
```env
# Backend
SECRET_KEY=generate-strong-random-key
NEO4J_URI=bolt://your-neo4j-host:7687
NEO4J_PASSWORD=strong-password
REDIS_URL=redis://your-redis-host:6379

# Frontend
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

### Security Checklist
- [ ] Change default Neo4j password
- [ ] Generate strong SECRET_KEY
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Set up firewall rules
- [ ] Enable Neo4j authentication
- [ ] Use environment variables for secrets
- [ ] Set up backup for Neo4j
- [ ] Configure rate limiting
- [ ] Enable logging and monitoring

### Recommended Platforms
- **Railway**: Easy deployment, free tier
- **Render**: Good for full-stack apps
- **DigitalOcean**: App Platform or Droplets
- **AWS**: ECS + RDS + ElastiCache
- **Heroku**: Simple but more expensive

## 📚 Additional Resources

### Documentation
- FastAPI: https://fastapi.tiangolo.com/
- Next.js: https://nextjs.org/docs
- Neo4j: https://neo4j.com/docs/
- Celery: https://docs.celeryproject.org/

### OSINT Resources
- OSINT Framework: https://osintframework.com/
- Awesome OSINT: https://github.com/jivoi/awesome-osint

## 💡 Tips

1. **Start Small**: Test with free providers first (DNS, WHOIS, GeoIP)
2. **API Keys**: Add them gradually as you need more data
3. **Rate Limits**: Be aware of provider rate limits
4. **Data Storage**: Neo4j data persists in Docker volumes
5. **Performance**: More workers = faster enrichment (but more resources)

## 🆘 Getting Help

If you encounter issues:
1. Check logs: `docker-compose logs`
2. Check worker logs in terminal
3. Check backend logs in terminal
4. Open an issue on GitHub with error details

---

**Ready to investigate!** 🔍
