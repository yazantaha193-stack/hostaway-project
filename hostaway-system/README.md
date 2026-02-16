# 🏢 Hostaway Cleaning Management System

نظام إدارة متكامل لعمليات التنظيف عبر حسابات Hostaway متعددة (6-15 حساب)

## 📋 المكونات

### Backend Services
- ✅ Authentication Service (JWT-based)
- ✅ Hostaway Connector Service  
- ✅ Booking Management
- ✅ Cleaning Tasks Service
- ✅ Workers Management
- ✅ Notifications Service
- ✅ Analytics Service

### Frontend Applications
- ✅ Admin Dashboard (React)
- ✅ Worker Mobile App (React Native)

### Infrastructure
- PostgreSQL Database
- Redis Cache
- Message Queue (Bull)
- AWS/Cloud Ready

## 🚀 Quick Start

### Prerequisites
```bash
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker (optional)
```

### Installation

#### 1. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
npm install
npm run migrate
npm start
```

#### 2. Admin Dashboard
```bash
cd frontend-admin
npm install
npm run dev
```

#### 3. Worker App
```bash
cd frontend-worker
npm install
npm run android  # or npm run ios
```

## ⚙️ Configuration

### Environment Variables (.env)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/hostaway_cleaning
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_secret_key

# Hostaway Accounts (add up to 15)
HOSTAWAY_ACCOUNT_1_ID=account_1
HOSTAWAY_ACCOUNT_1_NAME=عقارات النخيل
HOSTAWAY_ACCOUNT_1_API_KEY=your_api_key
```

## 📊 Database Schema

### Core Tables
- `accounts` - Hostaway accounts
- `properties` - Properties from Hostaway
- `bookings` - Reservations
- `cleaning_tasks` - Cleaning assignments
- `workers` - Cleaning staff
- `notifications` - Push/SMS notifications

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login/admin` - Admin login
- `POST /api/auth/login/worker` - Worker login
- `POST /api/auth/register/worker` - Worker registration
- `POST /api/auth/refresh` - Refresh token

### Accounts
- `GET /api/accounts` - Get all accounts
- `POST /api/accounts/sync` - Sync with Hostaway

### Tasks
- `GET /api/tasks` - Get tasks (with filters)
- `PUT /api/tasks/:id/assign` - Assign worker
- `PUT /api/tasks/:id/start` - Start task
- `PUT /api/tasks/:id/complete` - Complete task

### Workers
- `GET /api/workers` - Get all workers
- `GET /api/workers/me` - Get current worker

### Analytics
- `GET /api/analytics/overview` - Dashboard stats

## 🎯 Key Features

### Admin Dashboard
- 🔄 Quick switch between 6-15 Hostaway accounts
- 📅 Unified view of all bookings
- ✅ Task assignment and tracking
- 👥 Worker management
- 📊 Analytics and reports

### Worker App
- 📱 Simple, easy-to-use mobile interface
- 🔔 Automatic push notifications
- ✅ Task checklists
- ⏱️ Time tracking
- 📍 Navigation to properties

### Automation
- 🤖 Auto-create cleaning tasks from bookings
- ⏰ Smart notification scheduling
- 🔄 Continuous Hostaway sync
- 📈 Performance analytics

## 🔐 Security

- JWT-based authentication
- Bcrypt password hashing
- Rate limiting
- CORS protection
- Helmet.js security headers
- Encrypted API keys storage

## 📱 Technology Stack

### Backend
- Node.js + Express
- PostgreSQL
- Redis
- Bull (job queue)
- JWT
- Winston (logging)

### Frontend
- React 18
- Tailwind CSS
- React Query
- Zustand
- Recharts

### Mobile
- React Native
- Firebase Cloud Messaging
- React Navigation

## 🚀 Deployment

### Docker Deployment
```bash
docker-compose up -d
```

### AWS Deployment
1. Setup RDS (PostgreSQL)
2. Setup ElastiCache (Redis)
3. Deploy to ECS Fargate
4. Configure ALB
5. Setup CloudWatch monitoring

## 📈 Scaling

System designed to handle:
- ✅ 15+ Hostaway accounts
- ✅ 1000+ properties
- ✅ 10,000+ bookings/month
- ✅ 50+ concurrent workers
- ✅ 99.9% uptime

## 💰 Cost Estimate

### Development
- AWS: $150-250/month
- Third-party: $20-30/month

### Production
- AWS: $300-500/month
- Third-party: $50-100/month

## 📞 Support

For issues or questions:
1. Check documentation in `/docs`
2. Review API examples in `/examples`
3. Check logs in `/logs` directory

## 📝 License

Private - All rights reserved

## 🙏 Credits

Built with ❤️ for efficient cleaning management
