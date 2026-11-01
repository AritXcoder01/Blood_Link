import React from 'react';
import { Link } from 'react-router-dom';
import { Droplet, PhoneCall, ShieldCheck, Heart, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-charcoal-900 text-gray-300 text-xs border-t border-charcoal-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Column 1: Brand & Project Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blood-700 text-white flex items-center justify-center">
                <Droplet className="w-5 h-5 fill-white" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                Blood<span className="text-blood-500">_Link</span>
              </span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">
              Location-Based Emergency Blood Donor Discovery & Coordination System.
              Connecting voluntary donors within progressive 5km, 10km, and 25km geographical radiuses.
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-charcoal-800 text-emerald-400 text-[11px] font-medium border border-charcoal-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              Final-Year Academic Submission (2026)
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
              Platform
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="hover:text-white transition">Home</Link>
              </li>
              <li>
                <Link to="/how-it-works" className="hover:text-white transition">How Matching Works</Link>
              </li>
              <li>
                <Link to="/hospitals" className="hover:text-white transition">Hospitals & Blood Banks</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition">About System</Link>
              </li>
              <li>
                <Link to="/register/donor" className="text-blood-400 hover:text-blood-300 font-medium">Become a Donor</Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Emergency Guidelines */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
              Emergency & Safety
            </h4>
            <ul className="space-y-2 text-gray-400 text-xs">
              <li className="flex items-start gap-1.5">
                <span className="text-blood-500 font-bold">•</span>
                <span>Minimum donor age is 18 years.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blood-500 font-bold">•</span>
                <span>Matches reflect potential voluntary donors.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blood-500 font-bold">•</span>
                <span>Medical eligibility is decided strictly by licensed blood centres.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blood-500 font-bold">•</span>
                <span>Exact home coordinates are never publicly exposed.</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Coordination */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
              Emergency Hub
            </h4>
            <div className="space-y-2 text-gray-400">
              <p className="flex items-center gap-2 text-gray-200">
                <PhoneCall className="w-4 h-4 text-blood-500" />
                <span>Helpline: 104 / 108 (India)</span>
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>Hub: Pune Metropolitan Region</span>
              </p>
              <div className="pt-2">
                <p className="text-[11px] text-gray-400 leading-tight">
                  In acute medical emergencies, immediately contact the nearest licensed hospital or 108 emergency services.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-charcoal-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-gray-400 text-[11px]">
          <p>© {new Date().getFullYear()} Blood_Link Platform. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built with <Heart className="w-3.5 h-3.5 text-blood-500 fill-blood-500" /> for Emergency Healthcare Coordination
          </p>
        </div>
      </div>
    </footer>
  );
};
