import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Heart,
  Droplet,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  Building2,
  History,
  AlertCircle,
  ShieldCheck,
  Calendar,
  Send,
  PlusCircle,
  UserCheck,
} from 'lucide-react';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { MedicalDisclaimer } from '../components/MedicalDisclaimer';
import { DonorAvailability } from '../types';

export const DonorDashboard: React.FC = () => {
  const { user, token, updateAvailability } = useAuth();

  const [profile, setProfile] = useState<any | null>(null);
  const [assignedRequests, setAssignedRequests] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Respond Modal State
  const [respondingReq, setRespondingReq] = useState<any | null>(null);
  const [responseType, setResponseType] = useState<'ACCEPTED' | 'DECLINED'>('ACCEPTED');
  const [responseNotes, setResponseNotes] = useState('');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

  // New Donation Record Modal
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [donationDate, setDonationDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [hospitalName, setHospitalName] = useState('Ruby Hall Clinic');
  const [unitsDonated, setUnitsDonated] = useState(1);
  const [bloodComponent, setBloodComponent] = useState('Whole Blood');
  const [donationNotes, setDonationNotes] = useState('Voluntary camp donation');

  const fetchDonorData = async () => {
    if (!token) return;
    try {
      const [profileRes, reqsRes, histRes] = await Promise.all([
        fetch('/api/v1/donors/profile', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/donors/requests', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/donors/history', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [profileData, reqsData, histData] = await Promise.all([
        profileRes.json(),
        reqsRes.json(),
        histRes.json(),
      ]);

      if (profileData.success) setProfile(profileData.profile);
      if (reqsData.success) setAssignedRequests(reqsData.requests || []);
      if (histData.success) setHistory(histData.history || []);
    } catch (err) {
      console.error('Failed to load donor data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDonorData();
  }, [token]);

  const handleAvailabilityChange = async (status: DonorAvailability) => {
    const success = await updateAvailability(status);
    if (success && profile) {
      setProfile({ ...profile, availability_status: status });
    }
  };

  const handleOpenRespond = (req: any, type: 'ACCEPTED' | 'DECLINED') => {
    setRespondingReq(req);
    setResponseType(type);
    setResponseNotes('');
  };

  const handleSubmitResponse = async () => {
    if (!respondingReq || !token) return;
    setIsSubmittingResponse(true);

    try {
      const res = await fetch(`/api/v1/donors/requests/${respondingReq.request_id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          response: responseType,
          notes: responseNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setRespondingReq(null);
        await fetchDonorData();
      }
    } catch (err) {
      console.error('Error responding:', err);
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  const handleLogDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      const res = await fetch('/api/v1/donors/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          donationDate,
          hospitalName,
          unitsDonated: Number(unitsDonated),
          bloodComponent,
          notes: donationNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowDonationModal(false);
        await fetchDonorData();
      }
    } catch (err) {
      console.error('Error logging donation:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-xs text-gray-500">
        Loading donor dashboard...
      </div>
    );
  }

  const currentAvailability: DonorAvailability =
    profile?.availability_status || user?.availability_status || 'AVAILABLE';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. WELCOME & STATUS HEADER */}
      <div className="rounded-3xl bg-gradient-to-r from-blood-700 via-blood-800 to-blood-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-blood-100 text-xs font-semibold backdrop-blur-sm">
              <UserCheck className="w-3.5 h-3.5" />
              Voluntary Registered Donor Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, {user?.fullName || profile?.user?.full_name}
            </h1>
            <p className="text-xs text-blood-200">
              Locality: <strong className="text-white">{profile?.location?.locality || 'Pune'}</strong> | District: {profile?.location?.district || 'Pune'}
            </p>
          </div>

          {/* Blood Group & Availability Badge */}
          <div className="flex items-center gap-4 bg-white/10 p-3 rounded-2xl backdrop-blur border border-white/15">
            <div className="w-16 h-16 rounded-xl bg-white text-blood-700 flex flex-col items-center justify-center font-black shadow-md">
              <span className="text-xs uppercase font-bold text-gray-500">Group</span>
              <span className="text-2xl -mt-1">{profile?.blood_group || user?.blood_group || 'O+'}</span>
            </div>

            <div className="space-y-1 text-xs">
              <span className="text-[11px] text-blood-200 block">Your Discovery Status:</span>
              <span
                className={`inline-block px-2.5 py-1 rounded-lg font-bold text-xs ${
                  currentAvailability === 'AVAILABLE'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : currentAvailability === 'TEMPORARILY_UNAVAILABLE'
                    ? 'bg-amber-400 text-amber-950 font-bold'
                    : 'bg-gray-700 text-gray-200'
                }`}
              >
                {currentAvailability === 'AVAILABLE'
                  ? 'AVAILABLE FOR REQUESTS'
                  : currentAvailability === 'TEMPORARILY_UNAVAILABLE'
                  ? 'TEMPORARILY UNAVAILABLE'
                  : 'NOT ACCEPTING REQUESTS'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Availability Switcher */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-blood-200 font-semibold mr-1">Change Availability:</span>
          <button
            onClick={() => handleAvailabilityChange('AVAILABLE')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              currentAvailability === 'AVAILABLE'
                ? 'bg-white text-blood-800 shadow font-bold'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Available
          </button>
          <button
            onClick={() => handleAvailabilityChange('TEMPORARILY_UNAVAILABLE')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              currentAvailability === 'TEMPORARILY_UNAVAILABLE'
                ? 'bg-white text-amber-900 shadow font-bold'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Temporarily Unavailable
          </button>
          <button
            onClick={() => handleAvailabilityChange('NOT_ACCEPTING')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              currentAvailability === 'NOT_ACCEPTING'
                ? 'bg-white text-charcoal-900 shadow font-bold'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Not Accepting
          </button>
        </div>
      </div>

      {/* 2. STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-1">
          <span className="text-xs text-gray-500 font-semibold">Matched Emergency Requests</span>
          <p className="text-2xl font-black text-charcoal-900">{assignedRequests.length}</p>
          <span className="text-[10px] text-blood-700 font-medium">Within progressive 25 km radius</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-1">
          <span className="text-xs text-gray-500 font-semibold">Recorded Lifetime Donations</span>
          <p className="text-2xl font-black text-emerald-600">{history.length}</p>
          <span className="text-[10px] text-gray-500">Voluntary verified donations</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-1">
          <span className="text-xs text-gray-500 font-semibold">Last Donation Date</span>
          <p className="text-sm font-bold text-charcoal-900">
            {profile?.last_donation_date || 'None Recorded'}
          </p>
          <span className="text-[10px] text-emerald-600 font-medium">Rest interval active</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-1 flex flex-col justify-between">
          <span className="text-xs text-gray-500 font-semibold">Profile Completion</span>
          <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
            <div className="bg-blood-700 h-2 rounded-full w-full"></div>
          </div>
          <span className="text-[10px] text-gray-500">100% Health Screening Verified</span>
        </div>
      </div>

      {/* 3. ASSIGNED / NEARBY EMERGENCY REQUESTS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-charcoal-900 tracking-tight flex items-center gap-2">
              <Droplet className="w-5 h-5 text-blood-700 fill-blood-700" />
              Nearby Emergency Blood Requests
            </h2>
            <p className="text-xs text-gray-500">
              Matched based on your declared blood group ({profile?.blood_group || 'O+'}) and proximity radius.
            </p>
          </div>
        </div>

        {assignedRequests.length === 0 ? (
          <div className="p-10 rounded-2xl bg-white border border-gray-200 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-bold text-charcoal-900">No active emergency requests nearby</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              There are currently no urgent requests matching your blood group in your area. You will receive an immediate in-app and SMS alert if an emergency arises.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {assignedRequests.map((req) => {
              const isAccepted = req.response_status === 'ACCEPTED';
              const isDeclined = req.response_status === 'DECLINED';

              return (
                <div
                  key={req.match_id}
                  className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <PriorityBadge priority={req.priority} />
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blood-50 text-blood-700 border border-blood-200">
                          {req.distance_km} km away [Tier: {req.search_radius_km}km]
                        </span>
                      </div>
                      <StatusBadge status={req.request_status} size="sm" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-charcoal-900">
                        {req.blood_group} {req.blood_component} ({req.units_required} {req.units_required === 1 ? 'unit' : 'units'})
                      </h3>
                      <p className="text-xs text-gray-600 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blood-700 shrink-0" />
                        <strong>{req.hospital_name}</strong>
                      </p>
                      <p className="text-[11px] text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                        {req.hospital_address}
                      </p>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-xl text-xs text-charcoal-700 space-y-1">
                      <p>
                        <strong>Patient:</strong> {req.patient_name} (Age: {req.patient_age})
                      </p>
                      <p className="flex items-center gap-1 text-[11px] text-gray-500">
                        <Clock className="w-3.5 h-3.5" /> Needed by {req.required_date} at {req.required_time}
                      </p>
                      {req.additional_details && (
                        <p className="text-[11px] text-gray-600 italic mt-1">&quot;{req.additional_details}&quot;</p>
                      )}
                    </div>
                  </div>

                  {/* Actions / Current status */}
                  <div className="pt-2 border-t border-gray-100">
                    {isAccepted ? (
                      <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>You expressed willingness to donate. The hospital team has been informed.</span>
                      </div>
                    ) : isDeclined ? (
                      <div className="p-2.5 bg-gray-100 rounded-xl text-xs text-gray-600 flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>You marked this request as declined.</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenRespond(req, 'ACCEPTED')}
                          className="flex-1 py-2 px-3 rounded-xl bg-blood-700 hover:bg-blood-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Express Willingness
                        </button>
                        <button
                          onClick={() => handleOpenRespond(req, 'DECLINED')}
                          className="py-2 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. DONATION HISTORY LOG */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-charcoal-900 tracking-tight flex items-center gap-2">
              <History className="w-5 h-5 text-blood-700" />
              Your Donation History
            </h2>
            <p className="text-xs text-gray-500">Track and log your voluntary blood and platelet donations.</p>
          </div>
          <button
            onClick={() => setShowDonationModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-300 text-xs font-semibold text-charcoal-800 hover:bg-gray-50 shadow-xs"
          >
            <PlusCircle className="w-4 h-4 text-blood-700" />
            Log Completed Donation
          </button>
        </div>

        <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-xs text-xs text-charcoal-800">
          {history.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No previous donation records logged yet. Use the button above to log completed donations.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left divide-y divide-gray-200">
                <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Hospital / Blood Centre</th>
                    <th className="py-3 px-4">Component</th>
                    <th className="py-3 px-4">Units</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50/60">
                      <td className="py-3 px-4 font-semibold text-charcoal-900">{h.donation_date}</td>
                      <td className="py-3 px-4 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blood-700" />
                        {h.hospital_name}
                      </td>
                      <td className="py-3 px-4">{h.blood_component}</td>
                      <td className="py-3 px-4 font-bold">{h.units_donated} unit</td>
                      <td className="py-3 px-4 text-gray-500">{h.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <MedicalDisclaimer />

      {/* RESPOND MODAL WITH MANDATORY REGULATORY STATEMENT */}
      {respondingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-gray-200 text-xs text-charcoal-800 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-charcoal-900">
              {responseType === 'ACCEPTED'
                ? 'Express Willingness to Donate'
                : 'Decline Emergency Request'}
            </h3>

            {responseType === 'ACCEPTED' ? (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-2 text-amber-900">
                <p className="font-bold flex items-center gap-1.5 text-amber-950">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  Mandatory Medical Understanding:
                </p>
                <p className="text-[11px] leading-relaxed">
                  By clicking accept, you are expressing your <strong>willingness to be contacted</strong> by the hospital attendant. 
                  This does <em>not</em> guarantee blood availability or medical eligibility. 
                  Final clinical suitability and cross-matching will be evaluated by licensed blood centre personnel.
                </p>
              </div>
            ) : (
              <p className="text-gray-600">
                Are you sure you wish to decline? This helps the matching engine accurately notify other donors in the next radius tier.
              </p>
            )}

            <div className="space-y-1">
              <label className="font-semibold text-charcoal-700">Optional Notes / Availability Window</label>
              <textarea
                rows={2}
                placeholder="e.g. Can reach Ruby Hall blood centre by 2:30 PM."
                value={responseNotes}
                onChange={(e) => setResponseNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blood-700 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRespondingReq(null)}
                className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitResponse}
                disabled={isSubmittingResponse}
                className={`px-5 py-2.5 rounded-xl font-bold text-white shadow transition ${
                  responseType === 'ACCEPTED'
                    ? 'bg-blood-700 hover:bg-blood-800'
                    : 'bg-gray-800 hover:bg-black'
                }`}
              >
                {isSubmittingResponse ? 'Submitting...' : 'Confirm Response'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOG DONATION MODAL */}
      {showDonationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-200 text-xs text-charcoal-800">
            <h3 className="text-base font-bold text-charcoal-900">Log Completed Donation</h3>

            <form onSubmit={handleLogDonation} className="space-y-3">
              <div className="space-y-1">
                <label className="font-semibold text-charcoal-700">Donation Date</label>
                <input
                  type="date"
                  required
                  value={donationDate}
                  onChange={(e) => setDonationDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-charcoal-700">Hospital / Blood Centre</label>
                <input
                  type="text"
                  required
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-charcoal-700">Component</label>
                  <select
                    value={bloodComponent}
                    onChange={(e) => setBloodComponent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white"
                  >
                    <option value="Whole Blood">Whole Blood</option>
                    <option value="Platelets">Platelets</option>
                    <option value="Plasma">Plasma</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-charcoal-700">Units Donated</label>
                  <input
                    type="number"
                    min="1"
                    max="3"
                    value={unitsDonated}
                    onChange={(e) => setUnitsDonated(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-charcoal-700">Notes / Remarks</label>
                <input
                  type="text"
                  value={donationNotes}
                  onChange={(e) => setDonationNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDonationModal(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blood-700 hover:bg-blood-800 text-white font-bold shadow"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
