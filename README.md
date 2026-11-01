# Blood_Link
### Location-Based Emergency Blood Donor Discovery and Coordination System
*Final-Year Academic Capstone Project (2026)*

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

---

## 📌 Executive Summary

**Blood_Link** is a mission-critical emergency healthcare platform engineered to bridge the life-threatening delay between acute blood requirement and voluntary donor mobilization. Unlike unverified social media broadcasts that leak private patient details and cause panic, Blood_Link utilizes an **intelligent progressive matching engine (5 km, 10 km, and 25 km tiers)** coupled with **administrative clinical verification** and **strict privacy preservation**.

---

## 🔑 Key Architectural Features

- **Progressive Distance Search Algorithm**:
  - **Tier 1 (0 – 5 km)**: Immediate local donors who can report to the hospital in 15–20 minutes.
  - **Tier 2 (5 – 10 km)**: Metropolitan belt perimeter for high-urgency requests.
  - **Tier 3 (10 – 25 km)**: Extended regional radius for rare blood types (e.g., O-, AB-, B-).
- **Clinical Verification Gate**:
  - Requests enter `PENDING_VERIFICATION` upon submission.
  - Admin verifies hospital admission and component details before broadcasting alerts to prevent false alarms and donor alert fatigue.
- **Transfusion Compatibility Reference**:
  - Automatically matches declared ABO/Rh types and component requirements (Whole Blood, PRBC, Platelets, FFP).
- **Dual-Mode Database Architecture**:
  - **Production Mode**: Full PostgreSQL with PostGIS geospatial indexing support (`schema.sql`).
  - **Development Fallback Mode**: Embedded SQLite WebAssembly with zero C++ compilation dependencies, ensuring instantaneous 100% out-of-the-box demonstration on any machine.
- **Privacy by Design**:
  - Donors' exact home coordinates are masked; only locality name and distance in km are revealed.
- **1-Click Academic Evaluation Mode**:
  - Instant role switcher banner allowing evaluators to switch between **Admin**, **Donor (O+)**, and **Patient Attendant** in one click.

---

## 🧪 Demonstration Accounts & Roles

> [!NOTE]
> Default passwords are not published in version control. In local evaluation mode, test credentials are configured via local environment files (`docs/DEMO_CREDENTIALS.local.md`, Git-ignored) or seeded during initial setup.

| Role | Account Email | Password / Access | Details |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@bloodlink.org` | *Configured locally* | Chief Medical Admin (Full review & user management) |
| **Voluntary Donor (O+)** | `donor@bloodlink.org` | *Configured locally* | Arjun Mehta (Bund Garden, 1.25 km from Ruby Hall) |
| **Patient Requester** | `priya.sharma@example.com` | *Configured locally* | Priya Sharma (Family Attendant in Kothrud) |

*Simulated Demo OTP: Enabled in local development mode via environment configuration.*

---

## 🚀 Quick Startup Guide

### Prerequisites
- Node.js (v18+ or v20+)
- npm (v9+)

### Installation & Startup Commands

```bash
# 1. Install dependencies
npm run install:all

# 2. Seed realistic demonstration data (9 donors, 3 requesters, 4 hospitals, 4 requests)
npm run server:seed

# 3. Start Backend API (Port 5000)
npm run server:dev

# 4. Start Frontend (Port 3000) in another terminal
npm run client:dev
```

Open your browser at **`http://localhost:3000`**.

---

## 🩺 Clinical Safety & Non-Medical Disclaimer

> **IMPORTANT REGULATORY STATEMENT**:  
> Blood_Link coordinates voluntary potential donors. It is **not a licensed blood bank or transfusion service**.  
> Expressions of donor willingness do not guarantee medical fitness or blood availability.  
> **Final medical eligibility, infectious disease testing, and clinical cross-matching must be performed exclusively by authorized hospital blood centre personnel prior to collection or transfusion.**

---

## 📂 Project Structure

```
Blood_Link/
├── client/                     # Frontend Application (React 18 + Vite + Tailwind)
│   ├── src/
│   │   ├── components/         # Reusable UI (Navbar, Footer, Map, Modals, Badges)
│   │   ├── context/            # AuthContext, NotificationContext
│   │   ├── pages/              # Landing, Dashboards, Registration, Directory
│   │   └── types/              # TypeScript Interfaces
│   └── package.json
├── server/                     # Backend API (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── controllers/        # Auth, Donor, Requester, Request, Admin, Hospital
│   │   ├── routes/             # REST Endpoints (/api/v1/...)
│   │   ├── services/           # Progressive Matching Engine & Notification Service
│   │   ├── db/                 # Dual-Mode Connection, Schema, Seeds
│   │   └── index.ts            # Server Entry & Health Check
│   └── package.json
├── docs/                       # Academic Capstone Documentation
│   ├── SRS.md                  # Software Requirements Specification
│   ├── ARCHITECTURE.md         # Technical Architecture & Haversine Formula
│   ├── DATABASE_DESIGN.md      # Relational Schema & Indexes
│   ├── API_DOCUMENTATION.md    # REST API Reference
│   ├── TESTING_REPORT.md       # Automated Verification Report
│   └── DEMO_CREDENTIALS.md     # Quick Demonstration Script
├── README.md
└── PROJECT_STATUS.md
```
