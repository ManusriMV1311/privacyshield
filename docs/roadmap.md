# PrivacyShield — Development Roadmap

This document maps the implementation schedule, weekly milestones, testing stages, and long-term modular integration objectives for the PrivacyShield project.

---

## 📅 1. MVP Roadmap (6-Week Timeline)

The primary goal of this timeline is to design, code, test, and package the core PrivacyShield MVP deliverables (Extension, Express Backend, and React Dashboard).

```text
  Week 1            Week 2            Week 3            Week 4            Week 5            Week 6
+---------+       +---------+       +---------+       +---------+       +---------+       +---------+
| Env &   | =====>| Core MV3| =====>| Watermk | =====>| API     | =====>| React   | =====>| E2E     |
| DB Init |       | Scripts |       | Canvas  |       | Connect |       | Admin UI|       | Harden  |
+---------+       +---------+       +---------+       +---------+       +---------+       +---------+
```

### Week 1 — Foundation & DB Schema Setup
*   **Deliverables**:
    *   Docker Compose environment (PostgreSQL database, Redis cache).
    *   Prisma schema definitions and initial migrations.
    *   Express.js application scaffold with JWT validation.
*   **Milestones**: Database connection established, initial migration completed.
*   **Testing Stage**: Database connectivity tests, Express API health-check endpoint tests.

### Week 2 — Content Script Injection & Event Interceptors
*   **Deliverables**:
    *   Chrome Extension Manifest V3 configuration.
    *   Closed Shadow DOM container injection sequence.
    *   Content script event interceptors (`PrintScreen` intercept, global `visibilitychange`, `blur` focus events).
*   **Milestones**: Shadow DOM injected cleanly onto target websites without impacting host styles.
*   **Testing Stage**: Manual DOM inspection in DevTools, event capture unit testing.

### Week 3 — Watermark Renderer & Canvas Engine
*   **Deliverables**:
    *   Dynamic Canvas-based watermark generation.
    *   Rotation and low-opacity overlay layers.
    *   Watermark config hydration via backend payload profiles.
*   **Milestones**: Visible semi-opaque watermarks containing session telemetry details.
*   **Testing Stage**: Visual rendering alignment checks across screen resolutions, canvas processing load profiles.

### Week 4 — API Integration & Security State Machine
*   **Deliverables**:
    *   Background Service Worker routing messages from Content Script to Backend APIs.
    *   Secure Session Start (`/sessions/start`) and Session End (`/sessions/end`) integration.
    *   Asynchronous Telemetry Ingestor API (`/events/capture`).
*   **Milestones**: Event detections trigger real-time content blurs and database logs.
*   **Testing Stage**: End-to-End API payload validations, simulated network drop tolerance tests.

### Week 5 — Admin Panel & Live Threat Dashboard
*   **Deliverables**:
    *   React Single Page Application with TailwindCSS layout rules.
    *   Overview statistics panel (Active Sessions, Captured Threat Feeds, Risk Averages).
    *   Interactive Policy Configuration console.
*   **Milestones**: Live threat event logs display dynamically on the dashboard feed.
*   **Testing Stage**: UI layout checks (Firefox/Chrome/Safari compatibility), token refreshing, page navigation.

### Week 6 — Hardening, E2E Testing, and Release
*   **Deliverables**:
    *   MutationObserver validation tests.
    *   Cross-Origin script extraction defense adjustments.
    *   Automated Playwright integration test suite.
*   **Milestones**: MVP fully stable, achieving >70% path coverage.
*   **Testing Stage**: Playwright stress scripts, load limit checks, production package packaging.

---

## 🚀 2. Post-MVP & Future Extensions

PrivacyShield is structurally designed to support subsequent enterprise phases, mobile application overlays, and advanced security logic.

```text
+-----------------------+      +-----------------------+      +-----------------------+
|  Phase 2: Android     | ===> |  Phase 3: AI & ML     | ===> |  Phase 4: Stegano     |
|  Overlay Agent        |      |  Anomaly Detection    |      |  Watermarks           |
+-----------------------+      +-----------------------+      +-----------------------+
```

### 📱 2.1 Android Overlay Agent Integration (Phase 2)
*   **Architecture Path**: Creates a native Kotlin-based Android system background service utilizing `SYSTEM_ALERT_WINDOW` permissions to overlay protection above target media components.
*   **Core Mechanics**:
    *   Enforces `WindowManager.LayoutParams.FLAG_SECURE` strictly during protected activity screens.
    *   Leverages the Android Canvas rendering API to composite identical user-session watermarks.
    *   Integrates Accessibility Service API rules to identify active screen-sharing and third-party overlays.

### 🧠 2.2 AI-Driven Behavioral Anomaly Detection (Phase 3)
*   **Objective**: Replace rigid heuristic scoring rules with a dynamic LSTM-based model to distinguish between normal activity and active data-harvesting strategies.
*   **Core Mechanics**:
    *   Processes batches of telemetry sequences to compute localized anomaly metrics.
    *   Dynamic threshold calibration adapts risk criteria according to individual host environments.
    *   Detects automated browser scrapers via mouse movement curves and scroll irregularities.

### 🕵️ 2.3 Perceptual Steganography & Visual Deterrence (Phase 4)
*   **Objective**: Protect intellectual property from external camera capture.
*   **Core Mechanics**:
    *   Steganographic watermarking embeds invisible identifiers within image pixel data, surviving compression, print-outs, and recapture.
    *   Subtle spatial frequencies (high-contrast moiré patterns) are applied dynamically to degrade visual captures when secondary phone cameras photograph the screen.
