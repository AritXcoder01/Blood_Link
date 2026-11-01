/// <reference types="vite/client" />
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Shield, HeartHandshake, User, CheckCircle2 } from 'lucide-react';

export const DemoBanner: React.FC = () => {
  // In production builds, do not render evaluation role-switcher banner
  if (!import.meta.env.DEV) {
    return null;
  }

  const { user, quickLogin } = useAuth();
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  const handleSwitch = async (role: 'admin' | 'donor' | 'requester') => {
    setLoadingRole(role);
    await quickLogin(role);
    setLoadingRole(null);
  };

  return (
    <div className="bg-gradient-to-r from-charcoal-900 via-charcoal-800 to-charcoal-900 text-white text-xs py-2 px-4 shadow-sm border-b border-charcoal-700">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-emerald-400 uppercase tracking-wider text-[11px] flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> DEMO EVALUATION MODE
          </span>
          <span className="hidden sm:inline text-gray-300">
            | Pre-seeded with 9 Donors, 3 Requesters & 4 Hospitals in Pune Hub.
          </span>
          {user && (
            <span className="ml-2 inline-flex items-center gap-1 bg-charcoal-700 px-2 py-0.5 rounded text-amber-300 font-medium">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Active as {user.role.toUpperCase()} ({user.fullName})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-gray-400 text-[11px] mr-1 hidden md:inline">1-Click Role Switcher:</span>
          
          <button
            onClick={() => handleSwitch('admin')}
            disabled={loadingRole !== null}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-medium transition ${
              user?.role === 'admin'
                ? 'bg-blood-700 text-white shadow-sm ring-1 ring-white/20'
                : 'bg-charcoal-700 text-gray-200 hover:bg-charcoal-600'
            }`}
          >
            <Shield className="w-3 h-3 text-red-400" />
            Admin
          </button>

          <button
            onClick={() => handleSwitch('donor')}
            disabled={loadingRole !== null}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-medium transition ${
              user?.role === 'donor'
                ? 'bg-blood-700 text-white shadow-sm ring-1 ring-white/20'
                : 'bg-charcoal-700 text-gray-200 hover:bg-charcoal-600'
            }`}
          >
            <HeartHandshake className="w-3 h-3 text-emerald-400" />
            Donor (O+)
          </button>

          <button
            onClick={() => handleSwitch('requester')}
            disabled={loadingRole !== null}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-medium transition ${
              user?.role === 'requester'
                ? 'bg-blood-700 text-white shadow-sm ring-1 ring-white/20'
                : 'bg-charcoal-700 text-gray-200 hover:bg-charcoal-600'
            }`}
          >
            <User className="w-3 h-3 text-blue-400" />
            Requester
          </button>
        </div>
      </div>
    </div>
  );
};
