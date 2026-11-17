import React from 'react';
import { HeartPulse, User, PhoneCall, ShieldCheck, Sparkles, Activity } from 'lucide-react';

export default function Header({ onOpenEmergency, onSelectTab }) {
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

        {/* Patient and Caregiver Profile Badges & Emergency SOS */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center">
              EV
            </div>
            <div className="text-left text-xs">
              <span className="font-bold text-slate-900 block leading-tight">Eleanor Vance (74y)</span>
              <span className="text-[11px] text-teal-700 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Sarah Vance (Caregiver)
              </span>
            </div>
          </div>

          {/* Large Accessible Emergency SOS Button */}
          <button
            onClick={onOpenEmergency}
            className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 active:scale-95 transition text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-black shadow-md shadow-rose-200"
            title="Emergency SOS Dispatch"
          >
            <PhoneCall className="w-4 h-4 animate-bounce" />
            <span>EMERGENCY SOS</span>
          </button>
        </div>
      </div>
    </header>
  );
}
