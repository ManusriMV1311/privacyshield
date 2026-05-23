# PrivacyShield — Universal Adaptive Media Protection Framework

PrivacyShield is a cross-platform privacy middleware framework designed to reduce unauthorized media capture, duplication, and redistribution across digital platforms. It operates as an invisible, adaptive privacy enforcement layer between the end-user and digital content.

This repository contains the architecture, implementation plans, and codebase for the PrivacyShield **Minimum Viable Product (MVP)**.

---

## 🛡️ Project Overview

PrivacyShield combines dynamic watermarking, overlay-based protection, screenshot and visibility monitoring, and adaptive blur rendering into a single, cohesive framework. 

### Core MVP Deliverables
1. **Chrome Extension (Manifest V3)**: Real-time overlay injector, dynamic canvas watermark renderer, and event detection.
2. **Backend API (Node.js / Express / Prisma / PostgreSQL)**: Session state tracking, behavioral telemetry logging, and security event processing.
3. **Admin Dashboard (React / TS / TailwindCSS)**: Analytics monitoring, risk scoring visualizations, and real-time security alerts.

For full architectural blueprints, API specs, and setup instructions, explore the `docs/` directory.

---

## 📁 Repository Structure

```text
privacyshield/
├── extension/             # Chrome Extension (Manifest V3) sources
│   ├── public/            # Static assets (icons, manifests)
│   └── src/
│       ├── background/    # Service worker (auth and backend gateway)
│       ├── content/       # Content scripts (Shadow DOM overlay, event hooks)
│       ├── popup/         # Extension popups
│       └── utils/         # Base64 encodings, canvas helpers
├── backend/               # Express + Prisma REST API Backend
│   ├── prisma/            # Database schemas & migrations
│   ├── src/
│   │   ├── controllers/   # Route handlers
│   │   ├── middleware/    # Auth, validation, rate limiting
│   │   ├── routes/        # Router bindings
│   │   └── services/      # Business logic & risk evaluation
│   ├── Dockerfile
│   └── package.json
├── dashboard/             # React Admin Panel (Vite + TailwindCSS)
│   ├── src/
│   │   ├── components/    # Reusable UI widgets
│   │   ├── pages/         # Dashboard, Events, Policies, Analytics
│   │   └── services/      # API integrations
│   ├── Dockerfile
│   └── package.json
├── shared/                # Shared TS type definitions & schemas
├── docs/                  # Detailed architectural blueprints
│   ├── architecture.md    # High-level and component designs
│   ├── api.md             # REST API specifications
│   ├── setup.md           # Getting started and containerization
│   └── roadmap.md         # MVP timeline and deliverables
├── scripts/               # Seeding, utility, and build scripts
└── docker-compose.yml     # Orchestrates Dev environment (DB + Redis + API)
```

---

## ⚡ Quick Start (Development)

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or later
- [Docker](https://www.docker.com/) and Docker Compose
- Google Chrome (for Extension validation)

### 1. Spin up Infrastructure
Run the database and cache layers:
```bash
docker compose up -d postgres redis
```

### 2. Configure & Run Backend
Navigate to the backend, run migrations, and start the development server:
```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

### 3. Build & Load Chrome Extension
Assemble the extension files:
```bash
cd ../extension
npm install
npm run build
```
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `privacyshield/extension/dist` folder.

### 4. Run Admin Dashboard
Start the React application:
```bash
cd ../dashboard
npm install
npm run dev
```

---

## 📖 In-Depth Documentation

- 📐 **[System Architecture](docs/architecture.md)** — Core mechanics, overlay sandboxing, and behavior loops.
- 📡 **[API Specification](docs/api.md)** — HTTP requests, payloads, and JWT verification.
- 🛠️ **[Installation & Run Guide](docs/setup.md)** — Step-by-step local provisioning.
- 📅 **[MVP Development Roadmap](docs/roadmap.md)** — Weekly milestones and release targets.

---

## ⚖️ License & Boundaries
PrivacyShield operates at the software application layer. It is designed to act as a **deterrent and audit tool**, rather than a hardware-level DRM replacement. It does not prevent external physical photography of screens, but embeds forensic markers to trace leaked visual assets back to their originating sessions.
