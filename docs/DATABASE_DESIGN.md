# Database Design & Entity-Relationship Specification — Blood_Link

---

## 1. Relational Entity Overview

The Blood_Link database architecture contains **13 structured relational tables** designed with UUID primary keys, foreign key constraints, indexes on high-frequency query fields, and UTC timestamps.

### Entity Relationship Diagram (ERD)

```
 [users] 1 <-------- 1 [donor_profiles] 1 <------- 1 [health_questionnaires]
    |                                   1 <------- * [donation_history]
    | 1 <----------- 1 [requester_profiles]
    |
    | 1 <----------- * [blood_requests] 1 <------- * [donor_matches] * --------> 1 [donor_profiles]
    |                        |
    | 1 <----------- * [notifications]
    | 1 <----------- * [device_tokens]
    | 1 <----------- * [admin_audit_logs]
    |
 [locations] (Polymorphic: user, donor, hospital, request)
 [hospitals]
 [otp_verifications]
```

---

## 2. Table Schemas & Data Dictionaries

### 2.1 Table: `users`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR(36) | PRIMARY KEY | UUID identifier |
| `full_name` | VARCHAR(150) | NOT NULL | User's full name |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Account email (Indexed) |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt hash |
| `mobile` | VARCHAR(20) | NOT NULL | Contact telephone |
| `date_of_birth`| DATE | NULLABLE | Birth date (age >= 18 for donors) |
| `role` | VARCHAR(20) | CHECK ('donor','requester','admin') | User access role |
| `status` | VARCHAR(20) | CHECK ('active','suspended','pending') | Account standing |
| `is_verified` | BOOLEAN | DEFAULT FALSE | Mobile/Identity verification |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Modification time |

### 2.2 Table: `donor_profiles`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR(36) | PRIMARY KEY | UUID identifier |
| `user_id` | VARCHAR(36) | UNIQUE, FK `users(id)` | Foreign key to user |
| `blood_group` | VARCHAR(5) | CHECK ('A+','A-','B+','B-','AB+','AB-','O+','O-') | Declared blood type |
| `last_donation_date` | DATE | NULLABLE | Date of prior donation |
| `donation_type` | VARCHAR(50) | DEFAULT 'Whole Blood' | Whole blood, PRBC, Platelets |
| `availability_status` | VARCHAR(30) | CHECK ('AVAILABLE','TEMPORARILY_UNAVAILABLE','NOT_ACCEPTING') | Discovery toggle |
| `profile_completion_pct` | INTEGER | DEFAULT 100 | Percentage profile completion |

### 2.3 Table: `blood_requests`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR(36) | PRIMARY KEY | UUID identifier |
| `requester_id` | VARCHAR(36) | FK `users(id)` | Creating patient attendant |
| `patient_name` | VARCHAR(150) | NOT NULL | Patient name |
| `patient_age` | INTEGER | NOT NULL | Patient age |
| `blood_group` | VARCHAR(5) | NOT NULL | Required blood group |
| `blood_component`| VARCHAR(50) | DEFAULT 'Whole Blood' | PRBC, Platelets, FFP, etc. |
| `units_required` | INTEGER | CHECK (> 0) | Quantity in units |
| `hospital_name` | VARCHAR(200) | NOT NULL | Admitting hospital facility |
| `hospital_address`| TEXT | NOT NULL | Hospital street address |
| `latitude` | DECIMAL(10, 7) | NOT NULL | Hospital latitude coordinate |
| `longitude` | DECIMAL(10, 7) | NOT NULL | Hospital longitude coordinate |
| `required_date` | DATE | NOT NULL | Target transfusion date |
| `required_time` | VARCHAR(20) | NOT NULL | Target time |
| `priority` | VARCHAR(20) | CHECK ('CRITICAL','URGENT','SCHEDULED') | Urgency categorization |
| `status` | VARCHAR(30) | CHECK ('PENDING_VERIFICATION','VERIFIED','SEARCHING','DONOR_RESPONSES','COORDINATING','FULFILLED','CANCELLED','EXPIRED','REJECTED') | State machine status |
| `verified_by` | VARCHAR(36) | FK `users(id)` | Admin reviewer |
| `verified_at` | TIMESTAMP | NULLABLE | Verification timestamp |

### 2.4 Table: `donor_matches`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR(36) | PRIMARY KEY | UUID identifier |
| `request_id` | VARCHAR(36) | FK `blood_requests(id)` | Target request |
| `donor_id` | VARCHAR(36) | FK `donor_profiles(id)` | Matched donor |
| `distance_km` | DECIMAL(6, 2) | NOT NULL | Calculated distance in km |
| `search_radius_km` | INTEGER | NOT NULL (5, 10, or 25) | Search tier activated |
| `status` | VARCHAR(20) | CHECK ('NOTIFIED','ACCEPTED','DECLINED','EXPIRED') | Donor response state |
| `match_score` | DECIMAL(5, 2) | NOT NULL | Proximity & match score |
| `responded_at` | TIMESTAMP | NULLABLE | Timestamp of donor response |
| `response_notes` | TEXT | NULLABLE | Optional donor note |

---

## 3. Supabase Production PostgreSQL & PostGIS Integration

The production database is managed via Supabase PostgreSQL (v15+) with native PostGIS extensions and Row Level Security (RLS).

### 3.1 Migration Source
The complete production schema is version-controlled at:
`supabase/migrations/20261101000000_supabase_production_schema.sql`

### 3.2 Authentication & Entity Mapping
- **Identity Provider**: Supabase Auth (`auth.users`).
- **Application Profiles**: `public.profiles` (`id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`).
- **Compatibility Layer**: `public.users` SQL view maps `profiles` to preserve existing application query compatibility.
- **Privilege Protection**: The trigger `trg_prevent_admin_escalation` on `public.profiles` prevents non-administrators from self-assigning the `'admin'` role.

### 3.3 PostGIS Spatial Architecture
Locations, hospitals, and blood requests maintain a native PostGIS `extensions.geography(Point, 4326)` column (`geom`):
- Automatically updated on insert/update via trigger `fn_populate_geom()`.
- Indexed via spatial GiST indexes (`CREATE INDEX ... USING GIST(geom)`).

### 3.4 Progressive Matching RPC (`match_potential_donors`)
- Executes in-database proximity queries via `extensions.ST_DWithin` and `extensions.ST_Distance`.
- **Safety Gate**: Verifies that blood request status is `VERIFIED` or `SEARCHING` before discovery.
- **Privacy Gate**: Raw home coordinates of donors are strictly excluded from output; only locality centroid, district, distance, and tier are returned.
- **Permission Hardening**: Default `EXECUTE` privileges are revoked from `PUBLIC` and `anon`; execution is granted only to `authenticated` and `service_role`.

### 3.5 Donor Match Response RPC (`respond_to_donor_match`)
- Authenticated donors accept or decline emergency matches.
- Validates donor ownership (`dp.user_id = auth.uid()`), parameter values (`ACCEPTED`, `DECLINED`), and note lengths ($\le 500$ chars).
- Automatically updates blood request status to `DONOR_RESPONSES` upon acceptance.
- Revokes permissions from `PUBLIC` and `anon`.

### 3.6 Row Level Security (RLS) Policy Matrix

| Table | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `profiles` | Own profile or Admin | Own profile / Auth trigger | Own profile or Admin | Admin |
| `donor_profiles` | Own profile or Admin | Own profile | Own profile or Admin | Admin |
| `requester_profiles`| Own profile or Admin | Own profile | Own profile or Admin | Admin |
| `locations` | Own locations or Admin (Hospitals public) | Own locations | Own locations or Admin | Admin |
| `health_questionnaires` | Own questionnaire only | Own questionnaire | Own questionnaire | Admin |
| `donation_history` | Own donation records | Own records | Own records | Admin |
| `hospitals` | Public (Verified hospitals) | Admin | Admin | Admin |
| `blood_requests` | Own requests, Matched Donors, or Admin | Own request (`PENDING_VERIFICATION`) | Own request or Admin | Admin |
| `donor_matches` | Own donor match or Requester (if ACCEPTED) | Service-role / Engine | Own match (via RPC) | Admin |
| `notifications` | Own user notifications | Service-role / Engine | Own notifications | Own |
| `device_tokens` | Own tokens | Own tokens | Own tokens | Own |
| `otp_verifications` | **REVOKED** (Service-role only) | Service-role only | Service-role only | Service-role |
| `admin_audit_logs` | Admin only | Service-role / Triggers | **DENIED** (Immutable) | **DENIED** |

---

## 4. Dual-Mode Database Connection Protocol

- **Development (`NODE_ENV=development`)**:
  - Connects to embedded SQLite (`blood_link.db`) via `sql.js`.
  - Zero cloud dependencies required; pre-seeded evaluator accounts operate locally.
- **Production (`NODE_ENV=production`)**:
  - Requires `DATABASE_URL` pointing to Supabase Managed PostgreSQL.
  - SSL enabled (`rejectUnauthorized: false`).
  - **Zero Silent Fallback**: If `DATABASE_URL` is missing or connection fails, the server halts immediately with a fatal startup exception. Falling back to SQLite in production is strictly prohibited.
