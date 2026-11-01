import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FilePlus2,
  Clock,
  Building2,
  MapPin,
  CheckCircle2,
  XCircle,
  Users,
  AlertCircle,
  Eye,
  PhoneCall,
  Calendar,
  Activity,
  HeartHandshake,
} from 'lucide-react';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { EmergencyRequestModal } from '../components/EmergencyRequestModal';
import { MedicalDisclaimer } from '../components/MedicalDisclaimer';
import { BloodRequest, DonorMatch } from '../types';

export const RequesterDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<BloodRequest | null>(null);
  const [matches, setMatches] = useState<DonorMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchRequests = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/v1/requests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests || []);
        if (data.requests?.length > 0 && !selectedRequest) {
          fetchRequestDetails(data.requests[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRequestDetails = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/requests/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSelectedRequest(data.request);
        setMatches(data.matches || []);
      }
    } catch (err) {
      console.error('Error fetching request details:', err);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [token]);

  const handleCancelRequest = async (id: string) => {
    if (!token || !window.confirm('Are you sure you want to cancel this emergency request? Matching and pending notifications will be stopped.')) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/requests/${id}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        await fetchRequests();
        if (selectedRequest?.id === id) {
          fetchRequestDetails(id);
        }
      }
    } catch (err) {
      console.error('Error cancelling request:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-xs text-gray-500">
        Loading patient attendant dashboard...
      </div>
    );
  }

  const activeCount = requests.filter((r) =>
    ['PENDING_VERIFICATION', 'VERIFIED', 'SEARCHING', 'DONOR_RESPONSES', 'COORDINATING'].includes(r.status)
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. WELCOME & ACTION BAR */}
      <div className="rounded-3xl bg-white border border-gray-200/80 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            Patient & Attendant Coordination Desk
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight">
            Requester Dashboard
          </h1>
          <p className="text-xs text-gray-500">
            Logged in as <strong>{user?.fullName}</strong> ({user?.requester_type || 'Patient Attendant'})
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-blood-700 text-white font-bold text-xs hover:bg-blood-800 shadow-md hover:shadow-lg transition"
        >
          <FilePlus2 className="w-4 h-4" />
          Create Emergency Blood Request
        </button>
      </div>

      {/* 2. SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-1">
          <span className="text-xs text-gray-500 font-semibold">Total Requests Created</span>
          <p className="text-2xl font-black text-charcoal-900">{requests.length}</p>
          <span className="text-[10px] text-gray-500">Historical & active</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-1">
          <span className="text-xs text-gray-500 font-semibold">Active In-Progress Requests</span>
          <p className="text-2xl font-black text-blood-700">{activeCount}</p>
          <span className="text-[10px] text-amber-700 font-medium">Under matching or verification</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-1">
          <span className="text-xs text-gray-500 font-semibold">Hospital Coordination</span>
          <p className="text-2xl font-black text-emerald-600">Active</p>
          <span className="text-[10px] text-gray-500">Clinical cross-matching desks linked</span>
        </div>
      </div>

      {/* 3. SPLIT WORKFLOW: LIST OF REQUESTS (LEFT) + DETAILS & POTENTIAL DONORS (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Requests List */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-lg font-bold text-charcoal-900 tracking-tight flex items-center justify-between">
            <span>Your Emergency Requests</span>
            <span className="text-xs font-normal text-gray-500">{requests.length} total</span>
          </h2>

          {requests.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white border border-gray-200 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="text-xs text-gray-500">You haven&apos;t created any blood requests yet.</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-blood-700 text-white rounded-xl text-xs font-semibold shadow"
              >
                Create First Request
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => {
                const isSelected = selectedRequest?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => fetchRequestDetails(r.id)}
                    className={`p-5 rounded-2xl bg-white border cursor-pointer transition shadow-xs hover:shadow-md space-y-3 ${
                      isSelected
                        ? 'border-blood-700 ring-2 ring-blood-700/20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <PriorityBadge priority={r.priority} />
                        <span className="text-xs font-black text-blood-700 bg-blood-50 px-2.5 py-0.5 rounded-full border border-blood-100">
                          {r.blood_group}
                        </span>
                      </div>
                      <StatusBadge status={r.status} size="sm" />
                    </div>

                    <div className="space-y-1 text-xs">
                      <h3 className="font-bold text-charcoal-900 text-sm">
                        {r.patient_name} (Age: {r.patient_age})
                      </h3>
                      <p className="text-gray-600 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-blood-700 shrink-0" />
                        {r.hospital_name}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {r.blood_component} • {r.units_required} {r.units_required === 1 ? 'unit' : 'units'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px] text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Needed {r.required_date}
                      </span>
                      <span className="font-semibold text-blood-700">
                        {r.accepted_count || 0} donors willing
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Selected Request Tracking & Potential Donors Responses */}
        <div className="lg:col-span-7">
          {selectedRequest ? (
            <div className="rounded-3xl bg-white border border-gray-200/80 p-6 sm:p-8 shadow-sm space-y-6 text-xs text-charcoal-800">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={selectedRequest.priority} />
                    <StatusBadge status={selectedRequest.status} />
                  </div>
                  <h3 className="text-xl font-bold text-charcoal-900 mt-2">
                    Request for {selectedRequest.patient_name}
                  </h3>
                  <p className="text-gray-500 mt-0.5">
                    ID: #{selectedRequest.id.slice(0, 8)} • Required Blood Group:{' '}
                    <strong className="text-blood-700 font-black text-sm">{selectedRequest.blood_group}</strong>
                  </p>
                </div>

                {!['CANCELLED', 'FULFILLED', 'REJECTED'].includes(selectedRequest.status) && (
                  <button
                    onClick={() => handleCancelRequest(selectedRequest.id)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition"
                  >
                    Cancel Request
                  </button>
                )}
              </div>

              {/* Status Pipeline Visualizer */}
              <div className="space-y-2 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <span className="font-bold text-[11px] text-gray-500 uppercase tracking-wider block">
                  Live Emergency Tracking Pipeline
                </span>
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {[
                    { key: 'PENDING_VERIFICATION', label: '1. Verification' },
                    { key: 'SEARCHING', label: '2. 5-25km Search' },
                    { key: 'DONOR_RESPONSES', label: '3. Willing Donors' },
                    { key: 'FULFILLED', label: '4. Transfused Safe' },
                  ].map((step) => {
                    const statusOrder = ['PENDING_VERIFICATION', 'SEARCHING', 'DONOR_RESPONSES', 'FULFILLED'];
                    const currentIdx = statusOrder.indexOf(selectedRequest.status);
                    const stepIdx = statusOrder.indexOf(step.key);
                    const isDone = currentIdx >= stepIdx;

                    return (
                      <div
                        key={step.key}
                        className={`p-2 rounded-xl text-center text-[10px] font-bold border transition ${
                          isDone
                            ? 'bg-blood-700 text-white border-blood-700'
                            : 'bg-white text-gray-400 border-gray-200'
                        }`}
                      >
                        {step.label}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Request Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                  <span className="text-gray-500 text-[11px]">Hospital & Blood Centre</span>
                  <p className="font-bold text-charcoal-900">{selectedRequest.hospital_name}</p>
                  <p className="text-[11px] text-gray-600">{selectedRequest.hospital_address}</p>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                  <span className="text-gray-500 text-[11px]">Component & Requirement</span>
                  <p className="font-bold text-charcoal-900">{selectedRequest.blood_component}</p>
                  <p className="text-[11px] text-gray-600">
                    Units Needed: <strong>{selectedRequest.units_required}</strong>
                  </p>
                </div>
              </div>

              {selectedRequest.additional_details && (
                <div className="p-3 bg-gray-50 rounded-xl text-xs text-charcoal-700">
                  <span className="font-semibold block text-[11px] text-gray-500">Case Notes:</span>
                  <p className="italic mt-0.5">&quot;{selectedRequest.additional_details}&quot;</p>
                </div>
              )}

              {/* Matched Potential Donors List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-charcoal-900 text-sm flex items-center gap-1.5">
                    <HeartHandshake className="w-4 h-4 text-blood-700" />
                    Potential Donors Identified ({matches.length})
                  </h4>
                  <span className="text-[10px] text-gray-500">Ranked by distance & availability</span>
                </div>

                {matches.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-gray-50 text-center text-xs text-gray-500 space-y-1">
                    <p>No potential donors have responded yet.</p>
                    <span className="text-[11px]">
                      If the request is in <em>PENDING_VERIFICATION</em>, our medical desk will review it before matching.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {matches.map((m) => {
                      const isWilling = m.status === 'ACCEPTED';
                      return (
                        <div
                          key={m.id}
                          className={`p-4 rounded-2xl border transition space-y-2 ${
                            isWilling
                              ? 'bg-emerald-50/50 border-emerald-200'
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-charcoal-900 text-xs">{m.full_name}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blood-100 text-blood-800">
                                {m.blood_group}
                              </span>
                              <span className="text-gray-500 text-[11px]">
                                ({m.distance_km} km away • {m.locality})
                              </span>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isWilling
                                  ? 'bg-emerald-600 text-white'
                                  : m.status === 'DECLINED'
                                  ? 'bg-gray-200 text-gray-600'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isWilling ? 'Willing to Donate' : m.status}
                            </span>
                          </div>

                          {m.response_notes && (
                            <p className="text-[11px] text-emerald-900 bg-white/80 p-2 rounded-lg border border-emerald-100 italic">
                              &quot;{m.response_notes}&quot;
                            </p>
                          )}

                          {isWilling && m.mobile && (
                            <div className="pt-1 flex items-center justify-between text-xs">
                              <span className="text-emerald-800 text-[11px]">Contact Donor:</span>
                              <a
                                href={`tel:${m.mobile}`}
                                className="font-bold text-emerald-800 hover:underline flex items-center gap-1"
                              >
                                <PhoneCall className="w-3.5 h-3.5" />
                                {m.mobile}
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <MedicalDisclaimer compact />
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-white border border-gray-200 text-center text-xs text-gray-500">
              Select an emergency request from the left column to view tracking and donor responses.
            </div>
          )}
        </div>
      </div>

      <EmergencyRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRequestCreated={fetchRequests}
      />
    </div>
  );
};
