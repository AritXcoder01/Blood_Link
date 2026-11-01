import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Heart,
  Droplet,
  Users,
  Search,
  CheckCircle2,
  Clock,
  Shield,
  Activity,
  ArrowRight,
  PhoneCall,
  Sparkles,
  MapPin,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import { MedicalDisclaimer } from '../components/MedicalDisclaimer';
import { EmergencyRequestModal } from '../components/EmergencyRequestModal';
import { BloodGroup } from '../types';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<BloodGroup>('O+');

  // Compatibility Reference for interactive Matrix
  const compatibilityData: Record<BloodGroup, { canGiveTo: string[]; canReceiveFrom: string[]; type: string }> = {
    'O-': {
      canGiveTo: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
      canReceiveFrom: ['O-'],
      type: 'Universal Red Cell Donor',
    },
    'O+': {
      canGiveTo: ['O+', 'A+', 'B+', 'AB+'],
      canReceiveFrom: ['O+', 'O-'],
      type: 'Most Common Blood Type (~38%)',
    },
    'A-': {
      canGiveTo: ['A-', 'A+', 'AB-', 'AB+'],
      canReceiveFrom: ['A-', 'O-'],
      type: 'Rare Negative Antigen Type',
    },
    'A+': {
      canGiveTo: ['A+', 'AB+'],
      canReceiveFrom: ['A+', 'A-', 'O+', 'O-'],
      type: 'Second Most Common (~30%)',
    },
    'B-': {
      canGiveTo: ['B-', 'B+', 'AB-', 'AB+'],
      canReceiveFrom: ['B-', 'O-'],
      type: 'Rare Type (~2%)',
    },
    'B+': {
      canGiveTo: ['B+', 'AB+'],
      canReceiveFrom: ['B+', 'B-', 'O+', 'O-'],
      type: 'Highly Prevalent in South Asia (~32%)',
    },
    'AB-': {
      canGiveTo: ['AB-', 'AB+'],
      canReceiveFrom: ['AB-', 'A-', 'B-', 'O-'],
      type: 'Rarest Blood Group (<1%)',
    },
    'AB+': {
      canGiveTo: ['AB+'],
      canReceiveFrom: ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
      type: 'Universal Red Cell Recipient',
    },
  };

  const currentCompat = compatibilityData[selectedGroup];

  return (
    <div className="space-y-16 pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blood-50/70 via-white to-gray-50 pt-12 pb-20 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Heading & CTAs */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blood-100/80 text-blood-800 text-xs font-semibold border border-blood-200/60 shadow-xs">
                <span className="flex h-2 w-2 rounded-full bg-blood-700 animate-ping"></span>
                Emergency Healthcare Coordination Platform
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-charcoal-900 tracking-tight leading-[1.15]">
                Every Second Matters. <br />
                <span className="text-blood-700">Every Donor Counts.</span>
              </h1>

              <p className="text-base sm:text-lg text-charcoal-600 max-w-2xl leading-relaxed">
                Connecting people in need of blood with potential voluntary donors nearby through progressive <strong>5 km, 10 km, and 25 km</strong> geographical search tiers.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  onClick={() => setIsRequestModalOpen(true)}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-blood-700 text-white font-bold text-sm hover:bg-blood-800 shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Find Blood Donors
                </button>

                <Link
                  to="/register/donor"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white text-charcoal-800 font-bold text-sm hover:bg-gray-50 border border-gray-300 shadow-sm transition flex items-center justify-center gap-2"
                >
                  <Heart className="w-4 h-4 text-blood-700 fill-blood-700" />
                  Become a Donor
                </Link>
              </div>

              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Progressive Proximity Matching
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Admin Clinical Verification
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Strict Privacy Protection
                </span>
              </div>
            </div>

            {/* Right Column: Live Status & Quick Action Card */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl bg-white p-6 sm:p-8 shadow-xl border border-gray-200/80 space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-charcoal-800 uppercase tracking-wider">
                      Pune Metro Hub Status
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-blood-700 bg-blood-50 px-2 py-0.5 rounded-full border border-blood-100">
                    Active Demonstrable Hub
                  </span>
                </div>

                {/* Live Demonstration Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-2xl font-black text-blood-700">9</span>
                    <p className="text-xs font-semibold text-charcoal-700 mt-0.5">Voluntary Donors</p>
                    <span className="text-[10px] text-gray-500">Across all 8 ABO/Rh types</span>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-2xl font-black text-emerald-600">&lt; 15 min</span>
                    <p className="text-xs font-semibold text-charcoal-700 mt-0.5">Response Window</p>
                    <span className="text-[10px] text-gray-500">5 km priority radius</span>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-2xl font-black text-blue-600">4</span>
                    <p className="text-xs font-semibold text-charcoal-700 mt-0.5">Hospitals Linked</p>
                    <span className="text-[10px] text-gray-500">Ruby Hall, Sahyadri, KEM</span>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-2xl font-black text-purple-600">100%</span>
                    <p className="text-xs font-semibold text-charcoal-700 mt-0.5">Verified Requests</p>
                    <span className="text-[10px] text-gray-500">Zero unverified spam alerts</span>
                  </div>
                </div>

                <div className="p-3.5 bg-blood-50/70 rounded-xl border border-blood-100 text-xs text-blood-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-blood-700 shrink-0" />
                    <span>Emergency Hospital Coordination Desk</span>
                  </div>
                  <span className="font-bold text-blood-700">108 / 104</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS (4 STEPS) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-bold text-blood-700 uppercase tracking-wider">
            Clear Four-Step Workflow
          </span>
          <h2 className="text-3xl font-extrabold text-charcoal-900 tracking-tight">
            How Blood_Link Coordinates Emergency Care
          </h2>
          <p className="text-sm text-gray-600">
            A responsible, transparent system engineered to connect patient attendants with nearby potential voluntary donors while safeguarding hospital protocol.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              step: '01',
              title: 'Create Request',
              desc: 'Attendant submits patient details, blood group, component, units, and hospital address.',
              icon: Droplet,
            },
            {
              step: '02',
              title: 'Clinical Verification',
              desc: 'Admin desk validates hospital admission to prevent malicious or duplicate alerts.',
              icon: Shield,
            },
            {
              step: '03',
              title: 'Progressive Match',
              desc: 'Core engine scans nearby donors progressively in 5 km, 10 km, and 25 km radiuses.',
              icon: Search,
            },
            {
              step: '04',
              title: 'Donor Willingness',
              desc: 'Nearby available donors express willingness to report to the hospital blood centre.',
              icon: Heart,
            },
          ].map((item) => (
            <div
              key={item.step}
              className="relative p-6 rounded-2xl bg-white border border-gray-200/80 shadow-sm hover:shadow-md transition space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-gray-200">{item.step}</span>
                <div className="w-10 h-10 rounded-xl bg-blood-50 text-blood-700 flex items-center justify-center">
                  <item.icon className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-base font-bold text-charcoal-900">{item.title}</h3>
              <p className="text-xs text-charcoal-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. INTERACTIVE BLOOD GROUP COMPATIBILITY MATRIX */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-6 sm:p-10 border border-gray-200 shadow-sm space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
            <div>
              <span className="text-xs font-bold text-blood-700 uppercase tracking-wider">
                Clinical Reference
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 mt-1">
                ABO & Rh Transfusion Compatibility Matrix
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Click any blood group to explore clinical red-cell donation and reception compatibility rules.
              </p>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl flex-wrap">
              {(['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'] as BloodGroup[]).map((bg) => (
                <button
                  key={bg}
                  onClick={() => setSelectedGroup(bg)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedGroup === bg
                      ? 'bg-blood-700 text-white shadow-sm'
                      : 'text-charcoal-700 hover:bg-white'
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="p-6 rounded-2xl bg-blood-50/70 border border-blood-100 text-center space-y-2">
              <span className="text-4xl font-black text-blood-700">{selectedGroup}</span>
              <p className="text-xs font-bold text-charcoal-900">{currentCompat.type}</p>
              <p className="text-[11px] text-charcoal-600">Selected Blood Classification</p>
            </div>

            <div className="space-y-4 md:col-span-2">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Can Donate Red Blood Cells To ({currentCompat.canGiveTo.length} Groups):
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {currentCompat.canGiveTo.map((bg) => (
                    <span
                      key={bg}
                      className="px-3 py-1 bg-emerald-100 text-emerald-900 text-xs font-bold rounded-lg border border-emerald-200"
                    >
                      {bg}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
                <span className="text-xs font-bold text-blue-800 uppercase tracking-wide flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  Can Safely Receive Red Blood Cells From ({currentCompat.canReceiveFrom.length} Groups):
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {currentCompat.canReceiveFrom.map((bg) => (
                    <span
                      key={bg}
                      className="px-3 py-1 bg-blue-100 text-blue-900 text-xs font-bold rounded-lg border border-blue-200"
                    >
                      {bg}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. DONOR BENEFITS & SAFETY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          <div className="rounded-3xl bg-charcoal-900 text-white p-8 sm:p-10 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-xs font-bold text-blood-400 uppercase tracking-wider">
                Voluntary Impact
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Why Voluntary Donors Are Lifesavers
              </h3>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                A single voluntary whole blood donation can save up to three lives when separated into Packed Red Blood Cells, Platelets, and Fresh Frozen Plasma.
              </p>

              <ul className="space-y-3 pt-2 text-xs text-gray-200">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Immediate notification when emergency needs occur within your 5 km locality.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Instant availability toggle: mark yourself &quot;Temporarily Unavailable&quot; anytime.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Personalized donation history tracking with recommended 90-day rest periods.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Zero commercial exploitation: purely voluntary, non-remunerated donation.</span>
                </li>
              </ul>
            </div>

            <Link
              to="/register/donor"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blood-700 text-white font-bold text-xs hover:bg-blood-800 transition"
            >
              Register as a Voluntary Donor <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="rounded-3xl bg-white border border-gray-200 p-8 sm:p-10 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-xs font-bold text-blood-700 uppercase tracking-wider">
                Regulatory Standards
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight">
                Strict Ethical & Safety Safeguards
              </h3>
              <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed">
                Blood_Link enforces clinical safety, age compliance, and privacy by design.
              </p>

              <div className="space-y-3 text-xs text-charcoal-700">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <strong className="text-charcoal-900 block font-semibold">Minimum Age Requirement: 18 Years</strong>
                  <span className="text-gray-500">Only verified adults (age ≥ 18) are permitted to register as voluntary donors.</span>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <strong className="text-charcoal-900 block font-semibold">No Public Coordinate Exposure</strong>
                  <span className="text-gray-500">Exact home coordinates of donors and patients are masked. Only approximate locality and distance in km are revealed.</span>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <strong className="text-charcoal-900 block font-semibold">Hospital Blood Bank Authority</strong>
                  <span className="text-gray-500">Final eligibility and crossmatch compatibility are determined strictly by licensed blood centre personnel.</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <MedicalDisclaimer compact />
            </div>
          </div>

        </div>
      </section>

      {/* 5. PROMINENT CTA BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-blood-700 via-blood-800 to-blood-900 text-white p-8 sm:p-12 text-center space-y-6 shadow-xl">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Make a Life-Saving Difference?
          </h2>
          <p className="text-sm sm:text-base text-blood-100 max-w-2xl mx-auto leading-relaxed">
            Join the Blood_Link voluntary network today. A few minutes of your time can bring a patient back from critical condition.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register/donor"
              className="px-7 py-3 rounded-xl bg-white text-blood-700 font-bold text-xs hover:bg-gray-100 shadow-md transition"
            >
              Register as Donor
            </Link>
            <button
              onClick={() => setIsRequestModalOpen(true)}
              className="px-7 py-3 rounded-xl bg-blood-950/60 text-white font-bold text-xs hover:bg-blood-950/80 border border-white/20 transition"
            >
              Post Emergency Request
            </button>
          </div>
        </div>
      </section>

      {/* Emergency Request Modal */}
      <EmergencyRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
      />
    </div>
  );
};
