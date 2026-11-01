import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, AlertCircle, ArrowRight, ShieldCheck, MapPin } from 'lucide-react';

export const RequesterRegisterPage: React.FC = () => {
  const { registerRequester } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [requesterType, setRequesterType] = useState<'Patient' | 'Attendant'>('Attendant');
  const [locality, setLocality] = useState('Kothrud');
  const [district, setDistrict] = useState('Pune');
  const [state, setState] = useState('Maharashtra');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    const payload = {
      fullName,
      email,
      password,
      mobile,
      requesterType,
      state,
      district,
      taluka: 'Haveli',
      locality,
      latitude: 18.5074,
      longitude: 73.8077,
    };

    const res = await registerRequester(payload);
    setIsSubmitting(false);

    if (res.success) {
      navigate('/requester/dashboard');
    } else {
      setErrorMsg(res.message || 'Registration failed.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-3xl shadow-xl border border-gray-200 text-xs text-charcoal-800">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <User className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-charcoal-900 tracking-tight">
            Requester Registration
          </h2>
          <p className="text-gray-500">
            For patients and family attendants requiring emergency blood coordination
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="font-semibold text-charcoal-700">Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Priya Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blood-700 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-charcoal-700">Requester Type *</label>
            <div className="grid grid-cols-2 gap-2">
              {(['Attendant', 'Patient'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setRequesterType(t)}
                  className={`py-2 rounded-xl border text-center font-semibold transition ${
                    requesterType === t
                      ? 'bg-blood-700 text-white border-blood-700'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {t === 'Attendant' ? 'Family Attendant' : 'Self (Patient)'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-charcoal-700">Mobile Number *</label>
            <input
              type="tel"
              required
              placeholder="+91-9876543210"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blood-700 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-charcoal-700">Email Address (Login ID) *</label>
            <input
              type="email"
              required
              placeholder="priya@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blood-700 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-charcoal-700">Password *</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blood-700 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-charcoal-700">District *</label>
              <input
                type="text"
                required
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-charcoal-700">Locality *</label>
              <input
                type="text"
                required
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-blood-700 text-white font-bold text-xs hover:bg-blood-800 shadow transition flex items-center justify-center gap-1.5"
          >
            {isSubmitting ? 'Creating Account...' : 'Complete Requester Registration'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 text-center text-gray-500 border-t border-gray-100">
          Already registered?{' '}
          <Link to="/login" className="font-bold text-blood-700 hover:underline">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
};
