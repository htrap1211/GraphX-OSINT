# 🚀 Deploy GraphX-OSINT Now (100% Free)

Follow these steps to deploy your OSINT platform completely free in 30 minutes!

---

## 📋 What You'll Set Up

```
✅ Neo4j Aura    - Database (200k nodes free)
✅ Upstash       - Redis (10k commands/day free)
✅ Fly.io        - Backend API (3 VMs free)
✅ Vercel        - Frontend (unlimited free)

Total Cost: $0/month forever
```

---

## Step 1: Neo4j Aura (Database) - 5 minutes

### 1.1 Create Account
1. Go to: https://neo4j.com/cloud/aura-free/
2. Click "Start Free"
3. Sign up with email or Google

### 1.2 Create Database
1. Click "Create Database"
2. Choose "AuraDB Free"
3. Name: `graphx-osint`
4. Region: Choose closest to you
5. Click "Create"

### 1.3 Save Credentials
**IMPORTANT:** Save these immediately (shown only once):
```
Connection URI: neo4j+s://xxxxx.databases.neo4j.io
Username: neo4j
Password: [generated password]
```

**Save to a text file:**
```bash
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_generated_password
```

### 1.4 Wait for Database
- Status will change from "Creating" to "Running" (~2 minutes)
- Green checkmark means ready!

✅ **Neo4j Aura Complete!**

---

## Step 2: Upstash (Redis) - 3 minutes

### 2.1 Create Account
1. Go to: https://upstash.com
2. Click "Sign Up"
3. Sign up with GitHub (easiest)

### 2.2 Create Redis Database
1. Click "Create Database"
2. Name: `graphx-redis`
3. Type: Regional
4. Region: Choose same as Neo4j
5. Click "Create"

### 2.3 Get Connection URL
1. Click on your database
2. Scroll to "REST API" section
3. Copy "UPSTASH_REDIS_REST_URL"

**Save to your text file:**
```bash
REDIS_URL=https://xxxxx.upstash.io
```

✅ **Upstash Complete!**

---

## Step 3: Fly.io (Backend) - 10 minutes

### 3.1 Install Fly CLI

**On macOS:**
```bash
brew install flyctl
```

**On Linux/WSL:**
```bash
curl -L https://fly.io/install.sh | sh
```

**On Windows:**
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

### 3.2 Login to Fly.io
```bash
flyctl auth login
```
- Browser will open
- Sign up with GitHub (free)
- Authorize Fly.io

### 3.3 Navigate to Backend
```bash
cd backend
```

### 3.4 Create Fly App
```bash
flyctl launch --name graphx-osint-backend --region iad --no-deploy
```

**Questions it will ask:**
- "Would you like to copy its configuration?" → **No**
- "Would you like to set up a Postgresql database?" → **No**
- "Would you like to set up an Upstash Redis database?" → **No**

### 3.5 Set Environment Variables

**Replace with YOUR credentials from Steps 1 & 2:**
```bash
flyctl secrets set \
  NEO4J_URI="neo4j+s://xxxxx.databases.neo4j.io" \
  NEO4J_USER="neo4j" \
  NEO4J_PASSWORD="your_neo4j_password" \
  REDIS_URL="https://xxxxx.upstash.io" \
  SECRET_KEY="$(openssl rand -hex 32)"
```

### 3.6 Deploy Backend
```bash
flyctl deploy
```

**This will:**
- Build Docker image (~3 minutes)
- Deploy to Fly.io
- Start your backend

### 3.7 Get Backend URL
```bash
flyctl info
```

**Look for "Hostname":**
```
Hostname = graphx-osint-backend.fly.dev
```

**Save this URL:**
```bash
BACKEND_URL=https://graphx-osint-backend.fly.dev
```

### 3.8 Test Backend
```bash
curl https://graphx-osint-backend.fly.dev/health
```

**Should return:**
```json
{"status":"healthy"}
```

✅ **Backend Deployed!**

---

## Step 4: Vercel (Frontend) - 5 minutes

### 4.1 Install Vercel CLI
```bash
npm install -g vercel
```

### 4.2 Login to Vercel
```bash
vercel login
```
- Enter your email
- Click verification link
- Or sign up with GitHub

### 4.3 Navigate to Frontend
```bash
cd ../frontend
```

### 4.4 Create Production Environment File
```bash
echo "NEXT_PUBLIC_API_URL=https://graphx-osint-backend.fly.dev" > .env.production
```

**Replace with YOUR backend URL from Step 3.7**

### 4.5 Deploy to Vercel
```bash
vercel --prod
```

**Questions it will ask:**
- "Set up and deploy?" → **Yes**
- "Which scope?" → Choose your account
- "Link to existing project?" → **No**
- "What's your project's name?" → `graphx-osint` (or press Enter)
- "In which directory is your code located?" → Press Enter (current directory)
- "Want to override the settings?" → **No**

**Deployment will:**
- Build Next.js app (~2 minutes)
- Deploy to Vercel
- Give you a URL

### 4.6 Get Frontend URL
**Vercel will show:**
```
✅ Production: https://graphx-osint.vercel.app
```

**Save this URL!**

✅ **Frontend Deployed!**

---

## Step 5: Test Your Deployment - 2 minutes

### 5.1 Open Your App
```bash
open https://graphx-osint.vercel.app
```

Or visit the URL in your browser.

### 5.2 Login
- Enter any name and email
- Click "Continue"

### 5.3 Configure API Keys (Optional)
- Go to Settings
- Add your OSINT API keys
- Or skip for now (DNS, WHOIS, GeoIP work without keys)

### 5.4 Start Investigation
1. Go back to home
2. Enter an email, domain, or IP
3. Click "Start Investigation"
4. Watch the graph build!

✅ **Everything Working!**

---

## 🎉 You're Live!

Your OSINT platform is now running at:
- **Frontend:** https://graphx-osint.vercel.app
- **Backend:** https://graphx-osint-backend.fly.dev
- **Cost:** $0/month

---

## 📊 Monitor Your Services

### Fly.io Dashboard
```bash
flyctl dashboard
```
Or visit: https://fly.io/dashboard

**Check:**
- App status
- Logs: `flyctl logs`
- Metrics: `flyctl status`

### Vercel Dashboard
Visit: https://vercel.com/dashboard

**Check:**
- Deployments
- Analytics
- Logs

### Neo4j Aura
Visit: https://console.neo4j.io

**Check:**
- Database status
- Node count
- Query performance

### Upstash
Visit: https://console.upstash.com

**Check:**
- Command count
- Memory usage
- Latency

---

## 🔧 Useful Commands

### Update Backend
```bash
cd backend
flyctl deploy
```

### Update Frontend
```bash
cd frontend
vercel --prod
```

### View Backend Logs
```bash
flyctl logs -a graphx-osint-backend
```

### SSH into Backend
```bash
flyctl ssh console -a graphx-osint-backend
```

### Scale Backend (if needed)
```bash
flyctl scale count 2  # Add more VMs
```

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check logs
flyctl logs -a graphx-osint-backend

# Check secrets
flyctl secrets list -a graphx-osint-backend

# Restart app
flyctl apps restart graphx-osint-backend
```

### Frontend can't connect to backend
1. Check `NEXT_PUBLIC_API_URL` in Vercel dashboard
2. Verify backend is running: `flyctl status`
3. Test backend directly: `curl https://graphx-osint-backend.fly.dev/health`

### Database connection issues
1. Check Neo4j Aura is running
2. Verify credentials in Fly.io secrets
3. Test connection from backend logs

### Redis connection issues
1. Check Upstash dashboard
2. Verify REDIS_URL in Fly.io secrets
3. Check command count (10k/day limit)

---

## 🚀 Next Steps

### 1. Custom Domain (Optional)
**Vercel:**
```bash
vercel domains add yourdomain.com
```

**Fly.io:**
```bash
flyctl certs add yourdomain.com
```

### 2. Add to GitHub README
Update your README with live demo link:
```markdown
## 🌐 Live Demo
Try it now: https://graphx-osint.vercel.app
```

### 3. Share Your Project
- Post on Twitter
- Share on Reddit r/OSINT
- Submit to Product Hunt
- Write a blog post

### 4. Monitor Usage
- Check Fly.io metrics weekly
- Monitor Neo4j node count
- Watch Upstash command usage
- Review Vercel analytics

---

## 💡 Tips for Free Tier

### Stay Within Limits
- **Neo4j:** 200k nodes (plenty for OSINT)
- **Upstash:** 10k commands/day (optimize queries)
- **Fly.io:** 3 VMs with 256MB (auto-scales)
- **Vercel:** Unlimited (no worries!)

### Optimize Performance
1. **Cache aggressively** - Reduce database queries
2. **Batch operations** - Group Redis commands
3. **Efficient queries** - Optimize Neo4j Cypher
4. **Auto-stop** - Fly.io stops when idle (saves resources)

### Monitor Costs
```bash
# Fly.io usage
flyctl status

# Check if you're still on free tier
flyctl dashboard
```

---

## 📞 Need Help?

### Fly.io Support
- Docs: https://fly.io/docs
- Community: https://community.fly.io

### Vercel Support
- Docs: https://vercel.com/docs
- Discord: https://vercel.com/discord

### Neo4j Support
- Docs: https://neo4j.com/docs
- Community: https://community.neo4j.com

### Upstash Support
- Docs: https://docs.upstash.com
- Discord: https://upstash.com/discord

---

## 🎊 Congratulations!

You've successfully deployed a professional OSINT investigation platform completely free!

**What you've accomplished:**
✅ Full-stack application deployed
✅ Graph database running
✅ Redis caching enabled
✅ Global CDN for frontend
✅ Automatic HTTPS
✅ Auto-scaling infrastructure
✅ Professional monitoring
✅ Zero monthly cost

**Now go investigate! 🔍**

---

## 📝 Quick Reference

### Your URLs
```
Frontend:  https://graphx-osint.vercel.app
Backend:   https://graphx-osint-backend.fly.dev
Neo4j:     https://console.neo4j.io
Upstash:   https://console.upstash.com
```

### Your Credentials
```
Neo4j:
  URI: neo4j+s://xxxxx.databases.neo4j.io
  User: neo4j
  Password: [your password]

Redis:
  URL: https://xxxxx.upstash.io

Fly.io:
  App: graphx-osint-backend
  Region: iad

Vercel:
  Project: graphx-osint
  URL: https://graphx-osint.vercel.app
```

### Quick Commands
```bash
# Deploy backend
cd backend && flyctl deploy

# Deploy frontend
cd frontend && vercel --prod

# View logs
flyctl logs -a graphx-osint-backend

# Check status
flyctl status -a graphx-osint-backend
```

---

**Happy investigating! 🎉**
