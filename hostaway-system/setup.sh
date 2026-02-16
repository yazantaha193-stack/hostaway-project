#!/bin/bash
echo "🚀 Setting up Hostaway Cleaning Management System..."

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed."; exit 1; }

echo "✅ Prerequisites check passed"

# Start Docker services
echo "🐳 Starting PostgreSQL and Redis..."
docker-compose up -d

# Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 10

# Setup backend
echo "📦 Installing backend dependencies..."
cd backend
npm install

echo "🗄️  Initializing database..."
cp .env.example .env
echo "⚠️  Please edit backend/.env with your configuration"
echo "Press Enter when ready..."
read

npm run migrate

echo "✅ Backend setup complete!"

# Setup frontend
cd ../frontend-admin
echo "📦 Installing frontend dependencies..."
npm install

echo "✅ Frontend setup complete!"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start the system:"
echo "  1. Terminal 1: cd backend && npm start"
echo "  2. Terminal 2: cd frontend-admin && npm run dev"
echo ""
echo "Admin Dashboard will be available at: http://localhost:3001"
echo "Backend API will be available at: http://localhost:3000"
