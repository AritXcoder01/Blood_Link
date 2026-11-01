/// <reference types="vite/client" />
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Heart,
  Droplet,
  User,
  MapPin,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import { BloodGroup } from '../types';
import { InteractiveMap } from '../components/InteractiveMap';
import { MedicalDisclaimer } from '../components/MedicalDisclaimer';

export const DonorRegisterPage: React.FC = () => {
  const { registerDonor } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Personal Information
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('2000-01-01');

  // Step 2: Blood Information
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O+');
  const [donationType, setDonationType] = useState('Whole Blood');
  const [lastDonationDate, setLastDonationDate] = useState('');

  // Step 3: Location
  const [state, setState] = useState('Maharashtra');
  const [district, setDistrict] = useState('Pune');
  const [taluka, setTaluka] = useState('Haveli');
  const [locality, setLocality] = useState('Shivajinagar');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number>(18.5308);
  const [longitude, setLongitude] = useState<number>(73.8475);

  // Step 4: Health Questionnaire & Consent
  const [medicalHistory, setMedicalHistory] = useState('None');
  const [currentMedication, setCurrentMedication] = useState('None');
  const [recentIllness, setRecentIllness] = useState('None in last 6 months');
  const [knownAllergies, setKnownAllergies] = useState('None');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);

  // OTP Verification Modal
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  // Validate Age (>= 18)
  const isAdult = () => {
    const dob = new Date(dateOfBirth);
    const now = new Date();
    const age = (now.getTime() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
    return age >= 18;
  };

  const handleNext = () => {
    setErrorMsg('');
    if (currentStep === 1) {
      if (!fullName.trim() || !email.trim() || !password || !mobile.trim()) {
        setErrorMsg('Please complete all required personal fields.');
        return;
      }
      if (!isAdult()) {
        setErrorMsg('Donors must be at least 18 years old to register.');
        return;
      }
    } else if (currentStep === 2) {
      if (!bloodGroup) {
        setErrorMsg('Please select your blood group.');
        return;
      }
    } else if (currentStep === 3) {
      if (!state.trim() || !district.trim() || !locality.trim()) {
        setErrorMsg('Please provide state, district, and locality.');
        return;
      }
    }
    setCurrentStep((prev) => Math.min(4, prev + 1));
  };

  const handlePrev = () => {
    setErrorMsg('');
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!consentGiven) {
      setErrorMsg('You must provide informed consent to register as a voluntary donor.');
      return;
    }

    // Trigger Demo OTP verification modal
    setShowOtpModal(true);
  };

  const handleConfirmOtpAndRegister = async () => {
    setIsSubmitting(true);
    setShowOtpModal(false);

    const payload = {
      fullName,
      email,
      password,
      mobile,
      dateOfBirth,
      bloodGroup,
      donationType,
      lastDonationDate: lastDonationDate || null,
      state,
      district,
      taluka,
      locality,
      address,
      latitude,
      longitude,
      medicalHistory,
      currentMedication,
      recentIllness,
      knownAllergies,
      additionalNotes,
      consentGiven,
    };

    const res = await registerDonor(payload);
    setIsSubmitting(false);

    if (res.success) {
      navigate('/donor/dashboard');
    } else {
      setErrorMsg(res.message || 'Registration failed.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Wizard Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-blood-700 text-white flex items-center justify-center mx-auto shadow-md shadow-blood-700/20">
          <Heart className="w-7 h-7 fill-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-charcoal-900 tracking-tight">
          Voluntary Donor Registration
        </h1>
        <p className="text-xs text-gray-500">
          Join the local emergency discovery network. Age 18+ requirement.
        </p>
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-4 gap-2 border-b border-gray-200 pb-4">
        {[
          { step: 1, label: '1. Personal Info', icon: User },
          { step: 2, label: '2. Blood Info', icon: Droplet },
          { step: 3, label: '3. Location', icon: MapPin },
          { step: 4, label: '4. Health & Consent', icon: FileText },
        ].map((s) => {
          const isActive = currentStep === s.step;
          const isDone = currentStep > s.step;
          return (
            <div
              key={s.step}
              className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? 'bg-blood-50 text-blood-700 border border-blood-200'
                  : isDone
                  ? 'text-emerald-700'
                  : 'text-gray-400'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                  isActive
                    ? 'bg-blood-700 text-white'
                    : isDone
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : s.step}
              </div>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          );
        })}
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Wizard Form Container */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-gray-200 shadow-sm">
        {/* STEP 1: PERSONAL INFORMATION */}
        {currentStep === 1 && (
          <div className="space-y-4 text-xs text-charcoal-800">
            <h3 className="text-base font-bold text-charcoal-900 border-b border-gray-100 pb-2">
              Step 1: Personal & Account Credentials
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-charcoal-700">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Deshmukh"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blood-700 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-charcoal-700">Date of Birth (Min Age: 18) *</label>
                <input
                  type="date"
                  required
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blood-700 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-charcoal-700">Mobile Number (for SMS Alerts) *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91-9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blood-700 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-charcoal-700">Email Address (Login ID) *</label>
                <input
                  type="email"
                  required
                  placeholder="rahul@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blood-700 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="font-semibold text-charcoal-700">Account Password (Min 6 chars) *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blood-700 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: BLOOD INFORMATION */}
        {currentStep === 2 && (
          <div className="space-y-6 text-xs text-charcoal-800">
            <h3 className="text-base font-bold text-charcoal-900 border-b border-gray-100 pb-2">
              Step 2: Blood Type & Prior Donation History
            </h3>

            <div className="space-y-2">
              <label className="font-semibold text-charcoal-700">Select Your ABO/Rh Blood Group *</label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {(['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] as BloodGroup[]).map((bg) => (
                  <button
                    key={bg}
                    type="button"
                    onClick={() => setBloodGroup(bg)}
                    className={`py-3 rounded-xl border text-center font-bold text-sm transition ${
                      bloodGroup === bg
                        ? 'bg-blood-700 text-white border-blood-700 shadow-md ring-2 ring-blood-700/20'
                        : 'bg-gray-50 text-charcoal-800 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {bg}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <label className="font-semibold text-charcoal-700">Donation Preference Type</label>
                <select
                  value={donationType}
                  onChange={(e) => setDonationType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white"
                >
                  <option value="Whole Blood">Whole Blood (Standard)</option>
                  <option value="Packed Red Blood Cells (PRBC)">Packed Red Blood Cells</option>
                  <option value="Platelets">Platelet Apheresis (SDP)</option>
                  <option value="Plasma">Fresh Frozen Plasma</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-charcoal-700">Last Blood Donation Date (if applicable)</label>
                <input
                  type="date"
                  value={lastDonationDate}
                  onChange={(e) => setLastDonationDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
                <span className="text-[10px] text-gray-500">
                  Recommended rest interval between whole blood donations is 90 days.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: LOCATION & MAP SELECTION */}
        {currentStep === 3 && (
          <div className="space-y-6 text-xs text-charcoal-800">
            <h3 className="text-base font-bold text-charcoal-900 border-b border-gray-100 pb-2">
              Step 3: Residential Locality & Proximity Radius
            </h3>
            <p className="text-gray-500 text-xs">
              GPS coordinates are used strictly by the matching engine to compute distance tiers (5km, 10km, 25km). Your exact home address is never revealed to other users.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-charcoal-700">State *</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-charcoal-700">District *</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-charcoal-700">Taluka *</label>
                <input
                  type="text"
                  value={taluka}
                  onChange={(e) => setTaluka(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-charcoal-700">Locality / Area Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Kothrud / Baner / Camp"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>
            </div>

            {/* Interactive Map Picker */}
            <div className="space-y-2 pt-2">
              <label className="font-semibold text-charcoal-700 block">
                Pin Location on Map (Click on map to adjust coordinates):
              </label>
              <div className="h-64 rounded-xl overflow-hidden border border-gray-300">
                <InteractiveMap
                  center={[latitude, longitude]}
                  zoom={13}
                  selectedCoord={[latitude, longitude]}
                  onLocationSelect={(lat, lng) => {
                    setLatitude(Math.round(lat * 10000) / 10000);
                    setLongitude(Math.round(lng * 10000) / 10000);
                  }}
                />
              </div>
              <span className="text-[11px] text-gray-500">
                Selected coordinates: Lat {latitude}, Lng {longitude}
              </span>
            </div>
          </div>
        )}

        {/* STEP 4: HEALTH QUESTIONNAIRE & INFORMED CONSENT */}
        {currentStep === 4 && (
          <form onSubmit={handleFinalSubmit} className="space-y-6 text-xs text-charcoal-800">
            <h3 className="text-base font-bold text-charcoal-900 border-b border-gray-100 pb-2">
              Step 4: Preliminary Health Questionnaire & Consent
            </h3>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="font-semibold text-charcoal-700">
                  Relevant Medical Conditions or Chronic Illnesses
                </label>
                <input
                  type="text"
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-charcoal-700">Current Medications (if any)</label>
                <input
                  type="text"
                  value={currentMedication}
                  onChange={(e) => setCurrentMedication(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-charcoal-700">Recent Illness or Fever in Past 30 Days</label>
                <input
                  type="text"
                  value={recentIllness}
                  onChange={(e) => setRecentIllness(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-charcoal-700">Known Allergies</label>
                <input
                  type="text"
                  value={knownAllergies}
                  onChange={(e) => setKnownAllergies(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>
            </div>

            {/* Mandatory Regulatory Statement */}
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-2 text-amber-900">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                Medical Screening Protocol
              </div>
              <p className="text-[11px] leading-relaxed">
                Registration on Blood_Link does <strong>not</strong> certify clinical fitness to donate. 
                Full medical assessment, hemoglobin check, blood pressure measurement, and infectious marker testing are mandatorily conducted by certified medical personnel at the blood centre prior to any collection.
              </p>
            </div>

            {/* Informed Consent Checkbox */}
            <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="mt-0.5 rounded text-blood-700 focus:ring-blood-700 h-4 w-4"
              />
              <span className="text-xs text-charcoal-800 leading-relaxed">
                I hereby declare that I am at least 18 years of age, and voluntarily consent to be notified of emergency blood needs nearby. I understand that responding expresses my willingness to be contacted, and final donation eligibility will be decided by the hospital blood centre.
              </span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting || !consentGiven}
              className="w-full py-3 rounded-xl bg-blood-700 text-white font-bold text-xs hover:bg-blood-800 disabled:opacity-50 shadow-md transition flex items-center justify-center gap-2"
            >
              Verify Mobile & Complete Registration <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Wizard Navigation Buttons */}
        {currentStep < 4 && (
          <div className="pt-6 mt-6 border-t border-gray-100 flex items-center justify-between">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="px-4 py-2 rounded-xl text-charcoal-700 hover:bg-gray-100 font-semibold text-xs flex items-center gap-1.5 transition"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <div></div>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-blood-700 text-white font-bold text-xs hover:bg-blood-800 shadow transition flex items-center gap-1.5"
            >
              Next Step <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Demo OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-gray-200 text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 bg-blood-50 text-blood-700 rounded-full flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-charcoal-900">
              Verify Mobile Number
            </h3>
            <p className="text-xs text-gray-500">
              In Live Demo Mode, standard OTP verification is simulated.
            </p>

            {import.meta.env.DEV && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs font-semibold">
                Development Notice: Simulated code (123456)
              </div>
            )}

            <input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              maxLength={6}
              className="w-full text-center tracking-widest font-mono text-lg py-2 rounded-xl border border-gray-300 font-bold focus:ring-2 focus:ring-blood-700 focus:outline-none"
            />

            <button
              onClick={handleConfirmOtpAndRegister}
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-blood-700 text-white font-bold text-xs hover:bg-blood-800 shadow transition"
            >
              {isSubmitting ? 'Verifying...' : 'Verify OTP & Enter Dashboard'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
