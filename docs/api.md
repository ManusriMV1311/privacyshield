# PrivacyShield — REST API Specifications

This document outlines the REST API routes, parameter definitions, and request/response models used across the PrivacyShield framework.

---

## 📡 Base Endpoint
All API routes are versioned and access is restricted over HTTPS.
```text
https://api.privacyshield.network/api/v1
```

---

## 🔐 1. Authentication Service

### 1.1 User Login
Authenticates an administrator or host platform integration client.

*   **Method**: `POST`
*   **Path**: `/auth/login`
*   **Auth Required**: No

#### Request Payload
```json
{
  "email": "admin@privacyshield.network",
  "password": "SecurePassword123"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjM2JiMTY5Ny1hMTQ5LTQ5M2ItOGMzMC0yZTAwOWRkZWM2MTgiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NDAwMDAwMDB9.hash",
  "user": {
    "id": "c3bb1697-a149-493b-8c30-2e009ddec618",
    "email": "admin@privacyshield.network",
    "role": "admin"
  }
}
```

---

## ⏱️ 2. Session Lifecycle Service

### 2.1 Start Protected Session
Invoked by host systems or the extension background service when accessing protected visuals.

*   **Method**: `POST`
*   **Path**: `/sessions/start`
*   **Auth Required**: Yes (`Bearer <JWT>`)

#### Request Payload
```json
{
  "deviceFp": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "platform": "browser",
  "metadata": {
    "orgId": "550e8400-e29b-41d4-a716-446655440000",
    "contextUrl": "https://university.lms.com/exams/midterm-2025"
  }
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "session": {
    "id": "8fa8d10b-8521-4fa3-9e47-fa28db3e843e",
    "sessionToken": "session_token_signed_string",
    "riskScore": 0,
    "protectionLvl": 1,
    "startedAt": "2025-10-15T09:00:00Z"
  },
  "watermark": {
    "userHash": "a3f8b2c1d9e2f8...hashedUserId",
    "encodedPayload": "eyJVc2VySGFzaCI6ICJhM2Y4YjJjMWQ5ZTJmOCIsICJTZXNzaW9uSWQiOiAiOGZhOGQxMGI..."
  }
}
```

### 2.2 Terminate Active Session
Ends tracking, flushing active state records from memory caches.

*   **Method**: `POST`
*   **Path**: `/sessions/end`
*   **Auth Required**: Yes (`Bearer <JWT>`)

#### Request Payload
```json
{
  "sessionId": "8fa8d10b-8521-4fa3-9e47-fa28db3e843e"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Session terminated successfully.",
  "endedAt": "2025-10-15T09:45:00Z"
}
```

---

## 📈 3. Protection Telemetry & Analytics

### 3.1 Log Protection Event
Called immediately when screenshot attempts, print requests, or visibility events occur.

*   **Method**: `POST`
*   **Path**: `/events/capture`
*   **Auth Required**: Yes (`Bearer <JWT>`)

#### Request Payload
```json
{
  "sessionId": "8fa8d10b-8521-4fa3-9e47-fa28db3e843e",
  "eventType": "screenshot_attempt",
  "severity": 3,
  "metadata": {
    "capturedKeys": ["PrintScreen"],
    "triggerElement": "video#lecturedrive-view"
  }
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "riskScore": 25,
  "protectionLvl": 2,
  "actionEnforced": "intensify_watermark"
}
```

### 3.2 Log Behavioral Telemetry Batch
Transmits periodic client interactions to evaluate potential threat behaviors.

*   **Method**: `POST`
*   **Path**: `/events/behavior`
*   **Auth Required**: Yes (`Bearer <JWT>`)

#### Request Payload
```json
{
  "sessionId": "8fa8d10b-8521-4fa3-9e47-fa28db3e843e",
  "batches": [
    {
      "type": "rapid_scroll",
      "timestamp": "2025-10-15T09:05:10Z",
      "data": { "pixelsPerSecond": 4200 }
    },
    {
      "type": "focus_loss",
      "timestamp": "2025-10-15T09:05:32Z",
      "data": { "lostDurationMs": 4200 }
    }
  ]
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "riskScore": 18,
  "protectionLvl": 1
}
```

---

## 🖥️ 4. Administrator Services

### 4.1 Get Dashboard Analytics Summary
Fetches real-time aggregates for KPIs displayed on the central dashboard feed.

*   **Method**: `GET`
*   **Path**: `/analytics/overview`
*   **Auth Required**: Yes (Bearer, restricted to Admin)

#### Response (200 OK)
```json
{
  "success": true,
  "kpis": {
    "activeSessions": 342,
    "totalEventsToday": 1874,
    "unauthorizedCapturesPrevented": 42,
    "averageRiskScore": 14.2
  },
  "charts": {
    "eventsOverTime": [
      { "hour": "08:00", "count": 120 },
      { "hour": "09:00", "count": 240 }
    ]
  }
}
```

### 4.2 Fetch Security Events (Live Feed)
Paginated log stream, ideal for filtering search requests.

*   **Method**: `GET`
*   **Path**: `/analytics/events?page=1&limit=20&severity=3`
*   **Auth Required**: Yes (Bearer, restricted to Admin)

#### Response (200 OK)
```json
{
  "success": true,
  "total": 42,
  "pages": 3,
  "events": [
    {
      "id": "f5bb1697-e149-493b-8c30-2e009ddff618",
      "sessionId": "8fa8d10b-8521-4fa3-9e47-fa28db3e843e",
      "eventType": "screenshot_attempt",
      "severity": 3,
      "occurredAt": "2025-10-15T09:05:32Z",
      "session": {
        "deviceFp": "e3b0c442...855",
        "ipAddress": "192.168.1.42",
        "user": {
          "email": "student@university.edu"
        }
      }
    }
  ]
}
```
