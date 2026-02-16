# 🚀 دليل النشر الشامل - نظام إدارة التنظيف Hostaway

## 📋 نظرة عامة

تم إنشاء نظام متكامل جاهز للعمل يتضمن:

### ✅ ما تم إنجازه

#### Backend (الخادم الخلفي)
- ✅ 7 خدمات Microservices كاملة
- ✅ Database Schema كامل (PostgreSQL)
- ✅ Authentication System (JWT)
- ✅ Hostaway API Integration
- ✅ Task Management System
- ✅ Worker Management
- ✅ Notification System
- ✅ Analytics Service
- ✅ Redis Caching
- ✅ Background Workers

#### Frontend Admin Dashboard
- ✅ هيكل المشروع كامل
- ✅ React Setup
- ✅ API Integration
- ✅ Authentication Flow
- ✅ Routing Configuration

#### Documentation
- ✅ README شامل
- ✅ API Documentation
- ✅ Database Schema
- ✅ Docker Setup
- ✅ Environment Configuration

---

## 🎯 الخطوات السريعة للتشغيل

### الطريقة 1: باستخدام Docker (الأسهل)

```bash
# 1. انتقل إلى مجلد المشروع
cd hostaway-system

# 2. شغّل PostgreSQL و Redis
docker-compose up -d

# 3. انتظر 10 ثواني لبدء الخدمات
sleep 10

# 4. ثبّت وشغّل Backend
cd backend
npm install
cp .env.example .env
# عدّل ملف .env وأضف معلومات Hostaway API
npm run migrate
npm run seed
npm start

# 5. في نافذة طرفية جديدة - شغّل Frontend
cd ../frontend-admin
npm install
npm run dev
```

### الطريقة 2: تثبيت يدوي

إذا كنت تملك PostgreSQL و Redis مثبتين مسبقاً:

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env

# 2. عدّل .env واضبط:
#    - DATABASE_URL
#    - REDIS_URL
#    - JWT_SECRET
#    - معلومات Hostaway API

# 3. إنشاء قاعدة البيانات
npm run migrate
npm run seed

# 4. تشغيل
npm start

# 5. Frontend (في نافذة جديدة)
cd ../frontend-admin
npm install
npm run dev
```

---

## 🔧 إعداد حسابات Hostaway

في ملف `backend/.env`، أضف معلومات حساباتك:

```env
# حساب 1
HOSTAWAY_ACCOUNT_1_ID=account_1
HOSTAWAY_ACCOUNT_1_NAME=اسم الحساب الأول
HOSTAWAY_ACCOUNT_1_API_KEY=your_actual_api_key_here
HOSTAWAY_ACCOUNT_1_API_SECRET=your_actual_api_secret_here

# حساب 2
HOSTAWAY_ACCOUNT_2_ID=account_2
HOSTAWAY_ACCOUNT_2_NAME=اسم الحساب الثاني
HOSTAWAY_ACCOUNT_2_API_KEY=your_actual_api_key_here
HOSTAWAY_ACCOUNT_2_API_SECRET=your_actual_api_secret_here

# ... أضف المزيد حتى 15 حساب
```

### الحصول على API Keys من Hostaway

1. سجل دخول على: https://dashboard.hostaway.com
2. اذهب إلى Settings → API Keys
3. أنشئ API Key جديد
4. انسخ API Key و API Secret

---

## 🔑 معلومات الدخول الافتراضية

بعد تشغيل `npm run seed`:

### Admin Dashboard
```
Email: admin@example.com
Password: admin123
URL: http://localhost:3001
```

### عمال التنظيف (للتطبيق)
```
Email: ahmad@example.com, sara@example.com, mahmoud@example.com, fatima@example.com
Password: worker123
```

---

## 📡 API Endpoints

### Authentication
```
POST /api/auth/login/admin
POST /api/auth/login/worker
POST /api/auth/register/worker
POST /api/auth/refresh
POST /api/auth/logout
```

### Accounts
```
GET  /api/accounts              # قائمة جميع الحسابات
POST /api/accounts/sync         # مزامنة مع Hostaway
```

### Bookings
```
GET /api/bookings?accountId=&propertyId=&startDate=&endDate=
```

### Tasks
```
GET  /api/tasks                 # قائمة المهام
GET  /api/tasks/:id             # تفاصيل مهمة
PUT  /api/tasks/:id/assign      # تعيين عامل
PUT  /api/tasks/:id/start       # بدء المهمة
PUT  /api/tasks/:id/complete    # إنهاء المهمة
PUT  /api/tasks/:id/checklist/:itemId  # تحديث checklist
```

### Workers
```
GET /api/workers                # قائمة العمال
GET /api/workers/me             # معلومات العامل الحالي
```

### Analytics
```
GET /api/analytics/overview     # إحصائيات عامة
```

---

## 🗄️ Database Schema

### الجداول الرئيسية

#### accounts
```sql
- id (UUID)
- name (VARCHAR)
- hostaway_account_id (VARCHAR)
- api_key (TEXT)
- status (VARCHAR)
```

#### properties
```sql
- id (UUID)
- account_id (UUID FK)
- hostaway_listing_id (VARCHAR)
- name, address, city
- bedrooms, bathrooms
- estimated_cleaning_time
```

#### bookings
```sql
- id (UUID)
- account_id, property_id (FK)
- check_in, check_out
- guest_name, guest_email, guest_phone
```

#### cleaning_tasks
```sql
- id (UUID)
- booking_id, property_id, worker_id (FK)
- scheduled_time
- status (pending/assigned/in_progress/completed)
- priority
```

#### workers
```sql
- id (UUID)
- name, email, phone
- rating, total_tasks, completed_tasks
- availability (JSONB)
```

---

## 🔄 المزامنة التلقائية

النظام يقوم بـ:

1. **مزامنة تلقائية كل 30 دقيقة** مع جميع حسابات Hostaway
2. **إنشاء مهام تنظيف تلقائية** عند وصول حجوزات جديدة
3. **إرسال إشعارات تلقائية** للعمال قبل:
   - 24 ساعة من المهمة
   - 2 ساعة من المهمة
   - 30 دقيقة من المهمة

---

## 🔔 نظام الإشعارات

### أنواع الإشعارات

1. **Push Notifications** (عبر Firebase)
2. **SMS** (عبر Twilio - للحالات العاجلة)
3. **In-App** (داخل التطبيق)

### إعداد Firebase (للإشعارات)

1. أنشئ مشروع في Firebase Console
2. احصل على Server Key
3. أضفه في `.env`:
   ```env
   FCM_SERVER_KEY=your_firebase_server_key
   ```

### إعداد Twilio (للـ SMS)

1. أنشئ حساب على Twilio.com
2. احصل على Account SID و Auth Token
3. أضفهم في `.env`:
   ```env
   TWILIO_ACCOUNT_SID=your_sid
   TWILIO_AUTH_TOKEN=your_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

---

## 🚀 النشر على الإنتاج

### خيار 1: AWS (موصى به)

#### متطلبات AWS:
- RDS PostgreSQL
- ElastiCache Redis
- ECS Fargate (للـ Backend)
- S3 (للملفات الثابتة)
- ALB (Load Balancer)
- CloudWatch (المراقبة)

#### الخطوات:
```bash
# 1. إنشاء Docker Image
docker build -t hostaway-backend ./backend

# 2. رفع إلى ECR
aws ecr get-login-password | docker login --username AWS --password-stdin
docker tag hostaway-backend:latest [ECR_URL]
docker push [ECR_URL]

# 3. تحديث ECS Service
aws ecs update-service --cluster hostaway --service api --force-new-deployment
```

### خيار 2: Heroku (سريع)

```bash
# Backend
cd backend
heroku create hostaway-backend
heroku addons:create heroku-postgresql:hobby-dev
heroku addons:create heroku-redis:hobby-dev
git push heroku main

# Frontend
cd frontend-admin
npm run build
# نشر المجلد build على Netlify أو Vercel
```

---

## 📊 المراقبة والصيانة

### Logs
```bash
# Backend logs
tail -f backend/logs/combined.log

# Error logs only
tail -f backend/logs/error.log
```

### Database Backup
```bash
# Backup
pg_dump hostaway_cleaning > backup_$(date +%Y%m%d).sql

# Restore
psql hostaway_cleaning < backup_20260216.sql
```

### Redis Monitoring
```bash
redis-cli INFO
redis-cli MONITOR
```

---

## 🐛 Troubleshooting

### المشكلة: لا يتصل بقاعدة البيانات
```bash
# تحقق من أن PostgreSQL يعمل
docker ps | grep postgres

# أو
sudo systemctl status postgresql
```

### المشكلة: Hostaway API لا تعمل
```bash
# تحقق من API Keys في .env
# جرب الاتصال يدوياً:
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.hostaway.com/v1/listings
```

### المشكلة: الإشعارات لا تصل
```bash
# تحقق من Redis
redis-cli ping

# تحقق من worker
npm run worker
```

---

## 💡 نصائح مهمة

### الأمان
- ✅ غيّر JWT_SECRET في الإنتاج
- ✅ استخدم HTTPS دائماً
- ✅ فعّل Rate Limiting
- ✅ احفظ API Keys بشكل آمن

### الأداء
- ✅ استخدم Redis للـ caching
- ✅ فعّل Database Indexes
- ✅ استخدم Connection Pooling
- ✅ راقب الأداء عبر CloudWatch

### التطوير المستقبلي
- 📱 تطبيق React Native للعمال
- 📊 تقارير متقدمة
- 🗓️ تكامل مع Google Calendar
- 💬 WhatsApp Integration
- 🎯 ML لتحسين تعيين المهام

---

## 📞 الدعم والمساعدة

إذا واجهت أي مشاكل:

1. راجع ملف `README.md`
2. تحقق من `logs/error.log`
3. جرّب إعادة تشغيل الخدمات
4. تحقق من `docker-compose logs`

---

## ✅ Checklist قبل الإطلاق

- [ ] تحديث معلومات Hostaway API
- [ ] تغيير كلمات المرور الافتراضية
- [ ] إعداد Firebase للإشعارات
- [ ] إعداد Twilio للـ SMS
- [ ] إعداد النسخ الاحتياطي التلقائي
- [ ] تفعيل HTTPS
- [ ] إعداد المراقبة (Monitoring)
- [ ] اختبار جميع المزايا

---

## 🎉 تهانينا!

النظام جاهز للعمل! 🚀

الآن يمكنك:
- ✅ إدارة 6-15 حساب Hostaway من مكان واحد
- ✅ تعيين مهام التنظيف تلقائياً
- ✅ إرسال إشعارات للعمال
- ✅ متابعة الأداء والإحصائيات

**وقت التطوير الفعلي: اكتمل! ✨**
