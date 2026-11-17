import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HeartPulse, Lock, Mail, User, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';

export default function Register({ onSwitchToLogin }) {
  const navigate = useNavigate();
  const { register, authError, isAuthenticated } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('patient');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password || !displayName.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await register(email.trim(), password, displayName.trim(), role);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border border-slate-100">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-teal-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg shadow-teal-500/30 mb-3">
            <HeartPulse className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create Your Account</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Join CareCircle AI for intelligent elderly healthcare management
          </p>
        </div>

        {(error || authError) && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error || authError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Eleanor Vance"
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 bg-slate-50/50 text-slate-900 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 bg-slate-50/50 text-slate-900 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 bg-slate-50/50 text-slate-900 font-medium"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                Confirm
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 bg-slate-50/50 text-slate-900 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Select Your Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('patient')}
                className={`p-3 rounded-xl border text-left transition ${
                  role === 'patient'
                    ? 'border-teal-600 bg-teal-50/70 ring-2 ring-teal-500/20'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <span className="text-xs font-bold text-slate-900 block">Elderly Patient</span>
                <span className="text-[11px] text-slate-500">I am managing my own care</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('caregiver')}
                className={`p-3 rounded-xl border text-left transition ${
                  role === 'caregiver'
                    ? 'border-cyan-600 bg-cyan-50/70 ring-2 ring-cyan-500/20'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <span className="text-xs font-bold text-slate-900 block">Family Caregiver</span>
                <span className="text-[11px] text-slate-500">I care for an elderly loved one</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold rounded-xl text-sm shadow-md shadow-teal-600/20 transition flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
          >
            <span>{loading ? 'Creating Account...' : 'Complete Registration'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Already have an account?{' '}
          {onSwitchToLogin ? (
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-teal-600 font-bold hover:underline"
            >
              Sign In
            </button>
          ) : (
            <Link to="/login" className="text-teal-600 font-bold hover:underline">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
