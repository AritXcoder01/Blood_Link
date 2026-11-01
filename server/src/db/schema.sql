-- ============================================================================
-- Blood_Link Relational Schema (PostgreSQL with PostGIS compatibility)
-- ============================================================================

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    date_of_birth DATE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('donor', 'requester', 'admin')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Table: donor_profiles
CREATE TABLE IF NOT EXISTS donor_profiles (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    blood_group VARCHAR(5) NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    last_donation_date DATE,
    donation_type VARCHAR(50) DEFAULT 'Whole Blood',
    availability_status VARCHAR(30) DEFAULT 'AVAILABLE' CHECK (availability_status IN ('AVAILABLE', 'TEMPORARILY_UNAVAILABLE', 'NOT_ACCEPTING')),
    profile_completion_pct INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_donor_blood_group ON donor_profiles(blood_group);
CREATE INDEX IF NOT EXISTS idx_donor_availability ON donor_profiles(availability_status);

-- Table: requester_profiles
CREATE TABLE IF NOT EXISTS requester_profiles (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    requester_type VARCHAR(20) DEFAULT 'Patient' CHECK (requester_type IN ('Patient', 'Attendant')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: locations
CREATE TABLE IF NOT EXISTS locations (
    id VARCHAR(36) PRIMARY KEY,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('user', 'donor', 'hospital', 'request')),
    entity_id VARCHAR(36) NOT NULL,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    taluka VARCHAR(100) NOT NULL,
    locality VARCHAR(150) NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_locations_entity ON locations(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_locations_lat_lng ON locations(latitude, longitude);

-- Table: health_questionnaires
CREATE TABLE IF NOT EXISTS health_questionnaires (
    id VARCHAR(36) PRIMARY KEY,
    donor_id VARCHAR(36) NOT NULL REFERENCES donor_profiles(id) ON DELETE CASCADE,
    relevant_medical_history TEXT,
    current_medication TEXT,
    recent_illness TEXT,
    known_allergies TEXT,
    additional_notes TEXT,
    consent_given BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: donation_history
CREATE TABLE IF NOT EXISTS donation_history (
    id VARCHAR(36) PRIMARY KEY,
    donor_id VARCHAR(36) NOT NULL REFERENCES donor_profiles(id) ON DELETE CASCADE,
    donation_date DATE NOT NULL,
    units_donated INTEGER DEFAULT 1,
    blood_component VARCHAR(50) DEFAULT 'Whole Blood',
    hospital_name VARCHAR(150) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: hospitals
CREATE TABLE IF NOT EXISTS hospitals (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    district VARCHAR(100) NOT NULL,
    taluka VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    contact_number VARCHAR(30) NOT NULL,
    blood_bank_available BOOLEAN DEFAULT TRUE,
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hospitals_district ON hospitals(district);

-- Table: blood_requests
CREATE TABLE IF NOT EXISTS blood_requests (
    id VARCHAR(36) PRIMARY KEY,
    requester_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_name VARCHAR(150) NOT NULL,
    patient_age INTEGER NOT NULL CHECK (patient_age >= 0),
    blood_group VARCHAR(5) NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    blood_component VARCHAR(50) NOT NULL DEFAULT 'Whole Blood',
    units_required INTEGER NOT NULL CHECK (units_required > 0),
    hospital_name VARCHAR(200) NOT NULL,
    hospital_address TEXT NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    required_date DATE NOT NULL,
    required_time VARCHAR(20) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'URGENT' CHECK (priority IN ('CRITICAL', 'URGENT', 'SCHEDULED')),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_VERIFICATION' CHECK (
        status IN ('PENDING_VERIFICATION', 'VERIFIED', 'SEARCHING', 'DONOR_RESPONSES', 'COORDINATING', 'FULFILLED', 'CANCELLED', 'EXPIRED', 'REJECTED')
    ),
    additional_details TEXT,
    verified_by VARCHAR(36) REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blood_requests_status ON blood_requests(status);
CREATE INDEX IF NOT EXISTS idx_blood_requests_blood_group ON blood_requests(blood_group);

-- Table: donor_matches
CREATE TABLE IF NOT EXISTS donor_matches (
    id VARCHAR(36) PRIMARY KEY,
    request_id VARCHAR(36) NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
    donor_id VARCHAR(36) NOT NULL REFERENCES donor_profiles(id) ON DELETE CASCADE,
    distance_km DECIMAL(6, 2) NOT NULL,
    search_radius_km INTEGER NOT NULL DEFAULT 5,
    status VARCHAR(20) NOT NULL DEFAULT 'NOTIFIED' CHECK (status IN ('NOTIFIED', 'ACCEPTED', 'DECLINED', 'EXPIRED')),
    match_score DECIMAL(5, 2) DEFAULT 100.0,
    responded_at TIMESTAMP WITH TIME ZONE,
    response_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(request_id, donor_id)
);

CREATE INDEX IF NOT EXISTS idx_donor_matches_request ON donor_matches(request_id);
CREATE INDEX IF NOT EXISTS idx_donor_matches_donor ON donor_matches(donor_id);

-- Table: notifications
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM' CHECK (type IN ('EMERGENCY_REQUEST', 'DONOR_RESPONSE', 'STATUS_UPDATE', 'ADMIN_ALERT', 'SYSTEM')),
    is_read BOOLEAN DEFAULT FALSE,
    metadata_json TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- Table: device_tokens
CREATE TABLE IF NOT EXISTS device_tokens (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform VARCHAR(20) DEFAULT 'web',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, token)
);

-- Table: otp_verifications
CREATE TABLE IF NOT EXISTS otp_verifications (
    id VARCHAR(36) PRIMARY KEY,
    mobile VARCHAR(20) NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: admin_audit_logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    admin_id VARCHAR(36) NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(36) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
