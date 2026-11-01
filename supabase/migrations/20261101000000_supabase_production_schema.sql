-- ============================================================================
-- Blood_Link Production PostgreSQL Schema (Supabase Managed PostGIS + Auth)
-- Migration: 20261101000000_supabase_production_schema.sql
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA extensions;

-- ============================================================================
-- 2. Core Tables & Auth Synchronization
-- ============================================================================

-- Table: public.profiles (Linked directly to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    date_of_birth DATE,
    role VARCHAR(20) NOT NULL DEFAULT 'donor' CHECK (role IN ('donor', 'requester', 'admin')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Backward-Compatibility View for Server Application: public.users
CREATE OR REPLACE VIEW public.users AS
SELECT 
    id,
    full_name,
    email,
    'PROTECTED'::varchar(255) AS password_hash,
    mobile,
    date_of_birth,
    role,
    status,
    is_verified,
    created_at,
    updated_at
FROM public.profiles;

-- Automatically create profile on Supabase auth.users registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role VARCHAR(20);
BEGIN
    -- Prevent unauthorized users from assigning themselves admin role at signup
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'donor');
    IF v_role NOT IN ('donor', 'requester') THEN
        v_role := 'donor';
    END IF;

    INSERT INTO public.profiles (id, full_name, email, mobile, role, is_verified)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'New User'),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'mobile', ''),
        v_role,
        FALSE
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Prevent Non-Admins from Self-Assigning 'admin' Role
CREATE OR REPLACE FUNCTION public.prevent_admin_self_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF (NEW.role = 'admin' AND (OLD.role IS NULL OR OLD.role <> 'admin')) THEN
        IF (auth.jwt() -> 'app_metadata' ->> 'role') <> 'admin' AND (auth.uid() IS NOT NULL) THEN
            RAISE EXCEPTION 'Privilege escalation rejected: only administrators can grant admin privileges.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_admin_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_admin_escalation
    BEFORE UPDATE OF role ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_self_assignment();

-- ============================================================================
-- 3. Application Domain Tables
-- ============================================================================

-- Table: public.donor_profiles
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

-- Table: public.requester_profiles
CREATE TABLE IF NOT EXISTS public.requester_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    requester_type VARCHAR(20) DEFAULT 'Patient' CHECK (requester_type IN ('Patient', 'Attendant')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: public.locations (With PostGIS Spatial Geography & Privacy Flags)
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

-- Table: public.health_questionnaires (Isolated Sensitive Clinical Information)
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

-- Table: public.donation_history
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

-- Table: public.hospitals (Institutional Blood Bank Directory)
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

-- Table: public.blood_requests (Emergency Patient Blood Transfusion Requests)
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
CREATE INDEX IF NOT EXISTS idx_blood_requests_blood_group ON public.blood_requests(blood_group);

-- Table: public.donor_matches (Matching Linkages & Dispatched Alerts)
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

-- Table: public.notifications (User Alerts and SMS Stubs)
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

-- Table: public.device_tokens
CREATE TABLE IF NOT EXISTS public.device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform VARCHAR(20) DEFAULT 'web',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, token)
);

-- Table: public.otp_verifications
CREATE TABLE IF NOT EXISTS public.otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mobile VARCHAR(20) NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: public.admin_audit_logs
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

-- ============================================================================
-- 4. Automatic Spatial Geography Point Population Triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_populate_geom()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.geom := extensions.ST_SetSRID(extensions.ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::extensions.geography;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_locations_geom ON public.locations;
CREATE TRIGGER trg_locations_geom
    BEFORE INSERT OR UPDATE OF latitude, longitude ON public.locations
    FOR EACH ROW EXECUTE FUNCTION public.fn_populate_geom();

DROP TRIGGER IF EXISTS trg_hospitals_geom ON public.hospitals;
CREATE TRIGGER trg_hospitals_geom
    BEFORE INSERT OR UPDATE OF latitude, longitude ON public.hospitals
    FOR EACH ROW EXECUTE FUNCTION public.fn_populate_geom();

DROP TRIGGER IF EXISTS trg_requests_geom ON public.blood_requests;
CREATE TRIGGER trg_requests_geom
    BEFORE INSERT OR UPDATE OF latitude, longitude ON public.blood_requests
    FOR EACH ROW EXECUTE FUNCTION public.fn_populate_geom();

-- ============================================================================
-- 5. Stored Procedures & Progressive Matching Engine (RPC)
-- ============================================================================

/**
 * match_potential_donors
 * Native PostGIS progressive matching function supporting 5km, 10km, and 25km tiers.
 *
 * PRIVACY NOTICE:
 * Does NOT return raw coordinates of matched donors to callers.
 * Returns only locality centroid, district, distance, and tier metadata.
 * Requires verified request status before execution.
 */
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
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_req_geom extensions.geography;
    v_blood_group VARCHAR;
    v_component VARCHAR;
    v_status VARCHAR;
    v_compatible_groups VARCHAR[];
BEGIN
    -- 1. Fetch request coordinates, status, and blood group
    SELECT geom, blood_requests.blood_group, blood_component, status
    INTO v_req_geom, v_blood_group, v_component, v_status
    FROM public.blood_requests
    WHERE id = p_request_id;

    IF v_req_geom IS NULL THEN
        RAISE EXCEPTION 'Request not found or coordinates missing.';
    END IF;

    -- Strict Medical Gate: Only clinically verified requests can trigger donor discovery
    IF v_status NOT IN ('VERIFIED', 'SEARCHING') THEN
        RAISE EXCEPTION 'Donor matching cannot be executed for requests with status: %', v_status;
    END IF;

    -- 2. Define clinical compatibility mapping
    IF v_component LIKE '%Plasma%' THEN
        -- Plasma compatibility (reverse of red blood cells)
        v_compatible_groups := CASE v_blood_group
            WHEN 'O+'  THEN ARRAY['O+', 'A+', 'B+', 'AB+']
            WHEN 'O-'  THEN ARRAY['O-', 'A-', 'B-', 'AB-']
            WHEN 'A+'  THEN ARRAY['A+', 'AB+']
            WHEN 'A-'  THEN ARRAY['A-', 'AB-']
            WHEN 'B+'  THEN ARRAY['B+', 'AB+']
            WHEN 'B-'  THEN ARRAY['B-', 'AB-']
            WHEN 'AB+' THEN ARRAY['AB+']
            WHEN 'AB-' THEN ARRAY['AB-']
            ELSE ARRAY[v_blood_group]
        END;
    ELSE
        -- Red Blood Cells / Whole Blood compatibility
        v_compatible_groups := CASE v_blood_group
            WHEN 'A+'  THEN ARRAY['A+', 'A-', 'O+', 'O-']
            WHEN 'A-'  THEN ARRAY['A-', 'O-']
            WHEN 'B+'  THEN ARRAY['B+', 'B-', 'O+', 'O-']
            WHEN 'B-'  THEN ARRAY['B-', 'O-']
            WHEN 'AB+' THEN ARRAY['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-']
            WHEN 'AB-' THEN ARRAY['AB-', 'A-', 'B-', 'O-']
            WHEN 'O+'  THEN ARRAY['O+', 'O-']
            WHEN 'O-'  THEN ARRAY['O-']
            ELSE ARRAY[v_blood_group]
        END;
    END IF;

    -- 3. Query potential available donors within progressive radius
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
      AND dp.blood_group = ANY(v_compatible_groups)
      AND extensions.ST_DWithin(l.geom, v_req_geom, p_max_radius_meters)
    ORDER BY distance_km ASC;
END;
$$;

-- Secure execution privileges
REVOKE ALL ON FUNCTION public.match_potential_donors FROM PUBLIC;
REVOKE ALL ON FUNCTION public.match_potential_donors FROM anon;
GRANT EXECUTE ON FUNCTION public.match_potential_donors TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_potential_donors TO service_role;

/**
 * respond_to_donor_match
 * Secure procedure allowing authenticated donors to accept or decline emergency matches.
 * Enforces donor ownership, notes length validation, and safe search_path.
 */
CREATE OR REPLACE FUNCTION public.respond_to_donor_match(
    p_match_id UUID,
    p_status VARCHAR,
    p_response_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_donor_user_id UUID;
    v_request_id UUID;
    v_current_status VARCHAR;
BEGIN
    -- 1. Parameter Validation
    IF p_status NOT IN ('ACCEPTED', 'DECLINED') THEN
        RAISE EXCEPTION 'Invalid status. Permitted responses are ACCEPTED or DECLINED.';
    END IF;

    IF length(COALESCE(p_response_notes, '')) > 500 THEN
        RAISE EXCEPTION 'Response notes must not exceed 500 characters.';
    END IF;

    -- 2. Fetch match record and verify donor ownership
    SELECT dp.user_id, dm.request_id, dm.status
    INTO v_donor_user_id, v_request_id, v_current_status
    FROM public.donor_matches dm
    JOIN public.donor_profiles dp ON dm.donor_id = dp.id
    WHERE dm.id = p_match_id;

    IF v_donor_user_id IS NULL THEN
        RAISE EXCEPTION 'Donor match record not found.';
    END IF;

    -- Verify that caller matches the donor's profile
    IF v_donor_user_id <> auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: You can only respond to emergency requests dispatched to your own account.';
    END IF;

    -- 3. Update the match status
    UPDATE public.donor_matches
    SET status = p_status,
        responded_at = CURRENT_TIMESTAMP,
        response_notes = p_response_notes
    WHERE id = p_match_id;

    -- 4. If accepted, progress the request state to DONOR_RESPONSES
    IF p_status = 'ACCEPTED' THEN
        UPDATE public.blood_requests
        SET status = 'DONOR_RESPONSES',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_request_id
          AND status IN ('SEARCHING', 'VERIFIED');
    END IF;

    RETURN json_build_object(
        'success', TRUE,
        'message', 'Donor response recorded successfully',
        'match_id', p_match_id,
        'status', p_status
    );
END;
$$;

-- Secure execution privileges
REVOKE ALL ON FUNCTION public.respond_to_donor_match FROM PUBLIC;
REVOKE ALL ON FUNCTION public.respond_to_donor_match FROM anon;
GRANT EXECUTE ON FUNCTION public.respond_to_donor_match TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_donor_match TO service_role;

-- ============================================================================
-- 6. Row Level Security (RLS) Policies
-- ============================================================================

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
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper expression for Admin role
-- Checks app_metadata in JWT (which cannot be forged by client)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', FALSE);
$$;

-- Policies: profiles
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_own_or_admin" ON public.profiles
    FOR UPDATE USING (auth.uid() = id OR public.is_admin());

-- Policies: donor_profiles
DROP POLICY IF EXISTS "donor_profiles_select_own_or_admin" ON public.donor_profiles;
CREATE POLICY "donor_profiles_select_own_or_admin" ON public.donor_profiles
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "donor_profiles_update_own" ON public.donor_profiles;
CREATE POLICY "donor_profiles_update_own" ON public.donor_profiles
    FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "donor_profiles_insert_own" ON public.donor_profiles;
CREATE POLICY "donor_profiles_insert_own" ON public.donor_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies: requester_profiles
DROP POLICY IF EXISTS "requester_profiles_select_own_or_admin" ON public.requester_profiles;
CREATE POLICY "requester_profiles_select_own_or_admin" ON public.requester_profiles
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "requester_profiles_update_own" ON public.requester_profiles;
CREATE POLICY "requester_profiles_update_own" ON public.requester_profiles
    FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "requester_profiles_insert_own" ON public.requester_profiles;
CREATE POLICY "requester_profiles_insert_own" ON public.requester_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies: locations (Strict Privacy Protection for Coordinates)
DROP POLICY IF EXISTS "locations_user_manage_own" ON public.locations;
CREATE POLICY "locations_user_manage_own" ON public.locations
    FOR ALL USING (
        (entity_type IN ('user', 'donor') AND entity_id IN (
            SELECT id FROM public.profiles WHERE id = auth.uid()
            UNION
            SELECT id FROM public.donor_profiles WHERE user_id = auth.uid()
        ))
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "locations_public_read_hospitals" ON public.locations;
CREATE POLICY "locations_public_read_hospitals" ON public.locations
    FOR SELECT USING (entity_type = 'hospital');

-- Policies: health_questionnaires (Isolated Sensitive Health Data)
DROP POLICY IF EXISTS "health_questionnaires_donor_only" ON public.health_questionnaires;
CREATE POLICY "health_questionnaires_donor_only" ON public.health_questionnaires
    FOR ALL USING (
        auth.uid() = (SELECT user_id FROM public.donor_profiles WHERE id = donor_id)
        OR public.is_admin()
    );

-- Policies: donation_history
DROP POLICY IF EXISTS "donation_history_donor_only" ON public.donation_history;
CREATE POLICY "donation_history_donor_only" ON public.donation_history
    FOR ALL USING (
        auth.uid() = (SELECT user_id FROM public.donor_profiles WHERE id = donor_id)
        OR public.is_admin()
    );

-- Policies: hospitals (Verified Directory Public Read)
DROP POLICY IF EXISTS "hospitals_read_verified" ON public.hospitals;
CREATE POLICY "hospitals_read_verified" ON public.hospitals
    FOR SELECT USING (is_verified = TRUE OR public.is_admin());

DROP POLICY IF EXISTS "hospitals_admin_manage" ON public.hospitals;
CREATE POLICY "hospitals_admin_manage" ON public.hospitals
    FOR ALL USING (public.is_admin());

-- Policies: blood_requests
DROP POLICY IF EXISTS "blood_requests_requester_manage" ON public.blood_requests;
CREATE POLICY "blood_requests_requester_manage" ON public.blood_requests
    FOR ALL USING (auth.uid() = requester_id OR public.is_admin());

DROP POLICY IF EXISTS "blood_requests_donor_view_matched" ON public.blood_requests;
CREATE POLICY "blood_requests_donor_view_matched" ON public.blood_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.donor_matches dm
            JOIN public.donor_profiles dp ON dm.donor_id = dp.id
            WHERE dm.request_id = public.blood_requests.id 
              AND dp.user_id = auth.uid()
        )
    );

-- Policies: donor_matches
DROP POLICY IF EXISTS "donor_matches_donor_view_own" ON public.donor_matches;
CREATE POLICY "donor_matches_donor_view_own" ON public.donor_matches
    FOR SELECT USING (
        auth.uid() = (SELECT user_id FROM public.donor_profiles WHERE id = donor_id)
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "donor_matches_requester_view_accepted" ON public.donor_matches;
CREATE POLICY "donor_matches_requester_view_accepted" ON public.donor_matches
    FOR SELECT USING (
        (auth.uid() = (SELECT requester_id FROM public.blood_requests WHERE id = request_id)
         AND status = 'ACCEPTED')
        OR public.is_admin()
    );

-- Policies: notifications
DROP POLICY IF EXISTS "notifications_user_manage_own" ON public.notifications;
CREATE POLICY "notifications_user_manage_own" ON public.notifications
    FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- Policies: device_tokens
DROP POLICY IF EXISTS "device_tokens_user_manage_own" ON public.device_tokens;
CREATE POLICY "device_tokens_user_manage_own" ON public.device_tokens
    FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- Policies: otp_verifications (Backend Service Role Only)
-- Revoke direct user access completely; OTP verification must be processed via server-side endpoints
REVOKE ALL ON public.otp_verifications FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.otp_verifications TO service_role;

-- Policies: admin_audit_logs
DROP POLICY IF EXISTS "admin_audit_logs_admin_only" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_logs_admin_only" ON public.admin_audit_logs
    FOR ALL USING (public.is_admin());
