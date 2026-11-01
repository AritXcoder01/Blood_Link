import React from 'react';
import { Droplet, Award, ShieldCheck, HeartHandshake, Code2, Users, MapPin } from 'lucide-react';
import { MedicalDisclaimer } from '../components/MedicalDisclaimer';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="space-y-4 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blood-50 text-blood-700 text-xs font-semibold border border-blood-100">
          <Droplet className="w-3.5 h-3.5 fill-blood-700" />
          Final-Year Engineering Capstone Project (2026)
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-charcoal-900 tracking-tight">
          About Blood_Link
        </h1>
        <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Location-Based Emergency Blood Donor Discovery and Coordination System.
        </p>
      </div>

      <div className="p-8 rounded-2xl bg-white border border-gray-200/80 shadow-sm space-y-6 text-sm text-charcoal-700 leading-relaxed">
        <h2 className="text-xl font-bold text-charcoal-900">Project Mission & Architectural Context</h2>
        <p>
          In acute clinical crises such as trauma resuscitation, maternal hemorrhages, and dengue-induced thrombocytopenia, time is the single most critical survival determinant. 
          Traditional blood banking models often leave patient families running between distant blood centres or broadcasting frantic, unverified appeals on social media that expose sensitive patient data and lead to false rumors.
        </p>
        <p>
          <strong>Blood_Link</strong> was architected as an intelligent, location-aware bridge. It integrates progressive geographical distance searching (5 km, 10 km, and 25 km tiers) with clinical administrative verification to ensure that voluntary donors within immediate reach are respectfully alerted while hospital blood centres verify cross-match compatibility.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blood-50 text-blood-700 flex items-center justify-center font-bold">
            <MapPin className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-charcoal-900 text-sm">Progressive Geo-Matching</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Mathematical Haversine and PostGIS geospatial calculation prioritizes closest donors first, expanding only when needed to prevent donor alert fatigue.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blood-50 text-blood-700 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-charcoal-900 text-sm">Verified Emergency Desk</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Every blood request is clinically validated before progressive donor notifications are sent, eliminating fraud and duplicate requests.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blood-50 text-blood-700 flex items-center justify-center font-bold">
            <Code2 className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-charcoal-900 text-sm">Enterprise Stack</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Built with React, TypeScript, Vite, Tailwind CSS, Node.js Express API, and dual-mode database engine (PostgreSQL + SQLite WebAssembly fallback).
          </p>
        </div>
      </div>

      <MedicalDisclaimer />
    </div>
  );
};
