#!/bin/bash

echo "🚀 Starting OSINT Intelligence Graph Explorer..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start infrastructure
echo "📦 Starting Neo4j and Redis..."
docker-compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if backend dependencies are installed
if [ ! -d "backend/venv" ]; then
    echo "📦 Setting up Python virtual environment..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
fi

# Create .env file if it doesn't exist
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating backend .env file..."
    cp backend/.env.example backend/.env
fi

# Start Celery worker
echo "🔧 Starting Celery worker..."
cd backend
source venv/bin/activate
celery -A app.celery_app worker --loglevel=info &
CELERY_PID=$!
cd ..

# Start FastAPI backend
echo "🔧 Starting FastAPI backend..."
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

# Start Next.js frontend
echo "🎨 Starting Next.js frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ All services started!"
echo ""
echo "📍 Services:"
echo "   - Neo4j Browser: http://localhost:7474 (neo4j/osintpassword)"
echo "   - Backend API: http://localhost:8000"
echo "   - Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for Ctrl+C
trap "echo ''; echo '🛑 Stopping services...'; kill $CELERY_PID $BACKEND_PID $FRONTEND_PID; docker-compose down; echo '✅ All services stopped'; exit" INT
wait
