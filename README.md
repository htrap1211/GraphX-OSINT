# 🔍 OSINT Intelligence Graph Explorer

A professional OSINT investigation platform that automatically enriches entities using 10+ intelligence sources, visualizes relationships in an interactive graph, and provides case management for organizing investigations.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.11+-blue.svg)
![Next.js](https://img.shields.io/badge/next.js-14-black.svg)
![Neo4j](https://img.shields.io/badge/neo4j-5.x-green.svg)

## 🚀 Quick Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/graphx-osint)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/htrap1211/GraphX-OSINT)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/htrap1211/GraphX-OSINT)

**[📖 Full Deployment Guide](DEPLOYMENT.md)** | **[⚙️ Setup Instructions](SETUP.md)** | **[🎨 UI Enhancements](UI_ENHANCEMENTS.md)**

## ✨ Features

### 🔍 OSINT Intelligence Gathering
- **10+ Provider Integrations**: DNS, WHOIS, GeoIP, Hunter.io, Shodan, VirusTotal, URLScan.io, AlienVault OTX, HIBP, and more
- **Automatic Enrichment**: Parallel data collection from multiple sources
- **Entity Types**: Emails, Domains, IP Addresses, Breaches, Organizations

### 📊 Interactive Graph Visualization
- **Real-time Graph Building**: Watch relationships appear as data is enriched
- **7 Node Types**: Color-coded entities with unique shapes
- **8 Relationship Types**: Visual connections between entities
- **Maltego-Style Pivots**: Right-click to expand and discover related entities

### 🎯 Intelligent Risk Scoring
- **0-100 Risk Scores**: Automated risk assessment for all entities
- **Risk Levels**: LOW, MEDIUM, HIGH with color coding
- **Detailed Factors**: Understand why entities are flagged as risky

### 📁 Case Management
- **Investigation Organization**: Create cases to track related entities
- **Status Tracking**: Open, In Progress, Closed, Archived
- **Priority Levels**: Low, Medium, High, Critical
- **Statistics Dashboard**: Entity breakdown and risk distribution
- **PDF Reports**: Generate professional investigation reports

### 🔧 Investigation Tools
- **Notes & Tags**: Document findings and categorize entities
- **Pivot Actions**: Expand graph to find related infrastructure
- **Search & Filter**: Find entities across investigations
- **Data Export**: JSON and PDF export capabilities

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ and npm
- Python 3.11+

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/osint-graph-explorer.git
cd osint-graph-explorer
```

### 2. Start Infrastructure
```bash
docker-compose up -d
```

This starts:
- Neo4j (ports 7474, 7687)
- Redis (port 6379)

### 3. Start Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend runs on http://localhost:8000

### 4. Start Worker
```bash
cd backend
celery -A app.celery_app worker --loglevel=info
```

### 5. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:3000

### 6. Access Application
Open http://localhost:3000 and login with:
- Username: `admin`
- Password: `admin`

## 📖 Usage

### Basic Investigation Flow

1. **Start Investigation**
   - Enter an email, domain, or IP address
   - Click "Start Investigation"
   - Watch the graph build in real-time

2. **Explore Results**
   - Click nodes to view detailed information
   - Right-click for pivot actions
   - Add notes and tags to entities

3. **Organize with Cases**
   - Create a case for your investigation
   - Add entities from the graph
   - View statistics and risk distribution
   - Generate PDF reports

### API Key Configuration

For full functionality, configure API keys in Settings:

**Free Tier Available:**
- Hunter.io - Email verification
- VirusTotal - Malware scanning
- URLScan.io - Website analysis
- AlienVault OTX - Threat intelligence

**Paid Services:**
- Shodan - Port scanning
- Have I Been Pwned - Breach data

See [SETUP.md](SETUP.md) for detailed API key setup instructions.

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- Next.js 14 (React 18) with TypeScript
- Tailwind CSS for styling
- Cytoscape.js for graph visualization
- React Hot Toast for notifications

**Backend:**
- FastAPI (Python) for REST API
- Neo4j graph database
- Celery + Redis for distributed tasks
- JWT authentication

**OSINT Providers:**
- DNS, WHOIS, GeoIP (free, no API key)
- Hunter.io, Shodan, VirusTotal, URLScan.io, AlienVault OTX (API key required)
- HIBP, LeakCheck, BreachDirectory (breach data)

### System Components

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Next.js   │────▶│   FastAPI   │────▶│   Neo4j     │
│  Frontend   │     │   Backend   │     │  Database   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐     ┌─────────────┐
                    │   Celery    │────▶│    Redis    │
                    │   Workers   │     │   Broker    │
                    └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    OSINT    │
                    │  Providers  │
                    └─────────────┘
```

## 📊 Data Model

### Node Types
- **Email**: Email addresses with breach data
- **Domain**: Domains with DNS, WHOIS, reputation data
- **IP**: IP addresses with geolocation, ports, services
- **Breach**: Data breach information
- **Organization**: Companies, registrars, ISPs
- **Person**: Individuals from WHOIS data
- **Case**: Investigation cases

### Relationships
- `EXPOSED_IN` - Email found in breach
- `RESOLVES_TO` - Domain resolves to IP
- `REGISTERED_WITH` - Domain registered with organization
- `HAS_EMAIL` - Domain has email address
- `HOSTED_BY` - IP hosted by organization
- `CONTAINS` - Case contains entity

## 🔐 Security

- JWT-based authentication
- API key encryption in transit
- Input sanitization
- CORS configuration
- Environment variable configuration
- No sensitive data in logs

## 🛠️ Development

### Project Structure
```
osint-graph-explorer/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── database.py          # Neo4j operations
│   │   ├── providers/           # OSINT providers
│   │   ├── services/            # Business logic
│   │   └── workers/             # Celery tasks
│   └── requirements.txt
├── frontend/
│   ├── app/                     # Next.js pages
│   ├── components/              # React components
│   └── lib/                     # Utilities
└── docker-compose.yml           # Infrastructure
```

### Adding New OSINT Providers

1. Create provider class in `backend/app/providers/`
2. Inherit from `BaseProvider`
3. Implement `enrich()` method
4. Add to enrichment worker
5. Update frontend display logic

Example:
```python
from app.providers.base import BaseProvider

class MyProvider(BaseProvider):
    @property
    def name(self) -> str:
        return "myprovider"
    
    async def enrich(self, query: str, entity_type: str):
        # Your implementation
        return {"success": True, "data": {...}}
```

## 📝 API Documentation

Once running, visit:
- API Docs: http://localhost:8000/docs
- Neo4j Browser: http://localhost:7474

### Key Endpoints

**Investigations:**
- `POST /api/lookup` - Start investigation
- `GET /api/graph/{job_id}` - Get graph data
- `GET /api/jobs` - List investigations

**Cases:**
- `POST /api/cases` - Create case
- `GET /api/cases` - List cases
- `POST /api/cases/{id}/entities` - Add entity to case
- `GET /api/cases/{id}/report` - Generate PDF report

**Notes & Tags:**
- `POST /api/notes` - Add note
- `POST /api/tags` - Add tag
- `GET /api/tags/predefined` - Get predefined tags

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with FastAPI, Next.js, Neo4j, and Celery
- Graph visualization powered by Cytoscape.js
- OSINT data from multiple public and commercial sources

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**⚠️ Disclaimer**: This tool is for legitimate security research and investigations only. Always respect privacy laws and terms of service of data providers. The authors are not responsible for misuse of this software.
