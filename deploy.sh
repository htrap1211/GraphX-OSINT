#!/bin/bash

# GraphX-OSINT Deployment Script
# This script helps you deploy GraphX-OSINT quickly

set -e

echo "🔍 GraphX-OSINT Deployment Helper"
echo "=================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Create .env file if it doesn't exist
if [ ! -f backend/.env ]; then
    echo "📝 Creating backend/.env file..."
    cp backend/.env.example backend/.env
    
    # Generate random secret key
    SECRET_KEY=$(openssl rand -hex 32)
    sed -i.bak "s/your_secret_key_here/$SECRET_KEY/" backend/.env
    rm backend/.env.bak 2>/dev/null || true
    
    echo "✅ Created backend/.env with random SECRET_KEY"
else
    echo "✅ backend/.env already exists"
fi

# Create frontend .env.local if it doesn't exist
if [ ! -f frontend/.env.local ]; then
    echo "📝 Creating frontend/.env.local..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > frontend/.env.local
    echo "✅ Created frontend/.env.local"
else
    echo "✅ frontend/.env.local already exists"
fi

echo ""
echo "🚀 Starting services with Docker Compose..."
echo ""

# Start services
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo ""
    echo "✅ Services are running!"
    echo ""
    echo "📊 Service Status:"
    docker-compose ps
    echo ""
    echo "🌐 Access your application:"
    echo "   Frontend:     http://localhost:3000"
    echo "   Backend API:  http://localhost:8000"
    echo "   API Docs:     http://localhost:8000/docs"
    echo "   Neo4j:        http://localhost:7474"
    echo ""
    echo "🔑 Default Neo4j credentials:"
    echo "   Username: neo4j"
    echo "   Password: password"
    echo ""
    echo "📖 Next steps:"
    echo "   1. Open http://localhost:3000 in your browser"
    echo "   2. Login with any email and name"
    echo "   3. Configure API keys in Settings"
    echo "   4. Start your first investigation!"
    echo ""
    echo "📚 Documentation:"
    echo "   Setup Guide:      SETUP.md"
    echo "   Deployment Guide: DEPLOYMENT.md"
    echo "   Publishing Guide: PUBLISHING_GUIDE.md"
    echo ""
    echo "🛑 To stop services: docker-compose down"
    echo "📋 To view logs:     docker-compose logs -f"
else
    echo ""
    echo "❌ Some services failed to start. Check logs:"
    echo "   docker-compose logs"
fi
