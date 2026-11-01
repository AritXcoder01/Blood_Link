# Blood_Link — Security & Privacy Architecture Checklist

**Target Jurisdiction:** India (Digital Personal Data Protection Act, 2023 [DPDPA]; Drugs and Cosmetics Act, 1940 & Rules, 1945; National Blood Transfusion Council [NBTC] Guidelines)  
**Target Region:** Mumbai Metropolitan Pilot (Mumbai City, Mumbai Suburban, expandable to Thane & Navi Mumbai)  
**Document Status:** Architecture & Regulatory Compliance Specification (Phase 0.2)  
**Execution Constraint:** Planning Only — No code changes or database alterations until explicit approval.

---

## 1. Executive Summary & Privacy-by-Design Principles

Blood_Link operates at the critical intersection of emergency medical logistics and highly sensitive personal health information. An emergency blood donor discovery platform handles three distinct categories of sensitive data:
1. **Donor Geolocation & Physical Residence**: Revealing exact residential coordinates poses harassment, stalking, and safety risks to voluntary donors.
2. **Donor Health & Deferral Questionnaire**: Self-reported medical conditions, recent surgeries, hemoglobin levels, tattoos, weight, and infectious disease screenings are strictly confidential personal health data.
3. **Emergency Patient & Hospital Records**: Patient medical admission, required blood component, and hospital ward data must not be exposed to unauthorized parties or leveraged for commercial exploitation.

To maintain trust and statutory compliance, Blood_Link enforces **Privacy-by-Design** and **Zero-Trust Data Isolation**.

---

## 2. Statutory & Regulatory Compliance Matrix

| Regulation / Standard | Scope & Mandate | Blood_Link Technical Implementation | Compliance Status |
| :--- | :--- | :--- | :--- |
| **Digital Personal Data Protection Act (DPDPA), 2023** (India) | - Lawful basis and explicit consent for personal data processing.<br>- Purpose limitation: donor data only used for emergency blood coordination.<br>- Right to withdraw consent and data erasure ("Right to be Forgotten").<br>- Data fiduciary duty to protect against breach. | - Explicit granular consent modal during registration with opt-in timestamping.<br>- 1-click consent revocation in Donor Settings.<br>- Data deletion workflow purging phone numbers, coordinates, and health answers.<br>- Encrypted connections (TLS 1.3) and encrypted at rest (AES-256). | Planned for Production |
| **Drugs & Cosmetics Act, 1940 & Rules, 1945 (Schedule F, Part XII-B)** | - Eligibility criteria for blood donation (Age 18–65, weight $\ge$ 45 kg, donation intervals $\ge$ 90 days for whole blood, 14 days for platelets).<br>- Prohibition of commercial / paid blood donation (Professional Blood Donation banned under Supreme Court of India 1996 ruling). | - Automated validation rejecting registration for age < 18 or weight < 45 kg.<br>- Algorithmic deferral for last donation date < 90 days.<br>- Clear platform prohibition: voluntary, unremunerated donors only; no financial transactions or payments. | Embedded in Domain Logic |
| **National Blood Transfusion Council (NBTC) Guidelines** | - Voluntary donor privacy and non-stigmatizing donor deferral.<br>- Mandatory lab testing by licensed blood centres (Blood_Link coordinates willingness; actual screening is performed by the blood bank). | - Prominent medical disclaimers that matching expresses willingness to donate, not certified clinical compatibility or infectious clearance. | Fully Documented & Displayed |
| **CERT-In Cyber Security Guidelines** | - 6-hour incident reporting requirement.<br>- Centralized audit logging of access to sensitive systems. | - Immutable `admin_audit_logs` tracking every administrative verification, hospital modification, and status change. | Schema Implemented |

---

## 3. Geolocation Privacy & Location Masking Architecture

### 3.1 The Exact Coordinate Vulnerability
In a naive matching system, storing and returning precise GPS coordinates `(lat, lng)` of a voluntary donor allows requesters to pinpoint the donor's exact home or office on a map. This is a severe safety and privacy violation.

### 3.2 Dual Precision Model
Donors in Blood_Link are offered two privacy levels during onboarding:

```
[ Donor Location Selection ]
         │
         ├── Option A: [ PRECISE_GPS ] (Map Pin / High Accuracy)
         │       └── Usage: Stored in PostGIS for accurate distance calculation ONLY.
         │       └── Protection: Stripped at database boundary; never exposed to API or UI.
         │
         └── Option B: [ LOCALITY_CENTROID ] (Neighbourhood Level)
                 └── Example: "Dadar West, Mumbai", "Andheri East, Mumbai"
                 └── Centroid coordinates used for distance calculation (~500m - 1km fuzzing).
```

### 3.3 Database Boundary Coordinate Stripping
The PostGIS stored procedure `match_potential_donors(...)` calculates distance using `ST_Distance(...)`, but **projects only privacy-safe fields**:
```sql
-- Security Definer Function: Coordinate Isolation
SELECT 
    dp.id AS donor_id,
    p.full_name,
    dp.blood_group,
    ROUND((ST_Distance(l.geom, req_point) / 1000.0)::numeric, 1) AS distance_km, -- Only relative distance
    l.locality,                                                                   -- e.g. "Bandra West"
    l.district                                                                   -- "Mumbai Suburban"
    -- ST_X(l.geom) and ST_Y(l.geom) ARE EXPLICITLY OMITTED!
FROM donor_profiles dp ...
```
- Requesters see only: **"Donor within 4.2 km in Bandra West"**.
- Exact coordinates are never serialized to JSON over the network.

### 3.4 Contact Information Masking & Progressive Consent
- Prior to a donor accepting a match request, their phone number and full identity remain **completely hidden** from the requester.
- Only when a donor clicks **"I am willing to donate"** (`status = 'ACCEPTED'`), the system grants the requester access to the donor's contact phone number for hospital coordination.
- If a donor declines (`status = 'DECLINED'`) or ignores the alert, their information is never revealed.

---

## 4. Sensitive Health Questionnaire Data Isolation

The health questionnaire (`health_questionnaires` table) contains medical self-declarations:
- Chronic conditions (cardiovascular disease, cancer, diabetes on insulin, epilepsy).
- Transmissible risk markers (jaundice/hepatitis, HIV, malaria within 3 months).
- Recent interventions (major surgery in 6 months, tattooing or piercing in 6 months, pregnancy/lactation).
- Physiological metrics (weight, hemoglobin self-report).

### Security Architecture for Health Data:
1. **Zero Access for Requesters**: No requester or patient attendant can ever query, read, or infer answers from `health_questionnaires`.
2. **Row Level Security (RLS)**:
   ```sql
   CREATE POLICY "Donors can only read their own health questionnaire"
       ON public.health_questionnaires FOR SELECT
       USING (donor_id IN (SELECT id FROM donor_profiles WHERE user_id = auth.uid()));
   ```
3. **No External Storage**: Questionnaire data is stored strictly in the database schema; never cached on client devices, never stored in browser local storage.
4. **Automated Eligibility Computation**: The backend calculates a boolean `is_eligible` flag and an integer deferral interval. Staff or administrators inspect medical flags only when resolving donor disputes.

---

## 5. Authentication, Authorization & Session Hardening

### 5.1 Identity Provider (Supabase Auth)
- Built on hardened GoTrue server with cryptographically signed JSON Web Tokens (JWT).
- Access tokens have short lifespans (1 hour), paired with rotating Refresh Tokens stored in secure HTTP-only cookies (or local storage managed with proactive expiration).
- Passwords hashed using bcrypt (cost factor 10+) or Argon2.

### 5.2 Role-Based Access Control (RBAC) Architecture
Three strictly delineated roles:
- `donor`: Access to personal donor profile, health questionnaire, assigned emergency requests, and match willingness confirmation.
- `requester`: Access to create emergency requests, track verification status, and view accepted donor contacts. Zero access to unaccepted donors or other requesters' requests.
- `admin`: Elevated oversight for hospital directory, request verification, audit log inspection, and system metrics.

### 5.3 Privilege Escalation Prevention
- Role claims are not accepted from the client request payload during signup.
- Registration endpoints hardcode role assignment: `/register/donor` assigns `donor`; `/register/requester` assigns `requester`.
- The `admin` role **cannot** be registered via public APIs; it must be provisioned directly by existing super-administrators or via the Supabase Service Role console.
- In PostGIS RLS policies, the role is validated against the verified JWT claim:
  ```sql
  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  ```

---

## 6. Anti-Spam, Rate Limiting & Abuse Prevention

Emergency services are frequent targets for spam, hoaxes, and harassment. Blood_Link enforces multi-tier defense:

### 6.1 Request Verification Gate
- To prevent fake blood requests from triggering alarms across hundreds of donors, every newly created request enters `PENDING_VERIFICATION` status.
- An emergency request is verified either:
  1. **By Hospital Cross-Check**: The request links to a verified hospital with patient IPD/admission number.
  2. **By Admin Verification**: An administrator verifies emergency authenticity (doctor requisition slip / blood bank requisition form).
- Donors are **only alerted** after the request transitions to `VERIFIED`.

### 6.2 Rate Limiting Policies (Vercel Edge / API Gateway)
| Route / Action | Rate Limit Threshold | Defense Against |
| :--- | :--- | :--- |
| `POST /api/v1/auth/login` | 5 attempts per 15 minutes per IP | Credential stuffing & brute-force |
| `POST /api/v1/auth/register/*` | 3 registrations per hour per IP | Sybil attacks & fake account floods |
| `POST /api/v1/requests` | 2 active requests per 24 hours per user | Panic spam & fake emergencies |
| `POST /api/v1/matching/notify` | 1 broadcast cycle per 10 minutes per request | Notification storms / donor alert fatigue |

### 6.3 OTP Abuse Mitigation
- When SMS OTP is activated (Twilio, Gupshup, or MSG91):
  - Maximum 3 OTP requests per phone number per hour.
  - 60-second cooldown between resend requests.
  - OTP expires strictly after 5 minutes.
  - Maximum 3 verification attempts per OTP before invalidation.

---

## 7. Audit Logging & Administrative Accountability

All administrative interventions are logged immutably in `public.admin_audit_logs`.

### Logged Operations:
1. `REQUEST_VERIFIED`: Admin ID, request ID, timestamp, hospital verified, notes.
2. `REQUEST_REJECTED`: Admin ID, request ID, rejection reason (e.g. duplicate, unverified hospital).
3. `DONOR_STATUS_CHANGED`: Admin ID, donor ID, previous status $\to$ new status (e.g. suspended for non-response or abuse).
4. `HOSPITAL_DIRECTORY_MODIFIED`: Admin ID, hospital ID, action (`CREATE`, `UPDATE`, `DEACTIVATE`).
5. `ADMIN_LOGIN_SUCCESS` / `ADMIN_LOGIN_FAILURE`: Timestamp, IP hash, user agent.

### Tamper-Proofing:
- Table permissions for `admin_audit_logs` allow `INSERT` and `SELECT` only.
- `UPDATE` and `DELETE` operations are revoked for all roles, including administrators.

---

## 8. Data Retention, Consent Revocation & Right to be Forgotten

In compliance with India's DPDPA (2023):
- **Right to Withdraw**: Donors can toggle their availability status to `INACTIVE` at any time with zero penalty.
- **Account Deletion**: Donors can initiate account deletion from the profile dashboard:
  - Immediate de-identification: Name, mobile, email, and coordinates are cleared or anonymized.
  - Historical donation matches are retained in anonymized aggregate form (`donor_id = NULL`) to preserve hospital audit integrity and statistical reporting.
- **Request Expiration**: Unfulfilled or fulfilled emergency requests are archived after 30 days. No further notifications can ever be dispatched for archived requests.

---

## 9. Pre-Launch Security Checklist (Production Gate)

Before accepting real-world users in Mumbai, verify each item:

- [ ] **SSL / TLS 1.3**: Strict HTTPS enforced across Vercel frontend, serverless API, and Supabase database connection.
- [ ] **HTTP Security Headers**: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` active in `vercel.json`.
- [ ] **Supabase Service Role Key Protection**: Confirmed that `SUPABASE_SERVICE_ROLE_KEY` is configured **only** in backend environment variables and is **never** bundled into the React client code.
- [ ] **Row Level Security Active**: Checked that every single table in `public` schema has `ENABLE ROW LEVEL SECURITY` turned ON.
- [ ] **PostGIS Coordinate Redaction**: Verified that spatial RPC queries return only `distance_km` and locality names, with no raw coordinates sent to the requester UI.
- [ ] **Demo Mode Banner Disabled in Production**: Verified that `DemoBanner.tsx` and quick-login helpers are completely disabled when `import.meta.env.PROD === true`.
- [ ] **Seed Scripts Isolated**: Confirmed that `seed.ts` cannot run against the production database connection string.
- [ ] **Rate Limiting Implemented**: Verified rate limits on login, registration, and request dispatch endpoints.
- [ ] **Audit Trail Functional**: Confirmed that admin verifications generate immutable records in `admin_audit_logs`.
- [ ] **Terms of Service & DPDPA Privacy Notice**: Linked on the public registration pages with explicit checkboxes.
