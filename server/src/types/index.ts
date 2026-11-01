export type UserRole = 'donor' | 'requester' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'pending';

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type BloodComponent = 'Whole Blood' | 'Packed Red Blood Cells (PRBC)' | 'Platelets' | 'Fresh Frozen Plasma (FFP)' | 'Cryoprecipitate';

export type DonorAvailability = 'AVAILABLE' | 'TEMPORARILY_UNAVAILABLE' | 'NOT_ACCEPTING';

export type RequestPriority = 'CRITICAL' | 'URGENT' | 'SCHEDULED';

export type RequestStatus = 
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'SEARCHING'
  | 'DONOR_RESPONSES'
  | 'COORDINATING'
  | 'FULFILLED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REJECTED';

export type MatchStatus = 'NOTIFIED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export type NotificationType = 
  | 'EMERGENCY_REQUEST'
  | 'DONOR_RESPONSE'
  | 'STATUS_UPDATE'
  | 'ADMIN_ALERT'
  | 'SYSTEM';

export interface User {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  mobile: string;
  date_of_birth?: string;
  role: UserRole;
  status: UserStatus;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface DonorProfile {
  id: string;
  user_id: string;
  blood_group: BloodGroup;
  last_donation_date?: string;
  donation_type: string;
  availability_status: DonorAvailability;
  profile_completion_pct: number;
  created_at: string;
  updated_at: string;
  user?: Partial<User>;
  location?: Location;
}

export interface RequesterProfile {
  id: string;
  user_id: string;
  requester_type: 'Patient' | 'Attendant';
  created_at: string;
  updated_at: string;
  user?: Partial<User>;
  location?: Location;
}

export interface Location {
  id: string;
  entity_type: 'user' | 'donor' | 'hospital' | 'request';
  entity_id: string;
  state: string;
  district: string;
  taluka: string;
  locality: string;
  address?: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  district: string;
  taluka: string;
  state: string;
  latitude: number;
  longitude: number;
  contact_number: string;
  blood_bank_available: boolean;
  email?: string;
  created_at: string;
}

export interface BloodRequest {
  id: string;
  requester_id: string;
  patient_name: string;
  patient_age: number;
  blood_group: BloodGroup;
  blood_component: BloodComponent;
  units_required: number;
  hospital_name: string;
  hospital_address: string;
  latitude: number;
  longitude: number;
  required_date: string;
  required_time: string;
  priority: RequestPriority;
  status: RequestStatus;
  additional_details?: string;
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  requester?: Partial<User>;
  matches_count?: number;
  accepted_count?: number;
}

export interface DonorMatch {
  id: string;
  request_id: string;
  donor_id: string;
  distance_km: number;
  search_radius_km: number;
  status: MatchStatus;
  match_score: number;
  responded_at?: string;
  response_notes?: string;
  created_at: string;
  donor?: Partial<DonorProfile> & { full_name?: string; mobile?: string; locality?: string; district?: string };
  request?: Partial<BloodRequest>;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  metadata_json?: string;
  created_at: string;
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
}
