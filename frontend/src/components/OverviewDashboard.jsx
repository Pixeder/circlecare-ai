import React, { useState, useEffect } from 'react';
import {
  HeartPulse,
  Pill,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Bot,
  Upload,
  PhoneCall,
  User,
  Activity,
} from 'lucide-react';
import { fetchOverview, logDose, requestMedicationRefill } from '../services/api';

export default function OverviewDashboard({ onNavigate, onOpenEmergency, onRefreshNeeded }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchOverview();
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [onRefreshNeeded]);

  const handleTakeDose = async (medName) => {
    try {
      await logDose(medName, 'taken', 'Marked taken from Overview Dashboard');
      setActionMessage(`Logged ${medName} dose as taken!`);
      setTimeout(() => setActionMessage(null), 4000);
      loadData();
    } catch (err) {
      alert(`Error logging dose: ${err.message}`);
    }
  };

  const handleRefill = async (medName) => {
    try {
      const res = await requestMedicationRefill(medName, 30);
      setActionMessage(res.message);
      setTimeout(() => setActionMessage(null), 5000);
      loadData();
    } catch (err) {
      alert(`Error requesting refill: ${err.message}`);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-sm font-semibold text-slate-600">Loading Eleanor's Health Dashboard...</span>
      </div>
    );
  }

  const patient = data?.patient || {
    name: 'Eleanor Vance',
    age: 74,
    allergies: ['Penicillin', 'Sulfa drugs'],
    primaryCondition: 'Essential Hypertension, Type 2 Diabetes',
  };

  const quickStats = data?.quickStats || {
    activeMedicationsCount: 2,
    adherenceRate: '94%',
    lowStockCount: 1,
    nextDoctorVisit: '2026-11-20 (10:30 AM)',
  };

  const todaySchedule = data?.todaySchedule || [];
  const upcomingAppointment = data?.upcomingAppointment;
  const lowStockWarnings = data?.lowStockWarnings || [];

  return (
    <div className="space-y-6">
      {/* Patient Greeting & Status Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-cyan-900 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-white/20 text-white font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Elderly Care Profile
              </span>
              <span className="text-xs text-teal-200">Patient ID: #patient_elderly_001</span>
            </div>
            <h1 className="text-2xl font-bold mt-1">Good morning, {patient.name}!</h1>
            <p className="text-teal-100 text-sm mt-1 max-w-2xl">
              Age {patient.age} • Conditions: {patient.primaryCondition} • All systems monitored by CareCircle AI.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => onNavigate('assistant')}
              className="flex items-center space-x-1.5 bg-white text-teal-900 hover:bg-teal-50 px-4 py-2.5 rounded-xl font-bold text-sm shadow transition"
            >
              <Bot className="w-4 h-4 text-teal-600" />
              <span>Ask Assistant</span>
            </button>
            <button
              onClick={onOpenEmergency}
              className="flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow transition animate-pulse"
            >
              <PhoneCall className="w-4 h-4" />
              <span>SOS</span>
            </button>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-sm font-medium flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Adherence Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dose Adherence (30d)</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{quickStats.adherenceRate}</div>
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
              <CheckCircle className="w-3.5 h-3.5" /> High Clinical Adherence
            </span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <HeartPulse className="w-6 h-6" />
          </div>
        </div>

        {/* Active Meds */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Medications</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{quickStats.activeMedicationsCount}</div>
            <span className="text-xs text-slate-500 font-medium">Metformin, Amlodipine</span>
          </div>
          <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center">
            <Pill className="w-6 h-6" />
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div
          onClick={() => onNavigate('medications')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-amber-400 transition"
        >
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Low-Stock Warning</span>
            <div className="text-2xl font-bold text-amber-600 mt-1">{quickStats.lowStockCount}</div>
            <span className="text-xs text-amber-700 font-medium">Amlodipine (4 tablets)</span>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Next Visit */}
        <div
          onClick={() => onNavigate('appointments')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-teal-400 transition"
        >
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Next Doctor Visit</span>
            <div className="text-lg font-bold text-slate-900 mt-1 truncate max-w-[170px]">
              {upcomingAppointment?.doctorName?.split(',')[0] || 'Dr. Miller'}
            </div>
            <span className="text-xs text-teal-600 font-medium">{quickStats.nextDoctorVisit}</span>
          </div>
          <div className="w-12 h-12 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Today's Schedule & Low Stock Warning */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's Schedule (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-teal-600" />
              <h2 className="text-lg font-bold text-slate-900">Today's Medication Schedule</h2>
            </div>
            <button
              onClick={() => onNavigate('medications')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-800 flex items-center gap-1"
            >
              Full Schedule <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {todaySchedule.map((med, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-base">{med.name}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800">
                      {med.dosage}
                    </span>
                    {med.stockRemaining <= med.refillThreshold && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {med.stockRemaining} left
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Frequency: {med.frequency} • Next scheduled: {med.nextDose || '8:00 PM'}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleTakeDose(med.name)}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Log Taken</span>
                  </button>
                  {med.stockRemaining <= med.refillThreshold && (
                    <button
                      onClick={() => handleRefill(med.name)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                    >
                      Request Refill
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Upload Action Banner */}
          <div className="mt-6 p-4 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-teal-950 text-sm">Have a new prescription slip?</h3>
              <p className="text-xs text-teal-800 mt-0.5">
                Upload via NVIDIA NIM OCR to automatically extract medication instructions.
              </p>
            </div>
            <button
              onClick={() => onNavigate('prescriptions')}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold whitespace-nowrap transition"
            >
              Upload Prescription
            </button>
          </div>
        </div>

        {/* Right Column: Family Caregiver & Doctor Consultation (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Caregiver Status */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-slate-900 text-base">Family Care Circle</h3>
              </div>
              <button
                onClick={() => onNavigate('family')}
                className="text-xs font-semibold text-teal-600 hover:text-teal-800"
              >
                Manage
              </button>
            </div>

            <div className="mt-3.5 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">
                    SV
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">Sarah Vance</span>
                    <span className="text-xs text-slate-500">Daughter • Primary Medical Proxy</span>
                  </div>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                  Online
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-sm">
                    RM
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">Dr. Robert Miller, FACC</span>
                    <span className="text-xs text-slate-500">Attending Cardiologist</span>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('history')}
                  className="text-xs text-teal-600 font-semibold hover:underline"
                >
                  Doctor Brief
                </button>
              </div>
            </div>
          </div>

          {/* Quick Doctor Visit Preparation Banner */}
          <div className="bg-gradient-to-br from-cyan-900 to-slate-900 rounded-2xl p-5 text-white shadow-sm">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" /> Doctor Visit Brief Generator
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Prepare a comprehensive clinical summary with 30-day adherence stats, vital trends, and cited source records for Eleanor's upcoming visit.
            </p>
            <button
              onClick={() => onNavigate('history')}
              className="mt-3.5 w-full py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs transition"
            >
              Generate Doctor Visit Brief (Qdrant RAG)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
