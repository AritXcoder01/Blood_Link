# Supabase Setup Guide & Production Database Schema — Blood_Link

**Target Database:** Supabase Managed PostgreSQL (v15+) with PostGIS  
**Target Region:** Mumbai, India (`ap-south-1` / `aws-ap-south-1`)  
**Document Status:** Planning & Setup Reference (Phase 0.2)

---

## 1. Supabase Project Creation Steps

1. Log into your account at [supabase.com](https://supabase.com).
2. Click **"New Project"**.
3. Configure project details:
   - **Name**: `Blood-Link-Production` (or `Blood-Link-Pilot`)
   - **Database Password**: Generate and store a strong password securely (never commit this to git).
   - **Region**: Select **`ap-south-1` (Mumbai, India)** for lowest network latency to Maharashtra users.
   - **Pricing Plan**: Free or Pro tier.
4. Once provisioned, navigate to **Project Settings $\to$ API** and retrieve:
   - **Project URL**: `https://<project-ref>.supabase.co`
   - **anon / public key**: Client-safe key for frontend `VITE_SUPABASE_ANON_KEY`.
   - **service_role / secret key**: Privileged server-only key for backend functions (never expose to frontend!).
5. Under **Project Settings $\to$ Database**, copy the **Connection string (URI)**:
   - Select **Mode: Transaction (Port 6543)** for serverless execution via Supavisor pooler.

---

## 2. SQL Migration Script (`supabase/migrations/001_production_schema.sql`)

Execute the following SQL script in the **Supabase SQL Editor** to establish the complete relational database, PostGIS extensions, and RLS policies.

```sql
-- ============================================================================
-- Blood_Link Production PostgreSQL Schema (PostGIS + Supabase Auth Linked)
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA extensions;

-- 2. Table: profiles (Synchronized with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    date_of_birth DATE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('donor', 'requester', 'admin')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- 3. Table: donor_profiles
CREATE TABLE IF NOT EXISTS public.donor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    blood_group VARCHAR(5) NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    last_donation_date DATE,
    donation_type VARCHAR(50) DEFAULT 'Whole Blood',
    availability_status VARCHAR(30) DEFAULT 'AVAILABLE' CHECK (availability_status IN ('AVAILABLE', 'TEMPORARILY_UNAVAILABLE', 'NOT_ACCEPTING')),
    profile_completion_pct INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_donor_blood_group ON public.donor_profiles(blood_group);
CREATE INDEX IF NOT EXISTS idx_donor_availability ON public.donor_profiles(availability_status);

-- 4. Table: requester_profiles
CREATE TABLE IF NOT EXISTS public.requester_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    requester_type VARCHAR(20) DEFAULT 'Patient' CHECK (requester_type IN ('Patient', 'Attendant')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Table: locations (With PostGIS Spatial Geography & Consent Tracking)
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('user', 'donor', 'hospital', 'request')),
    entity_id UUID NOT NULL,
    state VARCHAR(100) NOT NULL DEFAULT 'Maharashtra',
    district VARCHAR(100) NOT NULL,
    taluka VARCHAR(100) NOT NULL,
    locality VARCHAR(150) NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    geom extensions.geography(Point, 4326),
    location_consent_given BOOLEAN DEFAULT FALSE,
    location_consent_timestamp TIMESTAMP WITH TIME ZONE,
    location_accuracy_type VARCHAR(30) DEFAULT 'LOCALITY_CENTROID' CHECK (location_accuracy_type IN ('PRECISE_GPS', 'LOCALITY_CENTROID')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_locations_geom ON public.locations USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_locations_entity ON public.locations(entity_type, entity_id);

-- 6. Table: health_questionnaires (Isolated Sensitive Data)
CREATE TABLE IF NOT EXISTS public.health_questionnaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id UUID NOT NULL REFERENCES public.donor_profiles(id) ON DELETE CASCADE,
    relevant_medical_history TEXT,
    current_medication TEXT,
    recent_illness TEXT,
    known_allergies TEXT,
    additional_notes TEXT,
    consent_given BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Table: donation_history
CREATE TABLE IF NOT EXISTS public.donation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id UUID NOT NULL REFERENCES public.donor_profiles(id) ON DELETE CASCADE,
    donation_date DATE NOT NULL,
    units_donated INTEGER DEFAULT 1,
    blood_component VARCHAR(50) DEFAULT 'Whole Blood',
    hospital_name VARCHAR(150) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Table: hospitals (Administrator Verified Institutional Directory)
CREATE TABLE IF NOT EXISTS public.hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    district VARCHAR(100) NOT NULL,
    taluka VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL DEFAULT 'Maharashtra',
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    geom extensions.geography(Point, 4326),
    contact_number VARCHAR(30) NOT NULL,
    blood_bank_available BOOLEAN DEFAULT TRUE,
    email VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES public.profiles(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hospitals_geom ON public.hospitals USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_hospitals_district ON public.hospitals(district);

-- 9. Table: blood_requests (Emergency Requests)
CREATE TABLE IF NOT EXISTS public.blood_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    patient_name VARCHAR(150) NOT NULL,
    patient_age INTEGER NOT NULL CHECK (patient_age >= 0),
    blood_group VARCHAR(5) NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    blood_component VARCHAR(50) NOT NULL DEFAULT 'Whole Blood',
    units_required INTEGER NOT NULL CHECK (units_required > 0),
    hospital_name VARCHAR(200) NOT NULL,
    hospital_address TEXT NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    geom extensions.geography(Point, 4326),
    required_date DATE NOT NULL,
    required_time VARCHAR(20) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'URGENT' CHECK (priority IN ('CRITICAL', 'URGENT', 'SCHEDULED')),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_VERIFICATION' CHECK (
        status IN ('PENDING_VERIFICATION', 'VERIFIED', 'SEARCHING', 'DONOR_RESPONSES', 'COORDINATING', 'FULFILLED', 'CANCELLED', 'EXPIRED', 'REJECTED')
    ),
    additional_details TEXT,
    verified_by UUID REFERENCES public.profiles(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blood_requests_geom ON public.blood_requests USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_blood_requests_status ON public.blood_requests(status);

-- 10. Table: donor_matches (Matching Linkages & Dispatched Alerts)
CREATE TABLE IF NOT EXISTS public.donor_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.blood_requests(id) ON DELETE CASCADE,
    donor_id UUID NOT NULL REFERENCES public.donor_profiles(id) ON DELETE CASCADE,
    distance_km DECIMAL(6, 2) NOT NULL,
    search_radius_km INTEGER NOT NULL DEFAULT 5,
    status VARCHAR(20) NOT NULL DEFAULT 'NOTIFIED' CHECK (status IN ('NOTIFIED', 'ACCEPTED', 'DECLINED', 'EXPIRED')),
    match_score DECIMAL(5, 2) DEFAULT 100.0,
    responded_at TIMESTAMP WITH TIME ZONE,
    response_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(request_id, donor_id)
);

CREATE INDEX IF NOT EXISTS idx_donor_matches_request ON public.donor_matches(request_id);
CREATE INDEX IF NOT EXISTS idx_donor_matches_donor ON public.donor_matches(donor_id);

-- 11. Table: notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM' CHECK (type IN ('EMERGENCY_REQUEST', 'DONOR_RESPONSE', 'STATUS_UPDATE', 'ADMIN_ALERT', 'SYSTEM')),
    is_read BOOLEAN DEFAULT FALSE,
    metadata_json TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);

-- 12. Table: admin_audit_logs
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.profiles(id),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Automatic Geography Point Population Trigger
CREATE OR REPLACE FUNCTION public.fn_populate_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom := extensions.ST_SetSRID(extensions.ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::extensions.geography;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_locations_geom BEFORE INSERT OR UPDATE OF latitude, longitude ON public.locations FOR EACH ROW EXECUTE FUNCTION public.fn_populate_geom();
CREATE TRIGGER trg_hospitals_geom BEFORE INSERT OR UPDATE OF latitude, longitude ON public.hospitals FOR EACH ROW EXECUTE FUNCTION public.fn_populate_geom();
CREATE TRIGGER trg_requests_geom BEFORE INSERT OR UPDATE OF latitude, longitude ON public.blood_requests FOR EACH ROW EXECUTE FUNCTION public.fn_populate_geom();
```

---

## 3. PostGIS Native Progressive Matching Function (RPC)

Execute this in Supabase SQL editor to enable native, in-database distance searches across 5 km, 10 km, and 25 km tiers:

```sql
CREATE OR REPLACE FUNCTION public.match_potential_donors(
    p_request_id UUID,
    p_max_radius_meters INT DEFAULT 25000
)
RETURNS TABLE (
    donor_profile_id UUID,
    user_id UUID,
    full_name VARCHAR,
    mobile VARCHAR,
    blood_group VARCHAR,
    locality VARCHAR,
    district VARCHAR,
    distance_km NUMERIC,
    search_radius_km INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_req_geom extensions.geography;
    v_blood_group VARCHAR;
    v_component VARCHAR;
BEGIN
    -- 1. Fetch request coordinates and blood parameters
    SELECT geom, blood_requests.blood_group, blood_component
    INTO v_req_geom, v_blood_group, v_component
    FROM public.blood_requests
    WHERE id = p_request_id;

    IF v_req_geom IS NULL THEN
        RAISE EXCEPTION 'Request not found or coordinates missing';
    END IF;

    -- 2. Query matching available donors within radius using PostGIS ST_DWithin
    RETURN QUERY
    SELECT 
        dp.id AS donor_profile_id,
        p.id AS user_id,
        p.full_name,
        p.mobile,
        dp.blood_group,
        l.locality,
        l.district,
        ROUND((extensions.ST_Distance(l.geom, v_req_geom) / 1000.0)::numeric, 2) AS distance_km,
        CASE 
            WHEN extensions.ST_Distance(l.geom, v_req_geom) <= 5000 THEN 5
            WHEN extensions.ST_Distance(l.geom, v_req_geom) <= 10000 THEN 10
            ELSE 25
        END AS search_radius_km
    FROM public.donor_profiles dp
    JOIN public.profiles p ON dp.user_id = p.id
    JOIN public.locations l ON l.entity_id = dp.id AND l.entity_type = 'donor'
    WHERE p.role = 'donor'
      AND p.status = 'active'
      AND dp.availability_status = 'AVAILABLE'
      AND l.location_consent_given = TRUE
      AND extensions.ST_DWithin(l.geom, v_req_geom, p_max_radius_meters)
    ORDER BY distance_km ASC;
END;
$$;
```

---

## 4. Row Level Security (RLS) Policies

```sql
-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requester_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Policy: donor_profiles
CREATE POLICY "Donors view own donor profile" ON public.donor_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Donors update own donor profile" ON public.donor_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Policy: health_questionnaires (Isolated Health Data)
CREATE POLICY "Donors manage own health questionnaire" ON public.health_questionnaires
    FOR ALL USING (auth.uid() = (SELECT user_id FROM public.donor_profiles WHERE id = donor_id));

-- Policy: blood_requests
CREATE POLICY "Requesters manage own requests" ON public.blood_requests
    FOR ALL USING (auth.uid() = requester_id);
CREATE POLICY "Donors view matched requests" ON public.blood_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.donor_matches dm
            JOIN public.donor_profiles dp ON dm.donor_id = dp.id
            WHERE dm.request_id = public.blood_requests.id AND dp.user_id = auth.uid()
        )
    );

-- Policy: hospitals (Public Read for verified hospitals)
CREATE POLICY "Public read verified hospitals" ON public.hospitals FOR SELECT USING (is_verified = TRUE);
```
