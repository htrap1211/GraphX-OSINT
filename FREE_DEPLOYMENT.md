# 🆓 Free Deployment Guide for GraphX-OSINT

Deploy your OSINT platform completely free using this guide!

## 🎯 Recommended Free Stack

```
Frontend:  Vercel (Free Forever)
Backend:   Fly.io (Free Tier)
Neo4j:     Neo4j Aura (Free Tier)
Redis:     Upstash (Free Tier)
```

**Total Monthly Cost: $0** ✨

---

## 📋 Step-by-Step Free Deployment

### Step 1: Deploy Neo4j Database (Free)

**Neo4j Aura Free Tier:**
- 200,000 nodes
- 400,000 relationships
- Perfect for OSINT investigations

**Setup:**
1. Go to https://neo4j.com/cloud/aura-free/
2. Sign up for free account
3. Create new database
4. Save credentials:
   ```
   NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your_password
   ```

---

### Step 2: Deploy Redis (Free)

**Upstash Redis Free Tier:**
- 10,000 commands per day
- 256MB storage
- Global edge network

**Setup:**
1. Go to https://upstash.com
2. Sign up with GitHub
3. Create Redis database
4. Copy connection string:
   ```
   REDIS_URL=rediss://default:xxxxx@xxxxx.upstash.io:6379
   ```

---

### Step 3: Deploy Backend on Fly.io (Free)

**Fly.io Free Tier:**
- 3 shared VMs (256MB each)
- 3GB storage
- 160GB bandwidth

**Setup:**
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Navigate to backend
cd backend

# Launch app
flyctl launch --name graphx-osint-backend --region iad

# Set environment variables
flyctl secrets set NEO4J_URI="neo4j+s://xxxxx.databases.neo4j.io"
flyctl secrets set NEO4J_USER="neo4j"
flyctl secrets set NEO4J_PASSWORD="your_password"
flyctl secrets set REDIS_URL="rediss://default:xxxxx@xxxxx.upstash.io:6379"
flyctl secrets set SECRET_KEY="$(openssl rand -hex 32)"

# Deploy
flyctl deploy

# Get URL
flyctl info
# Save this URL: https://graphx-osint-backend.fly.dev
```

---

### Step 4: Deploy Frontend on Vercel (Free)

**Vercel Free Tier:**
- Unlimited bandwidth
- Automatic HTTPS
- Global CDN
- 100GB bandwidth

**Setup:**
```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend
cd frontend

# Login
vercel login

# Set environment variable
echo "NEXT_PUBLIC_API_URL=https://graphx-osint-backend.fly.dev" > .env.production

# Deploy
vercel --prod

# Your app is live!
# URL: https://graphx-osint.vercel.app
```

**Or use Vercel Dashboard:**
1. Go to https://vercel.com
2. Import GitHub repository
3. Set root directory: `frontend`
4. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = `https://graphx-osint-backend.fly.dev`
5. Deploy!

---

## 🔄 Alternative: All on Fly.io

Deploy everything on Fly.io (still free):

```bash
# Backend
cd backend
flyctl launch --name graphx-osint-backend
flyctl deploy

# Frontend
cd ../frontend
flyctl launch --name graphx-osint-frontend
flyctl deploy

# Redis on Fly.io
flyctl redis create --name graphx-redis

# Still use Neo4j Aura for database
```

---

## 🚀 Alternative Free Platforms

### Option 1: Koyeb (Free)

**Free Tier:**
- 1 web service
- 512MB RAM
- Automatic HTTPS

**Deploy:**
1. Go to https://koyeb.com
2. Connect GitHub
3. Select repository
4. Choose service (backend or frontend)
5. Deploy!

**Note:** Only 1 free service, so deploy backend on Koyeb and frontend on Vercel

---

### Option 2: Railway ($5 free credits)

**Almost Free:**
- $5 free credits per month
- All services in one place
- Uses ~$3-5/month

**Deploy:**
1. Go to https://railway.app
2. Connect GitHub
3. Deploy all services
4. Add Neo4j and Redis from Railway
5. Done!

**Pros:** Easiest setup, everything included
**Cons:** Not completely free (but $5 credit covers it)

---

### Option 3: Cyclic.sh (Free)

**Free Tier:**
- Unlimited apps
- Serverless
- Free DynamoDB

**Note:** Better for Node.js, requires backend adaptation

---

## 📊 Free Tier Comparison

| Platform | Backend | Frontend | Database | Redis | Total Cost |
|----------|---------|----------|----------|-------|------------|
| **Fly.io + Vercel** | ✅ Free | ✅ Free | Aura Free | Upstash Free | **$0** |
| **Railway** | ✅ $5 credit | ✅ $5 credit | ✅ $5 credit | ✅ $5 credit | **~$3-5/mo** |
| **Koyeb + Vercel** | ✅ Free | ✅ Free | Aura Free | Upstash Free | **$0** |
| **Render** | ❌ Used | ❌ | ❌ | ❌ | N/A |

---

## 🎯 Recommended Setup (100% Free)

```
┌─────────────────────────────────────────┐
│  Frontend: Vercel                       │
│  - Free forever                         │
│  - Global CDN                           │
│  - Automatic HTTPS                      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Backend: Fly.io                        │
│  - 3 free VMs                           │
│  - 256MB RAM each                       │
│  - Auto-scaling                         │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Neo4j: Aura Free                       │
│  - 200k nodes                           │
│  - 400k relationships                   │
│  - Managed service                      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Redis: Upstash Free                    │
│  - 10k commands/day                     │
│  - 256MB storage                        │
│  - Global edge                          │
└─────────────────────────────────────────┘
```

---

## 🛠️ Quick Deploy Script

Save this as `deploy-free.sh`:

```bash
#!/bin/bash

echo "🚀 Deploying GraphX-OSINT (Free Tier)"
echo "======================================"

# Deploy Backend to Fly.io
echo "📦 Deploying backend to Fly.io..."
cd backend
flyctl launch --name graphx-osint-backend --region iad --no-deploy
flyctl secrets set \
  NEO4J_URI="$NEO4J_URI" \
  NEO4J_USER="$NEO4J_USER" \
  NEO4J_PASSWORD="$NEO4J_PASSWORD" \
  REDIS_URL="$REDIS_URL" \
  SECRET_KEY="$(openssl rand -hex 32)"
flyctl deploy
BACKEND_URL=$(flyctl info --json | jq -r '.Hostname')

# Deploy Frontend to Vercel
echo "🎨 Deploying frontend to Vercel..."
cd ../frontend
echo "NEXT_PUBLIC_API_URL=https://$BACKEND_URL" > .env.production
vercel --prod

echo "✅ Deployment complete!"
echo "Backend: https://$BACKEND_URL"
echo "Frontend: Check Vercel output above"
```

---

## 📝 Environment Variables Checklist

### Backend (Fly.io)
```bash
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
REDIS_URL=rediss://default:xxxxx@xxxxx.upstash.io:6379
SECRET_KEY=your_random_secret_key
```

### Frontend (Vercel)
```bash
NEXT_PUBLIC_API_URL=https://graphx-osint-backend.fly.dev
```

---

## 🔍 Monitoring Your Free Tier Usage

### Fly.io
```bash
flyctl status
flyctl logs
flyctl scale show
```

### Vercel
- Dashboard: https://vercel.com/dashboard
- Analytics included

### Neo4j Aura
- Dashboard: https://console.neo4j.io
- Monitor node count

### Upstash
- Dashboard: https://console.upstash.com
- Monitor command usage

---

## 💡 Tips for Staying Free

1. **Optimize Backend:** Use auto-stop on Fly.io
2. **Cache Aggressively:** Reduce database queries
3. **Monitor Usage:** Check dashboards weekly
4. **Efficient Queries:** Optimize Neo4j queries
5. **Rate Limiting:** Prevent abuse

---

## 🆘 Troubleshooting

### Backend won't start on Fly.io
```bash
flyctl logs
flyctl ssh console
```

### Frontend can't connect to backend
- Check CORS settings in backend
- Verify NEXT_PUBLIC_API_URL is correct
- Check Fly.io app is running

### Database connection issues
- Verify Neo4j Aura credentials
- Check IP whitelist (should be 0.0.0.0/0)
- Test connection locally first

---

## 📈 Scaling Beyond Free Tier

When you outgrow free tier:

1. **Fly.io:** Add more VMs ($1.94/mo per VM)
2. **Vercel:** Pro plan $20/mo (usually not needed)
3. **Neo4j:** Professional $65/mo (50M nodes)
4. **Upstash:** Pay-as-you-go ($0.20 per 100k commands)

---

## 🎉 You're All Set!

Your OSINT platform is now running completely free with:
- ✅ Professional infrastructure
- ✅ Global CDN
- ✅ Automatic HTTPS
- ✅ Auto-scaling
- ✅ Managed databases
- ✅ Zero monthly cost

**Total Setup Time:** ~30 minutes
**Monthly Cost:** $0

Enjoy your free OSINT platform! 🔍
