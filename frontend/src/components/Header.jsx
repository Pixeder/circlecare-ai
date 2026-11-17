import React from 'react';
import { useAuth } from '../context/AuthContext';
import { HeartPulse, User, PhoneCall, ShieldCheck, Sparkles, LogOut, UserPlus } from 'lucide-react';

export default function Header({ onOpenEmergency, onSelectTab, onOpenOnboarding }) {
  const { user, patientProfile, logout } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div
          onClick={() => onSelectTab && onSelectTab('overview')}
          className="flex items-center space-x-3 cursor-pointer"
        >
          <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-sm">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">CareCircle AI</h1>
              <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-teal-600" /> NVIDIA NIM
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Agentic Elderly Healthcare Management Platform</p>
          </div>
        </div>

        {/* Patient Profile Badge & User Controls */}
        <div className="flex items-center space-x-3">
          {patientProfile ? (
            <div className="hidden sm:flex items-center space-x-2.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center">
                {patientProfile.name?.slice(0, 2).toUpperCase()}
              </div>
              <div className="text-left text-xs">
                <span className="font-bold text-slate-900 block leading-tight">{patientProfile.name}</span>
                <span className="text-[11px] text-teal-700 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> {user?.displayName || user?.email} ({user?.role})
                </span>
              </div>
            </div>
          ) : (
            <button
              onClick={onOpenOnboarding}
              className="flex items-center space-x-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 px-3 py-1.5 rounded-xl text-xs font-bold border border-teal-200 transition"
            >
              <UserPlus className="w-3.5 h-3.5 text-teal-600" />
              <span>Create Patient Profile</span>
            </button>
          )}

          {/* Emergency SOS Button */}
          <button
            onClick={onOpenEmergency}
            className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 active:scale-95 transition text-white px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-black shadow-md shadow-rose-200"
            title="Emergency SOS Dispatch"
          >
            <PhoneCall className="w-4 h-4 animate-bounce" />
            <span className="hidden sm:inline">EMERGENCY SOS</span>
            <span className="sm:hidden">SOS</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
