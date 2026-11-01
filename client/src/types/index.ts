export type UserRole = 'donor' | 'requester' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'pending';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
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

export interface User {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  role: UserRole;
  status: UserStatus;
  isVerified: boolean;
  blood_group?: BloodGroup;
  availability_status?: DonorAvailability;
  requester_type?: 'Patient' | 'Attendant';
  locality?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
}

export interface BloodRequest {
  id: string;
  requester_id: string;
  patient_name: string;
  patient_age: number;
  blood_group: BloodGroup;
  blood_component: string;
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
  created_at: string;
  matches_count?: number;
  accepted_count?: number;
  requester_name?: string;
  requester_mobile?: string;
}

export interface DonorMatch {
  id: string;
  distance_km: number;
  search_radius_km: number;
  status: 'NOTIFIED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  match_score: number;
  responded_at?: string;
  response_notes?: string;
  full_name?: string;
  mobile?: string;
  blood_group?: BloodGroup;
  locality?: string;
  district?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  metadata_json?: string;
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
}
