# نظام معلومات الدراسات العليا (PG-SIS)
## Postgraduate Student Information System

### مرحباً بك في نظام معلومات طلاب الدراسات العليا المتكامل لجامعة ليبيا المفتوحة

---

## 📋 نظرة عامة على المشروع

**PG-SIS** هو نظام معلومات شامل ومتكامل لإدارة برامج الماجستير والدكتوراه في جامعة ليبيا المفتوحة، يعتمد على مبدأ **الخدمة الذاتية (Self-Service)** ويوفر أتمتة كاملة لجميع العمليات الأكاديمية والإدارية.

### الميزات الرئيسية:
- ✅ **21 وحدة وظيفية** متكاملة
- ✅ **بوابات متخصصة** للطلاب والأساتذة والموظفين والمديرين
- ✅ **نظام إدارة التعلم (LMS)** يدعم النماذج المرنة والمتزامنة
- ✅ **تتبع متقدم** للحضور والغياب والنشاطات
- ✅ **أمان عالي** مع RBAC و MFA و Encryption
- ✅ **توافق كامل** مع لائحة جامعة ليبيا المفتوحة (القرار 595/2023)
- ✅ **واجهات عربية** وسهلة الاستخدام
- ✅ **تقارير وتحليلات** متقدمة

---

## 🏗️ البنية المعمارية

```
PG-SIS
├── Backend (Node.js + Express + TypeScript)
│   ├── API Gateway
│   ├── Microservices
│   ├── Database Layer
│   └── Security & Auth
├── Frontend (React + TypeScript)
│   ├── Student Portal
│   ├── Faculty Portal
│   ├── Admin Portals
│   └── LMS Interface
├── Database (PostgreSQL)
├── DevOps (Docker + GitHub Actions)
└── Documentation
```

---

## 🎯 الوحدات الوظيفية (21 وحدة)

### المرحلة الأولى (الأساسية):
1. **SS** - بوابة الطالب للخدمة الذاتية
2. **FA** - بوابة أعضاء هيئة التدريس
3. **PC** - وحدة منسقي البرامج
4. **CM** - نظام إدارة اللجان
5. **AR** - السجلات الأكاديمية والتقدم
6. **TD** - إدارة الرسائل والأطروحات
7. **CR** - إدارة المقررات
8. **DM** - إدارة المخالفات والعقوبات
9. **RA** - التقارير والتحليلات

### المرحلة الثانية (الإدارة):
10. **RG** - عميد شؤون التسجيل
11. **AD** - إدارة القبول
12. **REG** - إدارة التسجيل
13. **GR** - إدارة الخريجين
14. **PG-ADMIN** - إدارة الدراسات العليا
15. **FA-ADMIN** - إدارة أعضاء هيئة التدريس
16. **SE** - إدارة الدراسة والامتحانات
17. **FIN** - الإدارة المالية
18. **ITS** - تقنية المعلومات والدعم الفني
19. **QA** - إدارة ضمان الجودة والاعتماد
20. **LMS** - نظام إدارة التعلم (مع تتبع الحضور)

---

## 🚀 البدء السريع

### المتطلبات الأساسية:
- Node.js 18+
- PostgreSQL 14+
- Docker & Docker Compose
- Git

### التثبيت:

```bash
# استنساخ المستودع
git clone https://github.com/room1-cyber/sis1.git
cd sis1

# تثبيت المتطلبات
npm install

# إعداد متغيرات البيئة
cp .env.example .env

# تشغيل قاعدة البيانات
docker-compose up -d

# تشغيل الخادم
npm run dev
```

---

## 📁 هيكل المشروع

```
sis1/
├── apps/
│   ├── backend/          # Node.js + Express API
│   │   ├── src/
│   │   │   ├── modules/  # الوحدات الوظيفية
│   │   │   ├── services/
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   ├── utils/
│   │   │   └── config/
│   │   ├── tests/
│   │   └── package.json
│   │
│   └── frontend/         # React + TypeScript UI
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── services/
│       │   └── context/
│       ├── public/
│       └── package.json
│
├── db/
│   ├── migrations/
│   ├── seeds/
│   └── schema.sql
│
├── docs/
│   ├── API.md
│   ├── Database.md
│   ├── Architecture.md
│   └── User_Guide.md
│
├── .github/
│   └── workflows/        # CI/CD
│
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

---

## 🔐 المتطلبات الأمنية

- ✅ MFA (Multi-Factor Authentication)
- ✅ RBAC (Role-Based Access Control)
- ✅ Encryption (AES-256 + TLS 1.3)
- ✅ Audit Logging
- ✅ Session Management
- ✅ Security Headers

---

## 📊 معايير النجاح

- ✅ توفر 99.9% خلال أوقات الذروة
- ✅ تحميل الصفحات < 3 ثواني
- ✅ دعم 5,000+ مستخدم متزامن
- ✅ توافق 100% مع اللائحة الداخلية
- ✅ تقارير دقيقة وفورية

---

## 📞 الدعم والمساعدة

- 📧 البريد الإلكتروني: support@lis.ly
- 🔧 نظام التذاكر: GitHub Issues
- 💬 الدردشة: قدم طلب دعم فني

---

## 📜 الترخيص

جميع الحقوق محفوظة © 2026 جامعة ليبيا المفتوحة

---

## 🤝 المساهمة

نرحب بمساهماتكم! يرجى اتباع التعليمات في [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📅 خريطة الطريق

| المرحلة | الفترة الزمنية | الوحدات |
|--------|---------------|--------|
| Phase 1 | الأسبوع 1-4 | SS, FA, PC, AR, CR |
| Phase 2 | الأسبوع 5-8 | TD, DM, RA, LMS |
| Phase 3 | الأسبوع 9-12 | RG, AD, REG, GR |
| Phase 4 | الأسبوع 13-16 | PG-ADMIN, FA-ADMIN, SE, FIN |
| Phase 5 | الأسبوع 17-20 | ITS, QA, CM, Integration |

---

**آخر تحديث:** 10 يونيو 2026
