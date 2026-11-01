import React from 'react';
import { Search, ShieldAlert, CheckCircle, Navigation, Radio, HeartHandshake, Building2 } from 'lucide-react';
import { MedicalDisclaimer } from '../components/MedicalDisclaimer';

export const HowItWorksPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="space-y-4 text-center">
        <span className="text-xs font-bold text-blood-700 uppercase tracking-wider">
          Engineering & Coordination Protocol
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-charcoal-900 tracking-tight">
          How Progressive Matching Works
        </h1>
        <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Understanding the mathematical radius expansion, clinical verification pipeline, and privacy-preserving donor coordination.
        </p>
      </div>

      {/* 3 Tier Progressive Radiuses */}
      <div className="p-8 rounded-3xl bg-white border border-gray-200/80 shadow-sm space-y-6">
        <h2 className="text-xl font-bold text-charcoal-900 flex items-center gap-2">
          <Radio className="w-5 h-5 text-blood-700" />
          Progressive Three-Tier Geospatial Search Engine
        </h2>
        <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed">
          To prevent broadcasting indiscriminate spam notifications to distant citizens while ensuring urgent blood needs are met rapidly, our matching engine employs an automated progressive perimeter:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="p-5 rounded-2xl bg-blood-50/60 border border-blood-200 space-y-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blood-700 text-white uppercase">
              Tier 1: 0 - 5 km
            </span>
            <h3 className="font-bold text-charcoal-900 text-sm">Immediate Proximity</h3>
            <p className="text-xs text-charcoal-600 leading-relaxed">
              Dispatched first to donors who can physically reach the hospital blood centre within 15–20 minutes.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-600 text-white uppercase">
              Tier 2: 5 - 10 km
            </span>
            <h3 className="font-bold text-charcoal-900 text-sm">Metropolitan Belt</h3>
            <p className="text-xs text-charcoal-600 leading-relaxed">
              Activated if insufficient responses arrive from Tier 1 within critical urgency thresholds.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white uppercase">
              Tier 3: 10 - 25 km
            </span>
            <h3 className="font-bold text-charcoal-900 text-sm">Extended Regional Hub</h3>
            <p className="text-xs text-charcoal-600 leading-relaxed">
              Extended perimeter for rare blood types (e.g., AB-, O-, B-) or mass-casualty surgical procedures.
            </p>
          </div>
        </div>
      </div>

      {/* Verification Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-4">
          <h3 className="font-bold text-charcoal-900 text-base flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blood-700" />
            Clinical Verification Gate
          </h3>
          <p className="text-xs text-charcoal-600 leading-relaxed">
            Unlike open social media forums where fake requests cause panic, every request on Blood_Link enters 
            <span className="font-semibold text-amber-800"> PENDING_VERIFICATION</span>. 
            Trained coordination personnel confirm the patient&apos;s hospital admission, doctor prescription, and required blood component before public or donor notification.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-4">
          <h3 className="font-bold text-charcoal-900 text-base flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-blood-700" />
            Donor Privacy & Consent
          </h3>
          <p className="text-xs text-charcoal-600 leading-relaxed">
            Exact donor coordinates are never displayed. When a donor accepts, they indicate <em>willingness to be contacted for donation</em>. 
            All clinical health screenings, viral testing, hemoglobin checks, and cross-matching occur inside certified hospital facilities.
          </p>
        </div>
      </div>

      <MedicalDisclaimer />
    </div>
  );
};
