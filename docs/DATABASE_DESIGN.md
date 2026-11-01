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

## 3. PostGIS Production Integration Note

For deployment on PostgreSQL with PostGIS installed, geographical coordinates can be queried directly using spatial index operators:

```sql
-- Spatial Point generation
ALTER TABLE locations ADD COLUMN geom geometry(Point, 4326);
UPDATE locations SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326);
CREATE INDEX idx_locations_geom ON locations USING GIST(geom);

-- Progressive radius scan using ST_DWithin (distance in meters)
SELECT dp.*, ST_Distance(l.geom, ST_SetSRID(ST_MakePoint(:reqLng, :reqLat), 4326)::geography) / 1000.0 as distance_km
FROM donor_profiles dp
JOIN locations l ON l.entity_id = dp.id AND l.entity_type = 'donor'
WHERE ST_DWithin(l.geom::geography, ST_SetSRID(ST_MakePoint(:reqLng, :reqLat), 4326)::geography, 5000);
```
