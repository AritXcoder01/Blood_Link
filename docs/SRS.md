# Software Requirements Specification (SRS)
## Blood_Link: Location-Based Emergency Blood Donor Discovery and Coordination System

---

## 1. Introduction

### 1.1 Purpose
The purpose of this document is to specify the complete functional, non-functional, interface, and safety requirements for **Blood_Link**, an emergency voluntary blood donor discovery and hospital coordination platform developed as a final-year engineering capstone project.

### 1.2 Scope
Blood_Link coordinates voluntary blood donors with patient attendants and authorized hospital blood centres during acute medical emergencies. It provides:
1. Progressive geographical matching within 5 km, 10 km, and 25 km perimeter tiers.
2. Clinical verification of emergency blood requests by trained administrative personnel.
3. Multi-role access control for Donors, Requesters, and Administrators.
4. Non-medical regulatory compliance safeguarding transfusion safety.

### 1.3 Definitions and Acronyms
- **ABO/Rh**: Human blood classification system based on A/B antigens and Rhesus factor (+/-).
- **PRBC**: Packed Red Blood Cells.
- **SDP/RDP**: Single Donor Platelets / Random Donor Platelets.
- **FFP**: Fresh Frozen Plasma.
- **Haversine**: Great-circle distance formula computing spherical distance between two coordinate pairs.

---

## 2. Overall Description

### 2.1 Product Perspective
Blood_Link operates as a modular monolith web application:
- **Frontend Layer**: React 18, Vite, TypeScript, Tailwind CSS, React Router, Lucide Icons, Leaflet.
- **Application Layer**: Node.js, Express.js, TypeScript REST API.
- **Database Layer**: Relational PostgreSQL with PostGIS compatibility, plus automatic SQLite WebAssembly local development fallback.

### 2.2 User Classes and Characteristics
1. **Voluntary Donor**: Adults (age ≥ 18) who declare their ABO/Rh blood type, locality, and availability status. Donors receive proximity alerts and express willingness to donate.
2. **Patient Requester / Attendant**: Patients or family attendants who register emergency blood requests specifying hospital details, urgency, and units required.
3. **Medical Administrator**: Hospital or NGO coordinator responsible for verifying patient admission before dispatching donor alerts, managing users, and supervising system audits.

---

## 3. System Features & Functional Requirements

### 3.1 Authentication & Security (FR-01)
- Passwords must be hashed using `bcrypt` (10 rounds).
- Stateless JWT authentication tokens must protect private endpoints.
- Role-based authorization must enforce access to `/donor/*`, `/requester/*`, and `/admin/*`.
- Minimum donor age must be verified (≥ 18 years); maximum age restrictions must not be arbitrarily imposed.

### 3.2 Emergency Request Lifecycle (FR-02)
- Initial request state must be `PENDING_VERIFICATION`.
- Unrestricted alerts must **never** be dispatched prior to clinical verification.
- Verified requests transition to `SEARCHING` and trigger the core matching engine.
- When donors accept, state transitions to `DONOR_RESPONSES` or `COORDINATING`.
- Once satisfied, state transitions to `FULFILLED`.
- Cancellation stops all matching and pending notifications immediately.

### 3.3 Core Matching Engine (FR-03)
- Matches donors based on ABO/Rh compatibility and requested blood component.
- Excludes donors marked `TEMPORARILY_UNAVAILABLE` or `NOT_ACCEPTING`.
- Computes spherical distance using the Haversine formula:
  $$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
- Evaluates progressive radius tiers:
  1. **Tier 1 (5 km)**: Immediate urban proximity.
  2. **Tier 2 (10 km)**: Metropolitan suburban belt.
  3. **Tier 3 (25 km)**: Extended regional radius.
- Ranks candidates by proximity, exact blood match, and rest interval (≥ 90 days).
- Prevents duplicate match entries in `donor_matches`.

### 3.4 Regulatory & Non-Medical Safeguards (FR-04)
- Outputs must be strictly labelled "potential voluntary donors".
- Platforms must **never** claim clinical compatibility or guaranteed blood availability.
- Licensed blood centre personnel must execute all medical screenings, infectious disease tests, and cross-matching.
- Exact home coordinates must remain protected and never shown publicly.
