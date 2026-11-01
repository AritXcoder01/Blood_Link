import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Droplet, Shield, HeartHandshake, User, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, quickLogin, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect to appropriate dashboard
  React.useEffect(() => {
    if (user) {
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'donor') navigate('/donor/dashboard');
      else navigate('/requester/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    const res = await login(email, password);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.message || 'Invalid credentials');
    }
  };

  const handleQuickLogin = async (role: 'admin' | 'donor' | 'requester') => {
    setIsSubmitting(true);
    await quickLogin(role);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl shadow-xl border border-gray-200">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-blood-700 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-blood-700/20">
            <Droplet className="w-7 h-7 fill-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-charcoal-900 tracking-tight">
            Sign In to Blood_Link
          </h2>
          <p className="text-xs text-gray-500">
            Emergency Blood Donor Discovery & Coordination Platform
          </p>
        </div>

        {/* 1-Click Evaluation Login Buttons */}
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2.5">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block text-center">
            Academic Demo Mode (1-Click Login)
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              disabled={isSubmitting}
              className="py-2 px-2 bg-white hover:bg-red-50 text-blood-700 text-xs font-semibold rounded-xl border border-gray-200 hover:border-blood-300 shadow-xs transition flex flex-col items-center gap-1"
            >
              <Shield className="w-4 h-4 text-blood-700" />
              <span>Admin</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('donor')}
              disabled={isSubmitting}
              className="py-2 px-2 bg-white hover:bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl border border-gray-200 hover:border-emerald-300 shadow-xs transition flex flex-col items-center gap-1"
            >
              <HeartHandshake className="w-4 h-4 text-emerald-600" />
              <span>Donor (O+)</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('requester')}
              disabled={isSubmitting}
              className="py-2 px-2 bg-white hover:bg-blue-50 text-blue-700 text-xs font-semibold rounded-xl border border-gray-200 hover:border-blue-300 shadow-xs transition flex flex-col items-center gap-1"
            >
              <User className="w-4 h-4 text-blue-600" />
              <span>Requester</span>
            </button>
          </div>
        </div>

        {/* Regular Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs text-charcoal-800">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="font-semibold text-charcoal-700">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blood-700 focus:outline-none text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-charcoal-700">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blood-700 focus:outline-none text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-blood-700 text-white font-bold text-xs hover:bg-blood-800 shadow transition flex items-center justify-center gap-1.5"
          >
            {isSubmitting ? 'Authenticating...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer links */}
        <div className="pt-2 text-center text-xs text-gray-500 space-y-2 border-t border-gray-100">
          <p>
            Don&apos;t have an account?{' '}
            <Link to="/register/donor" className="font-bold text-blood-700 hover:underline">
              Register as Donor
            </Link>
            {' or '}
            <Link to="/register/requester" className="font-bold text-blue-700 hover:underline">
              Patient Attendant
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};
