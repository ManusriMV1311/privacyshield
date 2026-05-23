# PrivacyShield — Installation & Run Guide

Follow these instructions to provision and execute the PrivacyShield framework locally across all individual MVP target directories.

---

## 📋 1. Prerequisites

Ensure you have the following system applications installed before proceeding:
*   [Node.js](https://nodejs.org/) (v18.x or later recommended)
*   [npm](https://www.npmjs.com/) (installed alongside Node)
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) (contains Docker Compose)
*   [Google Chrome](https://www.google.com/chrome/) (required to validate Manifest V3 extensions)

---

## 🐋 2. Infrastructure Setup (Docker)

We utilize Docker Compose to provision infrastructure services, including our primary relational database (PostgreSQL) and session caching cluster (Redis).

1.  From the project root repository, start the containers in detached mode:
    ```bash
    docker compose up -d
    ```
2.  Verify the containers are healthy and running:
    ```bash
    docker compose ps
    ```
    *Expect to see ports `5432` (PostgreSQL) and `6379` (Redis) listening on localhost.*

---

## 📡 3. Backend Service Setup

The backend uses a Node.js + Express framework and Prisma ORM to connect to the PostgreSQL database.

1.  Navigate into the backend project directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure local environment configurations. Create a `.env` file within the directory:
    ```env
    PORT=5000
    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/privacyshield?schema=public"
    REDIS_URL="redis://localhost:6379"
    JWT_SECRET="super-secret-dev-key-change-in-production"
    ```
4.  Execute Prisma database migrations to create tables and indexes:
    ```bash
    npx prisma migrate dev --name init
    ```
5.  *(Optional)* Seed initial databases:
    ```bash
    npm run seed
    ```
6.  Launch the backend service:
    ```bash
    npm run dev
    ```
    *The API will start running at `http://localhost:5000`.*

---

## 🔌 4. Chrome Extension Build

The client extension compiles using TypeScript and must be loaded into Google Chrome.

1.  Open a new terminal window and navigate into the extension folder:
    ```bash
    cd extension
    ```
2.  Install development dependencies:
    ```bash
    npm install
    ```
3.  Build the extension bundle:
    ```bash
    npm run build
    ```
    *This generates output files under the `extension/dist` folder structure.*

### Loading Extension into Google Chrome:
1.  Open Chrome and navigate to `chrome://extensions/`.
2.  Enable **Developer mode** via the toggle switch in the top-right corner.
3.  Click the **Load unpacked** button located in the top-left section.
4.  Browse and select the compiled directory: `privacyshield/extension/dist`.
5.  Verify the PrivacyShield extension card appears in the manager.

---

## 🖥️ 5. Admin Dashboard Launch

The management console runs as a standalone single page web application powered by React, TypeScript, and TailwindCSS.

1.  Navigate to the dashboard directory:
    ```bash
    cd dashboard
    ```
2.  Install UI packages:
    ```bash
    npm install
    ```
3.  Launch the Vite development server:
    ```bash
    npm run dev
    ```
4.  Open your browser and navigate to `http://localhost:5173`.
5.  Use seed credentials to log in:
    *   **Email**: `admin@privacyshield.network`
    *   **Password**: `AdminPassword123`

---

## 🧪 6. End-to-End Verification Checklist

1.  Verify the Chrome extension popup shows an **"Active & Connected"** state when landing on target pages.
2.  Verify the content script injects the diagonal watermark successfully across target body sections.
3.  Simulate a security breach. Hit `PrintScreen` (Windows) or open Developer Tools (`F12`).
    *   Observe: The content blurs immediately (`filter: blur(12px)`).
    *   Observe: A warning overlay is visible inside the browser window.
4.  Open the Admin Dashboard, log in, and view the **Live Threat Feed**.
    *   Check: Verify the logged event shows up instantly in the UI with correct severity tags.
