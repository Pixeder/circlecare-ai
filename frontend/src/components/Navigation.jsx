import React from 'react';
import {
  LayoutDashboard,
  Bot,
  FileText,
  Pill,
  Calendar,
  History,
  Users,
  AlertOctagon,
  Settings,
} from 'lucide-react';

export default function Navigation({ activeTab, onSelectTab, counts = {} }) {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'assistant', label: 'AI Assistant', icon: Bot, badge: 'NIM' },
    { id: 'prescriptions', label: 'Prescriptions', icon: FileText, count: counts.prescriptions },
    { id: 'medications', label: 'Medications', icon: Pill, alert: counts.lowStock > 0 },
    { id: 'appointments', label: 'Appointments', icon: Calendar, count: counts.appointments },
    { id: 'history', label: 'Medical History', icon: History, badge: 'RAG' },
    { id: 'family', label: 'Family Care', icon: Users, count: counts.caregivers },
    { id: 'emergency', label: 'Emergency SOS', icon: AlertOctagon, danger: true },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-[69px] z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2.5 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? tab.danger
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-teal-600 text-white shadow-sm'
                    : tab.danger
                    ? 'text-rose-600 hover:bg-rose-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${tab.danger && !isActive ? 'text-rose-500' : ''}`} />
                <span>{tab.label}</span>

                {tab.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                      isActive ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-800'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}

                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`text-[11px] font-bold px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}

                {tab.alert && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Low stock warning" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
