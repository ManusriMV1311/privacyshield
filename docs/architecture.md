# PrivacyShield — Architecture Blueprint

This document details the high-level architecture, module designs, data flows, and security paradigms for the PrivacyShield Universal Adaptive Media Protection Framework (MVP).

---

## 📐 1. System Overview

PrivacyShield is a modular middleware framework that enforces visual media protection at the render layer. It decouples protection rules from direct content delivery systems, enabling universal integration.

### High-Level Architecture Diagram

```text
       +-------------------------------------------------------------+
       |                         BROWSER CLIENT                      |
       |                                                             |
       |  +--------------------------+    +-----------------------+  |
       |  |       Host Page          |    |   PrivacyShield Ext   |  |
       |  |  (LMS, Enterprise Portal)|    |      (Shadow DOM)     |  |
       |  |                          |    |                       |  |
       |  |  +--------------------+  |    |  +-----------------+  |  |
       |  |  | Protected Content  |  |    |  | Dynamic Canvas  |  |  |
       |  |  | (Images, Text, PDF)|  |    |  | Watermark Layer |  |  |
       |  |  +---------+----------+  |    |  +--------+--------+  |  |
       |  +------------|-------------+    +-----------|-----------+  |
       |               | (DOM Capture Intercepted)    |              |
       |               +-----------------------------+               |
       |                                                             |
       +------------------------------|------------------------------+
                                      | Secure Message Tunnel
                                      v (WS / Async HTTPS)
       +-------------------------------------------------------------+
       |                       BACKEND API                           |
       |                                                             |
       |  +--------------------+  +-------------------------------+  |
       |  | Express Router     |  |  Risk Scoring Service         |  |
       |  |  & Middlewares     |  |  - Weighting & Decay          |  |
       |  +---------+----------+  |  - Multiplier Logic           |  |
       |            |             +---------------+---------------+  |
       |            v                             v                  |
       |    [ Prisma Client ]             [ Redis Cache ]            |
       |            |                             |                  |
       |            v                             v                  |
       |   +--------+--------+            +-------+-------+          |
       |   | PostgreSQL DB   |            | Session State |          |
       |   +-----------------+            +---------------+          |
       +-------------------------------------------------------------+
```

---

## 🧩 2. Core Modules & Interactions

### 2.1 Browser Extension Architecture (Manifest V3)
The Chrome Extension operates through isolated scopes to ensure visual integrity and prevent target scripts from disabling security policies.

```text
+-------------------------------------------------------------------------------+
| Chrome Extension Sandbox                                                      |
|                                                                               |
|  +------------------------+      Message       +---------------------------+  |
|  | Content Script         |    Tunnelling      | Background Service Worker |  |
|  | - Shadow DOM injection | <================> | - Coordinates Auth Tokens |  |
|  | - Watermark rendering  |                    | - Event API proxy         |  |
|  | - Blur DOM overlay     |                    | - Keeps Session Alive     |  |
|  | - Event Listener hooks |                    +-------------+-------------+  |
|  +------------------------+                                  |                |
+--------------------------------------------------------------|----------------+
                                                               | API requests
                                                               v
                                                      +------------------+
                                                      |  Express API     |
                                                      +------------------+
```

#### Client Component Breakdown:
*   **Shadow DOM Overlay Layer**: Overlays are injected within a private Shadow DOM root (`mode: 'closed'`). This prevents standard DOM scripts running on the host page from using `document.querySelector` or global CSS rules to hide, modify, or strip the protective layers.
*   **Dynamic Canvas Watermarking**: Operates inside an `OffscreenCanvas` inside web workers (or lightweight canvas loops) to render rotating user-identifiable metadata tiles.
*   **Telemetry Event Collector**: Captures keystrokes (such as `PrintScreen`, `Cmd+Shift+4`), document visibility updates (`visibilitychange`), and focus losses (`blur`).

---

## 🔄 3. Key Process Flows

### 3.1 Session Lifecycle

```text
[ User ]        [ Host Page ]       [ Extension ]        [ Backend API ]        [ Database ]
   |                  |                   |                     |                    |
   |-- 1. Logs in --->|                   |                     |                    |
   |                  |-- 2. Init Ext --->|                     |                    |
   |                  |   (Send Metadata) |-- 3. StartSession ->|                    |
   |                  |                   |   (UserHash, IP, FP)|-- 4. Create Rec -->|
   |                  |                   |<-- 5. Session JWT --|                    |
   |                  |<-- 6. Confirms ---|   & WatermarkConfig |                    |
   |                  |   Session Active  |                     |                    |
   |<-- 7. View ------|                   |                     |                    |
   |   Content        |-- 8. Render ----->|                     |                    |
   |                  |   Overlay Layer   |                     |                    |
```

### 3.2 Detection & Blur Response Loop
When a risk event is detected, the extension reacts instantly (under 50ms) to protect the media, while asynchronously reporting to the backend server.

```text
[ User Keyboard ] =======> ( Intercept PrintScreen )
                                 |
                                 v
                       +-------------------+
                       | Content Script    | (Enforce Level 3 Action)
                       | - Blur Container  | ===> [ Renders host content blurry ]
                       | - Show Alert View |
                       +---------+---------+
                                 |
                        (Async Msg Tunnel)
                                 v
                       +-------------------+
                       | Background Worker |
                       +---------+---------+
                                 |
                         (POST /events/log)
                                 v
                       +-------------------+
                       | Express Backend   |
                       | - Record Event    | ===> Write Event in DB
                       | - Eval Risk Score | ===> Read/Write Redis Cache
                       +---------+---------+
                                 |
                       (Push WS Notification)
                                 v
                       +-------------------+
                       | Admin Dashboard   | ===> [ Alerts Dashboard Live Feed ]
                       +-------------------+
```

---

## 🔒 4. Security & Threat Modeling

PrivacyShield relies on multiple defensive boundaries to counter bypasses:

### 4.1 Content Manipulation Defenses
*   **CSS Style Overrides**: To combat CSS-level tampering (e.g., changing opacity or display properties on the overlay elements), styles are embedded directly inside the Shadow DOM with critical `!important` attributes.
*   **DOM Mutation Monitoring**: A background `MutationObserver` actively watches the Shadow root for changes. If the host page attempts to remove elements, clear attributes, or toggle visibility, the overlay immediately self-heals by re-injecting elements or blurs the content layer completely.

### 4.2 Security Analysis (STRIDE Matrix)

| Threat | Target | MVP Mitigations |
| :--- | :--- | :--- |
| **Spoofing** | API Requests | JWT session tokens bind the transaction with a hashed **Device Fingerprint**. Sessions cannot be hijacked from separate machines. |
| **Tampering** | Overlay DOM Elements | Contained entirely within a closed Shadow DOM, defended by dynamic `MutationObservers` which enforce hard self-healing loops. |
| **Repudiation** | Logging Pipeline | Secure audit logging tracking events, linked with cryptographically signed watermarks, establishing a strict chain of evidence. |
| **Information Disclosure** | Media Extraction | Event detection intercepts clipboard transfers and screenshots, locking down visual rendering immediately by utilizing CSS blur. |
| **Denial of Service** | Session/Telemetry | Rate limiting middleware limits spam requests on API Gateway; Redis caches ephemeral scores. |
| **Elevation of Privilege** | Dashboard Controls | Express RBAC (Role-Based Access Control) filters all administrative actions strictly via backend validation checks. |

---

## 🧠 5. Risk Assessment Engine

The behavior risk score dynamically shifts the system between protection levels:

```text
  Event Input             Risk Weight          Decay Modifier         Updated Score
+--------------+        +-------------+        +-------------+        +-------------+
| Screen Capture| =====> |    +25      | =====> |  t-seconds  | =====> | Current     |
| Vis Loss     | =====> |    +5       |        |  since last |        | Risk: 0-100 |
| Fast Scroll  | =====> |    +10      |        |  action     |        +------+------+
+--------------+        +-------------+        +-------------+               |
                                                                             v
                                                                    [ Escalation Rules ]
                                                                    - Score > 40: Level 2
                                                                    - Score > 70: Level 3
                                                                    - Score > 90: Level 4
```

### Protection Level Enforcements:
1.  **Level 1 (Baseline)**: Dynamic watermarking (low opacity, standard rotation), behavioral telemetry logging.
2.  **Level 2 (Elevated)**: Increased watermark opacity (+5%), periodic dynamic layout repositioning, heightened logging intervals.
3.  **Level 3 (Active Threat)**: Viewport content blurs heavily (`filter: blur(12px)`), display overlay alerts, immediately submit alert logs.
4.  **Level 4 (Session Suspended)**: Viewport permanently locked. User session is flagged as `suspended` in database and requires manual administrator override.
