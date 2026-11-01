import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  X,
  AlertCircle,
  Building2,
  Clock,
  Calendar,
  HeartPulse,
  Send,
  CheckCircle2,
  MapPin,
} from 'lucide-react';
import { BloodGroup, Hospital } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRequestCreated?: () => void;
}

export const EmergencyRequestModal: React.FC<Props> = ({ isOpen, onClose, onRequestCreated }) => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('');
  const [isCustomHospital, setIsCustomHospital] = useState(false);

  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState<number>(30);
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O+');
  const [bloodComponent, setBloodComponent] = useState('Whole Blood');
  const [unitsRequired, setUnitsRequired] = useState<number>(2);
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [latitude, setLatitude] = useState<number>(18.5312);
  const [longitude, setLongitude] = useState<number>(73.8741);
  const [requiredDate, setRequiredDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [requiredTime, setRequiredTime] = useState('14:00');
  const [priority, setPriority] = useState<'CRITICAL' | 'URGENT' | 'SCHEDULED'>('CRITICAL');
  const [additionalDetails, setAdditionalDetails] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successResult, setSuccessResult] = useState<any | null>(null);

  // Fetch hospital directory
  useEffect(() => {
    if (!isOpen) return;
    const fetchHospitals = async () => {
      try {
        const res = await fetch('/api/v1/hospitals');
        const data = await res.json();
        if (data.success && data.hospitals?.length > 0) {
          setHospitals(data.hospitals);
          const first = data.hospitals[0];
          setSelectedHospitalId(first.id);
          setHospitalName(first.name);
          setHospitalAddress(first.address);
          setLatitude(Number(first.latitude));
          setLongitude(Number(first.longitude));
        }
      } catch (err) {
        console.error('Failed to load hospitals:', err);
      }
    };
    fetchHospitals();
  }, [isOpen]);

  const handleHospitalChange = (hId: string) => {
    setSelectedHospitalId(hId);
    if (hId === 'custom') {
      setIsCustomHospital(true);
      setHospitalName('');
      setHospitalAddress('');
    } else {
      setIsCustomHospital(false);
      const found = hospitals.find((h) => h.id === hId);
      if (found) {
        setHospitalName(found.name);
        setHospitalAddress(found.address);
        setLatitude(Number(found.latitude));
        setLongitude(Number(found.longitude));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!user) {
      navigate('/login?redirect=new-request');
      return;
    }

    if (!patientName.trim()) {
      setErrorMsg('Please provide the patient name.');
      return;
    }

    if (!hospitalName.trim() || !hospitalAddress.trim()) {
      setErrorMsg('Please specify hospital name and address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        patientName,
        patientAge: Number(patientAge),
        bloodGroup,
        bloodComponent,
        unitsRequired: Number(unitsRequired),
        hospitalName,
        hospitalAddress,
        latitude: Number(latitude),
        longitude: Number(longitude),
        requiredDate,
        requiredTime,
        priority,
        additionalDetails,
      };

      const res = await fetch('/api/v1/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessResult(data);
        if (onRequestCreated) onRequestCreated();
      } else {
        setErrorMsg(data.message || 'Failed to register blood request.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error while submitting request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blood-700 to-blood-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-lg">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">New Emergency Blood Request</h3>
              <p className="text-xs text-blood-100">Coordinate emergency voluntary blood donors</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success View */}
        {successResult ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-lg font-bold text-charcoal-900">
              Emergency Request Registered!
            </h4>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 text-left space-y-2">
              <p className="font-semibold text-amber-950 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                Status: PENDING_VERIFICATION
              </p>
              <p className="text-amber-800 leading-relaxed">
                {successResult.verificationNotice}
              </p>
              <p className="text-[11px] text-amber-700 italic">
                Our medical desk verifies hospital admission details before activating progressive 5km/10km/25km donor alerts to prevent false alarms.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  onClose();
                  navigate(user?.role === 'admin' ? '/admin' : '/requester/dashboard');
                }}
                className="px-5 py-2.5 bg-blood-700 text-white text-xs font-semibold rounded-xl hover:bg-blood-800 shadow transition"
              >
                Go to Tracker Dashboard
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs text-charcoal-800">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {!user && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg flex items-center justify-between">
                <span>Please sign in or register to submit a verified blood request.</span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/login');
                  }}
                  className="font-bold underline ml-2"
                >
                  Sign In
                </button>
              </div>
            )}

            {/* Row 1: Patient Name & Age */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="font-semibold text-charcoal-700">Patient Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patil"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blood-700 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-charcoal-700">Patient Age *</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  required
                  value={patientAge}
                  onChange={(e) => setPatientAge(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blood-700 focus:outline-none"
                />
              </div>
            </div>

            {/* Row 2: Blood Group, Component & Units */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-charcoal-700">Blood Group Required *</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blood-700 focus:outline-none bg-white font-bold text-blood-700"
                >
                  {(['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] as BloodGroup[]).map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-charcoal-700">Component *</label>
                <select
                  value={bloodComponent}
                  onChange={(e) => setBloodComponent(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blood-700 focus:outline-none bg-white"
                >
                  <option value="Whole Blood">Whole Blood</option>
                  <option value="Packed Red Blood Cells (PRBC)">Packed Red Blood Cells (PRBC)</option>
                  <option value="Platelets">Platelets (RDP / SDP)</option>
                  <option value="Fresh Frozen Plasma (FFP)">Fresh Frozen Plasma (FFP)</option>
                  <option value="Cryoprecipitate">Cryoprecipitate</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-charcoal-700">Units Required *</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={unitsRequired}
                  onChange={(e) => setUnitsRequired(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blood-700 focus:outline-none"
                />
              </div>
            </div>

            {/* Row 3: Priority */}
            <div className="space-y-1">
              <label className="font-semibold text-charcoal-700">Urgency Level *</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'CRITICAL', label: 'CRITICAL (Immediate)', color: 'text-red-700 bg-red-50 border-red-300' },
                  { id: 'URGENT', label: 'URGENT (< 24 Hours)', color: 'text-amber-800 bg-amber-50 border-amber-300' },
                  { id: 'SCHEDULED', label: 'SCHEDULED (Surgery)', color: 'text-blue-700 bg-blue-50 border-blue-300' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id as any)}
                    className={`py-2 px-3 rounded-lg border font-semibold text-center transition ${
                      priority === p.id
                        ? `${p.color} ring-2 ring-blood-700 font-bold`
                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 4: Hospital Selection */}
            <div className="space-y-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <label className="font-semibold text-charcoal-700 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blood-700" />
                Hospital & Blood Centre Selection (Pune Hub) *
              </label>

              <select
                value={selectedHospitalId}
                onChange={(e) => handleHospitalChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blood-700 focus:outline-none bg-white font-medium"
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} — {h.address}
                  </option>
                ))}
                <option value="custom">-- Enter Other Hospital / Custom Address --</option>
              </select>

              {isCustomHospital && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  <input
                    type="text"
                    required
                    placeholder="Hospital Name"
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-300 bg-white"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Full Hospital Address"
                    value={hospitalAddress}
                    onChange={(e) => setHospitalAddress(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-300 bg-white"
                  />
                </div>
              )}
            </div>

            {/* Row 5: Date, Time & Clinical Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-charcoal-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Required Date
                </label>
                <input
                  type="date"
                  required
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-charcoal-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Required Time
                </label>
                <input
                  type="time"
                  required
                  value={requiredTime}
                  onChange={(e) => setRequiredTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-charcoal-700">Clinical Case / Surgery Details</label>
              <textarea
                rows={2}
                placeholder="e.g., Cardiac bypass elective surgery at Ruby Hall Clinic. Attendant contact number at reception."
                value={additionalDetails}
                onChange={(e) => setAdditionalDetails(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blood-700 focus:outline-none"
              />
            </div>

            {/* Safety notice */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                <strong>Verification Safety Policy:</strong> Once registered, this request enters <em>PENDING_VERIFICATION</em>. Our medical desk confirms hospital admission details before broadcasting progressive 5km/10km/25km alerts to voluntary donors.
              </p>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-charcoal-600 hover:bg-gray-100 font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !user}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blood-700 text-white font-semibold hover:bg-blood-800 disabled:opacity-50 shadow transition"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Registering Request...' : 'Submit Emergency Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
